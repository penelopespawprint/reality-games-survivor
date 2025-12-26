import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="RGFL" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-neutral-400 text-sm">
              Fantasy Survivor for people who actually watch Survivor.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              Play
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/how-to-play"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  How to Play
                </Link>
              </li>
              <li>
                <Link
                  to="/how-to-play#scoring"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  Scoring Rules
                </Link>
              </li>
              <li>
                <Link
                  to="/castaways"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  Castaways
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/sms"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  SMS Commands
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              Contact
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:support@realitygamesfantasyleague.com"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  support@realitygamesfantasyleague.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/rgfantasyleague"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  @rgfantasyleague
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-sm">
            © {currentYear} Reality Games Fantasy League. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <Link to="/privacy" className="hover:text-neutral-300 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-neutral-300 transition-colors">
              Terms
            </Link>
            <span>Not affiliated with CBS or Survivor.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
