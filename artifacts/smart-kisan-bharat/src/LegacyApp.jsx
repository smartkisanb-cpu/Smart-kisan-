import React, { useEffect, useMemo, useState } from 'react';
import './legacy.css';

const languages = [
  ['en', 'English'], ['hi', 'हिन्दी'], ['pa', 'ਪੰਜਾਬੀ'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'],
  ['te', 'తెలుగు'], ['ta', 'தமிழ்'], ['bn', 'বাংলা'], ['kn', 'ಕನ್ನಡ'], ['ml', 'മലയാളം']
];

const translations = {
  en: { home: 'Overview', farmer: 'Farmer / Seller', buyer: 'Buyer / Corporate', government: 'Government', admin: 'Admin', live: 'Live marketplace', trusted: 'Trust-led farmer-to-buyer commerce', hero: 'Better prices for growers. Better supply for India.', heroSub: 'One verified network for crops, nursery plants, transparent bids and dependable pickup — from Bhuna to Bharat.', explore: 'Explore marketplace', listCrop: 'List a crop', verified: 'Verified network', listings: 'Live listings', activeBids: 'Active bids', value: 'Transaction value', portal: 'Choose your workspace', farmerDesc: 'List harvests in seconds, hear local bids and accept with a Green Tick.', buyerDesc: 'Source verified crops and nursery plants with lab-backed quality.', govtDesc: 'Monitor MSP compliance, farmer verification and mandi economics.', adminDesc: 'Operate approvals, disputes and platform health from one control room.', marketplace: 'Pan-India marketplace', crops: 'Agricultural crops', plants: 'Nursery plants', radius: 'Radius', allStates: 'All states', allDistricts: 'All districts', search: 'Search crops, plants or locations', placeBid: 'Place bid', viewBids: 'View bids', quality: 'AI quality score', accept: 'Accept with Green Tick', draftSaved: 'Draft saved offline', liveStream: 'Live bid stream', govtTitle: 'Public agriculture intelligence', adminTitle: 'Platform operations', login: 'Secure admin login', mobile: 'Mobile number', pin: 'PIN', signIn: 'Sign in', logout: 'Sign out', approvalQueue: 'Approval queue', disputes: 'Dispute resolution', tier: 'Dashboard tier', block: 'Block', district: 'District', state: 'State', national: 'National', compliance: 'MSP compliance', verifiedFarmers: 'Verified farmers', mandi: 'Mandi tax tracked', activity: 'Activity feed', close: 'Close', submit: 'Submit listing', quantity: 'Quantity', location: 'Location', cropName: 'Crop / plant name', price: 'Starting price', category: 'Category' },
  hi: { home: 'अवलोकन', farmer: 'किसान / विक्रेता', buyer: 'खरीदार / कॉर्पोरेट', government: 'सरकार', admin: 'एडमिन', live: 'लाइव मार्केटप्लेस', trusted: 'विश्वसनीय किसान-से-खरीदार व्यापार', hero: 'किसानों के लिए बेहतर भाव। भारत के लिए बेहतर आपूर्ति।', heroSub: 'फसलों, नर्सरी पौधों, पारदर्शी बोली और भरोसेमंद पिकअप का एक सत्यापित नेटवर्क — भुना से भारत तक।', explore: 'मार्केटप्लेस देखें', listCrop: 'फसल सूचीबद्ध करें', verified: 'सत्यापित नेटवर्क', listings: 'लाइव लिस्टिंग', activeBids: 'सक्रिय बोलियां', value: 'लेनदेन मूल्य', portal: 'अपना कार्यक्षेत्र चुनें', farmerDesc: 'कुछ ही सेकंड में उपज सूचीबद्ध करें, स्थानीय बोलियां सुनें और ग्रीन टिक से स्वीकार करें।', buyerDesc: 'लैब-आधारित गुणवत्ता के साथ सत्यापित फसल और नर्सरी पौधे खरीदें।', govtDesc: 'एमएसपी अनुपालन, किसान सत्यापन और मंडी अर्थव्यवस्था पर नज़र रखें।', adminDesc: 'एक नियंत्रण कक्ष से अनुमोदन, विवाद और प्लेटफॉर्म स्वास्थ्य संभालें।', marketplace: 'पैन-इंडिया मार्केटप्लेस', crops: 'कृषि फसलें', plants: 'नर्सरी पौधे', radius: 'दायरा', allStates: 'सभी राज्य', allDistricts: 'सभी जिले', search: 'फसल, पौधे या स्थान खोजें', placeBid: 'बोली लगाएं', viewBids: 'बोलियां देखें', quality: 'एआई गुणवत्ता स्कोर', accept: 'ग्रीन टिक से स्वीकार करें', draftSaved: 'ड्राफ्ट ऑफलाइन सेव', liveStream: 'लाइव बोली स्ट्रीम', govtTitle: 'सार्वजनिक कृषि इंटेलिजेंस', adminTitle: 'प्लेटफॉर्म संचालन', login: 'सुरक्षित एडमिन लॉगिन', mobile: 'मोबाइल नंबर', pin: 'पिन', signIn: 'साइन इन', logout: 'साइन आउट', approvalQueue: 'अनुमोदन कतार', disputes: 'विवाद समाधान', tier: 'डैशबोर्ड स्तर', block: 'ब्लॉक', district: 'जिला', state: 'राज्य', national: 'राष्ट्रीय', compliance: 'एमएसपी अनुपालन', verifiedFarmers: 'सत्यापित किसान', mandi: 'मंडी टैक्स ट्रैक', activity: 'गतिविधि फ़ीड', close: 'बंद करें', submit: 'लिस्टिंग भेजें', quantity: 'मात्रा', location: 'स्थान', cropName: 'फसल / पौधे का नाम', price: 'शुरुआती भाव', category: 'श्रेणी' }
};

const fallbackCopy = translations.en;
const t = (lang, key) => (translations[lang]?.[key] || fallbackCopy[key] || key);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
const number = value => new Intl.NumberFormat('en-IN').format(value || 0);

async function api(path, options = {}) {
  const token = sessionStorage.getItem('skb-admin-session');
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }, ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function Icon({ name, size = 20 }) {
  const paths = {
    leaf: <><path d="M20 4C12 4 5 8 4 20c12-1 16-8 16-16Z"/><path d="M4 20c4-5 8-8 13-11"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 3.7 5.8 3.7 9s-1.2 6.2-3.7 9c-2.5-2.8-3.7-5.8-3.7-9S9.5 5.8 12 3Z"/></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m8 12 2.5 2.5L16 9"/></>,
    sprout: <><path d="M12 21V9"/><path d="M12 12C7 12 4 9 4 4c5 0 8 3 8 8ZM12 9c0-4 3-7 8-7 0 5-3 8-8 8"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></>,
    user: <><circle cx="12" cy="8" r="3"/><path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 16-5-5L5 20"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    external: <><path d="M14 5h5v5M19 5l-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.leaf}</svg>;
}

function Brand() {
  return <div className="brand" aria-label="Smart Kisan Bharat">
    <div className="brand-mark"><Icon name="sprout" size={23} /></div>
    <div><strong>Smart Kisan</strong><span>भारत · Smart Star Solutions</span></div>
  </div>;
}

function Header({ lang, setLang, page, setPage, online }) {
  const nav = [['home', 'Overview'], ['farmer', 'Farmer / Seller'], ['buyer', 'Buyer / Corporate'], ['government', 'Government'], ['admin', 'Admin']];
  return <header className="topbar">
    <Brand />
    <nav className="desktop-nav">{nav.map(([id, label]) => <button key={id} className={page === id ? 'nav-link active' : 'nav-link'} onClick={() => setPage(id)}>{t(lang, id)}</button>)}</nav>
    <div className="header-actions">
      <span className={online ? 'live-status' : 'live-status offline'}><i /> {online ? 'Live' : 'Offline'}</span>
      <label className="language-select"><Icon name="globe" size={16} /><select value={lang} onChange={e => setLang(e.target.value)} aria-label="Language"><>{languages.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</></select></label>
      <button className="mobile-menu"><Icon name="menu" /></button>
    </div>
  </header>;
}

function StatCard({ label, value, note, tone = 'green' }) {
  return <div className={`stat-card ${tone}`}><span className="stat-label">{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function PortalCard({ icon, title, desc, tone, onClick, action }) {
  return <button className={`portal-card ${tone}`} onClick={onClick}><div className="portal-top"><span className="portal-icon"><Icon name={icon} size={24} /></span><span className="portal-arrow"><Icon name="arrow" size={17} /></span></div><h3>{title}</h3><p>{desc}</p><span className="portal-action">{action} <Icon name="arrow" size={14} /></span></button>;
}

function Overview({ lang, setPage, dashboard }) {
  const metrics = dashboard?.metrics || {};
  return <main className="page overview-page">
    <section className="hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> {t(lang, 'trusted')}</div>
        <h1>{t(lang, 'hero')}<span>.</span></h1>
        <p>{t(lang, 'heroSub')}</p>
        <div className="hero-actions"><button className="button primary" onClick={() => setPage('buyer')}>{t(lang, 'explore')} <Icon name="arrow" size={17} /></button><button className="button ghost" onClick={() => setPage('farmer')}><Icon name="plus" size={17} /> {t(lang, 'listCrop')}</button></div>
        <div className="trust-row"><span><Icon name="shield" size={16} /> AgStack-ready</span><span><Icon name="check" size={16} /> OTP verified</span><span><Icon name="bolt" size={16} /> Realtime bids</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-image-wrap"><img src="/attached_assets/1790489786209_1790496759474.png" alt="Farmer-to-buyer marketplace workflow" /><div className="image-caption"><span className="pulse" /> <b>LIVE NETWORK</b><small>2,486 verified participants online</small></div></div>
        <div className="floating-ticket"><span className="ticket-check"><Icon name="check" size={15} /></span><div><b>Green Tick accepted</b><small>Premium wheat · ₹2,410/qtl</small></div></div>
      </div>
    </section>
    <section className="stats-row">
      <StatCard label={t(lang, 'verified')} value={number(metrics.farmers || 0)} note="+8.4% this month" tone="green" />
      <StatCard label={t(lang, 'listings')} value={number(metrics.marketListings || 5)} note="Across 18 states" tone="gold" />
      <StatCard label={t(lang, 'activeBids')} value={number(metrics.activeBids || 4)} note="Live right now" tone="blue" />
      <StatCard label={t(lang, 'value')} value={money(metrics.transactionValue || 0)} note="₹4.8 Cr this week" tone="slate" />
    </section>
    <section className="section-block portals-section"><div className="section-heading"><div><span className="section-kicker">SMART WORKSPACES</span><h2>{t(lang, 'portal')}</h2></div><span className="section-meta">One trusted network · Four perspectives</span></div>
      <div className="portal-grid">
        <PortalCard icon="sprout" tone="farmer-card" title={t(lang, 'farmer')} desc={t(lang, 'farmerDesc')} action={t(lang, 'listCrop')} onClick={() => setPage('farmer')} />
        <PortalCard icon="chart" tone="buyer-card" title={t(lang, 'buyer')} desc={t(lang, 'buyerDesc')} action={t(lang, 'explore')} onClick={() => setPage('buyer')} />
        <PortalCard icon="shield" tone="govt-card" title={t(lang, 'government')} desc={t(lang, 'govtDesc')} action={t(lang, 'govtTitle')} onClick={() => setPage('government')} />
        <PortalCard icon="lock" tone="admin-card" title={t(lang, 'admin')} desc={t(lang, 'adminDesc')} action={t(lang, 'adminTitle')} onClick={() => setPage('admin')} />
      </div>
    </section>
    <section className="trust-strip"><div className="trust-icon"><Icon name="shield" size={22} /></div><div><b>Built for Bharat, backed by proof.</b><span>Lab certificate viewer · AI quality score · e-NAM aligned rates · UPI-ready fulfillment</span></div><button onClick={() => setPage('government')}>How it works <Icon name="arrow" size={15} /></button></section>
  </main>;
}

function PortalHeader({ eyebrow, title, subtitle, icon }) {
  return <div className="portal-header"><div className="page-icon"><Icon name={icon} size={25} /></div><div><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div></div>;
}

function FarmerPortal({ lang, refresh }) {
  const [form, setForm] = useState({ crop: '', quantity: '', location: 'Bhuna, Fatehabad', price: '', category: 'Cereals' });
  const [draft, setDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bids, setBids] = useState([]);
  const [recording, setRecording] = useState(false);
  useEffect(() => { const saved = localStorage.getItem('skb-draft'); if (saved) { setForm(JSON.parse(saved)); setDraft(true); } api('/bids?listingId=crop-001').then(data => setBids(data.bids)).catch(() => {}); }, []);
  const update = (key, value) => { const next = { ...form, [key]: value }; setForm(next); localStorage.setItem('skb-draft', JSON.stringify(next)); setDraft(true); };
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Voice input is not supported in this browser.');
    const recognition = new SpeechRecognition(); recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'; recognition.onstart = () => setRecording(true); recognition.onend = () => setRecording(false); recognition.onresult = e => update('crop', e.results[0][0].transcript); recognition.start();
  };
  const submit = async e => { e.preventDefault(); try { await api('/listings', { method: 'POST', body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price), farmerId: 'farmer-new' }) }); setSubmitted(true); localStorage.removeItem('skb-draft'); setDraft(false); refresh(); } catch (error) { alert(error.message); } };
  const accept = async id => { await api(`/bids/${id}/accept`, { method: 'POST' }); setBids(bids.map(b => ({ ...b, status: b.id === id ? 'accepted' : 'closed' }))); refresh(); };
  return <main className="page portal-page"><PortalHeader eyebrow="FARMER / SELLER PORTAL" icon="sprout" title={t(lang, 'farmer')} subtitle="Turn today's harvest into tomorrow's confirmed order." />
    <div className="portal-layout farmer-layout">
      <section className="panel listing-panel"><div className="panel-heading"><div><span className="panel-kicker">QUICK LISTING</span><h2>List a new harvest</h2></div><span className="offline-pill"><i /> {draft ? t(lang, 'draftSaved') : 'Offline-ready'}</span></div>
        {submitted ? <div className="success-state"><div className="success-mark"><Icon name="check" size={28} /></div><h3>Listing received for verification</h3><p>Your crop is saved locally and will sync automatically when the connection is stable.</p><button className="button secondary" onClick={() => setSubmitted(false)}>List another crop</button></div> :
        <form onSubmit={submit} className="listing-form"><div className="field-row"><label><span>{t(lang, 'cropName')}</span><div className="input-with-action"><input required value={form.crop} onChange={e => update('crop', e.target.value)} placeholder="e.g. Premium Wheat · HD-2967" /><button type="button" onClick={startVoice} className={recording ? 'recording' : ''} title="Voice input"><Icon name="mic" size={18} /></button></div></label><label><span>{t(lang, 'category')}</span><select value={form.category} onChange={e => update('category', e.target.value)}><option>Cereals</option><option>Oilseeds</option><option>Vegetables</option><option>Fruit</option><option>Flowering</option></select></label></div>
          <div className="field-row"><label><span>{t(lang, 'quantity')}</span><div className="unit-input"><input required type="number" min="1" value={form.quantity} onChange={e => update('quantity', e.target.value)} placeholder="240" /><select><option>quintals</option><option>kg</option><option>plants</option></select></div></label><label><span>{t(lang, 'price')} <small>₹ / unit</small></span><input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="2410" /></label></div>
          <div className="field-row"><label><span>{t(lang, 'location')}</span><input required value={form.location} onChange={e => update('location', e.target.value)} placeholder="Village, District" /></label><label className="photo-field"><span>Crop photo <small>optional</small></span><input type="file" accept="image/*" /><div className="file-input"><Icon name="image" size={18} /> Add a quality photo</div></label></div>
          <div className="form-footer"><span><Icon name="shield" size={15} /> OTP verification protects your listing</span><button className="button primary" type="submit">{t(lang, 'submit')} <Icon name="arrow" size={16} /></button></div></form>}
      </section>
      <section className="panel bids-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR MARKET SIGNAL</span><h2>{t(lang, 'liveStream')}</h2></div><span className="live-badge"><i /> LIVE</span></div><p className="panel-intro">Local buyers are watching your premium wheat listing.</p><div className="bid-list">{bids.slice(0, 3).map((bid, index) => <div className={`bid-row ${bid.status}`} key={bid.id}><div className="bid-rank">{index + 1}</div><div className="bid-main"><b>{bid.buyer}</b><span>{bid.buyerType} · {bid.quantity} qtl · <em><Icon name="check" size={12} /> GST verified</em></span></div><div className="bid-price"><b>{money(bid.amount)}</b><small>/ qtl</small></div>{bid.status === 'active' ? <button className="accept-button" onClick={() => accept(bid.id)} title={t(lang, 'accept')}><Icon name="check" size={16} /> <span>Green Tick</span></button> : <span className="accepted-tag"><Icon name="check" size={14} /> {bid.status}</span>}</div>)}</div><div className="bids-footer"><span>Best bid is <b>₹2,410 / quintal</b></span><span className="countdown"><Icon name="bolt" size={14} /> Updates in real time</span></div></section>
    </div>
    <section className="security-note"><div className="security-note-icon"><Icon name="lock" size={19} /></div><div><b>Offline-first by design</b><span>Drafts are encrypted in this device and sync after you reconnect. No harvest data is lost in low-network zones.</span></div><span className="network-bars"><i /><i /><i /><i /></span></section>
  </main>;
}

