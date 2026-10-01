import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
const DB_FILE = path.resolve(__dirname, '../data/db.json');
const app = express();
const clients = new Set();
let db;
let saveQueue = Promise.resolve();
let supabase;
const adminSessions = new Set();
const PII_HASH_SALT = process.env.PII_HASH_SALT || 'skb:pii:v1:';
const ADMIN_MOBILE_HASH = process.env.ADMIN_MOBILE_HASH || '71bf783de14ef19083f926c7fd0587421d120c307dea914170c5c1912d99b8df';
const ADMIN_PIN_HASH = process.env.ADMIN_PIN_HASH || '1010426e3456b8de370318640273c1ea56199095ca075377cd6e7393a1bf2760';

function getSupabase() {
  if (supabase !== undefined) return supabase;
  supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
  return supabase;
}

function hashPii(value) {
  return createHash('sha256').update(`${PII_HASH_SALT}${String(value || '').trim().toUpperCase()}`).digest('hex');
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 ? `+91 ******${digits.slice(-4)}` : 'Phone hidden';
}

function maskTax(value, label) {
  const normalized = String(value || '').replace(/\s/g, '').toUpperCase();
  return normalized ? `${label}: ${'*'.repeat(Math.max(0, normalized.length - 3))}${normalized.slice(-3)}` : `${label}: hidden`;
}

function maskPan(value) {
  const normalized = String(value || '').replace(/\s/g, '').toUpperCase();
  return normalized ? `PAN: ******${normalized.slice(-4)}` : 'PAN: hidden';
}

function publicLocation(item) {
  return item.block && item.district ? `${item.block}, ${item.district}` : String(item.location || 'District hidden');
}

function safeListing(item) {
  return {
    id: item.id, market: item.market, crop: item.crop, category: item.category,
    quantity: item.quantity, unit: item.unit, location: publicLocation(item),
    state: item.state, district: item.district, radiusKm: item.radiusKm,
    price: item.price, msp: item.msp, quality: item.quality, status: item.status,
    farmer: 'Verified farmer', farmerId: item.farmerId || null, certified: Boolean(item.certified),
    postedAt: item.postedAt, image: item.image || null
  };
}

function safeBid(item) {
  return {
    id: item.id, listingId: item.listingId, buyer: 'Verified buyer',
    buyerType: item.buyerType, amount: item.amount, quantity: item.quantity,
    status: item.status, verified: Boolean(item.verified), placedAt: item.placedAt
  };
}

function safeBuyer(item) {
  return {
    id: item.id, businessName: 'Verified buyer', status: item.status,
    gstin: item.gstinMasked || maskTax(item.gstin, 'GST'),
    pan: item.panMasked || maskPan(item.pan),
    verifiedAt: item.verifiedAt
  };
}

function safeOrder(item) {
  return {
    id: item.id, orderNumber: item.orderNumber, crop: item.crop,
    quantity: item.quantity, amount: item.amount, status: item.status,
    updatedAt: item.updatedAt, createdAt: item.createdAt
  };
}

function safeNotification(item) {
  return {
    id: item.id, type: item.type, title: item.title,
    detail: item.type === 'order' ? 'Your order status has changed.' : item.type === 'bid' ? 'A verified marketplace event needs your attention.' : 'Buyer verification was completed.',
    read: Boolean(item.read), createdAt: item.createdAt
  };
}

function safeApproval(item) {
  return { ...item, name: 'Verified user', location: 'Location hidden until finalized' };
}

function safeEventPayload(event, payload) {
  if (event === 'listing.created') return safeListing(payload);
  if (event === 'buyer.verified') return safeBuyer(payload);
  if (event === 'bid.created') return { bid: safeBid(payload.bid), notification: safeNotification(payload.notification) };
  if (event === 'bid.accepted') return { bid: safeBid(payload.bid), listing: safeListing(payload.listing), order: safeOrder(payload.order), notification: safeNotification(payload.notification) };
  if (event === 'order.updated') return { order: safeOrder(payload.order), notification: safeNotification(payload.notification) };
  return { event: 'updated' };
}

