'use client';

import { useState } from 'react';

import {
  ChevronDown,
  ChevronUp,
  Leaf,
  Sprout,
  Users,
  Truck,
  ShieldCheck,
  Target,
  MapPin,
  Phone,
  ArrowRight,
  HeartHandshake,
  BarChart3,
  Globe2,
  Lightbulb,
} from 'lucide-react';

import './About.css';

const faqs = [
  {
    question: 'What is KhetLink?',
    answer:
      'KhetLink is a smart agricultural technology platform designed to connect farmers, buyers, logistics providers and agricultural services through one unified digital ecosystem.',
  },
  {
    question: 'Why was KhetLink created?',
    answer:
      'KhetLink was created to address common challenges in agricultural supply chains such as limited market access, information gaps, inefficient transportation and unnecessary delays between farms and buyers.',
  },
  {
    question: 'Who can use KhetLink?',
    answer:
      'KhetLink is designed around three primary user groups: farmers who sell their produce, buyers who purchase agricultural products, and logistics providers who transport produce between farms and destinations.',
  },
  {
    question: 'How can a farmer sell produce on KhetLink?',
    answer:
      'Farmers can create an account, add information about their produce, specify quantity and expected pricing, and publish their listing so suitable buyers can discover it.',
  },
  {
    question: 'Can farmers decide their own selling price?',
    answer:
      'Yes. Farmers can specify their expected price and review available buyer offers before deciding whether to proceed with a transaction.',
  },
  {
    question: 'How does KhetLink help buyers?',
    answer:
      'KhetLink helps buyers discover suitable produce listings, connect with farmers and coordinate the purchasing process through a more organized digital marketplace.',
  },
  {
    question: 'How does KhetLink help logistics providers?',
    answer:
      'Logistics providers can participate in the movement of agricultural produce by coordinating transportation between farms and buyers, helping improve delivery efficiency.',
  },
  {
    question: 'How does KhetLink help reduce food wastage?',
    answer:
      'By connecting available produce with suitable buyers and coordinating transportation, KhetLink aims to reduce unnecessary delays between harvesting, selling and delivery.',
  },
  {
    question: 'Will KhetLink support multiple languages?',
    answer:
      'Yes. Multilingual support can be incorporated to make the platform more accessible to farmers and users from different regions and linguistic backgrounds.',
  },
  {
    question: 'What makes KhetLink different?',
    answer:
      'KhetLink combines marketplace access, farmer-buyer matching and logistics coordination into one integrated ecosystem instead of treating these processes as completely separate systems.',
  },
];

const developers = [
  'Soham Ghatak',
  'Chiraangshu Das',
  'Sayan Ojha',
  'Pritam Ghosh',
  'Sohom Saha',
  'Debadrita Guria',
];

const objectives = [
  {
    icon: Users,
    title: 'Connect Farmers Directly',
    description:
      'Create stronger connections between farmers and buyers while reducing unnecessary barriers between production and the market.',
  },
  {
    icon: BarChart3,
    title: 'Improve Market Access',
    description:
      'Provide farmers with better access to market information and opportunities so they can make more informed decisions.',
  },
  {
    icon: Truck,
    title: 'Strengthen Logistics',
    description:
      'Make transportation more coordinated and efficient so agricultural products can move from farms to destinations with fewer delays.',
  },
  {
    icon: ShieldCheck,
    title: 'Build Trust',
    description:
      'Create a transparent digital ecosystem where farmers, buyers and logistics providers can interact with greater confidence.',
  },
];