function BuyerVerification({ onVerified, onClose }) {
  const [form, setForm] = useState({ businessName: '', gstin: '', pan: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const verify = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api('/buyers/verify', { method: 'POST', body: JSON.stringify(form) });
      sessionStorage.setItem('skb-buyer', JSON.stringify(result.buyer));
      onVerified(result.buyer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal verification-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><Icon name="close" size={18} /></button><span className="section-kicker">BUYER IDENTITY CHECK</span><h2>Verify your GST & PAN</h2><p>One secure verification unlocks live bidding, order tracking and protected fulfillment across crops and nursery plants.</p><form onSubmit={verify}><label>Business / organization name<input required value={form.businessName} onChange={event => setForm({ ...form, businessName: event.target.value })} /></label><label>GSTIN<input required maxLength="15" value={form.gstin} onChange={event => setForm({ ...form, gstin: event.target.value.toUpperCase() })} placeholder="15-character GSTIN" /></label><label>PAN<input required maxLength="10" value={form.pan} onChange={event => setForm({ ...form, pan: event.target.value.toUpperCase() })} placeholder="10-character PAN" /></label>{error && <div className="form-error">{error}</div>}<div className="modal-trust"><Icon name="shield" size={18} /><span><b>Verified buyer profile</b><small>Your tax IDs are used only to establish buyer eligibility.</small></span></div><button className="button primary full" disabled={loading} type="submit">{loading ? 'Checking registry…' : 'Verify & continue'} <Icon name="arrow" size={16} /></button></form></div></div>;
}

function BuyerPortal({ lang, refresh, realtimeVersion }) {
  const [market, setMarket] = useState('crops');
  const [filters, setFilters] = useState({ state: 'all', district: 'all', radius: 'panindia', q: '' });
  const [options, setOptions] = useState({ states: [], radii: [10, 25, 50] });
  const [listings, setListings] = useState([]);
  const [bidsByListing, setBidsByListing] = useState({});
  const [bidModal, setBidModal] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [buyer, setBuyer] = useState(() => { try { return JSON.parse(sessionStorage.getItem('skb-buyer') || 'null'); } catch { return null; } });
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [expandedBids, setExpandedBids] = useState(null);
  const refreshAccount = async currentBuyer => {
    if (!currentBuyer?.id) return;
    const [orderData, notificationData] = await Promise.all([api(`/orders?buyerId=${currentBuyer.id}`), api(`/notifications?audience=${currentBuyer.id}`)]);
    setOrders(orderData.orders);
    setNotifications(notificationData.notifications);
    setUnread(notificationData.unread);
  };
  useEffect(() => { api(`/marketplace/options?market=${market}`).then(setOptions).catch(() => setOptions({ states: [], radii: [10, 25, 50] })); setFilters(current => ({ ...current, state: 'all', district: 'all' })); }, [market]);
  useEffect(() => {
    const query = new URLSearchParams({ market, state: filters.state, district: filters.district, radius: filters.radius, q: filters.q });
    api(`/listings?${query}`).then(async data => {
      setListings(data.listings);
      const entries = await Promise.all(data.listings.map(async listing => [listing.id, (await api(`/bids?listingId=${listing.id}`)).bids]));
      setBidsByListing(Object.fromEntries(entries));
    }).catch(() => setListings([]));
    refreshAccount(buyer).catch(() => {});
  }, [market, filters, realtimeVersion, buyer?.id]);
  const loadBids = async id => {
    const data = await api(`/bids?listingId=${id}`);
    setBidsByListing(current => ({ ...current, [id]: data.bids }));
    setExpandedBids(expandedBids === id ? null : id);
  };
  const placeBid = async event => {
    event.preventDefault();
    if (!buyer) { setBidModal(null); setVerifyOpen(true); return; }
    try {
      await api('/bids', { method: 'POST', body: JSON.stringify({ listingId: bidModal.id, amount: Number(bidAmount), quantity: bidModal.quantity, buyerId: buyer.id, buyer: buyer.businessName, buyerType: 'Corporate' }) });
      setBidModal(null); setBidAmount(''); refresh(); 
    } catch (error) { alert(error.message); }
  };
  const districts = options.states.find(item => item.name === filters.state)?.districts || [];
  const markNotificationsRead = async () => { if (!notifications.length) return; await api('/notifications/read', { method: 'POST', body: JSON.stringify({ ids: notifications.map(item => item.id) }) }); setUnread(0); };
  const statusLabel = { payment_pending: 'Payment pending', pickup_scheduled: 'Pickup scheduled', in_transit: 'In transit', delivered: 'Delivered', disputed: 'Under review' };
  return <main className="page portal-page"><PortalHeader eyebrow="BUYER / CORPORATE PORTAL" icon="chart" title={t(lang, 'buyer')} subtitle="Verified supply, quality in view, decisions without the guesswork." />
    <div className="market-control"><div className="market-switch"><button className={market === 'crops' ? 'active' : ''} onClick={() => setMarket('crops')}><Icon name="sprout" size={18} /> {t(lang, 'crops')} <span>{market === 'crops' ? listings.length : ''}</span></button><button className={market === 'plants' ? 'active' : ''} onClick={() => setMarket('plants')}><Icon name="leaf" size={18} /> {t(lang, 'plants')} <span>{market === 'plants' ? listings.length : ''}</span></button></div><div className={buyer ? 'buyer-verified verified' : 'buyer-verified'}><Icon name="shield" size={17} /> {buyer ? `${buyer.gstin} · ${buyer.pan}` : 'GST / PAN verification required'}<button onClick={() => buyer ? refreshAccount(buyer) : setVerifyOpen(true)}>{buyer ? 'Refresh' : 'Verify now'}</button></div></div>
    <section className="filter-bar"><div className="search-box"><Icon name="filter" size={18} /><input value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder={t(lang, 'search')} /></div><select value={filters.radius} onChange={event => setFilters({ ...filters, radius: event.target.value })}><option value="panindia">{t(lang, 'radius')}: Pan-India</option>{options.radii.map(radius => <option key={radius} value={radius}>{t(lang, 'radius')}: {radius} km</option>)}</select><select value={filters.state} onChange={event => setFilters({ ...filters, state: event.target.value, district: 'all' })}><option value="all">{t(lang, 'allStates')}</option>{options.states.map(state => <option key={state.name} value={state.name}>{state.name}</option>)}</select><select value={filters.district} onChange={event => setFilters({ ...filters, district: event.target.value })} disabled={filters.state === 'all'}><option value="all">{t(lang, 'allDistricts')}</option>{districts.map(district => <option key={district} value={district}>{district}</option>)}</select><span className="result-count">{listings.length} live results</span></section>
    <section className="market-grid">{listings.map(listing => <article className="listing-card" key={listing.id}><div className="listing-image"><img src={listing.image || '/icon.svg'} alt="" /><span className="listing-live"><i /> Live auction</span><span className="distance">{listing.radiusKm ? `${listing.radiusKm} km away` : 'Just listed'}</span></div><div className="listing-body"><div className="listing-label">{listing.category} <span>·</span> {listing.location}</div><h3>{listing.crop}</h3><div className="listing-meta"><span><b>{number(listing.quantity)}</b> {listing.unit}</span><span className="quality-score"><b>{listing.quality || '—'}</b> / 10 <small>{t(lang, 'quality')}</small></span></div><div className="listing-bottom"><div><small>Current best · {(bidsByListing[listing.id] || []).length} bids</small><strong>{money(Math.max(listing.price, ...(bidsByListing[listing.id] || []).map(bid => bid.amount)))} <i>/ {listing.unit === 'plants' ? 'plant' : 'qtl'}</i></strong></div><div className="listing-actions"><button className="text-button" onClick={() => loadBids(listing.id)}>{expandedBids === listing.id ? 'Hide bids' : t(lang, 'viewBids')}</button><button className="button compact primary" onClick={() => setBidModal(listing)}>{t(lang, 'placeBid')}</button></div></div>{expandedBids === listing.id && <div className="expanded-bids">{(bidsByListing[listing.id] || []).slice(0, 3).map(bid => <div key={bid.id}><span>{bid.buyer}</span><b>{money(bid.amount)}</b></div>)}</div>}</div></article>)}</section>
    {buyer && <section className="buyer-live-grid"><section className="panel notification-panel"><div className="panel-heading"><div><span className="panel-kicker">INSTANT NOTIFICATIONS</span><h2><Icon name="bell" size={18} /> Activity centre</h2></div>{unread > 0 && <span className="notification-count">{unread} new</span>}</div>{notifications.length ? <div className="notification-list">{notifications.slice(0, 3).map(notification => <div className={notification.read ? 'notification-row' : 'notification-row unread'} key={notification.id}><span className="notification-icon"><Icon name={notification.type === 'order' ? 'truck' : 'bell'} size={15} /></span><div><b>{notification.title}</b><span>{notification.detail}</span></div></div>)}</div> : <p className="empty-copy">Live bid and order updates will appear here.</p>}<button className="view-all" onClick={markNotificationsRead}>Mark updates as read <Icon name="check" size={14} /></button></section><section className="panel orders-panel"><div className="panel-heading"><div><span className="panel-kicker">FULFILLMENT</span><h2><Icon name="truck" size={18} /> Order tracking</h2></div><span className="live-badge"><i /> LIVE</span></div>{orders.length ? <div className="order-list">{orders.slice(0, 3).map(order => <div className="order-row" key={order.id}><div><b>{order.orderNumber}</b><span>{order.crop} · {number(order.quantity)} units</span></div><strong>{statusLabel[order.status] || order.status}</strong><div className="order-track"><i className={['payment_pending', 'pickup_scheduled', 'in_transit', 'delivered'].indexOf(order.status) >= 0 ? 'done' : ''} /><i className={['in_transit', 'delivered'].includes(order.status) ? 'done' : ''} /><i className={order.status === 'delivered' ? 'done' : ''} /><i className={order.status === 'delivered' ? 'done' : ''} /></div></div>)}</div> : <p className="empty-copy">Accepted bids become trackable orders here.</p>}</section></section>}
    {bidModal && <div className="modal-backdrop" onClick={() => setBidModal(null)}><div className="modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setBidModal(null)}><Icon name="close" size={18} /></button><span className="section-kicker">LIVE REVERSE AUCTION</span><h2>Bid for {bidModal.crop}</h2><p>Place your best verified offer. The farmer sees your buyer profile and bid instantly.</p><form onSubmit={placeBid}><label>Offer price <span>₹ / {bidModal.unit === 'plants' ? 'plant' : 'quintal'}</span><input required type="number" min="1" value={bidAmount} onChange={event => setBidAmount(event.target.value)} placeholder={bidModal.price} autoFocus /></label><div className="modal-trust"><Icon name="shield" size={18} /><span><b>Protected transaction</b><small>Escrow and pickup tracking activate after acceptance.</small></span></div><button className="button primary full" type="submit">Submit verified bid <Icon name="arrow" size={16} /></button></form></div></div>}
    {verifyOpen && <BuyerVerification onClose={() => setVerifyOpen(false)} onVerified={verifiedBuyer => { setBuyer(verifiedBuyer); setVerifyOpen(false); refresh(); }} />}
  </main>;
}

function GovernmentPortal({ lang }) {
  const [tier, setTier] = useState('State');
  const [government, setGovernment] = useState({ kpis: {}, alerts: [], complianceByDistrict: [] });
  useEffect(() => { api(`/government?tier=${tier}`).then(setGovernment).catch(() => {}); }, [tier]);
  return <main className="page portal-page"><PortalHeader eyebrow="GOVERNMENT OFFICIAL PORTAL" icon="shield" title={t(lang, 'govtTitle')} subtitle="A clear view of compliance, verification and value moving through the agri economy." />
    <div className="govt-toolbar"><div className="tier-switch"><span>{t(lang, 'tier')}</span>{[['Block', 'block'], ['District', 'district'], ['State', 'state'], ['National', 'national']].map(([label, key]) => <button className={tier === label ? 'active' : ''} onClick={() => setTier(label)} key={key}>{t(lang, key)}</button>)}</div><div className="data-status"><span className="sync-dot" /> Last synced 2 min ago <button>Export report</button></div></div>
    <section className="govt-kpis"><StatCard label={t(lang, 'compliance')} value={government.kpis.compliance || '—'} note="+2.8% vs last cycle" tone="green" /><StatCard label={t(lang, 'verifiedFarmers')} value={government.kpis.verifiedFarmers || '—'} note="AgStack + PM-Kisan" tone="blue" /><StatCard label={t(lang, 'mandi')} value={government.kpis.mandiTracked || '—'} note="98.1% reconciled" tone="gold" /><StatCard label="Open alerts" value={government.kpis.openAlerts || '—'} note="3 need action today" tone="slate" /></section>
     <div className="govt-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span className="panel-kicker">MSP COMPLIANCE · {tier.toUpperCase()}</span><h2>Price protection by district</h2></div><span className="date-chip">Sep 2026 <Icon name="arrow" size={12} /></span></div><div className="fake-chart"><div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-area"><div className="grid-lines">{[1,2,3,4].map(x => <i key={x} />)}</div><div className="chart-bars">{government.complianceByDistrict.map(({ name: label, value: height }) => <div className="bar-group" key={label}><div className="bar-track"><div className="bar" style={{ height: `${height}%` }}><span>{height}%</span></div></div><small>{label}</small></div>)}</div><div className="msp-line"><span>MSP floor</span></div></div></div><div className="chart-legend"><span><i className="legend-green" /> Compliant</span><span><i className="legend-gold" /> Watchlist</span><span><i className="legend-line" /> MSP floor</span></div></section>
       <section className="panel alert-panel"><div className="panel-heading"><div><span className="panel-kicker">ACTION CENTRE</span><h2>Priority signals</h2></div><span className="alert-count">{government.kpis.openAlerts || '—'}</span></div><div className="alert-list">{government.alerts.map(alert => <div className={`alert-row ${alert.severity.toLowerCase()}`} key={alert.title}><div className="alert-mark"><Icon name={alert.type === 'Tax' ? 'chart' : 'shield'} size={15} /></div><div><b>{alert.title}</b><span>{alert.detail}</span></div><button><Icon name="arrow" size={15} /></button></div>)}</div><button className="view-all">View all alerts <Icon name="arrow" size={14} /></button></section></div>
    <section className="data-ribbon"><div><span className="ribbon-icon"><Icon name="check" size={18} /></span><span><b>Government integrations</b><small>PM-Kisan · AgStack · e-NAM rate bridge</small></span></div><div><b>18</b><small>states connected</small></div><div><b>732</b><small>mandis reporting live</small></div><div><b>99.2%</b><small>data freshness</small></div></section>
  </main>;
}

 function AdminPortal({ lang, refresh }) {
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState({ mobile: '', pin: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { if (authed) api('/admin/metrics').then(setData).catch(() => {}); }, [authed, refresh]);
  const login = async e => { e.preventDefault(); setError(''); try { const result = await api('/admin/login', { method: 'POST', body: JSON.stringify(form) }); sessionStorage.setItem('skb-admin-session', result.session); setAuthed(true); } catch (err) { setError(err.message); } };
  if (!authed) return <main className="page admin-login-page"><div className="admin-login-card"><div className="admin-emblem"><Icon name="lock" size={26} /></div><span className="section-kicker">RESTRICTED OPERATIONS</span><h1>{t(lang, 'login')}</h1><p>Access the Smart Kisan Bharat command centre with your registered administrator credentials.</p><form onSubmit={login}><label>{t(lang, 'mobile')}<input required inputMode="numeric" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile number" /></label><label>{t(lang, 'pin')}<input required type="password" inputMode="numeric" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="6-digit PIN" /></label>{error && <div className="form-error">{error}</div>}<button className="button primary full" type="submit">{t(lang, 'signIn')} <Icon name="arrow" size={16} /></button></form><small className="login-note"><Icon name="shield" size={14} /> Session protected · Smart Star Solutions</small></div></main>;
  const metrics = data?.metrics || {};
  return <main className="page portal-page"><div className="admin-topline"><PortalHeader eyebrow="ADMIN CONTROL CENTRE" icon="lock" title={t(lang, 'adminTitle')} subtitle="Live operating picture for the team keeping every transaction trusted." /><button className="button ghost" onClick={() => setAuthed(false)}>{t(lang, 'logout')}</button></div><section className="admin-kpis"><StatCard label="Active farmers" value={number(metrics.activeFarmers)} note="↑ 8.4% this month" tone="green" /><StatCard label="Verified buyers" value={number(metrics.verifiedBuyers)} note="96 pending review" tone="blue" /><StatCard label="Active bids" value={number(metrics.activeBids)} note="Across 5 markets" tone="gold" /><StatCard label="Total transaction value" value={money(metrics.totalValue)} note="Since launch" tone="slate" /></section><div className="admin-grid"><section className="panel queue-panel"><div className="panel-heading"><div><span className="panel-kicker">IDENTITY & ACCESS</span><h2>{t(lang, 'approvalQueue')}</h2></div><span className="queue-count">{data?.approvals?.length || 0} waiting</span></div><div className="queue-list">{(data?.approvals || []).map(item => <div className="queue-row" key={item.id}><div className={`avatar ${item.type.toLowerCase()}`}>{item.name.charAt(0)}</div><div><b>{item.name}</b><span>{item.type} · {item.location}</span></div><small>{item.submitted}</small><button className={item.risk === 'review' ? 'review-btn' : 'approve-btn'}>{item.risk === 'review' ? 'Review' : 'Approve'}</button></div>)}</div><button className="view-all">Open approval queue <Icon name="arrow" size={14} /></button></section><section className="panel queue-panel"><div className="panel-heading"><div><span className="panel-kicker">TRUST & SAFETY</span><h2>{t(lang, 'disputes')}</h2></div><span className="queue-count danger">{data?.disputes?.length || 0} open</span></div><div className="queue-list">{(data?.disputes || []).map(item => <div className="queue-row dispute-row" key={item.id}><div className={`priority ${item.priority.toLowerCase()}`} /><div><b>{item.subject}</b><span>{item.id} · {item.parties}</span></div><small>{item.age}</small><button className="review-btn">Open</button></div>)}</div><button className="view-all">Open resolution desk <Icon name="arrow" size={14} /></button></section></div></main>;
}

function App() {
  const [lang, setLang] = useState('en');
  const [page, setPage] = useState('home');
  const [online, setOnline] = useState(navigator.onLine);
  const [dashboard, setDashboard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    api('/dashboard').then(setDashboard).catch(() => {});
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const source = new EventSource('/api/events');
    const eventNames = ['listing.created', 'buyer.verified', 'bid.created', 'bid.accepted', 'order.updated'];
    const bump = () => setRefreshKey(value => value + 1);
    source.onmessage = bump;
    eventNames.forEach(name => source.addEventListener(name, bump));
    return () => { source.close(); window.removeEventListener('online', on); window.removeEventListener('offline', off); eventNames.forEach(name => source.removeEventListener(name, bump)); };
  }, []);
  const changePage = next => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <><Header lang={lang} setLang={setLang} page={page} setPage={changePage} online={online} /><div className="mobile-nav">{[['home', 'Overview'], ['farmer', 'Farmer'], ['buyer', 'Buyer'], ['government', 'Govt'], ['admin', 'Admin']].map(([id, label]) => <button className={page === id ? 'active' : ''} onClick={() => changePage(id)} key={id}><Icon name={id === 'farmer' ? 'sprout' : id === 'buyer' ? 'chart' : id === 'government' ? 'shield' : id === 'admin' ? 'lock' : 'leaf'} size={17} /><span>{t(lang, id)}</span></button>)}</div><div className="app-shell">{page === 'home' && <Overview lang={lang} setPage={changePage} dashboard={dashboard} />}{page === 'farmer' && <FarmerPortal lang={lang} refresh={() => setRefreshKey(x => x + 1)} />}{page === 'buyer' && <BuyerPortal lang={lang} realtimeVersion={refreshKey} refresh={() => setRefreshKey(x => x + 1)} />}{page === 'government' && <GovernmentPortal lang={lang} />}{page === 'admin' && <AdminPortal lang={lang} refresh={refreshKey} />}</div><footer className="footer"><Brand /><span>© 2026 Smart Star Solutions · Secure commerce for Bharat</span><span>Made for growers, buyers & the public good</span></footer></>;
}

export default App;