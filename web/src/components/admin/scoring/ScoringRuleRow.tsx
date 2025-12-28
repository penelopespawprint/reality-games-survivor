/**
 * Scoring Rule Row Component
 *
 * A single row in the scoring form with increment/decrement controls.
 */

interface ScoringRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  is_negative: boolean;
}

interface ScoringRuleRowProps {
  rule: ScoringRule;
  quantity: number;
  onUpdateScore: (ruleId: string, value: number) => void;
}

export function ScoringRuleRow({ rule, quantity, onUpdateScore }: ScoringRuleRowProps) {
  const ruleTotal = rule.points * quantity;

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-cream-50 transition-colors">
      <div
        className={`w-14 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
          rule.is_negative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}
      >
        {rule.points >= 0 ? '+' : ''}
        {rule.points}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-neutral-800">{rule.name}</p>
        {rule.description && (
          <p className="text-xs text-neutral-500 mt-0.5 truncate">{rule.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateScore(rule.id, quantity - 1)}
            className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => onUpdateScore(rule.id, parseInt(e.target.value) || 0)}
            className="w-14 h-10 text-center border border-cream-200 rounded-lg focus:ring-2 focus:ring-burgundy-500"
          />
          <button
            onClick={() => onUpdateScore(rule.id, quantity + 1)}
            className="w-8 h-8 rounded-lg bg-cream-100 text-neutral-600 hover:bg-cream-200 flex items-center justify-center font-bold"
          >
            +
          </button>
        </div>
        {quantity > 0 && (
          <div
            className={`w-16 text-right font-bold ${ruleTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            = {ruleTotal >= 0 ? '+' : ''}
            {ruleTotal}
          </div>
        )}
      </div>
    </div>
  );
}
