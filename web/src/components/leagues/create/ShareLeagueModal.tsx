import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  Copy,
  MessageCircle,
  Mail,
  Facebook,
} from 'lucide-react';
import { useState } from 'react';

// Custom X (formerly Twitter) icon since lucide doesn't have it
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Custom Reddit icon
const RedditIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

// Custom WhatsApp icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface ShareLeagueModalProps {
  league: {
    id: string;
    name: string;
    code: string;
  };
  joinCode: string;
  isPrivate: boolean;
  onClose: () => void;
}

export function ShareLeagueModal({
  league,
  joinCode,
  isPrivate,
  onClose,
}: ShareLeagueModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const getInviteLink = () => {
    return `${window.location.origin}/join/${league.code}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaX = () => {
    const text = `Join my Survivor Fantasy League "${league.name}"! 🏝️🔥`;
    const url = getInviteLink();
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareViaFacebook = () => {
    const url = getInviteLink();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const shareViaSMS = () => {
    const text = `Join my Survivor Fantasy League! ${getInviteLink()}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join my Survivor Fantasy League: ${league.name}`;
    const body = `Hey!\n\nI created a Survivor Fantasy League and want you to join!\n\nLeague: ${league.name}\nJoin here: ${getInviteLink()}\n\nLet's see who can outwit, outplay, and outlast! 🏝️`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
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

  const shareViaReddit = () => {
    const title = `Join my Survivor Fantasy League: ${league.name}`;
    const url = getInviteLink();
    window.open(
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-neutral-800">Share Your League</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-neutral-800">{league.name}</h3>
          <p className="text-neutral-500 text-sm">League created successfully!</p>
        </div>

        <div className="bg-cream-50 rounded-xl p-4 mb-6 border border-cream-200">
          <p className="text-neutral-500 text-xs mb-1 text-center">Invite Code</p>
          <p className="text-2xl font-mono font-bold text-burgundy-500 tracking-wider text-center">
            {league.code}
          </p>
          {isPrivate && joinCode && (
            <p className="text-neutral-400 text-xs mt-2 text-center">
              Join Password: <span className="font-mono">{joinCode}</span>
            </p>
          )}
        </div>

        <button
          onClick={copyInviteLink}
          className="w-full btn btn-primary mb-4 flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-5 w-5" />
              Link Copied!
            </>
          ) : (
            <>
              <Copy className="h-5 w-5" />
              Copy Invite Link
            </>
          )}
        </button>

        <p className="text-neutral-500 text-sm text-center mb-3">Or share via:</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <button
            onClick={shareViaSMS}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="h-6 w-6 text-green-600" />
            <span className="text-xs text-neutral-600">SMS</span>
          </button>
          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Mail className="h-6 w-6 text-blue-600" />
            <span className="text-xs text-neutral-600">Email</span>
          </button>
          <button
            onClick={shareViaWhatsApp}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <WhatsAppIcon className="h-6 w-6 text-emerald-600" />
            <span className="text-xs text-neutral-600">WhatsApp</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={shareViaX}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            <XIcon className="h-6 w-6 text-neutral-800" />
            <span className="text-xs text-neutral-600">X</span>
          </button>
          <button
            onClick={shareViaFacebook}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <Facebook className="h-6 w-6 text-indigo-600" />
            <span className="text-xs text-neutral-600">Facebook</span>
          </button>
          <button
            onClick={shareViaReddit}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <RedditIcon className="h-6 w-6 text-orange-600" />
            <span className="text-xs text-neutral-600">Reddit</span>
          </button>
        </div>

        <button
          onClick={() => {
            onClose();
            navigate(`/leagues/${league.id}`);
          }}
          className="w-full btn btn-secondary mt-4"
        >
          Go to League
        </button>
      </div>
    </div>
  );
}
