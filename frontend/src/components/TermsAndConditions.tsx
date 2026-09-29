'use client';

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Leaf,
  ShieldCheck,
} from 'lucide-react';

import { useState } from 'react';

import './TermsAndConditions.css';

type UserRole = 'farmer' | 'buyer' | 'logistics';

interface TermsAndConditionsProps {
  role: UserRole;
  onBack: () => void;
  onAgree: () => void;
}

export default function TermsAndConditions({
  role,
  onBack,
  onAgree,
}: TermsAndConditionsProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAgree = () => {
    if (!agreed) return;

    onAgree();
  };

  /*
   * =====================================================
   * ROLE INFORMATION
   * =====================================================
   */

  const roleInfo = {
    farmer: {
      label: 'Farmer',
      title: 'Farmer Terms & Conditions',
      description:
        'Please review the following conditions before continuing as a farmer on KhetLink.',
      agreementText:
        'I have read, understood, and agree to the Farmer Terms & Conditions and agree to comply with the requirements for using KhetLink as a farmer.',
    },

    buyer: {
      label: 'Buyer',
      title: 'Buyer Terms & Conditions',
      description:
        'Please review the following conditions before continuing as a buyer on KhetLink.',
      agreementText:
        'I have read, understood, and agree to the Buyer Terms & Conditions and agree to comply with the requirements for using KhetLink as a buyer.',
    },

    logistics: {
      label: 'Logistics Provider',
      title: 'Logistics Provider Terms & Conditions',
      description:
        'Please review the following conditions before continuing as a logistics provider on KhetLink.',
      agreementText:
        'I have read, understood, and agree to the Logistics Provider Terms & Conditions and agree to comply with the requirements for using KhetLink as a logistics provider.',
    },
  };

  const currentRole = roleInfo[role];

  return (
    <div className="terms-overlay">
      <div className="terms-modal">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="terms-header">

          <div className="terms-brand">

            <div className="terms-logo">
              <img
                src="/Khetlink_Logo.svg"
                alt="KhetLink Logo"
              />
            </div>

            <div>
              <div className="terms-brand-title">
                KhetLink
              </div>

              <div className="terms-brand-subtitle">
                Farm Fresh • Smart Supply
              </div>
            </div>

          </div>

          <div className="terms-security">
            <ShieldCheck size={15} />

            <span>
              {currentRole.label} Agreement
            </span>
          </div>

        </header>


        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <main className="terms-main">

          {/* =====================================================
              HEADING
          ===================================================== */}

          <div className="terms-heading">

            <div className="terms-heading-icon">
              <Leaf size={21} />
            </div>

            <div>

              <h1>
                {currentRole.title}
              </h1>

              <p>
                {currentRole.description}
              </p>

            </div>

          </div>


          {/* =====================================================
              TERMS
          ===================================================== */}

          <div className="terms-content">

            {/* =================================================
                FARMER TERMS
            ================================================= */}

            {role === 'farmer' && (
              <>
                <section className="terms-section">
                  <div className="terms-number">01</div>

                  <div>
                    <h2>Acceptance of Terms</h2>

                    <p>
                      By registering or continuing as a farmer on
                      KhetLink, you agree to comply with these Terms &
                      Conditions and any applicable platform rules.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">02</div>

                  <div>
                    <h2>Farmer Account</h2>

                    <p>
                      You must provide accurate information including
                      your name, phone number, location, farming details
                      and other information requested during
                      registration.
                    </p>

                    <p>
                      You are responsible for keeping your account
                      credentials secure and for all activity performed
                      through your account.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">03</div>

                  <div>
                    <h2>Produce Listing</h2>

                    <p>
                      All produce listings must contain truthful
                      information about the type, quantity, expected
                      quality, availability and asking price of the
                      produce.
                    </p>

                    <p>
                      You must not intentionally provide misleading
                      information, duplicate listings or false
                      availability.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">04</div>

                  <div>
                    <h2>Product Quality</h2>

                    <p>
                      Farmers are expected to provide fresh and
                      reasonably marketable agricultural products
                      matching the description provided in their
                      listing.
                    </p>

                    <p>
                      Rotten, severely damaged, contaminated or
                      substantially below-grade produce may be rejected
                      or returned following quality assessment.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">05</div>

                  <div>
                    <h2>Quality Assessment</h2>

                    <p>
                      Produce may be inspected at designated collection
                      or storage facilities by authorised personnel or
                      qualified experts.
                    </p>

                    <p>
                      Photographs, inspection records and other evidence
                      may be collected for quality verification and
                      transaction records.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">06</div>

                  <div>
                    <h2>Payment & Price Adjustment</h2>

                    <p>
                      The final payable amount may depend on the quantity
                      and quality of the produce accepted after
                      inspection.
                    </p>

                    <p>
                      Where produce does not meet the agreed quality
                      requirements, the quantity accepted or final
                      payment may be adjusted accordingly.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">07</div>

                  <div>
                    <h2>Pickup & Delivery</h2>

                    <p>
                      Farmers must make accepted produce available at
                      the agreed pickup location and within the agreed
                      timeframe.
                    </p>

                    <p>
                      Delays, cancellations or changes affecting an
                      order should be communicated through the platform
                      as soon as reasonably possible.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">08</div>

                  <div>
                    <h2>Prohibited Activities</h2>

                    <p>
                      Farmers must not upload fraudulent listings,
                      intentionally misrepresent produce, manipulate
                      prices, provide false documents or use the
                      platform for unlawful activities.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">09</div>

                  <div>
                    <h2>Disputes & Verification</h2>

                    <p>
                      KhetLink may review transaction records, listing
                      details, quality reports and available evidence
                      when investigating disputes between users.
                    </p>

                    <p>
                      Users agree to cooperate with reasonable
                      verification requests related to their
                      transactions.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">10</div>

                  <div>
                    <h2>Account Suspension</h2>

                    <p>
                      KhetLink may restrict, suspend or terminate an
                      account if there is evidence of fraudulent
                      activity, repeated violations, misleading listings
                      or other serious misuse of the platform.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">11</div>

                  <div>
                    <h2>Changes to These Terms</h2>

                    <p>
                      KhetLink may update these terms when necessary.
                      Continued use of the platform after an update may
                      constitute acceptance of the revised terms.
                    </p>
                  </div>
                </section>


                <section className="terms-section">
                  <div className="terms-number">12</div>

                  <div>
                    <h2>Platform Role</h2>

                    <p>
                      KhetLink provides a platform for connecting
                      farmers, buyers and logistics providers. Unless
                      explicitly stated, KhetLink does not become the
                      owner of produce listed by independent farmers.
                    </p>
                  </div>
                </section>
              </>
            )}


            {/* =================================================
                BUYER TERMS
            ================================================= */}

            {role === 'buyer' && (
              <>
                <section className="terms-section">
                  <div className="terms-number">01</div>

                  <div>
                    <h2>Acceptance of Terms</h2>

                    <p>
                      By registering or continuing as a buyer on KhetLink,
                      you agree to comply with these Terms & Conditions
                      and applicable platform rules.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">02</div>

                  <div>
                    <h2>Buyer Account</h2>

                    <p>
                      Buyers must provide accurate information including
                      their name, phone number, organisation or business
                      details and delivery information requested during
                      registration.
                    </p>

                    <p>
                      Buyers are responsible for maintaining the security
                      of their account credentials.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">03</div>

                  <div>
                    <h2>Purchase Requirements</h2>

                    <p>
                      Buyers must provide accurate requirements including
                      product type, quantity, quality expectations,
                      delivery location and other relevant specifications.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">04</div>

                  <div>
                    <h2>Orders & Payments</h2>

                    <p>
                      Buyers are responsible for confirming orders and
                      completing applicable payments according to the
                      agreed transaction terms.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">05</div>

                  <div>
                    <h2>Product Inspection</h2>

                    <p>
                      Buyers acknowledge that agricultural products may
                      naturally vary in appearance, size and quality.
                      Where applicable, quality assessments may be used
                      to determine acceptance.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">06</div>

                  <div>
                    <h2>Cancellations & Disputes</h2>

                    <p>
                      Buyers should communicate cancellations,
                      discrepancies or disputes through the platform as
                      soon as reasonably possible.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">07</div>

                  <div>
                    <h2>Prohibited Activities</h2>

                    <p>
                      Buyers must not submit fraudulent requirements,
                      manipulate transactions, provide misleading
                      information or use KhetLink for unlawful activities.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">08</div>

                  <div>
                    <h2>Account Suspension</h2>

                    <p>
                      KhetLink may restrict, suspend or terminate accounts
                      involved in fraudulent activity, repeated violations
                      or serious misuse of the platform.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">09</div>

                  <div>
                    <h2>Changes to These Terms</h2>

                    <p>
                      KhetLink may update these terms when necessary.
                      Continued use after an update may constitute
                      acceptance of the revised terms.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">10</div>

                  <div>
                    <h2>Platform Role</h2>

                    <p>
                      KhetLink provides a platform that helps connect
                      buyers with farmers and logistics providers.
                      KhetLink does not necessarily become a party to
                      every transaction between users.
                    </p>
                  </div>
                </section>
              </>
            )}


            {/* =================================================
                LOGISTICS TERMS
            ================================================= */}

            {role === 'logistics' && (
              <>
                <section className="terms-section">
                  <div className="terms-number">01</div>

                  <div>
                    <h2>Acceptance of Terms</h2>

                    <p>
                      By registering or continuing as a logistics
                      provider on KhetLink, you agree to comply with
                      these Terms & Conditions and applicable platform
                      rules.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">02</div>

                  <div>
                    <h2>Provider Account</h2>

                    <p>
                      Logistics providers must provide accurate business,
                      contact, vehicle and service information requested
                      during registration.
                    </p>

                    <p>
                      Providers are responsible for maintaining the
                      security of their account credentials.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">03</div>

                  <div>
                    <h2>Delivery Responsibilities</h2>

                    <p>
                      Logistics providers are responsible for collecting
                      accepted produce from the agreed location and
                      delivering it to the specified destination within
                      the agreed timeframe.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">04</div>

                  <div>
                    <h2>Produce Handling</h2>

                    <p>
                      Providers must handle agricultural products with
                      reasonable care during loading, transportation and
                      delivery to minimise damage, contamination and
                      spoilage.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">05</div>

                  <div>
                    <h2>Vehicle & Safety Requirements</h2>

                    <p>
                      Vehicles and equipment used for deliveries should
                      be suitable for transporting the relevant produce
                      and comply with applicable safety requirements.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">06</div>

                  <div>
                    <h2>Delivery Confirmation</h2>

                    <p>
                      Providers may be required to submit delivery
                      confirmation, timestamps, photographs or other
                      relevant records through the platform.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">07</div>

                  <div>
                    <h2>Delays & Cancellations</h2>

                    <p>
                      Providers must communicate significant delays,
                      cancellations or delivery issues through the
                      platform as soon as reasonably possible.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">08</div>

                  <div>
                    <h2>Prohibited Activities</h2>

                    <p>
                      Logistics providers must not intentionally misuse
                      delivery information, falsify delivery records,
                      damage produce or use the platform for unlawful
                      activities.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">09</div>

                  <div>
                    <h2>Disputes & Verification</h2>

                    <p>
                      KhetLink may review delivery records, photographs,
                      timestamps and other available evidence when
                      investigating disputes.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">10</div>

                  <div>
                    <h2>Account Suspension</h2>

                    <p>
                      KhetLink may restrict, suspend or terminate an
                      account for fraudulent activity, repeated violations,
                      serious delivery failures or other misuse of the
                      platform.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">11</div>

                  <div>
                    <h2>Changes to These Terms</h2>

                    <p>
                      KhetLink may update these terms when necessary.
                      Continued use after an update may constitute
                      acceptance of the revised terms.
                    </p>
                  </div>
                </section>

                <section className="terms-section">
                  <div className="terms-number">12</div>

                  <div>
                    <h2>Platform Role</h2>

                    <p>
                      KhetLink provides a platform for coordinating
                      connections between farmers, buyers and logistics
                      providers. Unless explicitly stated, KhetLink is
                      not itself the transport operator for every delivery.
                    </p>
                  </div>
                </section>
              </>
            )}

          </div>


          {/* =====================================================
              AGREEMENT CHECKBOX
          ===================================================== */}

          <label
            className={`terms-checkbox ${
              agreed ? 'checked' : ''
            }`}
          >

            <span className="checkbox-wrapper">

              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) =>
                  setAgreed(e.target.checked)
                }
              />

              <span className="custom-checkbox">
                {agreed && (
                  <Check
                    size={13}
                    strokeWidth={3}
                  />
                )}
              </span>

            </span>

            <span className="checkbox-text">
              {currentRole.agreementText}
            </span>

          </label>


          {/* =====================================================
              ACTIONS
          ===================================================== */}

          <div className="terms-actions">

            <button
              type="button"
              className="terms-back"
              onClick={onBack}
            >
              <ArrowLeft size={15} />
              Back
            </button>


            <button
              type="button"
              className={`terms-agree ${
                agreed ? 'enabled' : 'disabled'
              }`}
              disabled={!agreed}
              onClick={handleAgree}
            >
              <CheckCircle2 size={16} />
              Agree & Continue
            </button>

          </div>

        </main>


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="terms-footer">

          <span>
            © 2026 KhetLink. All rights reserved.
          </span>

          <span>
            <Leaf size={13} />
            Building a Greener, Fairer Food Future
          </span>

        </footer>

      </div>
    </div>
  );
}
