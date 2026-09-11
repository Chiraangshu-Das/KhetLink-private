'use client';   

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, User2, Leaf, Truck, Store, ClipboardList, Brain, ShieldCheck, TrendingUp, HandCoins, LogOut } from 'lucide-react';
import './page.css';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignUpModal';
import KhetLinkCarousel from "../components/KhetLinkCarousel";
import TermsAndConditions from "../components/TermsAndConditions";

const TERMS_VERSIONS = {
  farmer: '1.0',
  buyer: '1.0',
  logistics: '1.0',
} as const;

type UserRole = keyof typeof TERMS_VERSIONS;

export default function LandingPage() {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [activeSection, setActiveSection] = useState('Home');
  const [user, setUser] = useState<{firstName?:string;lastName?:string;profileImage?:string}>({});

  // Check auth status on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => {
        setIsLoggedIn(r.ok);
        if (r.ok) { try { const data = await r.json(); setUser(data.user ?? {}); } catch {} }
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {const handleScroll = () => {const sections = ['Home','How-It-Works','Benefits','Contact',];
      const offset = 110;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5;
      if (atBottom) { setActiveSection('Contact');return;}
      let currentSection = 'Home';
      for (const id of sections) {const section = document.getElementById(id);
        if (!section) continue;
        const top = section.getBoundingClientRect().top;
        if (top <= offset) {currentSection = id;}
      }
      setActiveSection(currentSection);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {window.removeEventListener('scroll', handleScroll);};
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setIsLoggedIn(false);
    setUser({});
    // If currently on dashboard, go home
    if (window.location.pathname.startsWith('/dashboard')) {
      window.location.href = '/';
    }
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      document
        .querySelector('.role-section')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      return;
    }
    setIsSignupOpen(true);
  };

  const handleRoleClick = async (role: UserRole) => {
    if (!isLoggedIn) { setIsLoginOpen(true); return; }
    try {
      const response = await fetch('/api/roles', { credentials: 'include' });
      const data = await response.json();
      const active = data.roles?.some((r: { role: string; termsVersion?: string }) => r.role === role.toUpperCase() && r.termsVersion === TERMS_VERSIONS[role]);
      if (active) { router.push(`/${role}`); return; }
    } catch {}
    setSelectedRole(role); setShowTerms(true);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {setActiveSection(sectionId);};

  return (
    <div className="page-container">

      {/*NAVBAR*/}
      <nav className="navbar">
        <a href="#Home">
          <div className="logo-group">
            <div className="logo-icon-slot">
              <img src="./KhetLink_Logo.svg" alt="KhetLink Logo" width={38} height={38}/>
            </div>
            <div>
              <div className="brand-title">KhetLink</div>
              <div className="brand-subtitle"> Farm Fresh • Smart Supply </div>
            </div>
          </div>
        </a>

        <div className="nav-links">
          <a href="#Home" className={activeSection === 'Home' ? 'active' : ''}> Home </a>
          <a href="#How-It-Works" className={activeSection === 'How-It-Works' ? 'active' : ''}> How It Works </a>
          <a href="#Benefits" className={activeSection === 'Benefits' ? 'active' : ''}> Benefits </a>
          <a  href="/about" rel="noopener noreferrer"> About </a>
          <a href="#Contact" className={activeSection === 'Contact' ? 'active' : ''}> Contact </a>
        </div>

        <div className="auth-btns">
          {authChecked && (
            isLoggedIn ? (
              <>
                <div className="landing-user-avatar" title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Profile"}>
                  {user.profileImage ? <img src={user.profileImage} alt="Profile" /> : `${(user.firstName ?? "U")[0] ?? "U"}${(user.lastName ?? "")[0] ?? ""}`.toUpperCase()}
                </div>
                <button className="btn-login" onClick={handleLogout}>
                  <LogOut size={13}/> Logout
                </button>
              </>
            ) : (
              <>
                <button className="btn-login" onClick={() => setIsLoginOpen(true)}><User2 size={13}/> Login</button>
                <button className="btn-signup" onClick={() => setIsSignupOpen(true)}><User2 size={13}/> Sign Up</button>
              </>
            )
          )}
        </div>
      </nav>

      {/*HERO*/}
      <section id="Home" className="hero-wrapper">
        <div className="hero-overlay-content">
          <h1 className="hero-title">
            From Farm
            <br />
            to Destination,
            <br />
            <span>Smarter &amp; Faster</span>
          </h1>
          <p className="hero-desc">
            KhetLink connects Farmers, Logistics Providers and Buyers
            to reduce food waste and build a stronger supply chain.
          </p>

          <div className="hero-actions">
            <button className="btn-primary" onClick={handleGetStarted}> Get Started <ArrowRight size={16}/></button>
            <Link  href="/about" target="_blank" rel="noopener noreferrer" className="btn-secondary"> Learn More </Link>
          </div>
        </div>

        {/* FARMERS → LOGISTICS → BUYERS */}
        <div className="hero-network">
          <div className="network-node farmer-node">
            <div className="network-icon farmer-network-icon">
              <img src="./Farmer.svg" alt="Farmer"/>
            </div>
            <strong>Farmers</strong>
            <span>Grow &amp; Supply</span>
          </div>

          <div className="network-node logistics-node">
            <div className="network-icon logistics-network-icon">
              <img src="./Logistics.svg" alt="Logistics"/>
            </div>
            <strong>Logistics</strong>
            <span>Transport &amp; Deliver</span>
          </div>

          <div className="network-node buyer-node">
            <div className="network-icon buyer-network-icon">
              <img src="./Buyer.svg" alt="Buyer"/>
            </div>
            <strong>Buyers</strong>
            <span>Purchase &amp; Consume</span>
          </div>

          <div className="network-line line-1" />
          <div className="network-line line-2" />
        </div>

        {/* HERO CURVE */}
        <svg className="hero-wave-bottom" viewBox="0 0 1440 100" preserveAspectRatio="none" >
          <path d=" M0 38 C220 78 430 92 720 70 C1010 48 1220 15 1440 40 L1440 100 L0 100 Z"/>
        </svg>
      </section>

      {/*CHOOSE YOUR ROLE*/}
      <section className="role-section">
        <div className="section-header role-section-header">
          <h2 className="section-title"> Choose Your Role </h2>
          <p className="section-subtitle"> Select your account type to get started with KhetLink </p>
        </div>

        <div className="roles-grid">

          {/* FARMER */}
          <div className="role-card farmer">
            <div className="icon-slot-circle"><img src="./Farmer.svg" alt="Farmer" width={44} height={44}/></div>
            <h3> Farmers </h3>
            <p> List your produce, reach more buyers and get better prices </p>
            <button className="role-btn" onClick={() => handleRoleClick('farmer')}> Continue as Farmer <ArrowRight size={16}/></button>
          </div>

          {/* LOGISTICS */}
          <div className="role-card logistics">
            <div className="icon-slot-circle"><img src="./Logistics.svg" alt="Logistics" width={44} height={44}/></div>
            <h3> Logistics Providers </h3>
            <p> Transport fresh produce efficiently and earn more</p>
            <button className="role-btn" onClick={() => handleRoleClick('logistics')}> Continue as Logistics Provider <ArrowRight size={16}/></button>
          </div>

          {/* BUYER */}
          <div className="role-card buyer">
            <div className="icon-slot-circle"><img src="./Buyer.svg" alt="Buyer" width={44} height={44}/></div>
            <h3> Buyers </h3>
            <p> Get fresh produce directly from farms with guaranteed quality </p>
            <button className="role-btn" onClick={() => handleRoleClick('buyer')}> Continue as Buyer <ArrowRight size={16}/></button>
          </div>
        </div>
      </section>

      {/*HOW KHETLINK WORKS*/}
      <section id="How-It-Works" className="how-section">
        <div className="section-header">
          <h2 className="section-title"> How KhetLink Works </h2>
          <p className="section-subtitle"> A seamless journey from farm to buyer, powered by smart technology </p>
        </div>

        <div className="workflow-row">

          {/*STEP 1*/}
          <div className="workflow-step">
            <div className="step-badge-wrapper">
              <div className="icon-slot-circle workflow-icon">
                <img src="./Farmer.svg" alt="Farmers" width={40} height={40}/>
              </div>
              <span className="step-number"> 1 </span>
            </div>
            <h4> Farmers List Produce </h4>
            <p> Farmers share details of fresh produce available for sale </p>
          </div>

          <ArrowRight className="step-arrow"/>

          {/*STEP 2*/}
          <div className="workflow-step">
            <div className="step-badge-wrapper">
              <div className="icon-slot-circle workflow-icon">
                <ClipboardList size={30} strokeWidth={1.8}/>
              </div>
              <span className="step-number"> 2 </span>
            </div>
            <h4> Buyers Post Requirements </h4>
            <p> Hotels, restaurants and traders share their demand with clear specifications </p>
          </div>

          <ArrowRight className="step-arrow"/>

          {/*STEP 3*/}
          <div className="workflow-step">
            <div className="step-badge-wrapper">
              <div className="icon-slot-circle workflow-icon">
                <Brain size={30} strokeWidth={1.8}/>
              </div>
              <span className="step-number"> 3 </span>
            </div>
            <h4> Smart Matching </h4>
            <p> Our system connects the right farmers and buyers for the best fit </p>
          </div>

          <ArrowRight className="step-arrow"/>

          {/*STEP 4*/}
          <div className="workflow-step">
            <div className="step-badge-wrapper">
              <div className="icon-slot-circle workflow-icon">
                <Truck size={30} strokeWidth={1.8}/>
              </div>
              <span className="step-number"> 4 </span>
            </div>
            <h4> Optimized Delivery </h4>
            <p> Logistics providers plan the best routes and deliver fresh produce on time </p>
          </div>
        </div>
      </section>

      {/*BENEFITS*/}
      <section id="Benefits" className="benefits-box">
        <div className="section-header benefits-header">
          <h2 className="section-title"> Why Choose KhetLink? </h2>
          <p className="section-subtitle"> A smarter supply chain for a fresher, greener tomorrow </p>
        </div>

        <div className="benefits-grid">

          {/*BENEFIT 1*/}
          <div className="benefit-card">
            <div className="icon-slot-circle benefit-icon"><Leaf size={21}/></div>
            <h4> Less Food Waste </h4>
            <p> Fresh produce reaches buyers faster, reducing spoilage </p>
            <div className="card-accent-bar"/>
          </div>

          {/*BENEFIT 2*/}
          <div className="benefit-card">
            <div className="icon-slot-circle benefit-icon"><TrendingUp size={21}/></div>
            <h4> Better Earnings </h4>
            <p> Farmers get fair prices and a larger market for their produce </p>
            <div className="card-accent-bar"/>
          </div>

          {/*BENEFIT 3*/}
          <div className="benefit-card">
            <div className="icon-slot-circle benefit-icon"><Truck size={21}/></div>
            <h4> Lower Logistics Cost </h4>
            <p> Smart route planning and supply aggregation for higher efficiency </p>
            <div className="card-accent-bar" />
          </div>

          {/*BENEFIT 4*/}
          <div className="benefit-card">
            <div className="icon-slot-circle benefit-icon"><ShieldCheck size={21}/></div>
            <h4> Quality You Can Trust </h4>
            <p> Direct connection between farmers and verified buyers </p>
            <div className="card-accent-bar"/>
          </div>
        </div>
      </section>

      {/*REVENUE MODEL*/}
      <section className="revenue-section">
        <div className="revenue-card">
          <div className="revenue-graphic">
            <svg viewBox="0 0 180 140" className="revenue-chart">
              <path d="M10 105 L40 82 L72 91 L108 55 L145 30" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M138 30 L151 30 L145 42" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="15" y="105" width="20" height="25" rx="4" fill="#4ade80"/>
              <rect x="45" y="84" width="20" height="46" rx="4" fill="#22c55e"/>
              <rect x="75" y="68" width="20" height="62" rx="4" fill="#16a34a"/>
              <rect x="105" y="48" width="20" height="82" rx="4" fill="#15803d"/>
              <circle cx="145" cy="105" r="13" fill="#facc15"/>
              <circle cx="145" cy="82" r="10" fill="#facc15"/>
            </svg>
          </div>

          <div className="revenue-content">
            <h2 className="section-title text-left"> Our Revenue Model </h2>
            <p className="section-subtitle text-left"> KhetLink creates value for all partners and earns through two simple streams: </p>
            <div className="revenue-cards-row">

              {/*REVENUE 1*/}
              <div className="revenue-subcard">
                <div className="icon-slot-circle revenue-icon"><HandCoins size={20}/></div>
                <div>
                  <h5 className="revenue-subcard-title"> Commission from Buyers to Farms </h5>
                  <p className="revenue-subcard-desc"> A small transaction fee on every produce delivery arranged through KhetLink's logistics network. </p>
                </div>
              </div>

              {/*REVENUE 2*/}
              <div className="revenue-subcard">
                <div className="icon-slot-circle revenue-icon"><Truck size={20}/></div>
                <div>
                  <h5 className="revenue-subcard-title"> Logistics Agency Partnerships </h5>
                  <p className="revenue-subcard-desc"> Logistics providers and transport agencies contact us to take food from farms to buyers, earning a service fee for each delivery. </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*Gallery*/}
      <KhetLinkCarousel />

      {/*IMPACT*/}
      <section className="impact-banner">
        <h2 className="section-title impact-title"> Our Impact </h2>
        <p className="section-subtitle impact-subtitle"> A fresher supply chain for a better tomorrow </p>
        <div className="impact-grid">
          <div className="impact-card">
            <Leaf className="impact-icon"/>
            <span className="impact-value"> 0% </span>
            <span className="impact-label">
              Food Waste
              <br />
              (Goal)
            </span>
          </div>

          <div className="impact-card">
            <img className="impact-Farmer" src="./Farmer.svg" alt="Farmers" width={36} height={36}/>
            <span className="impact-value"> 1000+ </span>
            <span className="impact-label">
              Farmers
              <br />
              Connected
            </span>
          </div>

          <div className="impact-card">
            <Store className="impact-icon"/>
            <span className="impact-value"> 500+ </span>
            <span className="impact-label">
              Buyers
              <br />
              Enrolled
            </span>
          </div>

          <div className="impact-card">
            <Truck className="impact-icon"/>
            <span className="impact-value"> 2000+ </span>
            <span className="impact-label">
              Deliveries
              <br />
              Completed
            </span>
          </div>
        </div>
      </section>

      {/*CTA*/}
      <section
        id="Contact" className="cta-section">
        <div className="cta-banner">
          <div className="cta-left">
            <div className="icon-slot-circle cta-icon"><Leaf size={25}/></div>
            <div>
              <h2 className="cta-title"> Join KhetLink Today </h2>
              <p className="cta-subtitle"> Be a part of a smarter, stronger and more sustainable food supply chain. </p>
            </div>
          </div>

          <button className="btn-primary cta-btn" onClick={handleGetStarted}> Get Started <ArrowRight size={16}/></button>
        </div>
      </section>

      {/*FOOTER*/}
      <footer className="footer-container">
        <div className="footer-top">
          <div className="logo-group">
            <div className="footer-logo">
              <img className="footer-logo-container" src="./KhetLink_Logo.svg" alt="KhetLink Logo" width={38} height={38}/>
            </div>
            <div>
              <div className="footer-brand-title">
                KhetLink
              </div>
              <div className="footer-brand-subtitle">
                Farm Fresh • Smart Supply
              </div>
            </div>
          </div>

          <div className="footer-nav-links">
            <a href="#Home" className={activeSection === 'Home' ? 'active' : ''}> Home </a>
            <a href="#How-It-Works" className={activeSection === 'How-It-Works' ? 'active' : ''}> How It Works </a>
            <a href="#Benefits" className={activeSection === 'Benefits' ? 'active' : ''}> Benefits </a>
            <a  href="/about" rel="noopener noreferrer"> About </a>
            <a href="#Contact" className={activeSection === 'Contact' ? 'active' : ''}> Contact </a>
          </div>

          <div className="social-group">
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer"><div className="social-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </div></a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer"><div className="social-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
            </div></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><div className="social-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2z"/></svg>
            </div></a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"><div className="social-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z"/></svg>
            </div></a>
          </div>
        </div>

        <div className="footer-bottom">
          <span> © 2026 KhetLink. All rights reserved. </span>
          <span><Leaf size={13}/> Building a Greener, Fairer Food Future </span>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {isLoginOpen && (<LoginModal onClose={() => setIsLoginOpen(false)} onSignUp={() => {setIsLoginOpen(false); setIsSignupOpen(true);}}/>)}
      {/* Sigup Modal */}
      {isSignupOpen && (<SignupModal onClose={() => setIsSignupOpen(false)} onLogin={() => {setIsSignupOpen(false); setIsLoginOpen(true);}}/>)}
      {/* Show Terms */}
      {showTerms && selectedRole && (<TermsAndConditions role={selectedRole} onBack={() => {setShowTerms(false); setSelectedRole(null);}}
        onAgree={async () => {
          const response = await fetch('/api/roles/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ role: selectedRole?.toUpperCase(), accepted: true, termsVersion: TERMS_VERSIONS[selectedRole!] }) });
          if (!response.ok) return;
          const role = selectedRole!; setShowTerms(false); setSelectedRole(null);
          router.push(`/${role}`);
        }}/>)}
    </div>
  );
}