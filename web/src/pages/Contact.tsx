import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle,
  Loader2,
  User,
  HelpCircle,
  Bug,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';

type ContactReason = 'general' | 'support' | 'bug' | 'feature' | 'other';

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<ContactReason>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill user data if logged in
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set initial values from profile
  useState(() => {
    if (profile) {
      setName(profile.display_name || '');
      setEmail(profile.email || '');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create mailto link with form data
      const mailtoSubject = encodeURIComponent(`[RGFL ${reason.toUpperCase()}] ${subject}`);
      const mailtoBody = encodeURIComponent(
        `Name: ${name || profile?.display_name || 'Anonymous'}\n` +
          `Email: ${email || profile?.email || user?.email || 'Not provided'}\n` +
          `Reason: ${reason}\n` +
          `User ID: ${user?.id || 'Not logged in'}\n\n` +
          `Message:\n${message}`
      );

      // Open email client
      window.location.href = `mailto:support@realitygamesfantasyleague.com?subject=${mailtoSubject}&body=${mailtoBody}`;

      // Show success after a short delay (email client opens)
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
      }, 500);
    } catch {
      setError('Failed to open email client. Please try again.');
      setLoading(false);
    }
  };

  const reasonOptions = [
    {
      value: 'general',
      label: 'General Inquiry',
      icon: HelpCircle,
      description: 'General questions about RGFL',
    },
    {
      value: 'support',
      label: 'Support',
      icon: MessageSquare,
      description: 'Need help with your account or leagues',
    },
    { value: 'bug', label: 'Report a Bug', icon: Bug, description: 'Something not working right?' },
    {
      value: 'feature',
      label: 'Feature Request',
      icon: Lightbulb,
      description: 'Have an idea to make RGFL better?',
    },
    {
      value: 'other',
      label: 'Other',
      icon: AlertCircle,
      description: 'Anything else on your mind',
    },
  ];

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-elevated p-8 border border-cream-200 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">Message Sent!</h1>
          <p className="text-neutral-500 mb-6">
            Thank you for reaching out. Your email client should have opened with your message. We
            typically respond within 24-48 hours.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setSubject('');
              setMessage('');
            }}
            className="btn btn-secondary"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8 text-burgundy-600" />
        </div>
        <h1 className="text-3xl font-display font-bold text-neutral-800 mb-2">Contact Us</h1>
        <p className="text-neutral-500">
          Have questions, feedback, or just want to say hi? We'd love to hear from you!
        </p>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-2xl shadow-elevated p-6 border border-cream-200">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Email (if not logged in) */}
          {!user && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-10"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Logged in user info */}
          {user && profile && (
            <div className="p-4 bg-cream-50 rounded-xl border border-cream-200">
              <p className="text-sm text-neutral-500">Sending as:</p>
              <p className="font-medium text-neutral-800">{profile.display_name}</p>
              <p className="text-sm text-neutral-500">{profile.email}</p>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              What can we help you with?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {reasonOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value as ContactReason)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reason === option.value
                      ? 'border-burgundy-500 bg-burgundy-50 ring-2 ring-burgundy-100'
                      : 'border-cream-200 bg-white hover:border-burgundy-200'
                  }`}
                >
                  <option.icon
                    className={`h-5 w-5 mb-1 ${
                      reason === option.value ? 'text-burgundy-500' : 'text-neutral-400'
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      reason === option.value ? 'text-burgundy-700' : 'text-neutral-700'
                    }`}
                  >
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
              placeholder="Brief description of your inquiry"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input min-h-[150px] resize-y"
              placeholder="Tell us more..."
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !subject.trim() || !message.trim()}
            className="w-full btn btn-primary btn-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Opening Email...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Message
              </>
            )}
          </button>
        </form>
      </div>

      {/* Response Time */}
      <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-6 w-6 text-burgundy-500" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">Quick Response</h3>
            <p className="text-neutral-500 text-sm">
              We typically respond within 24-48 hours. For urgent matters during the season, we'll
              do our best to get back to you even faster!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
