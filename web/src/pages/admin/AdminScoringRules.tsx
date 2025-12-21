import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Plus, Edit2, Trash2, Save, X, Loader2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ScoringRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  points: number;
  category: string | null;
  is_negative: boolean;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  'Challenges',
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    points: 0,
    category: CATEGORIES[0],
    is_negative: false,
    is_active: true,
  });

  // Fetch all scoring rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-scoring-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .order('category')
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

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
      const { error } = await supabase
        .from('scoring_rules')
        .update(data)
        .eq('id', id);
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

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      points: 0,
      category: CATEGORIES[0],
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
      category: rule.category || CATEGORIES[0],
      is_negative: rule.is_negative,
      is_active: rule.is_active,
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
    setExpandedCategories(prev => {
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

  const groupedRules = CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredRules?.filter((r: ScoringRule) => r.category === category) || [];
    return acc;
  }, {} as Record<string, ScoringRule[]>);

  const stats = {
    total: rules?.length || 0,
    active: rules?.filter((r: ScoringRule) => r.is_active).length || 0,
    positive: rules?.filter((r: ScoringRule) => !r.is_negative).length || 0,
    negative: rules?.filter((r: ScoringRule) => r.is_negative).length || 0,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-gold-500" />
            Scoring Rules
          </h1>
          <p className="text-burgundy-200">{rules?.length || 0} rules defined</p>
        </div>
        <button
          onClick={startAdding}
          className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-burgundy-300 text-xs">Total</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{stats.active}</p>
          <p className="text-burgundy-300 text-xs">Active</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{stats.positive}</p>
          <p className="text-burgundy-300 text-xs">Positive</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">{stats.negative}</p>
          <p className="text-burgundy-300 text-xs">Negative</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingRule) && (
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-white font-medium mb-4">
            {editingRule ? 'Edit Rule' : 'Add New Rule'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-burgundy-300 text-sm mb-1 block">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VOTE_CORRECT"
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500 font-mono"
              />
            </div>
            <div>
              <label className="text-burgundy-300 text-sm mb-1 block">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-burgundy-300 text-sm mb-1 block">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Voted correctly"
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-burgundy-300 text-sm mb-1 block">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Points for voting with the majority"
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="text-burgundy-300 text-sm mb-1 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={formData.is_negative}
                  onChange={(e) => setFormData({ ...formData, is_negative: e.target.checked })}
                  className="rounded"
                />
                Negative Points
              </label>
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createRule.isPending || updateRule.isPending}
              className="flex-1 bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {(createRule.isPending || updateRule.isPending) ? (
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
              className="px-4 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-burgundy-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Rules by Category */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const categoryRules = groupedRules[category];
          if (categoryRules.length === 0) return null;

          return (
            <div key={category} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-white font-medium">{category}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-burgundy-300 text-sm">{categoryRules.length} rules</span>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="h-4 w-4 text-burgundy-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-burgundy-400" />
                  )}
                </div>
              </button>

              {expandedCategories.has(category) && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {categoryRules.map((rule: ScoringRule) => (
                    <div
                      key={rule.id}
                      className={`px-4 py-3 flex items-center gap-3 ${!rule.is_active ? 'opacity-50' : ''}`}
                    >
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                        rule.is_negative ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {rule.is_negative ? '-' : '+'}{Math.abs(rule.points)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{rule.name}</p>
                        <p className="text-burgundy-400 text-xs font-mono">{rule.code}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(rule)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-burgundy-300" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this rule?')) {
                              deleteRule.mutate(rule.id);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
