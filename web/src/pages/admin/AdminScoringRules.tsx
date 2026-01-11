import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';

interface ScoringRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  is_negative: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
  effective_from_episode_id: string | null;
}

const DEFAULT_CATEGORIES = [
  'Pre-Merge Challenges',
  'Post-Merge Challenges',
  'Tribal Council',
  'Strategic Play',
  'Social Game',
  'Idols & Advantages',
  'Survival',
  'Confessionals',
  'Bonus',
  'Penalties',
];

export function AdminScoringRules() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES)
  );

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    points: 0,
    category: DEFAULT_CATEGORIES[0],
    is_negative: false,
    is_active: true,
  });

  // Fetch all scoring rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-scoring-rules'],
    queryFn: async (): Promise<ScoringRule[]> => {
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .order('category')
        .order('sort_order');
      if (error) throw error;
      // Cast to ScoringRule[], adding missing optional field
      return (data || []).map((r) => ({
        ...r,
        effective_from_episode_id: (r as { effective_from_episode_id?: string | null }).effective_from_episode_id ?? null,
      }));
    },
  });

  // Derive categories from rules + defaults
  const categories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...(rules?.map((r) => r.category).filter(Boolean) || []),
    ])
  ) as string[];

  // Create rule mutation
  const createRule = useMutation({
    mutationFn: async (data: Omit<ScoringRule, 'id'>) => {
      const { error } = await supabase.from('scoring_rules').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scoring-rules'] });
      setIsAdding(false);
      resetForm();
    },
  });

  // Update rule mutation
  const updateRule = useMutation({
    mutationFn: async ({ id, ...data }: ScoringRule) => {
      const { error } = await supabase.from('scoring_rules').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scoring-rules'] });
      setEditingRule(null);
      resetForm();
    },
  });

  // Delete rule mutation
  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scoring_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scoring-rules'] });
    },
  });

  // Quick toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('scoring_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scoring-rules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      points: 0,
      category: DEFAULT_CATEGORIES[0],
      is_negative: false,
      is_active: true,
    });
  };

  const startEditing = (rule: ScoringRule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      points: rule.points,
      category: rule.category || DEFAULT_CATEGORIES[0],
      is_negative: !!rule.is_negative,
      is_active: !!rule.is_active,
    });
    setIsAdding(false);
  };

  const startAdding = () => {
    setIsAdding(true);
    setEditingRule(null);
    resetForm();
  };

  const handleSubmit = () => {
    const ruleData = {
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      points: formData.points,
      category: formData.category,
      is_negative: formData.is_negative,
      is_active: formData.is_active,
      sort_order: 0,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...ruleData } as ScoringRule);
    } else {
      createRule.mutate(ruleData as any);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredRules = rules?.filter((rule: ScoringRule) => {
    const matchesSearch =
      rule.code.toLowerCase().includes(search.toLowerCase()) ||
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedRules = categories.reduce(
    (acc, category) => {
      acc[category] = filteredRules?.filter((r: ScoringRule) => r.category === category) || [];
      return acc;
    },
    {} as Record<string, ScoringRule[]>
  );

  const stats = {
    total: rules?.length || 0,
    active: rules?.filter((r: ScoringRule) => !!r.is_active && !r.effective_from_episode_id).length || 0,
    inactive: rules?.filter((r: ScoringRule) => !r.is_active).length || 0,
    pending: rules?.filter((r: ScoringRule) => !!r.effective_from_episode_id).length || 0,
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <AdminNavBar />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <AdminNavBar />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-burgundy-500" />
              Scoring Rules
            </h1>
            <p className="text-neutral-500">{rules?.length || 0} rules defined</p>
          </div>
          <button onClick={startAdding} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-3 border border-cream-200 text-center">
            <p className="text-xl font-bold text-neutral-800">{stats.total}</p>
            <p className="text-neutral-500 text-xs">Total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.active}</p>
            <p className="text-neutral-500 text-xs">Active</p>
          </div>
          <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-neutral-500">{stats.inactive}</p>
            <p className="text-neutral-500 text-xs">Inactive</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-neutral-500 text-xs">Pending</p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingRule) && (
          <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-4 mb-6">
            <h3 className="text-neutral-800 font-medium mb-4">
              {editingRule ? 'Edit Rule' : 'Add New Rule'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-neutral-500 text-sm mb-1 block">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="VOTE_CORRECT"
                  className="input font-mono"
                />
              </div>
              <div>
                <label className="text-neutral-500 text-sm mb-1 block">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) =>
                    setFormData({ ...formData, points: parseInt(e.target.value) || 0 })
                  }
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-neutral-500 text-sm mb-1 block">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Voted correctly"
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="text-neutral-500 text-sm mb-1 block">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Points for voting with the majority"
                  className="input"
                />
              </div>
              <div>
                <label className="text-neutral-500 text-sm mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.is_negative}
                    onChange={(e) => setFormData({ ...formData, is_negative: e.target.checked })}
                    className="w-4 h-4 rounded border-cream-300 text-burgundy-500"
                  />
                  Negative Points
                </label>
                <label className="flex items-center gap-2 text-neutral-800">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-cream-300 text-burgundy-500"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={createRule.isPending || updateRule.isPending}
                className="btn btn-primary flex-1"
              >
                {createRule.isPending || updateRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingRule(null);
                  resetForm();
                }}
                className="btn btn-secondary px-4"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules..."
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input px-3 py-2 w-40"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Rules by Category */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryRules = groupedRules[category];
            if (categoryRules.length === 0) return null;

            return (
              <div
                key={category}
                className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-cream-50 transition-colors"
                >
                  <h3 className="text-neutral-800 font-medium">{category}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 text-sm">{categoryRules.length} rules</span>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {expandedCategories.has(category) && (
                  <div className="border-t border-cream-200 divide-y divide-cream-100">
                    {categoryRules.map((rule: ScoringRule) => {
                      const isPending = !!rule.effective_from_episode_id;
                      return (
                        <div
                          key={rule.id}
                          className={`px-4 py-3 flex items-center gap-3 ${!rule.is_active ? 'bg-neutral-50' : ''}`}
                        >
                          {/* Quick Active Toggle */}
                          <button
                            onClick={() => toggleActive.mutate({ id: rule.id, is_active: !rule.is_active })}
                            disabled={toggleActive.isPending}
                            className="flex-shrink-0"
                            title={rule.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {rule.is_active ? (
                              <ToggleRight className="h-6 w-6 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-neutral-300" />
                            )}
                          </button>

                          {/* Points Badge */}
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded ${
                              rule.is_negative
                                ? 'bg-red-100 text-red-600'
                                : 'bg-green-100 text-green-600'
                            }`}
                          >
                            {rule.is_negative ? '-' : '+'}
                            {Math.abs(rule.points)}
                          </span>

                          {/* Rule Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium truncate ${rule.is_active ? 'text-neutral-800' : 'text-neutral-400'}`}>
                                {rule.name}
                              </p>
                              {isPending && (
                                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-400 text-xs font-mono">{rule.code}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(rule)}
                              className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-neutral-500" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this rule?')) {
                                  deleteRule.mutate(rule.id);
                                }
                              }}
                              className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