export default function About() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((current) => (current === index ? null : index));
  };

  return (
    <main className="about-page">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="about-hero">

        <div className="about-hero-glow about-hero-glow-one" />
        <div className="about-hero-glow about-hero-glow-two" />

        <div className="about-hero-container">

          <div className="about-brand">
            <div className="about-logo">
              <img
                src="/Khetlink_Logo.svg"
                alt="KhetLink Logo"
              />
            </div>

            <div>
              <strong><h1>KhetLink</h1></strong>
              <span>Farm Fresh • Smart Supply</span>
            </div>
          </div>

          <div className="about-hero-content">

            <span className="about-eyebrow">
              <Leaf size={15} />
              ABOUT KHETLINK
            </span>

            <h1>
              Connecting the farm
              <br />
              <span>to a smarter future.</span>
            </h1>

            <p>
              KhetLink is built around a simple idea:
              agricultural technology should connect people,
              information and opportunities — from the moment
              produce leaves the farm to the moment it reaches
              its destination.
            </p>

            <div className="about-hero-actions">
              <a href="/#Home" className="about-primary-btn">
                Explore KhetLink
                <ArrowRight size={17} />
              </a>

              <a href="/#Contact" className="about-secondary-btn">
                Get in touch
              </a>
            </div>

          </div>

          <div className="about-hero-stats">

            <div>
              <span>01</span>
              <p>Farmers</p>
            </div>

            <div>
              <span>02</span>
              <p>Buyers</p>
            </div>

            <div>
              <span>03</span>
              <p>Logistics</p>
            </div>

            <div>
              <span>04</span>
              <p>One Ecosystem</p>
            </div>

          </div>

        </div>
      </section>


      {/* =====================================================
          INTRODUCTION
      ===================================================== */}

      <section className="about-story">

        <div className="about-container">

          <div className="about-story-grid">

            <div className="about-story-heading">

              <span className="about-eyebrow">
                <Sprout size={15} />
                OUR STORY
              </span>

              <h2>
                Technology should
                <span> bring agriculture closer.</span>
              </h2>

            </div>

            <div className="about-story-copy">

              <p>
                Agriculture is more than growing food. It is a
                connected journey involving farmers, markets,
                buyers, transportation and countless decisions
                along the way.
              </p>

              <p>
                Yet these parts of the agricultural supply chain
                often operate independently. Farmers may struggle
                to reach the right buyers, buyers may struggle to
                find suitable produce, and logistics can become
                another disconnected layer.
              </p>

              <p>
                KhetLink aims to bring these pieces together through
                a unified digital platform — creating a more
                connected, transparent and efficient agricultural
                ecosystem.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          MISSION / VISION
      ===================================================== */}

      <section className="about-mission">

        <div className="about-container">

          <div className="section-heading-left">

            <span className="about-eyebrow">
              <Target size={15} />
              OUR DIRECTION
            </span>

            <h2>
              Built with purpose.
              <span> Driven by impact.</span>
            </h2>

          </div>

          <div className="mission-grid">

            <article className="mission-card mission-card-main">

              <div className="mission-card-top">
                <div className="mission-icon">
                  <Sprout size={25} />
                </div>

                <span>OUR MISSION</span>
              </div>

              <h3>
                Making agriculture more connected,
                accessible and efficient.
              </h3>

              <p>
                Our mission is to empower farmers with better
                access to markets, information and opportunities
                while helping buyers and logistics providers
                participate in a more coordinated agricultural
                supply chain.
              </p>

              <div className="mission-line" />

              <small>
                Connecting people. Simplifying processes.
                Creating opportunities.
              </small>

            </article>


            <article className="mission-card">

              <div className="mission-card-top">
                <div className="mission-icon">
                  <Target size={23} />
                </div>

                <span>OUR VISION</span>
              </div>

              <h3>
                A fairer and smarter food supply chain.
              </h3>

              <p>
                We envision a future where technology helps
                agricultural communities make better decisions,
                reach wider markets and move fresh produce
                efficiently from farms to destinations.
              </p>

              <div className="vision-highlight">
                <Leaf size={17} />
                <span>
                  Better connections can create better outcomes.
                </span>
              </div>

            </article>

          </div>

        </div>

      </section>


      {/* =====================================================
          OBJECTIVES
      ===================================================== */}

      <section className="objectives-section">

        <div className="about-container">

          <div className="objectives-heading">

            <span className="about-eyebrow">
              <Lightbulb size={15} />
              OUR OBJECTIVES
            </span>

            <h2>
              What KhetLink
              <span> aims to achieve.</span>
            </h2>

            <p>
              We are building KhetLink around practical objectives
              that can create meaningful value for every participant
              in the agricultural ecosystem.
            </p>

          </div>


          <div className="objectives-grid">

            {objectives.map((objective, index) => {

              const Icon = objective.icon;

              return (
                <article
                  className="objective-card"
                  key={objective.title}
                >

                  <div className="objective-number">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="objective-icon">
                    <Icon size={21} />
                  </div>

                  <h3>{objective.title}</h3>

                  <p>{objective.description}</p>

                </article>
              );

            })}

          </div>

        </div>

      </section>


      {/* =====================================================
          WHY KHETLINK
      ===================================================== */}

      <section className="why-section">

        <div className="about-container">

          <div className="why-card">

            <div className="why-visual">

              <div className="why-orbit orbit-one" />
              <div className="why-orbit orbit-two" />

              <div className="why-logo">
                <img
                  src="/Khetlink_Logo.svg"
                  alt="KhetLink"
                />
              </div>

            </div>


            <div className="why-content">

              <span className="about-eyebrow">
                <HeartHandshake size={15} />
                WHY KHETLINK
              </span>

              <h2>
                Because every part of the
                <span> supply chain matters.</span>
              </h2>

              <p>
                A farmer's success is influenced by much more than
                what happens in the field. Access to information,
                market opportunities, reliable buyers and efficient
                transportation can all influence the final outcome.
              </p>

              <p>
                KhetLink brings these elements closer together,
                creating an ecosystem where each participant can
                contribute to a smoother journey from farm to
                destination.
              </p>

              <div className="why-points">

                <div>
                  <Globe2 size={18} />
                  <span>Connected agricultural ecosystem</span>
                </div>

                <div>
                  <Users size={18} />
                  <span>Farmer-first approach</span>
                </div>

                <div>
                  <Truck size={18} />
                  <span>Smarter movement of produce</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FAQ
      ===================================================== */}

      <section className="faq-section">

        <div className="about-container">

          <div className="faq-layout">

            <div className="faq-header">

              <span className="about-eyebrow">
                <Leaf size={15} />
                FAQ
              </span>

              <h2>
                Frequently Asked
                <span> Questions.</span>
              </h2>

              <p>
                Find answers to some of the most common questions
                about KhetLink, its purpose and how the platform
                brings the agricultural ecosystem together.
              </p>

            </div>


            <div className="faq-list">

              {faqs.map((faq, index) => {

                const isOpen = openFaqIndex === index;

                return (
                  <div
                    className={`faq-item ${isOpen ? 'open' : ''}`}
                    key={faq.question}
                  >

                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >

                      <span>{faq.question}</span>

                      <span className="faq-toggle">

                        {isOpen ? (
                          <ChevronUp size={17} />
                        ) : (
                          <ChevronDown size={17} />
                        )}

                      </span>

                    </button>


                    <div className="faq-answer-wrapper">

                      <div className="faq-answer">
                        {faq.answer}
                      </div>

                    </div>

                  </div>
                );

              })}

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          DEVELOPERS
      ===================================================== */}

      <section className="developers-section">

        <div className="about-container">

          <div className="developers-heading">

            <span className="about-eyebrow">
              <Users size={15} />
              THE TEAM
            </span>

            <h2>
              Built by people who
              <span> care about the problem.</span>
            </h2>

            <p>
              KhetLink is brought to life by a team of developers
              passionate about technology, innovation and solving
              real-world problems through software.
            </p>

          </div>


          <div className="developers-grid">

            {developers.map((developer, index) => (

              <article
                className="developer-card"
                key={developer}
              >

                <span className="developer-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="developer-avatar">
                  {developer
                    .split(' ')
                    .map((name) => name[0])
                    .join('')
                    .slice(0, 2)}
                </div>

                <div className="developer-info">

                  <h3>{developer}</h3>

                  <span>
                    KhetLink Developer
                  </span>

                </div>

              </article>

            ))}

          </div>

        </div>

      </section>


      {/* =====================================================
          CLOSING CTA
      ===================================================== */}

      <section className="about-closing">

        <div className="about-container">

          <div className="closing-card">

            <div className="closing-logo">
              <img
                src="/Khetlink_Logo.svg"
                alt="KhetLink Logo"
              />
            </div>

            <span className="about-eyebrow">
              <Leaf size={15} />
              THE JOURNEY AHEAD
            </span>

            <h2>
              Let's build a better
              <span> agricultural future.</span>
            </h2>

            <p>
              The future of agriculture will not be built by one
              person, one farmer or one technology. It will be built
              by connecting the people, ideas and systems that make
              the food supply chain possible.
            </p>

            <p>
              KhetLink is our step toward that future.
            </p>

            <a
              href="/#Home"
              className="closing-btn"
            >
              Explore KhetLink
              <ArrowRight size={17} />
            </a>

          </div>

        </div>

      </section>


      {/* =====================================================
          CONTACT
      ===================================================== */}

      <section className="about-contact-section">

        <div className="about-container">

          <div className="about-contact">

            <div className="contact-copy">

              <span className="about-eyebrow">
                <Leaf size={15} />
                GET IN TOUCH
              </span>

              <h2>
                Let's grow
                <span> together.</span>
              </h2>

              <p>
                Have questions, suggestions or ideas about KhetLink?
                We would love to hear from you.
              </p>

            </div>


            <div className="contact-details">

              <div className="contact-detail">

                <div className="contact-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <span>LOCATION</span>
                  <p>Kolkata, West Bengal, India</p>
                </div>

              </div>


              <div className="contact-detail">

                <div className="contact-icon">
                  <Phone size={18} />
                </div>

                <div>
                  <span>PHONE</span>
                  <p>+91 74076 59335</p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}
