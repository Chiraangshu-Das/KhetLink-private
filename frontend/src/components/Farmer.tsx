"use client";

import React, { useEffect, useState, useRef, useMemo, MouseEvent } from "react";
import Link from "next/link";
import "./farmer.css";
import "./farmer-profile.css";

/* Place the attached leaf logo at /public/Khetlink_Logo.svg (Next.js). */
const LOGO_SRC = "/Khetlink_Logo.svg";

/* Real farmer photography behind the hero — same treatment as the
   marketing homepage's photo-hero (dark green gradient scrim + white type). */
const HERO_PHOTO_SRC = "/Carousel2.jpeg";


/* =========================================================
   PRODUCE CATALOG — shared with the Profile page's product list,
   so "what do you grow" covers the same ground everywhere: crops,
   dairy (milk, curd, paneer, goat milk), eggs & poultry, honey,
   and fish — not just vegetables.
========================================================= */
type ProduceCategory = "Vegetables" | "Grains" | "Fruits" | "Dairy" | "Poultry & Eggs" | "Honey & Other" | "Fisheries";

interface ProduceItem {
  name: string;
  emoji: string;
  category: ProduceCategory;
}

const PRODUCE_CATALOG: ProduceItem[] = [
  { name: "Tomato", emoji: "🍅", category: "Vegetables" },
  { name: "Potato", emoji: "🥔", category: "Vegetables" },
  { name: "Onion", emoji: "🧅", category: "Vegetables" },
  { name: "Brinjal", emoji: "🍆", category: "Vegetables" },
  { name: "Spinach", emoji: "🥬", category: "Vegetables" },
  { name: "Cucumber", emoji: "🥒", category: "Vegetables" },
  { name: "Carrot", emoji: "🥕", category: "Vegetables" },
  { name: "Cauliflower", emoji: "🥦", category: "Vegetables" },
  { name: "Peas", emoji: "🫛", category: "Vegetables" },
  { name: "Rice", emoji: "🍚", category: "Grains" },
  { name: "Wheat", emoji: "🌾", category: "Grains" },
  { name: "Maize", emoji: "🌽", category: "Grains" },
  { name: "Banana", emoji: "🍌", category: "Fruits" },
  { name: "Mango", emoji: "🥭", category: "Fruits" },
  { name: "Milk", emoji: "🥛", category: "Dairy" },
  { name: "Curd", emoji: "🥣", category: "Dairy" },
  { name: "Paneer", emoji: "🧀", category: "Dairy" },
  { name: "Goat Milk", emoji: "🐐", category: "Dairy" },
  { name: "Eggs", emoji: "🥚", category: "Poultry & Eggs" },
  { name: "Poultry", emoji: "🐔", category: "Poultry & Eggs" },
  { name: "Honey", emoji: "🍯", category: "Honey & Other" },
  { name: "Fish", emoji: "🐟", category: "Fisheries" },
];

const CATEGORY_ORDER: ProduceCategory[] = ["Vegetables", "Grains", "Fruits", "Dairy", "Poultry & Eggs", "Honey & Other", "Fisheries"];

function produceMeta(name: string): ProduceItem {
  return PRODUCE_CATALOG.find((p) => p.name === name) ?? { name, emoji: "🌱", category: "Vegetables" };
}

const priceTiers = ["Fixed: ₹18–22/unit", "Fixed: ₹23–27/unit", "Fixed: ₹28–32/unit", "Negotiable / Bidding"];

/* =========================================================
   TYPES
========================================================= */
interface Listing {
  id?: string;
  productId?: string;
  name: string;
  qty: number;
  unit?: string;
  price: number;
  status: "Active" | "Sold" | "Paused";
}

type AdStatus = "accepted" | "rejected" | "offered" | "countered" | "negotiating" | null;

/* Buyer identity is intentionally NOT stored as a name here.
   Farmers see only a reference code, a broad buyer type, and a
   broad region — never a company name, address, or direct
   contact — so deals are always closed through KhetLink instead
   of going around it. */
interface BuyerAd {
  requirementId: string;
  buyerRef: string;
  buyerType: string;
  region: string;
  product: string;
  qty: string;
  price: number;
  status: AdStatus;
  bargainOpen: boolean;
  offer: string;
}

interface Transaction {
  date: string;
  crop: string;
  qty: string;
  amt: string;
  status: "Paid" | "Pending";
}

interface ShipmentStep {
  t: string;
  s: string;
  done: boolean;
}

interface Shipment {
  id: string;
  desc: string;
  steps: ShipmentStep[];
}

interface OtherFarmer {
  name: string;
  rating: number;
  qty: string;
  price: number;
}

type FullScreenId = "listings" | "transactions" | "shipment" | "profile" | null;

interface NotificationItem {
  kind: "offer" | "ship";
  title: string;
  sub: string;
}

/* =========================================================
   DEMO DATA
========================================================= */
const initialListings: Listing[] = [
  { name: "Tomato", qty: 120, price: 24, status: "Active" },
  { name: "Potato", qty: 200, price: 20, status: "Active" },
  { name: "Onion", qty: 150, price: 22, status: "Active" },
  { name: "Brinjal", qty: 80, price: 28, status: "Active" },
  { name: "Milk", qty: 60, price: 45, status: "Active" },
];

/* Buyers are identified only by a reference code + broad type + broad
   region — never a company name. */
const initialBuyerAds: BuyerAd[] = [
  { buyerRef: "B-4471", buyerType: "Hotel & Restaurant", region: "Kolkata region", product: "Tomato", qty: "150 kg", price: 26, status: null, bargainOpen: false, offer: "" },
  { buyerRef: "B-2098", buyerType: "Retail Chain", region: "Nadia district", product: "Potato", qty: "300 kg", price: 19, status: null, bargainOpen: false, offer: "" },
  { buyerRef: "B-5512", buyerType: "Grocery Mart", region: "Kolkata region", product: "Onion", qty: "100 kg", price: 23, status: null, bargainOpen: false, offer: "" },
];

