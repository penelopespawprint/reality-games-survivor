import { Link } from 'react-router-dom';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { getCopy } = useSiteCopy();

  return (
    <footer className="bg-neutral-900 text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="RGFL" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <EditableText copyKey="footer.tagline" as="p" className="text-neutral-400 text-sm">
              {getCopy('footer.tagline', 'Fantasy Survivor for people who actually watch Survivor.')}
            </EditableText>
          </div>

          {/* Quick Links */}
          <div>
            <EditableText copyKey="footer.play_header" as="h4" className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              {getCopy('footer.play_header', 'Play')}
            </EditableText>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/how-to-play"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_how_to_play" as="span" className="">{getCopy('footer.link_how_to_play', 'How to Play')}</EditableText>
                </Link>
              </li>
              <li>
                <Link
                  to="/how-to-play#scoring"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_scoring_rules" as="span" className="">{getCopy('footer.link_scoring_rules', 'Scoring Rules')}</EditableText>
                </Link>
              </li>
              <li>
                <Link
                  to="/castaways"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_castaways" as="span" className="">{getCopy('footer.link_castaways', 'Castaways')}</EditableText>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <EditableText copyKey="footer.resources_header" as="h4" className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              {getCopy('footer.resources_header', 'Resources')}
            </EditableText>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/contact"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_contact" as="span" className="">{getCopy('footer.link_contact', 'Contact Us')}</EditableText>
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_privacy" as="span" className="">{getCopy('footer.link_privacy', 'Privacy Policy')}</EditableText>
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.link_terms" as="span" className="">{getCopy('footer.link_terms', 'Terms of Service')}</EditableText>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <EditableText copyKey="footer.contact_header" as="h4" className="font-display font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">
              {getCopy('footer.contact_header', 'Contact')}
            </EditableText>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://twitter.com/realitygamesfl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-burgundy-400 transition-colors text-sm"
                >
                  <EditableText copyKey="footer.twitter_handle" as="span" className="">{getCopy('footer.twitter_handle', '@realitygamesfl')}</EditableText>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 mt-4 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <EditableText copyKey="footer.copyright" as="p" className="text-neutral-500 text-sm">
            {getCopy('footer.copyright', `© ${currentYear} Reality Games Fantasy League. All rights reserved.`)}
          </EditableText>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <Link to="/privacy" className="hover:text-neutral-300 transition-colors">
              <EditableText copyKey="footer.bottom_privacy" as="span" className="">{getCopy('footer.bottom_privacy', 'Privacy')}</EditableText>
            </Link>
            <Link to="/terms" className="hover:text-neutral-300 transition-colors">
              <EditableText copyKey="footer.bottom_terms" as="span" className="">{getCopy('footer.bottom_terms', 'Terms')}</EditableText>
            </Link>
            <EditableText copyKey="footer.disclaimer" as="span" className="">{getCopy('footer.disclaimer', 'Not affiliated with CBS or Survivor.')}</EditableText>
          </div>
        </div>
      </div>
    </footer>
  );
}
