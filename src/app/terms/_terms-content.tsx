"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";

export function TermsContent() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeAttr = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "light";

  return (
    <div className="lf-page" data-theme={themeAttr} suppressHydrationWarning>
      <SiteTopNav />
      <main>
        <section
          className="lf-section"
          style={{ paddingTop: "calc(var(--s-7) + 48px)" }}
        >
          <div className="lf-section-header">
            <div className="lf-kicker">
              <span className="lf-kicker-mark">§ T</span>The compact between you
              and LLP
            </div>
            <h1 className="lf-h2">Terms of Service</h1>
            <p className="lf-section-deck">
              Labor Law Partner (LLP) &middot; Last updated 27 February 2026
              &middot; Effective 27 February 2026.
            </p>
            <p
              className="lf-meta"
              style={{ marginTop: "var(--s-2)" }}
            >
              Contact: support@laborlawpartner.com
            </p>
          </div>

          <article
            className="lf-card lf-card--feature"
            style={{
              maxWidth: 820,
              display: "flex",
              flexDirection: "column",
              gap: "var(--s-4)",
            }}
          >
            <p className="lf-body">
              These Terms of Service (&quot;Terms&quot;) govern your use of the
              Labor Law Partner (LLP) website, apps, and services (the
              &quot;Platform&quot;). By using the Platform, you agree to these
              Terms.
            </p>
            <p className="lf-body">If you do not agree, do not use the Platform.</p>

            <h2 className="lf-h3">1. Who we are</h2>
            <p className="lf-body">
              <strong>Operator:</strong> Labor Law Partner (&quot;LLP&quot;,
              &quot;we&quot;, &quot;us&quot;)
            </p>
            <p className="lf-body">
              <strong>Contact:</strong> support@laborlawpartner.com
            </p>
            <p className="lf-body">
              <strong>Address:</strong> Plot 10, Main Road 3, Block A, Mirpur 11,
              Pallabi, Dhaka-1216, Bangladesh
            </p>

            <h2 className="lf-h3">2. What LLP provides</h2>
            <p className="lf-body">LLP may offer one or more of the following:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Free search and blog content</li>
              <li>AI-assisted guidance and tools</li>
              <li>Training courses and certificates</li>
              <li>Services Desk (paid services)</li>
              <li>Expert Marketplace (connecting users with verified experts)</li>
              <li>
                Headhunting / talent matching (including scout profiles and
                recruitment coordination)
              </li>
            </ul>
            <p className="lf-body">
              Some features may change over time or be available only in certain
              plans.
            </p>

            <h2 className="lf-h3">3. Important notice: LLP is not a law firm</h2>
            <p className="lf-body">
              LLP provides information and workflow support. Unless explicitly
              stated in a written engagement with a licensed professional, LLP:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>does not provide legal advice,</li>
              <li>does not create an attorney-client relationship,</li>
              <li>does not guarantee outcomes.</li>
            </ul>
            <p className="lf-body">
              If you need advice for a specific legal matter, consult a qualified
              professional.
            </p>

            <h2 className="lf-h3">4. Your account and responsibilities</h2>
            <p className="lf-body">If you create an account, you agree to:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>provide accurate information,</li>
              <li>keep your login credentials secure,</li>
              <li>notify us of unauthorized use,</li>
              <li>accept responsibility for activity under your account.</li>
            </ul>
            <p className="lf-body">
              We may suspend or terminate accounts that violate these Terms or
              create risk to the Platform or others.
            </p>

            <h2 className="lf-h3">
              5. AI features: how to use them responsibly
            </h2>
            <p className="lf-body">If you use AI-assisted features:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>AI outputs may be incomplete, outdated, or incorrect.</li>
              <li>You are responsible for verifying outputs before acting on them.</li>
              <li>
                Do not rely on AI output as a substitute for professional
                judgment.
              </li>
              <li>
                We may apply safeguards to prevent harmful use and to protect the
                Platform.
              </li>
            </ul>

            <h2 className="lf-h3">6. Expert Marketplace</h2>
            <p className="lf-body">If you use the Expert Marketplace:</p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              a) LLP&apos;s role
            </h3>
            <p className="lf-body">
              LLP facilitates discovery and connection. Unless explicitly stated
              otherwise:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>experts are independent third parties,</li>
              <li>
                LLP does not control expert advice, deliverables, or performance,
              </li>
              <li>LLP does not guarantee quality, timelines, or outcomes.</li>
            </ul>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              b) Your responsibilities
            </h3>
            <p className="lf-body">
              You agree to provide accurate information to experts, use experts&apos;
              services responsibly and lawfully, and pay agreed fees (if
              applicable) in line with the terms shown at the time of engagement.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              c) Reviews and ratings
            </h3>
            <p className="lf-body">
              If LLP displays ratings/reviews: they reflect users&apos; experiences
              and may be moderated for abuse or policy violations. You agree not
              to manipulate reviews or post false feedback.
            </p>

            <h2 className="lf-h3">
              7. Headhunting / talent matching (including Scout profiles)
            </h2>
            <p className="lf-body">
              If you use headhunting features (as a candidate, employer, or
              scout):
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              a) Consent and lawful sharing
            </h3>
            <p className="lf-body">
              If you upload or share candidate information (e.g., CVs), you
              confirm you have the candidate&apos;s permission or another lawful
              basis to share it for recruitment purposes through LLP.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              b) Sensitive data restriction
            </h3>
            <p className="lf-body">
              Do not upload highly sensitive identifiers (e.g., NID, passport,
              bank, medical information) unless strictly required for a specific
              recruitment step.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              c) No placement guarantee
            </h3>
            <p className="lf-body">
              LLP does not guarantee interviews, offers, hires, or placement
              outcomes.
            </p>

            <h2 className="lf-h3">8. Training and certificates</h2>
            <p className="lf-body">
              If you register for training or receive a certificate:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                you agree to follow training rules (attendance, conduct,
                integrity),
              </li>
              <li>
                certificates may reflect completion/assessment rules described on
                the course page,
              </li>
              <li>
                LLP may revoke or correct certificates if issued in error or
                obtained through misconduct.
              </li>
            </ul>

            <h2 className="lf-h3">9. Paid plans, payments, and refunds</h2>
            <p className="lf-body">Some features require payment.</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                Prices, plan features, and billing rules will be shown at
                checkout or on the pricing page.
              </li>
              <li>
                If you subscribe, you authorize LLP (or its payment processor) to
                charge applicable fees.
              </li>
              <li>
                Refunds (if any) follow the refund rule shown for that
                product/training at the time of purchase.
              </li>
              <li>LLP may update pricing with reasonable notice.</li>
            </ul>

            <h2 className="lf-h3">10. Acceptable use</h2>
            <p className="lf-body">You agree not to:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>use the Platform for unlawful purposes,</li>
              <li>
                attempt unauthorized access, bypass security, or probe
                vulnerabilities,
              </li>
              <li>
                scrape/crawl/harvest content using automated tools without
                permission,
              </li>
              <li>upload malware or disrupt the Platform,</li>
              <li>
                impersonate others, misrepresent identity, or mislead users,
              </li>
              <li>abuse experts, staff, or other users.</li>
            </ul>
            <p className="lf-body">
              We may restrict or suspend access to protect users and the
              Platform.
            </p>

            <h2 className="lf-h3">11. User content and submissions</h2>
            <p className="lf-body">
              If you upload or submit content (documents, CVs, articles, reviews,
              feedback):
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                you grant LLP the right to use, store, format, and display
                content as needed to deliver the service,
              </li>
              <li>you confirm you have the right to share that content,</li>
              <li>
                LLP may remove content that violates these Terms, without prior
                notice if necessary.
              </li>
            </ul>

            <h2 className="lf-h3">12. Intellectual property</h2>
            <p className="lf-body">
              LLP owns or licenses the content, design, logos, AI tools, and
              technology of the Platform. You may not copy, distribute, or re-use
              these without written permission, except as allowed by applicable
              law.
            </p>

            <h2 className="lf-h3">13. Limitation of liability</h2>
            <p className="lf-body">To the fullest extent allowed by applicable law:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                LLP is not liable for indirect, consequential, or incidental
                damages,
              </li>
              <li>
                LLP&apos;s total liability is limited to the amount you paid LLP
                (if any) in the 12 months before the claim arose,
              </li>
              <li>
                LLP does not guarantee that the Platform will always be
                error-free, secure, or available.
              </li>
            </ul>

            <h2 className="lf-h3">14. Indemnification</h2>
            <p className="lf-body">
              You agree to indemnify and hold LLP harmless against claims,
              losses, and expenses (including legal fees) arising from your
              misuse of the Platform, violation of these Terms, or infringement
              of any third-party rights.
            </p>

            <h2 className="lf-h3">15. Governing law and disputes</h2>
            <p className="lf-body">
              These Terms are governed by the laws of Bangladesh. Disputes will
              be resolved through the courts of Bangladesh, unless LLP agrees
              otherwise in writing.
            </p>

            <h2 className="lf-h3">16. Changes to these Terms</h2>
            <p className="lf-body">
              LLP may update these Terms from time to time. If a change is
              material, we will notify users through the Platform or by other
              reasonable means. Continued use after a change means acceptance of
              the updated Terms.
            </p>

            <h2 className="lf-h3">17. Contact</h2>
            <p className="lf-body">
              Labor Law Partner
              <br />
              Plot 10, Main Road 3, Block A, Mirpur 11, Pallabi, Dhaka-1216,
              Bangladesh
              <br />
              Email: support@laborlawpartner.com
            </p>
          </article>
        </section>
      </main>
      <HomepageFooter />
    </div>
  );
}