const transactions: Transaction[] = [
  { date: "18 Aug 2024", crop: "Tomato", qty: "100 kg", amt: "₹2,400", status: "Paid" },
  { date: "16 Aug 2024", crop: "Potato", qty: "200 kg", amt: "₹4,000", status: "Paid" },
  { date: "14 Aug 2024", crop: "Onion", qty: "150 kg", amt: "₹3,300", status: "Paid" },
  { date: "12 Aug 2024", crop: "Tomato", qty: "80 kg", amt: "₹1,920", status: "Pending" },
  { date: "10 Aug 2024", crop: "Brinjal", qty: "60 kg", amt: "₹1,680", status: "Paid" },
  { date: "08 Aug 2024", crop: "Milk", qty: "30 L", amt: "₹1,350", status: "Paid" },
  { date: "06 Aug 2024", crop: "Wheat", qty: "250 kg", amt: "₹5,250", status: "Paid" },
  { date: "04 Aug 2024", crop: "Onion", qty: "100 kg", amt: "₹2,200", status: "Pending" },
  { date: "02 Aug 2024", crop: "Potato", qty: "120 kg", amt: "₹2,400", status: "Paid" },
  { date: "30 Jul 2024", crop: "Tomato", qty: "90 kg", amt: "₹2,160", status: "Paid" },
];

/* Shipment descriptions are masked the same way — buyer type + broad
   region, never a company name or address. */
const shipments: Shipment[] = [
  {
    id: "#KL1024",
    desc: "Tomato · 300 kg → Verified buyer (Hotel & Restaurant, Kolkata region)",
    steps: [
      { t: "Order Confirmed", s: "18 Aug, 9:30 AM", done: true },
      { t: "Picked up from Farm", s: "18 Aug, 10:00 AM", done: true },
      { t: "Quality Check Passed", s: "18 Aug, 11:00 AM", done: true },
      { t: "In Transit", s: "18 Aug, 11:30 AM", done: true },
      { t: "Arriving at Buyer", s: "18 Aug, 1:00 PM (est.)", done: false },
    ],
  },
  {
    id: "#KL1019",
    desc: "Potato · 200 kg → Verified buyer (Retail Chain, Nadia district)",
    steps: [
      { t: "Order Confirmed", s: "16 Aug, 8:00 AM", done: true },
      { t: "Picked up from Farm", s: "16 Aug, 8:45 AM", done: true },
      { t: "Quality Check Passed", s: "16 Aug, 9:15 AM", done: true },
      { t: "In Transit", s: "16 Aug, 9:40 AM", done: true },
      { t: "Delivered", s: "16 Aug, 12:10 PM", done: true },
    ],
  },
];

const otherFarmers: OtherFarmer[] = [
  { name: "Tomato", rating: 4.8, qty: "120 kg available", price: 24 },
  { name: "Potato", rating: 4.6, qty: "200 kg available", price: 20 },
  { name: "Onion", rating: 4.7, qty: "150 kg available", price: 22 },
  { name: "Milk", rating: 4.9, qty: "80 L available", price: 46 },
  { name: "Eggs", rating: 4.5, qty: "40 dozen available", price: 6 },
];

