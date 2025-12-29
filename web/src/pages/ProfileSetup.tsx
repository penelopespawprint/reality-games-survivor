/**
 * Profile Setup Page
 * 
 * Shown after new user signs up via magic link or OAuth.
 * Collects essential profile information.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, User, Phone, MapPin, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [hometown, setHometown] = useState('');
  const [favoriteCastaway, setFavoriteCastaway] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['user-profile-setup'],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Pre-fill form if user already has some data
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setPhone(user.phone || '');
      setHometown(user.hometown || '');
      setFavoriteCastaway(user.favorite_castaway || '');
    }
  }, [user]);

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: {
      display_name: string;
      phone?: string;
      hometown?: string;
      favorite_castaway?: string;
    }) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authUser.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      // Refresh profile and navigate to dashboard
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['user-profile-setup'] });
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      setError(error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setIsSubmitting(true);
    updateProfile.mutate({
      display_name: displayName.trim(),
      ...(phone.trim() && { phone: phone.trim() }),
      ...(hometown.trim() && { hometown: hometown.trim() }),
      ...(favoriteCastaway.trim() && { favorite_castaway: favoriteCastaway.trim() }),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-100 to-cream-200">
        <Loader2 className="h-8 w-8 animate-spin text-burgundy-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-elevated p-8 border border-cream-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-burgundy-500" />
              </div>
              <h1 className="text-3xl font-display font-bold text-neutral-800 mb-2">
                Complete Your Profile
              </h1>
              <p className="text-neutral-500">
                Tell us a bit about yourself to get started
              </p>
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 rounded-xl p-4 mb-6">
                <p className="text-error-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name - Required */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Display Name <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name as others will see it"
                    className="input w-full pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone - Optional */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Phone Number <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="input w-full pl-10"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Add your phone to receive SMS notifications and make picks via text
                  </p>
                </div>
              </div>

              {/* Hometown - Optional */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Hometown <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    type="text"
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    placeholder="Where are you from?"
                    className="input w-full pl-10"
                  />
                </div>
              </div>

              {/* Favorite Castaway - Optional */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Favorite Castaway <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  <input
                    type="text"
                    value={favoriteCastaway}
                    onChange={(e) => setFavoriteCastaway(e.target.value)}
                    placeholder="Who's your all-time favorite Survivor player?"
                    className="input w-full pl-10"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !displayName.trim()}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
