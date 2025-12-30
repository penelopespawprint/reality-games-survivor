/**
 * Profile Header Component
 *
 * User avatar, display name editing, and email display.
 */

import { useState, useRef } from 'react';
import { User, Mail, Pencil, Loader2, Check, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProfileHeaderProps {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  userId: string;
  onUpdateName: (name: string) => void;
  onUpdateAvatar: (url: string) => void;
  isUpdating: boolean;
  error: string | null;
  success: string | null;
}

export function ProfileHeader({
  displayName,
  email,
  avatarUrl,
  userId,
  onUpdateName,
  onUpdateAvatar,
  isUpdating,
  error,
  success,
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateName(editName.trim());
      setIsEditing(false);
      setEditName('');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleStartEdit = () => {
    setEditName(displayName || '');
    setIsEditing(true);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Provide user-friendly error messages
        if (
          uploadError.message.includes('Bucket not found') ||
          uploadError.message.includes('not found')
        ) {
          setAvatarError(
            'Avatar storage is being set up. Please try again later or contact support.'
          );
        } else if (
          uploadError.message.includes('exceeded') ||
          uploadError.message.includes('size')
        ) {
          setAvatarError('Image is too large. Please choose a smaller file (max 2MB).');
        } else if (uploadError.message.includes('type') || uploadError.message.includes('mime')) {
          setAvatarError('Invalid file type. Please upload a JPG, PNG, or GIF image.');
        } else {
          setAvatarError('Unable to upload avatar. Please try again.');
        }
        console.error('Avatar upload error:', uploadError);
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Update user profile with new avatar URL
      onUpdateAvatar(publicUrl);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setAvatarError('Something went wrong uploading your avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <div className="flex items-center gap-4 mb-6">
        {/* Avatar with upload capability */}
        <div className="relative group">
          <div
            className="w-16 h-16 rounded-full overflow-hidden bg-burgundy-500 flex items-center justify-center cursor-pointer"
            onClick={handleAvatarClick}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || 'Profile'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
          </div>
          {/* Upload overlay */}
          <div
            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleAvatarClick}
          >
            {isUploadingAvatar ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploadingAvatar}
          />
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter display name"
                className="input flex-1"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={!editName.trim() || isUpdating}
                className="btn btn-primary"
              >
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save'}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary" disabled={isUpdating}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-neutral-800">{displayName}</h2>
              <button
                onClick={handleStartEdit}
                className="p-1 text-neutral-400 hover:text-burgundy-500 transition-colors"
                title="Edit display name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-neutral-500">{email}</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {(error || avatarError) && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error || avatarError}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          <Check className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Email display */}
      <div className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
        <Mail className="h-5 w-5 text-burgundy-500" />
        <div className="flex-1">
          <p className="text-neutral-800">{email}</p>
          <p className="text-neutral-400 text-sm">Primary email</p>
        </div>
        <Check className="h-5 w-5 text-green-500" />
      </div>
    </div>
  );
}