function migrateDb(data) {
  let changed = false;
  data.buyers = (data.buyers || []).map(item => {
    if (item.gstin) { item.gstinHash = hashPii(item.gstin); item.gstinMasked = maskTax(item.gstin, 'GST'); delete item.gstin; changed = true; }
    if (item.pan) { item.panHash = hashPii(item.pan); item.panMasked = maskPan(item.pan); delete item.pan; changed = true; }
    if (item.businessName) { item.displayName = 'Verified buyer'; delete item.businessName; changed = true; }
    return item;
  });
  data.listings.forEach(item => {
    if (item.farmer) { item.farmerId ||= 'farmer-verified'; delete item.farmer; changed = true; }
    if (item.exactAddress) { delete item.exactAddress; changed = true; }
  });
  data.bids.forEach(item => {
    if (item.buyer) { item.buyerDisplay = 'Verified buyer'; delete item.buyer; changed = true; }
  });
  return changed;
}

async function loadDb() {
  if (!db) {
    const localDb = JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
    const client = getSupabase();
    if (client) {
      const { data, error } = await client.from('app_state').select('payload').eq('id', 'smart-kisan-bharat').maybeSingle();
      db = !error && data?.payload ? data.payload : localDb;
    } else {
      db = localDb;
    }
    db.buyers ||= [];
    db.orders ||= [];
    db.notifications ||= [];
    db.government ||= { kpis: {}, alerts: [], complianceByDistrict: [] };
    if (migrateDb(db)) await saveDb();
  }
  return db;
}

