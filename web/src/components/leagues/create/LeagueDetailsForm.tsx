import { Users, FileText } from 'lucide-react';

interface LeagueDetailsFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
}

export function LeagueDetailsForm({
  name,
  setName,
  description,
  setDescription,
}: LeagueDetailsFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-burgundy-500" />
        League Details
      </h2>

      <label className="block mb-4">
        <span className="text-neutral-700 text-sm font-medium mb-2 block">League Name *</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Tribal Council"
          className="input"
          maxLength={50}
        />
      </label>

      <label className="block mb-4">
        <span className="text-neutral-700 text-sm font-medium mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-neutral-400" />
          Description (Optional)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A league for true Survivor superfans..."
          className="input min-h-[80px] resize-none"
          maxLength={200}
        />
        <p className="text-neutral-400 text-xs mt-1 text-right">{description.length}/200</p>
      </label>
    </div>
  );
}
