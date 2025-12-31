/**
 * Profile Info Component
 *
 * Displays user's bio, hometown, favorite castaway, and favorite season.
 */

import { useState } from 'react';
import { MapPin, Heart, Star, FileText, Pencil, Loader2, Check, X } from 'lucide-react';

interface ProfileInfoProps {
  bio: string | null;
  hometown: string | null;
  favoriteCastaway: string | null;
  favoriteSeason: string | null;
  onUpdate: (updates: {
    bio?: string;
    hometown?: string;
    favorite_castaway?: string;
    favorite_season?: string;
  }) => void;
  isUpdating: boolean;
}

const ALL_SURVIVOR_SEASONS = [
  { value: '', label: 'Not selected' },
  { value: 'borneo', label: 'Borneo (S1)' },
  { value: 'australian-outback', label: 'The Australian Outback (S2)' },
  { value: 'africa', label: 'Africa (S3)' },
  { value: 'marquesas', label: 'Marquesas (S4)' },
  { value: 'thailand', label: 'Thailand (S5)' },
  { value: 'amazon', label: 'The Amazon (S6)' },
  { value: 'pearl-islands', label: 'Pearl Islands (S7)' },
  { value: 'all-stars', label: 'All-Stars (S8)' },
  { value: 'vanuatu', label: 'Vanuatu (S9)' },
  { value: 'palau', label: 'Palau (S10)' },
  { value: 'guatemala', label: 'Guatemala (S11)' },
  { value: 'panama', label: 'Panama (S12)' },
  { value: 'cook-islands', label: 'Cook Islands (S13)' },
  { value: 'fiji', label: 'Fiji (S14)' },
  { value: 'china', label: 'China (S15)' },
  { value: 'micronesia', label: 'Micronesia (S16)' },
  { value: 'gabon', label: 'Gabon (S17)' },
  { value: 'tocantins', label: 'Tocantins (S18)' },
  { value: 'samoa', label: 'Samoa (S19)' },
  { value: 'heroes-vs-villains', label: 'Heroes vs. Villains (S20)' },
  { value: 'nicaragua', label: 'Nicaragua (S21)' },
  { value: 'redemption-island', label: 'Redemption Island (S22)' },
  { value: 'south-pacific', label: 'South Pacific (S23)' },
  { value: 'one-world', label: 'One World (S24)' },
  { value: 'philippines', label: 'Philippines (S25)' },
  { value: 'caramoan', label: 'Caramoan (S26)' },
  { value: 'blood-vs-water', label: 'Blood vs. Water (S27)' },
  { value: 'cagayan', label: 'Cagayan (S28)' },
  { value: 'san-juan-del-sur', label: 'San Juan del Sur (S29)' },
  { value: 'worlds-apart', label: 'Worlds Apart (S30)' },
  { value: 'cambodia', label: 'Cambodia (S31)' },
  { value: 'kaoh-rong', label: 'Kaôh Rōng (S32)' },
  { value: 'millennials-vs-gen-x', label: 'Millennials vs. Gen X (S33)' },
  { value: 'game-changers', label: 'Game Changers (S34)' },
  { value: 'heroes-healers-hustlers', label: 'Heroes vs. Healers vs. Hustlers (S35)' },
  { value: 'ghost-island', label: 'Ghost Island (S36)' },
  { value: 'david-vs-goliath', label: 'David vs. Goliath (S37)' },
  { value: 'edge-of-extinction', label: 'Edge of Extinction (S38)' },
  { value: 'island-of-the-idols', label: 'Island of the Idols (S39)' },
  { value: 'winners-at-war', label: 'Winners at War (S40)' },
  { value: '41', label: 'Survivor 41 (S41)' },
  { value: '42', label: 'Survivor 42 (S42)' },
  { value: '43', label: 'Survivor 43 (S43)' },
  { value: '44', label: 'Survivor 44 (S44)' },
  { value: '45', label: 'Survivor 45 (S45)' },
  { value: '46', label: 'Survivor 46 (S46)' },
  { value: '47', label: 'Survivor 47 (S47)' },
  { value: '48', label: 'Survivor 48 (S48)' },
  { value: '49', label: 'Survivor 49 (S49)' },
  { value: '50', label: 'Survivor 50 (S50)' },
];

function getSeasonLabel(value: string | null): string {
  if (!value) return 'Not selected';
  const season = ALL_SURVIVOR_SEASONS.find((s) => s.value === value);
  return season?.label || value;
}

export function ProfileInfo({
  bio,
  hometown,
  favoriteCastaway,
  favoriteSeason,
  onUpdate,
  isUpdating,
}: ProfileInfoProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const handleSave = () => {
    if (editingField) {
      const updates: Record<string, string> = {};
      if (editingField === 'bio') updates.bio = editValue;
      if (editingField === 'hometown') updates.hometown = editValue;
      if (editingField === 'favoriteCastaway') updates.favorite_castaway = editValue;
      if (editingField === 'favoriteSeason') updates.favorite_season = editValue;
      onUpdate(updates);
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (
    field: string,
    label: string,
    value: string | null,
    icon: React.ReactNode,
    isTextarea?: boolean,
    isSelect?: boolean
  ) => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-start gap-3 p-4 bg-cream-50 rounded-xl border border-cream-200">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-500 mb-1">{label}</p>
          {isEditing ? (
            <div className="space-y-2">
              {isSelect ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all bg-white text-sm"
                  autoFocus
                >
                  {ALL_SURVIVOR_SEASONS.map((season) => (
                    <option key={season.value} value={season.value}>
                      {season.label}
                    </option>
                  ))}
                </select>
              ) : isTextarea ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all resize-none text-sm"
                  rows={3}
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cream-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-500/20 outline-none transition-all text-sm"
                  autoFocus
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-burgundy-500 text-white text-sm rounded-lg hover:bg-burgundy-600 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className={`text-neutral-800 ${!value ? 'italic text-neutral-400' : ''}`}>
                {field === 'favoriteSeason' ? getSeasonLabel(value) : value || 'Not set'}
              </p>
              <button
                onClick={() => handleStartEdit(field, value)}
                className="p-1 text-neutral-400 hover:text-burgundy-500 transition-colors flex-shrink-0"
                title={`Edit ${label.toLowerCase()}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
      <h3 className="text-lg font-display font-bold text-neutral-800 mb-4">About You</h3>
      <div className="space-y-3">
        {renderField('bio', 'Bio', bio, <FileText className="h-5 w-5 text-burgundy-500" />, true)}
        {renderField(
          'hometown',
          'Hometown',
          hometown,
          <MapPin className="h-5 w-5 text-burgundy-500" />
        )}
        {renderField(
          'favoriteCastaway',
          'Favorite Castaway',
          favoriteCastaway,
          <Heart className="h-5 w-5 text-burgundy-500" />
        )}
        {renderField(
          'favoriteSeason',
          'Favorite Season',
          favoriteSeason,
          <Star className="h-5 w-5 text-burgundy-500" />,
          false,
          true
        )}
      </div>
    </div>
  );
}