async function saveDb() {
  const snapshot = JSON.stringify(db, null, 2);
  saveQueue = saveQueue.then(async () => {
    if (!IS_SERVERLESS) {
      const tempFile = `${DB_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tempFile, snapshot, 'utf8');
      await fs.rename(tempFile, DB_FILE);
    }
    const client = getSupabase();
    if (client) {
      const { error } = await client.from('app_state').upsert({
        id: 'smart-kisan-bharat',
        payload: JSON.parse(snapshot),
        updated_at: new Date().toISOString()
      });
      if (error) console.warn(`Supabase sync skipped: ${error.message}`);
    }
  });
  return saveQueue.catch(error => {
    saveQueue = Promise.resolve();
    throw error;
  });
}

function broadcast(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(safeEventPayload(event, payload))}\n\n`;
  clients.forEach(client => {
    try { client.write(message); } catch { clients.delete(client); }
  });
}

async function optionalSupabase() {
  return getSupabase();
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function addNotification(data, notification) {
  const item = { id: id('notification'), read: false, createdAt: new Date().toISOString(), ...notification };
  data.notifications.unshift(item);
  return item;
}

function normalizeRadius(value) {
  if (value === undefined || value === '' || value === 'all' || value === 'panindia') return 9999;
  const parsed = Number(value);
  return [10, 25, 50].includes(parsed) ? parsed : 9999;
}

function normalizeTaxId(value) {
  return String(value || '').trim().toUpperCase().replace(/\s/g, '');
}

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/attached_assets', express.static(path.resolve(__dirname, '../attached_assets')));

app.get('/api/health', async (_req, res) => {
  const supabase = await optionalSupabase();
  const data = await loadDb();
  res.json({
    ok: true,
    service: 'smart-kisan-bharat-api',
    port: PORT,
    bind: '0.0.0.0',
    realtime: true,
    supabaseConfigured: Boolean(supabase),
    persistence: supabase ? 'supabase-app-state' : IS_SERVERLESS ? 'ephemeral-serverless-until-Supabase-configured' : 'atomic-json',
    records: { listings: data.listings.length, bids: data.bids.length, orders: data.orders.length },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dashboard', async (_req, res) => {
  const data = await loadDb();
  const activeBids = data.bids.filter(b => b.status === 'active').length;
  const value = data.bids.filter(b => b.status === 'active').reduce((sum, bid) => sum + bid.amount * bid.quantity, 0);
  res.json({
    metrics: { farmers: 12847, buyers: 1842, activeBids, transactions: 3421, transactionValue: 284600000, marketListings: data.listings.length },
    highlights: [
      { label: 'Live listings', value: data.listings.filter(l => l.status === 'live').length, tone: 'green' },
      { label: 'Verified today', value: 86, tone: 'gold' },
      { label: 'Bidding value', value: `₹${(value / 100000).toFixed(1)}L`, tone: 'blue' }
    ],
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/listings', async (req, res) => {
  const data = await loadDb();
  const market = ['crops', 'plants'].includes(req.query.market) ? req.query.market : 'crops';
  const state = req.query.state || 'all';
  const district = req.query.district || 'all';
  const radius = normalizeRadius(req.query.radius);
  const q = String(req.query.q || '').toLowerCase();
  const listings = data.listings.filter(item => {
    const matchesMarket = item.market === market;
    const matchesState = state === 'all' || item.state === state;
    const matchesDistrict = district === 'all' || item.district === district;
    const matchesRadius = item.radiusKm <= radius;
    const matchesStatus = item.status === 'live';
    const matchesSearch = !q || `${item.crop} ${item.category} ${publicLocation(item)}`.toLowerCase().includes(q);
    return matchesMarket && matchesState && matchesDistrict && matchesRadius && matchesStatus && matchesSearch;
  });
  const marketListings = data.listings.filter(item => item.market === market && item.status === 'live');
  const states = [...new Set(marketListings.map(item => item.state))].sort().map(name => ({
    name,
    districts: [...new Set(marketListings.filter(item => item.state === name).map(item => item.district))].sort()
  }));
  res.json({ listings: listings.map(safeListing), total: listings.length, filters: { market, state, district, radius: radius === 9999 ? 'panindia' : radius, q }, options: { states } });
});

app.get('/api/marketplace/options', async (req, res) => {
  const data = await loadDb();
  const market = ['crops', 'plants'].includes(req.query.market) ? req.query.market : 'crops';
  const rows = data.listings.filter(item => item.market === market && item.status === 'live');
  const states = [...new Set(rows.map(item => item.state))].sort().map(name => ({
    name,
    districts: [...new Set(rows.filter(item => item.state === name).map(item => item.district))].sort()
  }));
  res.json({ market, states, radii: [10, 25, 50] });
});

app.get('/api/bids', async (req, res) => {
  const data = await loadDb();
  const bids = req.query.listingId ? data.bids.filter(b => b.listingId === req.query.listingId) : data.bids;
  res.json({ bids: bids.sort((a, b) => b.amount - a.amount).map(safeBid) });
});

app.get('/api/buyers/:buyerId', async (req, res) => {
  const data = await loadDb();
  const buyer = data.buyers.find(item => item.id === req.params.buyerId);
  if (!buyer) return res.status(404).json({ error: 'Buyer profile not found' });
  res.json({ buyer: safeBuyer(buyer) });
});

app.post('/api/buyers/verify', async (req, res) => {
  const data = await loadDb();
  const businessName = String(req.body?.businessName || '').trim();
  const gstin = normalizeTaxId(req.body?.gstin);
  const pan = normalizeTaxId(req.body?.pan);
  const gstValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin);
  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  if (!businessName || !gstValid || !panValid) {
    return res.status(422).json({ error: 'Enter a valid business name, GSTIN and PAN to continue verification.', fields: { gstin: gstValid, pan: panValid, businessName: Boolean(businessName) } });
  }
  const gstHash = hashPii(gstin);
  const panHash = hashPii(pan);
  let buyer = data.buyers.find(item => item.gstinHash === gstHash || item.panHash === panHash);
  if (buyer && buyer.status === 'verified') return res.json({ buyer: safeBuyer(buyer), message: 'Buyer identity already verified.' });
  buyer = buyer || { id: `BH-${Math.floor(1000 + Math.random() * 8999)}` };
  Object.assign(buyer, { displayName: 'Verified buyer', gstinHash: gstHash, gstinMasked: maskTax(gstin, 'GST'), panHash, panMasked: maskPan(pan), status: 'verified', verifiedAt: new Date().toISOString() });
  const existingIndex = data.buyers.findIndex(item => item.id === buyer.id);
  if (existingIndex >= 0) data.buyers[existingIndex] = buyer; else data.buyers.push(buyer);
  await saveDb();
  addNotification(data, { audience: 'admin', type: 'verification', title: 'Buyer verification completed', detail: 'A buyer is ready to bid.', buyerId: buyer.id });
  await saveDb();
  broadcast('buyer.verified', buyer);
  res.json({ buyer: safeBuyer(buyer), message: 'GST and PAN verified. You can now place live bids.' });
});

app.get('/api/notifications', async (req, res) => {
  const data = await loadDb();
  const audience = String(req.query.audience || '');
  const notifications = data.notifications.filter(item => !audience || item.audience === audience || item.buyerId === audience || item.farmerId === audience).slice(0, 30);
  res.json({ notifications: notifications.map(safeNotification), unread: notifications.filter(item => !item.read).length });
});

app.post('/api/notifications/read', async (req, res) => {
  const data = await loadDb();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  data.notifications.forEach(item => { if (!ids.length || ids.includes(item.id)) item.read = true; });
  await saveDb();
  res.json({ ok: true });
});

app.get('/api/orders', async (req, res) => {
  const data = await loadDb();
  const orders = data.orders.filter(order => !req.query.buyerId || order.buyerId === req.query.buyerId);
  res.json({ orders: orders.map(safeOrder) });
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const data = await loadDb();
  const order = data.orders.find(item => item.id === req.params.id);
  const allowed = ['payment_pending', 'pickup_scheduled', 'in_transit', 'delivered', 'disputed'];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!allowed.includes(req.body?.status)) return res.status(422).json({ error: 'Unsupported order status' });
  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  const notification = addNotification(data, { audience: order.buyerId, buyerId: order.buyerId, type: 'order', title: `Order ${order.status.replace('_', ' ')}`, detail: `${order.orderNumber} · ${order.crop}` });
  await saveDb();
  broadcast('order.updated', { order, notification });
  res.json({ order: safeOrder(order) });
});

app.get('/api/government', async (req, res) => {
  const data = await loadDb();
  res.json({
    tier: req.query.tier || 'State',
    kpis: data.government.kpis,
    alerts: data.government.alerts,
    complianceByDistrict: data.government.complianceByDistrict,
    updatedAt: new Date().toISOString()
  });
});

app.post('/api/listings', async (req, res) => {
  const data = await loadDb();
  const body = req.body || {};
  if (!body.crop || !body.quantity || !body.location) return res.status(400).json({ error: 'crop, quantity and location are required' });
  // Never promote the free-text location field to a public address. Only
  // structured block/district fields are allowed across the privacy boundary.
  const publicBlock = String(body.block || 'Block protected').trim();
  const publicDistrict = String(body.district || 'District protected').trim();
  const listing = {
    id: `listing-${Date.now()}`,
    market: body.market === 'plants' ? 'plants' : 'crops',
    crop: String(body.crop),
    category: String(body.category || 'General'),
    quantity: Number(body.quantity),
    unit: String(body.unit || 'quintals'),
    location: `${publicBlock}, ${publicDistrict}`,
    block: publicBlock,
    state: String(body.state || 'Haryana'),
    district: String(body.district || 'Fatehabad'),
    radiusKm: 0,
    price: Number(body.price || 0),
    msp: Number(body.msp || 0),
    quality: null,
    status: 'draft',
    farmerId: String(body.farmerId || 'farmer-new'),
    certified: false,
    postedAt: new Date().toISOString(),
    image: null
  };
  data.listings.unshift(listing);
  await saveDb();
  broadcast('listing.created', listing);
  res.status(201).json({ listing: safeListing(listing) });
});

app.post('/api/bids', async (req, res) => {
  const data = await loadDb();
  const body = req.body || {};
  if (!body.listingId || !body.amount || !body.quantity) return res.status(400).json({ error: 'listingId, amount and quantity are required' });
  const listing = data.listings.find(item => item.id === body.listingId && item.status === 'live');
  if (!listing) return res.status(404).json({ error: 'Live listing not found' });
  const buyer = data.buyers.find(item => item.id === body.buyerId);
  if (!buyer || buyer.status !== 'verified') return res.status(403).json({ error: 'Complete GST/PAN verification before bidding.' });
  const amount = Number(body.amount);
  const quantity = Number(body.quantity);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity <= 0 || quantity > listing.quantity) {
    return res.status(422).json({ error: 'Bid price and quantity must be valid and within the listing quantity.' });
  }
  const bid = {
    id: id('bid'),
    listingId: body.listingId,
    buyerId: buyer.id,
    buyerDisplay: 'Verified buyer',
    buyerType: String(body.buyerType || 'Corporate'),
    amount,
    quantity,
    status: 'active',
    verified: true,
    placedAt: new Date().toISOString()
  };
  data.bids.push(bid);
  const notification = addNotification(data, { audience: 'farmer', farmerId: listing.farmerId, type: 'bid', title: 'New live bid received', detail: `A verified buyer offered for ${listing.crop}`, listingId: listing.id });
  await saveDb();
  broadcast('bid.created', { bid, notification });
  res.status(201).json({ bid: safeBid(bid), notification: safeNotification(notification) });
});

app.post('/api/bids/:id/accept', async (req, res) => {
  const data = await loadDb();
  const bid = data.bids.find(item => item.id === req.params.id);
  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  if (bid.status !== 'active') return res.status(409).json({ error: 'This bid is no longer active.' });
  data.bids.forEach(item => { if (item.listingId === bid.listingId) item.status = item.id === bid.id ? 'accepted' : 'closed'; });
  const listing = data.listings.find(item => item.id === bid.listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (!bid.buyerId) return res.status(422).json({ error: 'Bid has no verified buyer profile.' });
  listing.status = 'contracted';
  const order = {
    id: id('order'),
    orderNumber: `SKB-${new Date().getFullYear()}-${String(data.orders.length + 1).padStart(4, '0')}`,
    listingId: bid.listingId,
    bidId: bid.id,
    buyerId: bid.buyerId,
    crop: listing?.crop || 'Marketplace order',
    quantity: bid.quantity,
    amount: bid.amount * bid.quantity,
    status: 'payment_pending',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  data.orders.unshift(order);
  const notification = addNotification(data, { audience: bid.buyerId, buyerId: bid.buyerId, type: 'bid', title: 'Your bid was accepted', detail: `${order.orderNumber} · Payment and pickup are ready`, orderId: order.id });
  await saveDb();
  broadcast('bid.accepted', { bid, listing, order, notification });
  res.json({ bid: safeBid(bid), listing: safeListing(listing), order: safeOrder(order), message: 'Green Tick confirmation recorded' });
});

app.post('/api/admin/login', (req, res) => {
  const { mobile, pin } = req.body || {};
  if (hashPii(mobile) === ADMIN_MOBILE_HASH && hashPii(pin) === ADMIN_PIN_HASH) {
    const session = `admin-${randomUUID()}`;
    adminSessions.add(session);
    return res.json({ ok: true, role: 'admin', session });
  }
  res.status(401).json({ ok: false, error: 'Invalid mobile or PIN' });
});

function requireAdmin(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!adminSessions.has(token)) return res.status(401).json({ error: 'Admin session required' });
  next();
}

app.get('/api/admin/metrics', requireAdmin, async (_req, res) => {
  const data = await loadDb();
  res.json({
    metrics: { activeFarmers: 12847, verifiedBuyers: 1842, activeBids: data.bids.filter(b => b.status === 'active').length, totalValue: 284600000 },
    approvals: data.approvals.map(safeApproval),
    disputes: data.disputes.map(item => ({ ...item, parties: 'Protected participants' }))
  });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

if (!IS_SERVERLESS && process.env.SKB_LEGACY_STANDALONE === 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Kisan Bharat running at http://0.0.0.0:${PORT}`);
  });
}

export default app;
export { app };