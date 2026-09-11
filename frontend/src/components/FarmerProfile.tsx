"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./farmer-profile.css";

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

export default function FarmerProfilePage({ embedded = false }: { embedded?: boolean }) {
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
    <div className={`khl-profile-page ${embedded ? "khl-profile-embedded" : ""}`}>
      <header className="khl-profile-topbar">
        <Link href="/farmer" className="khl-profile-brand">
          <img src="/Khetlink_Logo.svg" alt="KhetLink" />
          <span><strong>KhetLink</strong><small>Farmer dashboard</small></span>
        </Link>
        <nav className="farmer-profile-top-nav">
          <Link href="/farmer">Dashboard</Link>
          <Link href="/farmer?view=listings">My Produce</Link>
          <Link href="/farmer">Offers</Link>
          <Link href="/farmer?view=transactions">Earnings</Link>
          <Link href="/farmer?view=shipment">Tracking</Link>
          <Link href="/farmer/profile" className="active">Profile</Link>
        </nav>
        <div className="khl-profile-top-actions">
          <Link href="/farmer" className="khl-back-link"><span className="arrow" aria-hidden>←</span><span className="label">Back to Dashboard</span></Link>
          <div className="khl-profile-mini-avatar">{initials}</div>
        </div>
      </header>

      <button className="farmer-profile-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation">☰</button>
      <div className={`farmer-profile-sidebar-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`farmer-profile-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="farmer-profile-sidebar-head"><strong>KhetLink</strong><button onClick={() => setMobileMenuOpen(false)}>×</button></div>
        <Link href="/farmer" className="farmer-profile-nav-link">Dashboard</Link>
        <Link href="/farmer?view=listings" className="farmer-profile-nav-link">My Produce</Link>
        <Link href="/farmer" className="farmer-profile-nav-link">Offers</Link>
        <Link href="/farmer?view=transactions" className="farmer-profile-nav-link">Earnings</Link>
        <Link href="/farmer?view=shipment" className="farmer-profile-nav-link">Tracking</Link>
        <Link href="/farmer/profile" className="farmer-profile-nav-link active">Profile</Link>
      </aside>

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