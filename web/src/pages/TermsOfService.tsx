import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-burgundy-600 hover:text-burgundy-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-burgundy-500" />
            <h1 className="text-3xl font-display font-bold text-neutral-800">Terms of Service</h1>
          </div>
          <p className="text-neutral-500 mt-2">Last updated: December 26, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 space-y-8">
          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-neutral-600">
              By accessing or using Reality Games Survivor Fantasy League ("the Service"), you agree
              to be bound by these Terms of Service. If you do not agree to these terms, please do
              not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              2. Description of Service
            </h2>
            <p className="text-neutral-600">
              Reality Games Survivor Fantasy League is a fantasy sports platform where users draft
              castaways from the CBS television show "Survivor," make weekly picks, and compete in
              leagues based on castaway performance. This is a fan-made fantasy game and is not
              affiliated with, endorsed by, or sponsored by CBS, Survivor, or any related entities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              3. User Accounts
            </h2>
            <p className="text-neutral-600 mb-3">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              4. League Entry Fees and Payments
            </h2>
            <p className="text-neutral-600 mb-3">
              Some leagues may require entry fees ("donations"). By joining a paid league:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>You authorize us to process payment through Stripe</li>
              <li>Refunds are available only if you leave before the draft begins</li>
              <li>Prize distribution is managed by league commissioners</li>
              <li>We are not responsible for commissioner payout decisions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              5. User Conduct
            </h2>
            <p className="text-neutral-600 mb-3">You agree not to:</p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Create multiple accounts to gain unfair advantages</li>
              <li>Use automated scripts or bots</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              6. Scoring and Game Rules
            </h2>
            <p className="text-neutral-600">
              Scoring is determined by our proprietary system based on castaway actions during each
              episode. We reserve the right to adjust scores if errors are discovered. All scoring
              decisions are final. Picks must be submitted before the posted deadline; late picks
              may be auto-filled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              7. Intellectual Property
            </h2>
            <p className="text-neutral-600">
              The Service and its original content, features, and functionality are owned by Reality
              Games Fantasy League and are protected by copyright, trademark, and other intellectual
              property laws. "Survivor" is a trademark of CBS. We are not affiliated with CBS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-neutral-600">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED,
              SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              9. Limitation of Liability
            </h2>
            <p className="text-neutral-600">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE
              SERVICE, INCLUDING LOSS OF PROFITS, DATA, OR PRIZES.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              10. Termination
            </h2>
            <p className="text-neutral-600">
              We may terminate or suspend your account at any time for violations of these Terms or
              for any other reason at our discretion. Upon termination, your right to use the
              Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              11. Changes to Terms
            </h2>
            <p className="text-neutral-600">
              We reserve the right to modify these Terms at any time. We will provide notice of
              significant changes by posting the updated Terms on this page. Your continued use of
              the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">12. Contact Us</h2>
            <p className="text-neutral-600">
              If you have any questions about these Terms, please contact us at{' '}
              <Link to="/contact" className="text-burgundy-600 hover:text-burgundy-700 underline">
                our contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
