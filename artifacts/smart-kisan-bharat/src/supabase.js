import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets to enable sign-in and live data.'
  : '';

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });

export function requireSupabase() {
  if (!supabase) throw new Error(supabaseConfigError);
  return supabase;
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message || 'Supabase request failed.');
  return data;
}

export async function loadProfile(userId) {
  const client = requireSupabase();
  const profile = unwrap(await client
    .from('profiles')
    .select('id, role, display_name, business_name, created_at')
    .eq('id', userId)
    .maybeSingle());
  if (!profile) throw new Error('This account has no role profile. Apply the supplied Supabase schema, then sign in again.');
  return profile;
}

export async function signInForRole({ role, email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  try {
    const profile = await loadProfile(data.user.id);
    if (profile.role !== role) {
      await client.auth.signOut();
      throw new Error(`This account is registered as ${profile.role}. Choose that role and sign in again.`);
    }
    return { user: data.user, profile };
  } catch (error) {
    await client.auth.signOut();
    throw error;
  }
}

export async function signUpForRole({ role, email, password, displayName }) {
  if (!['farmer', 'buyer'].includes(role)) {
    throw new Error('Government and Admin accounts must be provisioned by an administrator.');
  }
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || '', role },
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) return { needsEmailConfirmation: true };
  const profile = await loadProfile(data.user.id);
  return { user: data.user, profile };
}

export async function getMarketplaceStats() {
  const client = requireSupabase();
  return unwrap(await client
    .from('marketplace_metrics')
    .select('farmers, buyers, market_listings, active_bids, transaction_value')
    .single());
}

export async function getMarketplaceOptions(market) {
  const client = requireSupabase();
  const rows = unwrap(await client
    .from('listings')
    .select('state, district')
    .eq('market', market)
    .eq('status', 'live'));
  const districtsByState = new Map();
  for (const row of rows || []) {
    if (!row.state) continue;
    const districts = districtsByState.get(row.state) || new Set();
    if (row.district) districts.add(row.district);
    districtsByState.set(row.state, districts);
  }
  return {
    states: [...districtsByState.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, districts]) => ({ name, districts: [...districts].sort() })),
  };
}

export async function getListings({ market, state, district, query }) {
  const client = requireSupabase();
  let request = client
    .from('listings')
    .select('id, crop, category, market, quantity, unit, location, state, district, radius_km, price, msp, quality, status, farmer_id, certified, posted_at, image_url')
    .eq('market', market)
    .eq('status', 'live')
    .order('posted_at', { ascending: false });
  if (state && state !== 'all') request = request.eq('state', state);
  if (district && district !== 'all') request = request.eq('district', district);
  const term = query?.trim().replace(/[,%()]/g, ' ');
  if (term) request = request.or(`crop.ilike.%${term}%,location.ilike.%${term}%,district.ilike.%${term}%`);
  return unwrap(await request);
}

export async function getBidsForListing(listingId) {
  const client = requireSupabase();
  const rows = unwrap(await client
    .from('bids')
    .select('id, listing_id, buyer_id, buyer_display, buyer_type, amount, quantity, status, created_at')
    .eq('listing_id', listingId)
    .order('amount', { ascending: false }));
  return (rows || []).map((bid) => ({
    ...bid,
    buyer: bid.buyer_display,
    buyerType: bid.buyer_type,
  }));
}

export async function getBidsForFarmer(farmerId) {
  const client = requireSupabase();
  const rows = unwrap(await client
    .from('bids')
    .select('id, listing_id, buyer_display, buyer_type, amount, quantity, status, created_at, listings!inner(crop, unit, farmer_id)')
    .eq('listings.farmer_id', farmerId)
    .order('amount', { ascending: false })
    .limit(12));
  return (rows || []).map((bid) => ({
    ...bid,
    buyer: bid.buyer_display,
    buyerType: bid.buyer_type,
    listing: Array.isArray(bid.listings) ? bid.listings[0] : bid.listings,
  }));
}

export async function createListing(input) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Sign in as a farmer before listing a crop.');
  return unwrap(await client
    .from('listings')
    .insert({
      farmer_id: user.id,
      market: input.market,
      crop: input.crop,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      location: input.location,
      price: input.price,
      status: 'pending',
    })
    .select('id, crop, status')
    .single());
}

export async function createBid({ listingId, amount, quantity }) {
  const client = requireSupabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Sign in as a buyer before placing a bid.');
  return unwrap(await client
    .from('bids')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      amount,
      quantity,
      status: 'active',
    })
    .select('id, listing_id, amount, quantity, status, created_at')
    .single());
}

export async function acceptBid(bidId) {
  const client = requireSupabase();
  return unwrap(await client.rpc('accept_marketplace_bid', { p_bid_id: bidId }));
}

export async function getGovernmentReport(tier = 'State') {
  const client = requireSupabase();
  const [listings, stats] = await Promise.all([
    client
      .from('listings')
      .select('id, state, district, price, msp')
      .eq('status', 'live'),
    getMarketplaceStats(),
  ]);
  const rows = unwrap(listings) || [];
  const groups = new Map();
  for (const listing of rows) {
    const name = tier === 'National'
      ? 'India'
      : tier === 'State'
        ? listing.state || 'Unspecified'
        : listing.district || listing.state || 'Unspecified';
    const group = groups.get(name) || { total: 0, compliant: 0, belowMsp: 0 };
    if (listing.msp != null && Number(listing.msp) > 0) {
      group.total += 1;
      if (Number(listing.price) >= Number(listing.msp)) group.compliant += 1;
      else group.belowMsp += 1;
    }
    groups.set(name, group);
  }
  const complianceByDistrict = [...groups.entries()]
    .map(([name, group]) => ({
      name,
      value: group.total ? Math.round((group.compliant / group.total) * 100) : 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const totalTracked = [...groups.values()].reduce((sum, group) => sum + group.total, 0);
  const compliant = [...groups.values()].reduce((sum, group) => sum + group.compliant, 0);
  const belowMsp = rows.filter((listing) => listing.msp != null && Number(listing.price) < Number(listing.msp));
  return {
    updatedAt: new Date().toISOString(),
    kpis: {
      compliance: totalTracked ? `${Math.round((compliant / totalTracked) * 100)}%` : '—',
      verifiedFarmers: stats.farmers,
      mandiTracked: groups.size,
      openAlerts: belowMsp.length,
    },
    complianceByDistrict,
    alerts: belowMsp.map((listing) => ({
      type: 'MSP',
      severity: 'High',
      title: `${listing.crop || 'Listing'} below MSP`,
      detail: `${listing.district || listing.state || 'Location not set'} · listed price is below its recorded MSP.`,
    })),
  };
}

export async function getAdminOverview() {
  const client = requireSupabase();
  const [stats, pendingListings, recentBids] = await Promise.all([
    getMarketplaceStats(),
    client
      .from('listings')
      .select('id, crop, category, quantity, unit, location, price, posted_at')
      .eq('status', 'pending')
      .order('posted_at', { ascending: true }),
    client
      .from('bids')
      .select('id, listing_id, buyer_display, amount, quantity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  return {
    stats,
    pendingListings: unwrap(pendingListings) || [],
    recentBids: unwrap(recentBids) || [],
  };
}

export async function approveListing(listingId) {
  const client = requireSupabase();
  return unwrap(await client
    .from('listings')
    .update({ status: 'live' })
    .eq('id', listingId)
    .eq('status', 'pending')
    .select('id')
    .single());
}