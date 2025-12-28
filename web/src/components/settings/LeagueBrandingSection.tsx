/**
 * League Branding Section Component
 *
 * Photo upload and description editing for leagues.
 */

import { useState } from 'react';
import { ImageIcon, Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LeagueBrandingSectionProps {
  leagueId: string;
  photoUrl: string;
  description: string;
  onPhotoChange: (url: string) => void;
  onDescriptionChange: (description: string) => void;
}

export function LeagueBrandingSection({
  leagueId,
  photoUrl,
  description,
  onPhotoChange,
  onDescriptionChange,
}: LeagueBrandingSectionProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !leagueId) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leagueId}.${fileExt}`;
      const filePath = `league-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('public').getPublicUrl(filePath);

      onPhotoChange(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h3 className="text-neutral-800 font-medium mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-burgundy-500" />
        League Branding
      </h3>

      {/* Photo Upload */}
      <div className="mb-6">
        <span className="text-neutral-500 text-sm mb-2 block">League Photo</span>
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="League"
              className="w-20 h-20 rounded-xl object-cover border-2 border-cream-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-cream-100 border-2 border-dashed border-cream-300 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-neutral-300" />
            </div>
          )}
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
            <div className="flex items-center justify-center gap-2 bg-cream-100 hover:bg-cream-200 border border-cream-200 rounded-xl py-3 px-4 cursor-pointer transition-colors">
              {uploadingPhoto ? (
                <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
              ) : (
                <Upload className="h-5 w-5 text-neutral-500" />
              )}
              <span className="text-neutral-600 text-sm font-medium">
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Description */}
      <label className="block">
        <span className="text-neutral-800 font-medium flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-burgundy-500" />
          Description
        </span>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Tell members what your league is about..."
          className="input min-h-[100px] resize-none"
          maxLength={500}
        />
        <p className="text-neutral-400 text-xs mt-1 text-right">{description.length}/500</p>
      </label>
    </div>
  );
}
