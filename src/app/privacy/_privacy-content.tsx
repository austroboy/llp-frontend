"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SiteTopNav } from "@/components/site/site-top-nav";
import { HomepageFooter } from "@/components/homepage/homepage-footer";
import "@/components/landing/landing.css";

export function PrivacyContent() {
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
              <span className="lf-kicker-mark">§ P</span>How LLP handles personal
              data
            </div>
            <h1 className="lf-h2">Privacy Policy</h1>
            <p className="lf-section-deck">
              Labor Law Partner (LLP) &middot; Effective 30 March 2026 &middot;
              Last updated 30 March 2026.
            </p>
            <p className="lf-meta" style={{ marginTop: "var(--s-2)" }}>
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
              Labor Law Partner (&quot;LLP,&quot; &quot;we,&quot; &quot;us,&quot;
              or &quot;our&quot;) respects your privacy and is committed to
              handling personal data responsibly.
            </p>
            <p className="lf-body">
              This Privacy Policy explains how we collect, use, store, share, and
              protect personal data when you use our website, applications,
              AI-assisted tools, free search, blog, training and certificate
              features, Services Desk, Expert Marketplace, headhunting or
              talent-matching features, and related services (together, the
              &quot;Platform&quot;).
            </p>
            <p className="lf-body">By using the Platform, you acknowledge this Privacy Policy.</p>

            <h2 className="lf-h3">1. Scope</h2>
            <p className="lf-body">
              This Privacy Policy applies to personal data processed through:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>LLP website pages and digital products</li>
              <li>Free search, blog, and resource experiences</li>
              <li>AI-assisted guidance, chat, review, and workflow tools</li>
              <li>Training registrations, certificates, and learning activities</li>
              <li>Services Desk requests and service-delivery workflows</li>
              <li>
                Expert Marketplace profiles, bookings, and related communications
              </li>
              <li>
                Headhunting, scout, hiring-support, and candidate-matching
                features
              </li>
              <li>
                Any support, feedback, onboarding, or account-related interaction
                with LLP
              </li>
            </ul>
            <p className="lf-body">
              This Privacy Policy does not apply to third-party websites, payment
              platforms, video platforms, calendar tools, or external services
              that may be linked from or integrated with the Platform. Those
              third parties apply their own terms and privacy practices.
            </p>

            <h2 className="lf-h3">2. Who controls your data</h2>
            <p className="lf-body">The data controller for the Platform is:</p>
            <p className="lf-body">
              <strong>Labor Law Partner</strong>
              <br />
              Plot 10, Main Road 3, Block A, Mirpur 11, Pallabi, Dhaka-1216,
              Bangladesh
              <br />
              Email: support@laborlawpartner.com
            </p>

            <h2 className="lf-h3">3. Information we collect</h2>
            <p className="lf-body">
              We collect personal data in four broad ways: information you
              provide directly, information collected automatically, information
              received from other users or business counterparties, and
              information received from service providers or partners.
            </p>

            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              A. Information you provide directly
            </h3>
            <p className="lf-body">Depending on the feature used, this may include:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Name, email address, phone number, and login or account information</li>
              <li>
                Preferred language, role, employer or organization name,
                industry, and profile details
              </li>
              <li>
                Queries, prompts, search terms, chat messages, uploaded files,
                notes, and feedback
              </li>
              <li>
                Training enrollment details, attendance data, certificate
                details, billing references, and payment-related records
              </li>
              <li>
                Services Desk request details, matter summaries, supporting
                files, and operational communications
              </li>
              <li>
                Expert, consultant, scout, or contributor application data,
                including CVs, work history, qualifications, LinkedIn URLs,
                availability, skill descriptions, and supporting evidence
              </li>
              <li>
                Candidate, employer, or hiring-brief information for headhunting
                or talent-matching workflows
              </li>
              <li>Blog, article, or content-submission details</li>
              <li>Support and complaint information</li>
            </ul>

            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              B. Information collected automatically
            </h3>
            <p className="lf-body">When you use the Platform, we may automatically collect:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                IP address, browser type, device type, operating system, language
                preference, referral source, and timestamps
              </li>
              <li>
                Page views, clicks, feature usage, session data, crash logs, and
                technical diagnostics
              </li>
              <li>Cookie, local-storage, and similar identifier data</li>
              <li>Security, fraud-prevention, and abuse-detection signals</li>
            </ul>

            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              C. Information received from others
            </h3>
            <p className="lf-body">We may receive information about you from:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Payment processors and banking or payment service partners</li>
              <li>
                Analytics, hosting, communication, CRM, and authentication
                providers
              </li>
              <li>
                Employers, clients, hiring partners, scouts, or experts involved
                in a requested workflow
              </li>
              <li>
                Users who refer you, nominate you, or include your information in
                a service request
              </li>
              <li>
                Publicly available professional sources, where relevant to
                marketplace or hiring workflows
              </li>
            </ul>

            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              D. Sensitive or high-risk data
            </h3>
            <p className="lf-body">
              Please do not upload or submit highly sensitive personal data
              unless it is strictly necessary for the requested service and
              specifically requested by LLP for that workflow. This includes:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>National ID or passport numbers</li>
              <li>Biometric data</li>
              <li>Health or medical information</li>
              <li>Bank or card details outside approved payment flows</li>
              <li>Criminal-record data</li>
              <li>Children&apos;s data</li>
              <li>Confidential third-party data you are not authorized to share</li>
            </ul>
            <p className="lf-body">
              If you submit such data, you confirm that you have a lawful basis
              and necessary authority to do so.
            </p>

            <h2 className="lf-h3">4. How we use personal data</h2>
            <p className="lf-body">We may use personal data for the following purposes:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>To create and manage accounts</li>
              <li>
                To provide search, AI, content, training, services, marketplace,
                and hiring features
              </li>
              <li>
                To route users to appropriate LLP services, experts, workflows,
                or support options
              </li>
              <li>
                To process payments, registrations, bookings, requests, and
                certificates
              </li>
              <li>
                To communicate about services, support, updates, reminders, and
                operational matters
              </li>
              <li>
                To personalize language, recommendations, workflow continuity,
                and user experience
              </li>
              <li>
                To improve platform performance, reliability, usability, and
                content quality
              </li>
              <li>To investigate abuse, fraud, security incidents, or misuse</li>
              <li>
                To comply with law, regulatory requirements, court orders, and
                legitimate recordkeeping obligations
              </li>
              <li>
                To protect the rights, property, safety, and legal interests of
                LLP, users, and others
              </li>
              <li>To enforce our policies, terms, and operational rules</li>
            </ul>

            <h2 className="lf-h3">
              5. AI features, prompts, uploads, and automated handling
            </h2>
            <p className="lf-body">The Platform includes AI-assisted features. When you use them:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                Your queries, prompts, uploaded files, instructions, and related
                metadata may be processed by automated systems to generate
                answers, summaries, comparisons, recommendations, or workflow
                outputs
              </li>
              <li>
                AI outputs may be influenced by the information you provide,
                available source material, prior interaction context, and product
                settings
              </li>
              <li>
                Authorized LLP personnel may access limited records where
                reasonably necessary for support, safety review, debugging, abuse
                prevention, compliance review, or service quality management
              </li>
              <li>
                We may log interactions to maintain service continuity,
                investigate incidents, improve reliability, and monitor misuse
              </li>
            </ul>
            <p className="lf-body">
              <strong>Model training position:</strong> LLP does not use
              user-submitted content to train general-purpose models by default.
              If LLP ever wishes to use identifiable user content for that
              purpose, LLP will provide a clear notice and obtain any consent
              required by applicable law before doing so.
            </p>
            <p className="lf-body">
              <em>Important:</em> Please avoid uploading materials that contain
              unnecessary confidential, restricted, or highly sensitive personal
              data.
            </p>

            <h2 className="lf-h3">6. User content and IP-related assurances</h2>
            <p className="lf-body">
              If you upload, submit, or share documents, messages, articles, CVs,
              hiring briefs, policies, contracts, or other materials through the
              Platform, you represent that:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                You own the content or have the necessary rights, permissions,
                and authority to provide it
              </li>
              <li>
                Your submission does not knowingly violate another person&apos;s
                privacy, confidentiality, copyright, trademark, database right,
                trade secret, or other legal right
              </li>
              <li>
                LLP may process, store, reproduce, format, transmit, and use that
                content only to the extent reasonably necessary to provide the
                requested feature, workflow, support, moderation, compliance
                review, or service delivery
              </li>
            </ul>
            <p className="lf-body">
              LLP does not claim ownership of your underlying content. However,
              LLP may remove, restrict, or refuse content where reasonably
              necessary for legal, safety, operational, policy, or
              infringement-related reasons.
            </p>

            <h2 className="lf-h3">7. When we share personal data</h2>
            <p className="lf-body">
              <strong>We do not sell personal data.</strong>
            </p>
            <p className="lf-body">
              We may share personal data only where reasonably necessary and
              lawful, including with:
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              A. Service providers and processors
            </h3>
            <p className="lf-body">
              Hosting, infrastructure, analytics, payment, communication,
              support, security, storage, and workflow vendors who act on our
              instructions.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              B. Experts, consultants, reviewers, scouts, employers, or hiring
              partners
            </h3>
            <p className="lf-body">
              Where this is necessary to fulfill a request you initiate or
              authorize through the Platform.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              C. Professional advisers and business counterparties
            </h3>
            <p className="lf-body">
              Lawyers, auditors, insurers, payment providers, or transaction
              counterparties where reasonably necessary.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              D. Authorities and legal recipients
            </h3>
            <p className="lf-body">
              Courts, regulators, law-enforcement agencies, or other authorized
              bodies where required by law.
            </p>
            <h3 className="lf-h3" style={{ fontSize: 17 }}>
              E. Corporate transactions
            </h3>
            <p className="lf-body">
              In connection with a merger, acquisition, investment,
              restructuring, asset transfer, or similar transaction.
            </p>

            <h2 className="lf-h3">
              8. Public profiles, marketplace visibility, and hiring visibility
            </h2>
            <p className="lf-body">
              Some Platform roles may include public or semi-public visibility.
              If a profile is made public, LLP may display information such as:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Name, photo, designation or professional title</li>
              <li>Organization name, experience summary</li>
              <li>Approved public links</li>
              <li>Skill or verification indicators</li>
              <li>Review, rating, or work-count indicators, where enabled</li>
            </ul>
            <p className="lf-body">
              Private contact details such as personal phone number and personal
              email address will not be displayed publicly unless LLP clearly
              states otherwise and you expressly choose to make them public.
            </p>

            <h2 className="lf-h3">9. Cookies and similar technologies</h2>
            <p className="lf-body">
              We may use cookies, pixels, SDKs, local storage, and similar
              technologies for purposes such as:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Keeping users signed in</li>
              <li>Maintaining security and fraud protection</li>
              <li>Remembering language and interface preferences</li>
              <li>Measuring traffic, usage, and performance</li>
              <li>Understanding feature adoption and page effectiveness</li>
              <li>Supporting communications, attribution, and product improvement</li>
            </ul>

            <h2 className="lf-h3">10. International processing and transfers</h2>
            <p className="lf-body">
              LLP may store or process personal data in Bangladesh and in other
              jurisdictions where LLP, its infrastructure providers, or service
              providers operate. Where personal data is transferred across
              borders, LLP will take reasonable steps to apply appropriate
              safeguards.
            </p>

            <h2 className="lf-h3">11. Data retention</h2>
            <p className="lf-body">
              We retain personal data only for as long as reasonably necessary
              for the purposes described in this Privacy Policy. Retention
              periods may vary by data type, including:
            </p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>
                Account records: while the account remains active and for a
                reasonable period afterward
              </li>
              <li>
                Support and operational logs: as reasonably needed for continuity
                and dispute handling
              </li>
              <li>
                AI interaction and search logs: for a limited period for service
                operation and safety
              </li>
              <li>
                Training, payment, and invoice records: as required for
                accounting, tax, and legal purposes
              </li>
              <li>
                Marketplace, booking, and headhunting records: for the life of
                the relevant workflow
              </li>
              <li>Public content or approved profile information: until removed or unpublished</li>
            </ul>

            <h2 className="lf-h3">12. Security</h2>
            <p className="lf-body">
              LLP uses reasonable administrative, technical, and organizational
              safeguards intended to protect personal data against unauthorized
              access, misuse, alteration, disclosure, or destruction. No system
              is completely secure. Accordingly, LLP cannot guarantee absolute
              security.
            </p>

            <h2 className="lf-h3">13. Your choices and rights</h2>
            <p className="lf-body">Subject to applicable law, you may request to:</p>
            <ul className="lf-body" style={{ paddingLeft: 20, listStyle: "disc" }}>
              <li>Access personal data we hold about you</li>
              <li>Correct or update inaccurate data</li>
              <li>Withdraw consent where processing is based on consent</li>
              <li>Request deletion of certain data</li>
              <li>Object to or restrict certain processing</li>
              <li>Manage public-profile visibility</li>
              <li>Opt out of non-essential marketing communications</li>
              <li>Request export or portability where available and legally required</li>
            </ul>

            <h2 className="lf-h3">14. Children&apos;s privacy</h2>
            <p className="lf-body">
              The Platform is designed primarily for professional, workplace,
              compliance, hiring, and business users. It is not intended for
              children. LLP does not knowingly process children&apos;s personal
              data except where specifically required for a lawful workflow.
            </p>

            <h2 className="lf-h3">15. Third-party services and links</h2>
            <p className="lf-body">
              The Platform may contain links to third-party sites, tools, or
              services. LLP is not responsible for the privacy, security, or
              content practices of those third parties.
            </p>

            <h2 className="lf-h3">16. Changes to this Privacy Policy</h2>
            <p className="lf-body">
              LLP may update this Privacy Policy from time to time. When we do,
              we will update the &quot;Last Updated&quot; date. If a change is
              material, we may also provide additional notice through the
              Platform.
            </p>

            <h2 className="lf-h3">17. Contact us</h2>
            <p className="lf-body">
              <strong>Labor Law Partner</strong>
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