/* =========================================================
   SMALL SHARED PIECES
========================================================= */
function ProduceIconBox({ name, size }: { name: string; size: number }) {
  const meta = produceMeta(name);
  return (
    <div
      className="khl-produce-photo"
      style={{ background: "#f1f7f3", width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {meta.emoji}
    </div>
  );
}

const LeafSvg = ({ size = 26, stroke = "#0d6832", strokeWidth = 8 }: { size?: number; stroke?: string; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M50 90 C50 65 50 50 50 50 C50 50 22 50 22 22 C45 22 50 40 50 50 C50 40 55 22 78 22 C78 50 50 50 50 50"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

/* =========================================================
   NOTIFICATIONS — buyer identity stays masked here too.
========================================================= */
function buildNotifications(buyerAds: BuyerAd[], shipmentList: Shipment[]): NotificationItem[] {
  const items: NotificationItem[] = [];

  buyerAds.forEach((ad) => {
    if (ad.status === "accepted") {
      items.push({ kind: "offer", title: `You accepted an offer from ${ad.buyerRef}`, sub: `${ad.product} · ${ad.qty} at ₹${ad.price} · ${ad.buyerType}` });
    } else if (ad.status === "offered") {
      items.push({ kind: "offer", title: `Counter-offer sent to ${ad.buyerRef}`, sub: `${ad.product} · awaiting buyer response at ₹${ad.offer}` });
    } else if (ad.status === "countered") {
      items.push({ kind: "offer", title: `Buyer countered ${ad.buyerRef}`, sub: `${ad.product} · new buyer price ₹${ad.offer}` });
    }
  });

  shipmentList.forEach((s) => {
    const lastDone = [...s.steps].reverse().find((step) => step.done);
    if (lastDone) {
      items.push({ kind: "ship", title: `Shipment ${s.id}: ${lastDone.t}`, sub: s.desc });
    }
  });

  return items.slice(0, 5);
}

function NotificationPanel({ items, onClose }: { items: NotificationItem[]; onClose: () => void }) {
  return (
    <div className="khl-notif-panel" onClick={(e) => e.stopPropagation()}>
      <div className="head">
        <h4>Notifications</h4>
        <span onClick={onClose} style={{ cursor: "pointer" }}>Close</span>
      </div>
      {items.length === 0 && <div className="khl-notif-item"><div className="t">No recent activity yet.</div></div>}
      {items.map((n, i) => (
        <div className="khl-notif-item" key={i}>
          <div className={`ico ${n.kind}`}>{n.kind === "offer" ? "₹" : "🚚"}</div>
          <div>
            <div className="t">{n.title}</div>
            <div className="s">{n.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   HEADER — "Profile" now links to the dedicated Profile page
   instead of opening a popup.
========================================================= */
function Header({
  activeFullScreen,
  openFullScreen,
  scrollToOffers,
  menuOpen,
  setMenuOpen,
  notifOpen,
  setNotifOpen,
  notifications,
  profileName,
}: {
  activeFullScreen: FullScreenId;
  openFullScreen: (id: FullScreenId) => void;
  scrollToOffers: () => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  notifications: NotificationItem[];
  profileName: string;
}) {
  const navItem = (label: string, onClick: () => void, isActive: boolean) => (
    <a
      className={isActive ? "active" : ""}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        onClick();
      }}
    >
      {label}
    </a>
  );

  const firstName = profileName.split(" ")[0] || "Farmer";
  const initials = profileName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="khl-header">
      <Link href="/farmer" className="khl-brand">
        <img src={LOGO_SRC} alt="KhetLink logo" />
        <div className="khl-brand-text">
          <span className="name">KhetLink</span>
          <span className="tag">Farm Fresh · Smart Supply</span>
        </div>
      </Link>
      <nav className="khl-nav">
        {navItem("Dashboard", () => openFullScreen(null), activeFullScreen === null)}
        {navItem("My Produce", () => openFullScreen("listings"), activeFullScreen === "listings")}
        {navItem("Offers", scrollToOffers, false)}
        {navItem("Earnings", () => openFullScreen("transactions"), activeFullScreen === "transactions")}
        {navItem("Tracking", () => openFullScreen("shipment"), activeFullScreen === "shipment")}
        <button className="khl-nav-profile-button" onClick={() => openFullScreen("profile")}>Profile</button>
      </nav>
      <div className="khl-head-right">
        <div
          className="khl-bell"
          aria-label={`${notifications.length} recent updates`}
          onClick={(e) => {
            e.stopPropagation();
            setNotifOpen(!notifOpen);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifications.length > 0 && <span className="dot">{notifications.length}</span>}
          {notifOpen && <NotificationPanel items={notifications} onClose={() => setNotifOpen(false)} />}
        </div>
        <div className="khl-profile-chip" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
          <div className="avatar">{initials}</div> {firstName} <span className="khl-menu-caret">▾</span>
          {menuOpen && (
            <div className="khl-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className="item" onClick={() => openFullScreen("profile")}>My Profile</button>
              <div className="item">Language: English</div>
              <div className="item">Help Center</div>
              <div className="item danger">Log Out</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   SIDEBAR — same interaction model as the Buyer dashboard: visible on
   tablet/mobile, while the desktop header keeps the primary navigation.
========================================================= */
function FarmerSidebar({
  open,
  onClose,
  activeFullScreen,
  openFullScreen,
  scrollToOffers,
}: {
  open: boolean;
  onClose: () => void;
  activeFullScreen: FullScreenId;
  openFullScreen: (id: FullScreenId) => void;
  scrollToOffers: () => void;
}) {
  const item = (label: string, action: () => void, active: boolean) => (
    <button className={active ? "active" : ""} onClick={() => { action(); onClose(); }}>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className={`farmer-sidebar-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`farmer-sidebar ${open ? "open" : ""}`}>
        <div className="farmer-sidebar-head"><strong>KhetLink</strong><button onClick={onClose} aria-label="Close menu">×</button></div>
        <div className="farmer-sidebar-nav">
          {item("Dashboard", () => openFullScreen(null), activeFullScreen === null)}
          {item("My Produce", () => openFullScreen("listings"), activeFullScreen === "listings")}
          {item("Offers", scrollToOffers, false)}
          {item("Earnings", () => openFullScreen("transactions"), activeFullScreen === "transactions")}
          {item("Tracking", () => openFullScreen("shipment"), activeFullScreen === "shipment")}
          <button className="farmer-sidebar-link" onClick={() => openFullScreen("profile")}>Profile</button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   HERO — scroll parallax farm photography + the farmer →
   logistics → buyer thread, matching the homepage.
========================================================= */
function Hero({ profileName }: { profileName: string }) {
  const firstName = profileName.split(" ")[0] || "Farmer";
  const bgRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="khl-hero">
      <div className="khl-hero-bg" ref={bgRef} style={{ backgroundImage: `url(${HERO_PHOTO_SRC})` }} />
      <div className="khl-hero-scrim" />
      <div className="khl-hero-thread">
        <div className="node"><span className="ico">🧑‍🌾</span><em>You</em></div>
        <span className="dots" />
        <div className="node"><span className="ico">🚚</span><em>Logistics</em></div>
        <span className="dots" />
        <div className="node"><span className="ico">🏪</span><em>Buyer</em></div>
      </div>
      <div className="khl-hero-content">
        <div className="khl-hero-text">
          <div className="khl-hero-icon">
            <img src={LOGO_SRC} alt="" style={{ width: 22, height: 22 }} />
          </div>
          <h1>
            Welcome back,
            <strong>{firstName}!</strong>
          </h1>
          <p>Your produce connects with verified buyers and logistics partners — safely, through KhetLink.</p>
        </div>
      </div>
      <svg className="khl-hero-wave" viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path d="M0,32 C240,70 480,0 720,18 C960,36 1200,70 1440,28 L1440,70 L0,70 Z" />
      </svg>
    </div>
  );
}

/* =========================================================
   STATS
========================================================= */
function StatsRow({ listingCount, orderCount }: { listingCount: number; orderCount: number }) {
  return (
    <div className="khl-stats-row">
      <div className="khl-stat-card green">
        <div className="khl-stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
        <div>
          <div className="khl-stat-label">Total Listings</div>
          <div className="khl-stat-value">{listingCount}</div>
          <div className="khl-stat-sub">Active produce listings</div>
          <div className="khl-stat-meter"><span style={{ width: "72%" }} /></div>
        </div>
      </div>
      <div className="khl-stat-card blue">
        <div className="khl-stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <div className="khl-stat-label">Total Offers Received</div>
          <div className="khl-stat-value">{orderCount}</div>
          <div className="khl-stat-sub">From verified buyers</div>
          <div className="khl-stat-meter"><span style={{ width: "84%" }} /></div>
        </div>
      </div>
      <div className="khl-stat-card orange">
        <div className="khl-stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="14" rx="2" />
            <path d="M16 12h.01" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <div>
          <div className="khl-stat-label">Total Income</div>
          <div className="khl-stat-value">₹12,450</div>
          <div className="khl-stat-sub">Earnings from sales</div>
          <div className="khl-stat-meter"><span style={{ width: "64%" }} /></div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADD NEW PRODUCE LISTING FORM — full catalog, grouped
========================================================= */
function AddListingForm({ onAdd }: { onAdd: (listing: Listing) => void }) {
  const [crop, setCrop] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [priceTier, setPriceTier] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);

  const canSubmit = crop !== "" && Number(qty) > 0 && priceTier !== "";

  const submit = () => {
    if (!canSubmit) return;
    const parsedQty = Number(qty);
    const impliedPrice = priceTier.startsWith("Negotiable") ? 0 : Number(priceTier.match(/₹(\d+)/)?.[1] ?? 20);
    onAdd({ name: crop, qty: Number.isFinite(parsedQty) ? parsedQty : 0, unit, price: impliedPrice || 20, status: "Active" });
    setCrop("");
    setQty("");
    setPriceTier("");
    setUnit("kg");
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <div className="khl-card khl-add-listing">
      <div className="khl-card-head-row">
        <div className="leaf-badge"><LeafSvg size={18} strokeWidth={9} /></div>
        <h3>Add New Produce Listing</h3>
      </div>
      <p className="khl-form-hint">List what you have to sell — crops, dairy, eggs, poultry, honey or fish — and your price. Buyers browse this and send you offers. This does not let you buy from other farmers.</p>
      <div className="khl-form-grid">
        <div className="khl-field">
          <label>What are you selling</label>
          <select value={crop} onChange={(e) => setCrop(e.target.value)}>
            <option value="">Select produce</option>
            {CATEGORY_ORDER.map((cat) => (
              <optgroup key={cat} label={cat}>
                {PRODUCE_CATALOG.filter((p) => p.category === cat).map((p) => (
                  <option key={p.name} value={p.name}>{p.emoji} {p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="khl-field">
          <label>Quantity</label>
          <input type="number" min="0" placeholder="e.g. 120 (kg / L / dozen)" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="khl-field">
          <label>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="kg">kg</option><option value="ton">ton</option><option value="dozen">dozen</option><option value="litre">litre</option>
          </select>
        </div>
        <div className="khl-field">
          <label>Price</label>
          <select value={priceTier} onChange={(e) => setPriceTier(e.target.value)}>
            <option value="">Select price</option>
            {priceTiers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <button className="khl-list-produce-btn" onClick={submit} disabled={!canSubmit}>
        🌾 List Produce
      </button>
      {savedMsg && <div className="khl-form-msg">✓ Listing added successfully</div>}
    </div>
  );
}

/* =========================================================
   RECENT LISTINGS (dashboard preview → opens full-screen page)
========================================================= */
function RecentListings({ listings, onViewAll }: { listings: Listing[]; onViewAll: () => void }) {
  return (
    <div className="khl-card">
      <div className="khl-card-head">
        <h3>My Produce</h3>
        <button className="khl-view-all" onClick={onViewAll}>View All →</button>
      </div>
      <div>
        {listings.slice(0, 3).map((l, i) => (
          <div className="khl-recent-item" key={i}>
            <ProduceIconBox name={l.name} size={44} />
            <div className="khl-recent-info">
              <div className="name">{l.name}</div>
              <div className="meta">{l.qty} {l.name === "Milk" ? "L" : l.name === "Eggs" ? "dozen" : "kg"} • ₹{l.price}</div>
            </div>
            <span className="khl-badge-active">{l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   QUICK ACTIONS
========================================================= */
function QuickActionsRow({ onTransactions, onShipment, onProfile }: { onTransactions: () => void; onShipment: () => void; onProfile: () => void }) {
  return (
    <div className="khl-quick-row">
      <div className="khl-quick-card green" onClick={onTransactions}>
        <div className="khl-quick-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0d6832" strokeWidth="2">
            <path d="M9 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9" />
            <path d="M9 12h6M9 16h6M9 8h2" />
          </svg>
        </div>
        <div className="khl-quick-text">
          <div className="t">Transaction History <span className="quick-status">Updated</span></div>
          <div className="s">View your sales and payments</div>
        </div>
        <div className="khl-quick-arrow">→</div>
      </div>
      <button className="khl-quick-card blue" onClick={onProfile}>
        <div className="khl-quick-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2f5fd6" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        </div>
        <div className="khl-quick-text">
          <div className="t">My Profile <span className="quick-status">82% complete</span></div>
          <div className="s">Update your farm details</div>
        </div>
        <div className="khl-quick-arrow">→</div>
      </button>
      <div className="khl-quick-card purple" onClick={onShipment}>
        <div className="khl-quick-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6a3fc0" strokeWidth="2">
            <rect x="1" y="6" width="15" height="12" rx="2" />
            <path d="M16 10h4l3 3v5h-7z" />
            <circle cx="6" cy="20" r="2" />
            <circle cx="18" cy="20" r="2" />
          </svg>
        </div>
        <div className="khl-quick-text">
          <div className="t">Shipment Tracking <span className="quick-status">Live</span></div>
          <div className="s">Track your active shipments</div>
        </div>
        <div className="khl-quick-arrow">→</div>
      </div>
    </div>
  );
}

/* =========================================================
   TRANSACTIONS + SHIPMENT PREVIEW (dashboard cards)
========================================================= */
function TxnRow({ t }: { t: Transaction }) {
  return (
    <tr>
      <td>{t.date}</td>
      <td>{t.crop}</td>
      <td>{t.qty}</td>
      <td>{t.amt}</td>
      <td><span className={`khl-pill ${t.status.toLowerCase()}`}>{t.status}</span></td>
    </tr>
  );
}

function TransactionHistoryCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="khl-card">
      <div className="khl-card-head">
        <h3>Transaction History</h3>
        <button className="khl-view-all" onClick={onViewAll}>View All →</button>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Crop</th><th>Qty</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          {transactions.slice(0, 4).map((t, i) => <TxnRow t={t} key={i} />)}
        </tbody>
      </table>
    </div>
  );
}

function TrackSteps({ steps }: { steps: ShipmentStep[] }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div className="khl-track-step" key={i}>
          <div className="dot-wrap">
            <div className={`dot ${s.done ? "" : "pending"}`}></div>
            {i < steps.length - 1 && <div className="line"></div>}
          </div>
          <div>
            <div className="t">{s.t}</div>
            <div className="s">{s.s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShipmentPreviewCard({ onViewAll }: { onViewAll: () => void }) {
  return (
    <div className="khl-card">
      <div className="khl-card-head">
        <h3>Shipment Tracking</h3>
        <button className="khl-view-all" onClick={onViewAll}>View All →</button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span className="khl-track-order-tag">Order {shipments[0].id} · In Transit</span>
      </div>
      <TrackSteps steps={shipments[0].steps} />
    </div>
  );
}

/* =========================================================
   OFFERS — buyer identity is masked: reference code + type +
   broad region only. A visible privacy strip explains why, so
   the farmer understands deals are closed through KhetLink.
========================================================= */
function OffersSection({
  offersRef,
  buyerAds,
  respondAd,
  toggleBargain,
  setOfferValue,
  sendOffer,
}: {
  offersRef: React.RefObject<HTMLDivElement>;
  buyerAds: BuyerAd[];
  respondAd: (idx: number, status: AdStatus) => void;
  toggleBargain: (idx: number) => void;
  setOfferValue: (idx: number, val: string) => void;
  sendOffer: (idx: number) => void;
}) {
  const pendingCount = buyerAds.filter((a) => !a.status).length;
  return (
    <div className="khl-card khl-orders-box" ref={offersRef} style={{ marginBottom: 20 }}>
      <div className="khl-card-head-row">
        <div className="leaf-badge"><LeafSvg size={18} strokeWidth={9} /></div>
        <h3>Offers</h3>
        <span className="khl-orders-count">{pendingCount} new</span>
      </div>
      <div className="khl-orders-sub">Buyers have sent offers to purchase your listed produce — accept, decline, or negotiate the price.</div>
      <div className="khl-privacy-strip">
        <LockIcon />
        <span>Buyer names and contact details stay private on KhetLink. You'll only see a reference code and buyer type — this keeps every deal (and your protection) inside the platform.</span>
      </div>

      <div className="khl-offers-scroll" role="region" aria-label="Buyer offers" tabIndex={0}>
        {buyerAds.map((ad, i) => (
          <div className="khl-buyer-ad" key={i}>
            <div className="khl-buyer-ad-top">
              <div>
                <div className="prod">
                  <ProduceIconBox name={ad.product} size={30} />
                  {ad.product} · {ad.qty}
                </div>
                <div className="khl-buyer-ref">
                  <span className="tag-lock"><LockIcon /></span>
                  <span className="id">{ad.buyerRef}</span>
                  <span className="type">{ad.buyerType} · {ad.region}</span>
                </div>
              </div>
              <div className="khl-buyer-ad-price">₹{ad.price}</div>
            </div>
            <div className="khl-buyer-ad-meta">Offer received from a verified buyer — respond to confirm supply. KhetLink handles pickup and payment.</div>

            {(ad.status === null || ad.status === "countered") && (
              <div className="khl-ad-actions">
                <button className="khl-ad-btn accept" onClick={() => respondAd(i, "accepted")}>Accept</button>
                <button className="khl-ad-btn reject" onClick={() => respondAd(i, "rejected")}>Decline</button>
                <button className="khl-ad-btn bargain" onClick={() => toggleBargain(i)}>Negotiate</button>
              </div>
            )}

            {(ad.status === null || ad.status === "countered") && ad.bargainOpen && (
              <div className="khl-bargain-row">
                <input type="number" min="1" placeholder="Counter price ₹" value={ad.offer} onChange={(e) => setOfferValue(i, e.target.value)} />
                <button onClick={() => sendOffer(i)}>Send Counter Offer</button>
              </div>
            )}

            {ad.status === "accepted" && <span className="khl-status-tag accepted">✓ Accepted — order confirmed</span>}
            {ad.status === "rejected" && <span className="khl-status-tag rejected">✕ Declined</span>}
            {ad.status === "offered" && <span className="khl-status-tag offered">↔ Your counter-offer: ₹{ad.offer} — waiting for buyer</span>}
            {ad.status === "countered" && <span className="khl-status-tag offered">↔ Buyer counter-offer: ₹{ad.offer}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   OTHER FARMERS CAROUSEL
========================================================= */
function OtherFarmersCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: number) => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <div className="khl-others-section">
      <div className="khl-others-head">
        <h3>🌱 Other Farmers Like You Are Selling…</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 Based on your area</span>
      </div>
      <div className="khl-others-sub">Check what other farmers in your region are offering</div>
      <div className="khl-carousel-wrap">
        <button className="khl-carousel-nav left" onClick={() => scrollCarousel(-1)} aria-label="Scroll left">‹</button>
        <div className="khl-carousel" ref={carouselRef}>
          {otherFarmers.map((f, i) => {
            const meta = produceMeta(f.name);
            return (
              <div className="khl-produce-card" key={i}>
                <div className="icon-frame" style={{ background: "#f1f7f3" }}>
                  {meta.emoji}
                  <div className="rating">★ {f.rating}</div>
                </div>
                <div className="pname">{f.name}</div>
                <div className="pqty">{f.qty}</div>
                <div className="pprice">₹{f.price}</div>
                <button className="khl-details-btn">View Details</button>
              </div>
            );
          })}
        </div>
        <button className="khl-carousel-nav right" onClick={() => scrollCarousel(1)} aria-label="Scroll right">›</button>
      </div>
    </div>
  );
}

/* =========================================================
   FULL-SCREEN PAGE SHELL — used for Listings / Transactions /
   Shipment Tracking. Opens over the whole viewport with a big
   back button and larger type, so it reads clearly on a phone
   in the field, not like a cramped popup.
========================================================= */
function FullScreenPage({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="khl-fs-overlay">
      <div className="khl-fs-topbar">
        <button className="khl-fs-back" onClick={onClose}>
          <span aria-hidden>←</span>
          <span>Back to Dashboard</span>
        </button>
        <div className="khl-fs-title-wrap">
          <div className="khl-fs-icon">{icon}</div>
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="khl-fs-body">{children}</div>
    </div>
  );
}

function ListingsFullScreen({ listings, onClose }: { listings: Listing[]; onClose: () => void }) {
  return (
    <FullScreenPage title="My Produce" subtitle={`${listings.length} listing${listings.length === 1 ? "" : "s"} on KhetLink`} icon="🌾" onClose={onClose}>
      {listings.length === 0 ? (
        <div className="khl-fs-empty">
          <div className="emoji">🌱</div>
          <h3>No listings yet</h3>
          <p>Add your first produce listing from the Dashboard to start receiving offers.</p>
        </div>
      ) : (
        listings.map((l, i) => (
          <div className="khl-fs-listing-item" key={i}>
            <ProduceIconBox name={l.name} size={60} />
            <div className="khl-recent-info">
              <div className="name">{l.name}</div>
              <div className="meta">{l.qty} {l.name === "Milk" ? "L" : l.name === "Eggs" ? "dozen" : "kg"} • ₹{l.price}</div>
            </div>
            <span className="khl-badge-active">{l.status}</span>
          </div>
        ))
      )}
    </FullScreenPage>
  );
}

function TransactionsFullScreen({ onClose }: { onClose: () => void }) {
  return (
    <FullScreenPage title="Transaction History" subtitle="All your payments in one place" icon="💰" onClose={onClose}>
      <div className="khl-fs-table-card">
        <table>
          <thead>
            <tr><th>Date</th><th>Crop</th><th>Qty</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => <TxnRow t={t} key={i} />)}
          </tbody>
        </table>
      </div>
    </FullScreenPage>
  );
}

function ShipmentFullScreen({ onClose }: { onClose: () => void }) {
  return (
    <FullScreenPage title="Shipment Tracking" subtitle="Follow every order from pickup to delivery" icon="🚚" onClose={onClose}>
      {shipments.map((o, i) => (
        <div className="khl-fs-ship-card" key={i}>
          <div className="khl-ship-order-head">
            <span className="oid">{o.id}</span>
            <span className="odesc">{o.desc}</span>
          </div>
          <TrackSteps steps={o.steps} />
        </div>
      ))}
    </FullScreenPage>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
function fullScreenFromLocation(): FullScreenId {
  if (typeof window === "undefined") return null;
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "listings" || view === "transactions" || view === "shipment" || view === "profile") return view;
  return null;
}


/* This is the farmer's dedicated Profile tab — reached from the dashboard's
   top nav, header menu, and "My Profile" quick action. It is a full page,
   not a popup, so there's room to browse the whole produce catalog
   (crops, dairy, eggs & poultry, honey, fish) comfortably. */

type Product = {
  name: string;
  emoji: string;
  group: "Vegetables" | "Grains" | "Fruits" | "Dairy" | "Poultry & Eggs" | "Honey & Other" | "Fisheries";
};

const products: Product[] = [
  { name: "Tomato", emoji: "🍅", group: "Vegetables" },
  { name: "Potato", emoji: "🥔", group: "Vegetables" },
  { name: "Onion", emoji: "🧅", group: "Vegetables" },
  { name: "Brinjal", emoji: "🍆", group: "Vegetables" },
  { name: "Spinach", emoji: "🥬", group: "Vegetables" },
  { name: "Cucumber", emoji: "🥒", group: "Vegetables" },
  { name: "Carrot", emoji: "🥕", group: "Vegetables" },
  { name: "Cauliflower", emoji: "🥦", group: "Vegetables" },
  { name: "Peas", emoji: "🫛", group: "Vegetables" },
  { name: "Rice", emoji: "🍚", group: "Grains" },
  { name: "Wheat", emoji: "🌾", group: "Grains" },
  { name: "Maize", emoji: "🌽", group: "Grains" },
  { name: "Banana", emoji: "🍌", group: "Fruits" },
  { name: "Mango", emoji: "🥭", group: "Fruits" },
  { name: "Milk", emoji: "🥛", group: "Dairy" },
  { name: "Curd", emoji: "🥣", group: "Dairy" },
  { name: "Paneer", emoji: "🧀", group: "Dairy" },
  { name: "Goat Milk", emoji: "🐐", group: "Dairy" },
  { name: "Eggs", emoji: "🥚", group: "Poultry & Eggs" },
  { name: "Poultry", emoji: "🐔", group: "Poultry & Eggs" },
  { name: "Honey", emoji: "🍯", group: "Honey & Other" },
  { name: "Fish", emoji: "🐟", group: "Fisheries" },
];

const groups = ["Vegetables", "Grains", "Fruits", "Dairy", "Poultry & Eggs", "Honey & Other", "Fisheries"] as const;

const defaults = {
  profileImage: "",
  profileName: "Ramesh Kumar",
  username: "ramesh_farms",
  farmArea: "",
  farmSize: "",
  experience: "",
  sellingArea: "",
  avatar: "RK",
  products: ["Tomato", "Potato", "Onion"],
};

function FarmerProfileSection() {
  const [data, setData] = useState(defaults);
  const [activeGroup, setActiveGroup] = useState<(typeof groups)[number]>("Vegetables");
  const [saved, setSaved] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/me", { credentials: "include" });
        if (!res.ok) return;
        const payload = await res.json();
        const u = payload.user ?? {};
        const f = u.farmer ?? {};
        if (cancelled) return;
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        setData(prev => ({
          ...prev,
          profileImage: u.profileImage ?? "",
          profileName: name || prev.profileName,
          username: (u.email ?? prev.username).split("@")[0],
          farmArea: f.farmArea ?? u.location ?? "",
          farmSize: f.landAcres ? `${f.landAcres} acres` : "",
          experience: f.experience ?? "",
          sellingArea: f.sellingArea ?? "",
          products: Array.isArray(f.produce) ? f.produce : prev.products,
        }));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const initials = useMemo(() => {
    return data.profileName.trim().split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "RK";
  }, [data.profileName]);

  const selectedCount = data.products.length;
  const completion = Math.min(100, 52 + (data.farmArea ? 10 : 0) + (data.farmSize ? 10 : 0) + (data.experience ? 8 : 0) + (data.sellingArea ? 8 : 0) + (selectedCount ? 12 : 0));

  const handleProfileImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setData((prev) => ({ ...prev, profileImage: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const removeProfileImage = () => {
    setData((prev) => ({ ...prev, profileImage: "" }));
  };

  const toggleProduct = (name: string) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.includes(name) ? prev.products.filter((p) => p !== name) : [...prev.products, name],
    }));
  };

  const save = async () => {
    const numericAcres = Number.parseFloat(data.farmSize);
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileImage: data.profileImage || undefined,
          farmArea: data.farmArea || undefined,
          landAcres: Number.isFinite(numericAcres) ? numericAcres : undefined,
          experience: data.experience || undefined,
          sellingArea: data.sellingArea || undefined,
          location: data.farmArea || undefined,
          produce: data.products,
        }),
      });
      if (!res.ok) throw new Error("Unable to save profile");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaved(false);
    }
  };

  const visibleProducts = products.filter((p) => p.group === activeGroup);

  return (
    <div className="khl-profile-page khl-profile-embedded">
      <main className="khl-profile-page-main">
        <div className="khl-profile-page-heading">
          <div>
            <span className="khl-eyebrow">FARMER ACCOUNT</span>
            <h1>My Profile</h1>
            <p>Keep your farm details updated so KhetLink can show you better selling opportunities.</p>
          </div>
          <div className="khl-profile-completion-big">
            <div><span>Profile strength</span><strong>{completion}%</strong></div>
            <div className="khl-profile-progress"><span style={{ width: `${completion}%` }} /></div>
            <small>Complete your details to improve matching</small>
          </div>
        </div>

        <section className="khl-profile-identity-card">
          <div className="khl-profile-avatar-xl">{data.profileImage ? <img src={data.profileImage} alt="Farmer profile" /> : initials}<span>✓</span></div>
          <div className="khl-profile-identity-copy">
            <div className="khl-profile-name-line"><h2>{data.profileName || "Your Name"}</h2><b>✓ Verified farmer</b></div>
            <p>@{data.username || "farmer"}</p>
            <div className="khl-trust-row"><span>🛡️ Account verified</span><span>🔒 Contact details protected</span><span>🌱 Farmer-first marketplace</span></div>
          </div>
          <div className="khl-privacy-note"><strong>Your privacy matters</strong><span>Buyer company names and direct contact details are never shown to you, and your own contact details are never shown to buyers — KhetLink handles every deal in between.</span></div>
        </section>

        <div className="khl-profile-layout">
          <div className="khl-profile-content">
            <section className="khl-profile-section-card">
              <div className="khl-section-title"><div><span className="khl-eyebrow">BASIC DETAILS</span><h3>Tell us about your farm</h3></div><span className="khl-section-helper">Only relevant marketplace information</span></div>
              <div className="khl-profile-form-grid">
                <label><span>Full name</span><input value={data.profileName} onChange={(e) => setData({ ...data, profileName: e.target.value })} placeholder="e.g. Ramesh Kumar" /></label>
                <label><span>Username</span><div className="khl-input-prefix"><b>@</b><input value={data.username} onChange={(e) => setData({ ...data, username: e.target.value.replace(/\s/g, "") })} placeholder="ramesh_farms" /></div></label>
                <label><span>Village / Area</span><input value={data.farmArea} onChange={(e) => setData({ ...data, farmArea: e.target.value })} placeholder="e.g. Nadia district" /></label>
                <label><span>Farm size</span><select value={data.farmSize} onChange={(e) => setData({ ...data, farmSize: e.target.value })}><option value="">Select farm size</option><option>Less than 1 acre</option><option>1–2 acres</option><option>2–5 acres</option><option>5–10 acres</option><option>10+ acres</option></select></label>
                <label><span>Farming experience</span><select value={data.experience} onChange={(e) => setData({ ...data, experience: e.target.value })}><option value="">Select experience</option><option>Just starting</option><option>1–5 years</option><option>6–10 years</option><option>11–20 years</option><option>20+ years</option></select></label>
                <label><span>Preferred selling area</span><select value={data.sellingArea} onChange={(e) => setData({ ...data, sellingArea: e.target.value })}><option value="">Choose preference</option><option>Nearby buyers</option><option>Within my district</option><option>Across West Bengal</option><option>Pan-India</option></select></label>
              </div>
            </section>

            <section className="khl-profile-section-card">
              <div className="khl-section-title"><div><span className="khl-eyebrow">YOUR PRODUCE</span><h3>What do you grow or produce?</h3></div><strong className="khl-selected-count">{selectedCount} selected</strong></div>
              <p className="khl-section-description">Choose everything you may sell through KhetLink — vegetables, grains, fruit, dairy (milk, curd, paneer, goat milk), eggs & poultry, honey, or fish. You can add or remove anytime.</p>
              <div className="khl-product-tabs">{groups.map((group) => <button key={group} className={activeGroup === group ? "active" : ""} onClick={() => setActiveGroup(group)}>{group}</button>)}</div>
              <div className="khl-product-grid-modern">
                {visibleProducts.map((product) => {
                  const selected = data.products.includes(product.name);
                  return <button key={product.name} className={`khl-product-tile ${selected ? "selected" : ""}`} onClick={() => toggleProduct(product.name)}><span className="khl-product-emoji">{product.emoji}</span><span><strong>{product.name}</strong><small>{selected ? "Added to profile" : "Tap to add"}</small></span><i>{selected ? "✓" : "+"}</i></button>;
                })}
              </div>
            </section>

            <section className="khl-profile-section-card">
              <div className="khl-section-title"><div><span className="khl-eyebrow">PROFILE PHOTO</span><h3>Choose your farmer photo</h3></div></div>
              <div className="farmer-profile-photo-editor">
                <div className="farmer-profile-photo-preview">
                  {data.profileImage ? <img src={data.profileImage} alt="Profile preview" /> : <span>{initials}</span>}
                </div>
                <div className="farmer-profile-photo-actions">
                  <label className="farmer-profile-upload-button">Upload picture<input type="file" accept="image/*" onChange={(e) => handleProfileImage(e.target.files?.[0])} hidden /></label>
                  {data.profileImage && <button type="button" className="farmer-profile-remove-button" onClick={removeProfileImage}>Remove</button>}
                  <p>Use a clear farm or profile photo. Your profile image is stored with your KhetLink account and is shared across your role interfaces.</p>
                </div>
              </div>
              <div className="khl-avatar-options">
                {[initials, "🧑‍🌾", "🌾", "🚜", "🌱"].map((avatar, index) => <button key={index} className={`khl-avatar-option ${data.avatar === avatar && !data.profileImage ? "selected" : ""}`} onClick={() => setData({ ...data, avatar })}>{avatar}{data.avatar === avatar && !data.profileImage && <span>✓</span>}</button>)}
              </div>
            </section>
          </div>

          <aside className="khl-profile-sidebar">
            <div className="khl-side-card greenish"><span className="khl-side-icon">🌾</span><strong>Better matching</strong><p>Select everything you sell — including dairy, eggs and honey — so relevant offers can find you.</p></div>
            <div className="khl-side-card"><span className="khl-side-icon">🔐</span><strong>Your details are protected</strong><p>KhetLink never shows buyer company names, phone numbers or direct contact information to farmers — and never shares your contact details with buyers either.</p></div>
            <div className="khl-side-card"><span className="khl-side-icon">💡</span><strong>Farmer tip</strong><p>Keep your quantity, farm area and products updated before the next selling season.</p></div>
          </aside>
        </div>
      </main>

      <div className="khl-profile-save-dock"><div><strong>{saved ? "✓ Profile saved successfully" : "Ready to update your profile?"}</strong><span>Your changes are saved to your KhetLink account.</span></div><button onClick={save}>{saved ? "Saved" : "Save Changes"}</button></div>
    </div>
  );
}

export default function KhetLinkDashboard() {
  const [activeFullScreen, setActiveFullScreen] = useState<FullScreenId>(() => fullScreenFromLocation());
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerAds, setBuyerAds] = useState<BuyerAd[]>([]);

  // Profile name is read-only here for greeting purposes; editing now
  // happens entirely on the dedicated Profile page.
  const [profileName, setProfileName] = useState("Ramesh Kumar");

  useEffect(() => {
    const load = async () => {
      try {
        const [p,l] = await Promise.all([fetch('/api/profile/me',{credentials:'include'}),fetch('/api/listings/mine',{credentials:'include'})]);
        if (p.ok) { const x=await p.json(); const u=x.user; setProfileName(`${u.firstName??''} ${u.lastName??''}`.trim() || 'Farmer'); }
        if (l.ok) { const x=await l.json(); setListings((x.listings??[]).map((r:any)=>({id:r.id,productId:r.productId,name:r.product?.name??'Produce',qty:r.quantity,unit:r.unit,price:r.price,status:r.status}))); }
        const incoming = await fetch('/api/requirements/incoming',{credentials:'include'});
        if (incoming.ok) { const x=await incoming.json(); setBuyerAds((x.requirements??[]).map((r:any)=>({ requirementId:r.id, buyerRef:`BUY-${String(r.buyer?.id??'').slice(-6).toUpperCase()}`, buyerType:'Verified Buyer', region:r.buyer?.location??'Region protected', product:r.items?.[0]?.product?.name??'Produce', qty:r.items?.reduce((sum:number,i:any)=>sum+i.quantity,0)+` ${r.items?.[0]?.unit??'kg'}`, price:r.items?.[0]?.maxPrice??0, status:null, bargainOpen:false, offer:String(r.items?.[0]?.maxPrice??'') }))); }
      } catch {}
    }; load();
  }, []);

  const offersRef = useRef<HTMLDivElement>(null);

  const openFullScreen = (id: FullScreenId) => {
    setActiveFullScreen(id);
    const url = new URL(window.location.href);
    if (id === null) url.searchParams.delete("view");
    else url.searchParams.set("view", id);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const closeFullScreen = () => openFullScreen(null);

  useEffect(() => {
    const onPopState = () => setActiveFullScreen(fullScreenFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const scrollToOffers = () => {
    setActiveFullScreen(null);
    offersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addListing = async (listing: Listing) => {
    try {
      const catalogRes = await fetch("/api/catalog", { credentials: "include" });
      const catalog = catalogRes.ok ? await catalogRes.json() : [];
      const product = catalog.find((p: any) => p.name === listing.name);
      if (!product) throw new Error("Product not found");
      const response = await fetch("/api/listings", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: listing.qty, unit: listing.unit ?? "kg", price: listing.price || 20, status: "Active" }),
      });
      if (!response.ok) throw new Error("Unable to create listing");
      const created = await response.json();
      setListings((prev) => [{ id: created.id, productId: created.productId, name: listing.name, qty: created.quantity, unit: created.unit, price: created.price, status: created.status }, ...prev]);
    } catch (error) {
      console.error(error);
    }
  };

  const respondAd = async (idx: number, status: AdStatus) => {
    const current = buyerAds[idx]; if (!current) return;
    if (status === "accepted" || status === "rejected") {
      try {
        const response = await fetch(`/api/requirements/${current.requirementId}/farmer-response`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action: status === "accepted" ? "accept" : "decline" }) });
        if (!response.ok) throw new Error();
      } catch { return; }
    }
    setBuyerAds(prev=>prev.map((a,i)=>i===idx?{...a,status,bargainOpen:false}:a));
  };

  const toggleBargain = (idx: number) => {
    setBuyerAds((prev) => prev.map((a, i) => (i === idx ? { ...a, bargainOpen: !a.bargainOpen } : a)));
  };

  const setOfferValue = (idx: number, val: string) => {
    setBuyerAds((prev) => prev.map((a, i) => (i === idx ? { ...a, offer: val } : a)));
  };

  const sendOffer = async (idx: number) => {
    const current=buyerAds[idx]; const counter=Number(current?.offer); if(!current||!Number.isFinite(counter)||counter<=0)return;
    const response=await fetch(`/api/requirements/${current.requirementId}/farmer-response`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"counter",price:counter})});
    if(!response.ok)return; setBuyerAds(prev=>prev.map((a,i)=>i===idx?{...a,status:"offered",bargainOpen:false}:a));
  };

  const pendingAcceptedCount = buyerAds.filter((a) => a.status === "accepted").length;
  const notifications = useMemo(() => buildNotifications(buyerAds, shipments), [buyerAds]);

  const closeAllMenus = () => {
    if (menuOpen) setMenuOpen(false);
    if (notifOpen) setNotifOpen(false);
  };

  return (
    <div className="khl-root" onClick={closeAllMenus}>
      <Header
        activeFullScreen={activeFullScreen}
        openFullScreen={openFullScreen}
        scrollToOffers={scrollToOffers}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        notifications={notifications}
        profileName={profileName}
      />
      <FarmerSidebar
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeFullScreen={activeFullScreen}
        openFullScreen={openFullScreen}
        scrollToOffers={scrollToOffers}
      />
      <button className="farmer-mobile-menu-trigger" onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(true); }} aria-label="Open navigation">☰</button>
      <Hero profileName={profileName} />

      <main className="khl-main">
        {activeFullScreen === "profile" ? (
          <FarmerProfileSection />
        ) : (<>
        <StatsRow listingCount={listings.length} orderCount={buyerAds.length} />

        <div className="khl-grid-2">
          <AddListingForm onAdd={addListing} />
          <RecentListings listings={listings} onViewAll={() => openFullScreen("listings")} />
        </div>

        <QuickActionsRow onTransactions={() => openFullScreen("transactions")} onShipment={() => openFullScreen("shipment")} onProfile={() => openFullScreen("profile")} />

        <div className="khl-grid-2">
          <TransactionHistoryCard onViewAll={() => openFullScreen("transactions")} />
          <ShipmentPreviewCard onViewAll={() => openFullScreen("shipment")} />
        </div>

        <OffersSection
          offersRef={offersRef}
          buyerAds={buyerAds}
          respondAd={respondAd}
          toggleBargain={toggleBargain}
          setOfferValue={setOfferValue}
          sendOffer={sendOffer}
        />

        <OtherFarmersCarousel />
        </>)}
      </main>

      {activeFullScreen === "listings" && <ListingsFullScreen listings={listings} onClose={closeFullScreen} />}
      {activeFullScreen === "transactions" && <TransactionsFullScreen onClose={closeFullScreen} />}
      {activeFullScreen === "shipment" && <ShipmentFullScreen onClose={closeFullScreen} />}
    </div>
  );
}