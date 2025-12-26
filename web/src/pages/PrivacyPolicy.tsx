import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicy() {
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
            <Shield className="h-8 w-8 text-burgundy-500" />
            <h1 className="text-3xl font-display font-bold text-neutral-800">Privacy Policy</h1>
          </div>
          <p className="text-neutral-500 mt-2">Last updated: December 26, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 space-y-8">
          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              1. Information We Collect
            </h2>
            <p className="text-neutral-600 mb-3">
              We collect information you provide directly to us when you:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>Create an account (email address, display name)</li>
              <li>Add a phone number for SMS notifications</li>
              <li>Make payments for league entry fees</li>
              <li>Participate in leagues, drafts, and weekly picks</li>
              <li>Contact us for support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              2. How We Use Your Information
            </h2>
            <p className="text-neutral-600 mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you notifications about picks, scores, and league activity</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              3. Information Sharing
            </h2>
            <p className="text-neutral-600 mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>With other league members (display name, picks, scores)</li>
              <li>
                With service providers who assist in our operations (Stripe for payments, Twilio for
                SMS)
              </li>
              <li>If required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              4. Data Security
            </h2>
            <p className="text-neutral-600">
              We take reasonable measures to help protect your personal information from loss,
              theft, misuse, unauthorized access, disclosure, alteration, and destruction. Your data
              is stored securely using industry-standard encryption and access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              5. Your Choices
            </h2>
            <p className="text-neutral-600 mb-3">You may:</p>
            <ul className="list-disc list-inside text-neutral-600 space-y-2 ml-4">
              <li>Update your account information at any time in your Profile</li>
              <li>Opt out of promotional communications</li>
              <li>Choose which notifications you receive (email, SMS, push)</li>
              <li>Request deletion of your account by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              6. Cookies and Tracking
            </h2>
            <p className="text-neutral-600">
              We use cookies and similar technologies to maintain your session, remember your
              preferences, and understand how you interact with our service. You can control cookies
              through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              7. Children's Privacy
            </h2>
            <p className="text-neutral-600">
              Our service is not directed to children under 13. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from
              a child under 13, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">
              8. Changes to This Policy
            </h2>
            <p className="text-neutral-600">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-3">9. Contact Us</h2>
            <p className="text-neutral-600">
              If you have any questions about this Privacy Policy, please contact us at{' '}
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
