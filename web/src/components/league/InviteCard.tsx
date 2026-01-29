/**
 * Invite Card Component
 *
 * Shows invite link/code for sharing the league with social share options.
 */

import { useState } from 'react';
import { Copy, Check, Share2, Mail, MessageCircle, Facebook } from 'lucide-react';
import type { League } from '@/types';

interface InviteCardProps {
  league: League;
  canManageLeague: boolean;
  copied: boolean;
  onCopyInvite: () => void;
}

// Custom icons for platforms not in lucide
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const BlueSkyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export function InviteCard({ league, canManageLeague, copied, onCopyInvite }: InviteCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  
  const getInviteLink = () => `${window.location.origin}/join/${league.code}`;
  
  const shareViaX = () => {
    const text = `Join my Survivor Fantasy League "${league.name}"! 🏝️🔥`;
    const url = getInviteLink();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareViaFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getInviteLink())}`,
      '_blank'
    );
  };

  const shareViaInstagram = () => {
    navigator.clipboard.writeText(getInviteLink());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    window.open('https://www.instagram.com/', '_blank');
  };

  const shareViaSMS = () => {
    const text = `Join my Survivor Fantasy League! ${getInviteLink()}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join my Survivor Fantasy League: ${league.name}`;
    const body = `Hey!\n\nI want you to join my Survivor Fantasy League!\n\nLeague: ${league.name}\nJoin here: ${getInviteLink()}\n\nLet's see who can outwit, outplay, and outlast! 🏝️`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      '_blank'
    );
  };

  const shareViaBlueSky = () => {
    const text = `Join my Survivor Fantasy League "${league.name}"! 🏝️🔥 ${getInviteLink()}`;
    window.open(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const shareViaReddit = () => {
    const title = `Join my Survivor Fantasy League: ${league.name}`;
    window.open(
      `https://www.reddit.com/submit?url=${encodeURIComponent(getInviteLink())}&title=${encodeURIComponent(title)}`,
      '_blank'
    );
  };

  const shareViaWhatsApp = () => {
    const text = `Join my Survivor Fantasy League "${league.name}"! 🏝️🔥 ${getInviteLink()}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const shareViaTikTok = () => {
    navigator.clipboard.writeText(getInviteLink());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    window.open('https://www.tiktok.com/', '_blank');
  };

  const ShareButtons = () => (
    <div className="mt-4 pt-4 border-t border-cream-100">
      <p className="text-neutral-500 text-xs mb-3">Share via:</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={shareViaSMS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-600 text-xs font-medium"
        >
          <MessageCircle className="h-4 w-4" />
          SMS
        </button>
        <button
          onClick={shareViaEmail}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600 text-xs font-medium"
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
        <button
          onClick={shareViaWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors text-green-500 text-xs font-medium"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          onClick={shareViaX}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-800 text-xs font-medium"
        >
          <XIcon className="h-4 w-4" />
          X
        </button>
        <button
          onClick={shareViaFacebook}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600 text-xs font-medium"
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </button>
        <button
          onClick={shareViaInstagram}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors text-pink-600 text-xs font-medium"
        >
          <InstagramIcon className="h-4 w-4" />
          Instagram
        </button>
        <button
          onClick={shareViaBlueSky}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors text-sky-500 text-xs font-medium"
        >
          <BlueSkyIcon className="h-4 w-4" />
          BlueSky
        </button>
        <button
          onClick={shareViaReddit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors text-orange-600 text-xs font-medium"
        >
          <RedditIcon className="h-4 w-4" />
          Reddit
        </button>
        <button
          onClick={shareViaTikTok}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-800 text-xs font-medium"
        >
          <TikTokIcon className="h-4 w-4" />
          TikTok
        </button>
      </div>
      {linkCopied && (
        <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Link copied! Paste it in the app.
        </p>
      )}
    </div>
  );

  if (canManageLeague) {
    return (
      <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-neutral-500 text-sm">League Invite Code</p>
            <p className="font-mono text-2xl font-bold text-burgundy-600 tracking-wider">
              {league.code}
            </p>
          </div>
          <button onClick={onCopyInvite} className="btn btn-secondary flex items-center gap-2">
            {copied ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Copy Invite Link
              </>
            )}
          </button>
        </div>
        <p className="text-neutral-400 text-xs mt-2">
          Share this link:{' '}
          <code className="select-all bg-cream-50 px-1 py-0.5 rounded text-neutral-600">
            {window.location.origin}/join/{league.code}
          </code>
        </p>
        <ShareButtons />
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neutral-500 text-sm">Invite Friends</p>
          <p className="text-neutral-700 font-medium">Share the invite link to grow your league!</p>
        </div>
        <button onClick={onCopyInvite} className="btn btn-primary flex items-center gap-2">
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="h-5 w-5" />
              Share Link
            </>
          )}
        </button>
      </div>
      <ShareButtons />
    </div>
  );
}
