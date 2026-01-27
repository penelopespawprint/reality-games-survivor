/**
 * Admin FAQ Management
 *
 * Create, edit, delete, and reorder FAQ items.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminNavBar } from '@/components/AdminNavBar';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Loader2,
  GripVertical,
} from 'lucide-react';

interface FAQItem {
  id: string;
  key: string;
  page: string;
  section: string | null;
  content: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const FAQ_CATEGORIES = [
  'Getting Started',
  'Gameplay',
  'Leagues',
  'Scoring',
  'Support',
  'Other',
];

export function AdminFAQ() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Getting Started');

  // Fetch FAQs
  const { data: faqs, isLoading } = useQuery({
    queryKey: ['admin', 'faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('page', 'faq')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FAQItem[];
    },
  });

  // Fetch FAQ categories
  const { data: categoryRecords, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin', 'faq-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('page', 'faq_categories')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Seed default categories if none exist
  useEffect(() => {
    if (categoryRecords && categoryRecords.length === 0) {
      const DEFAULT_CATEGORIES = [
        'Getting Started',
        'Gameplay',
        'Leagues',
        'Scoring',
        'Support',
        'Other',
      ];
      Promise.all(
        DEFAULT_CATEGORIES.map((name, index) =>
          supabase.from('site_copy').insert({
            page: 'faq_categories',
            key: `faq_category_${name.toLowerCase().replace(/\s+/g, '_')}`,
            content: name,
            sort_order: index,
            is_active: true,
          })
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'faq-categories'] });
      });
    }
  }, [categoryRecords, queryClient]);

  // Create FAQ
  const createFAQ = useMutation({
    mutationFn: async () => {
      const key = `faq.${question.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50)}`;
      const maxSort = faqs?.reduce((max, f) => Math.max(max, f.sort_order || 0), 0) || 0;

      const { error } = await supabase.from('site_copy').insert({
        key,
        page: 'faq',
        section: category,
        content_type: 'html',
        content: answer,
        description: question,
        sort_order: maxSort + 1,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] });
      resetForm();
    },
  });

  // Update FAQ
  const updateFAQ = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FAQItem> }) => {
      const { error } = await supabase.from('site_copy').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] });
      setEditingId(null);
    },
  });

  // Delete FAQ
  const deleteFAQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_copy').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] });
    },
  });

  // Move FAQ up/down within its category
  const moveFAQ = useMutation({
    mutationFn: async ({ id, direction, categoryItems }: { id: string; direction: 'up' | 'down'; categoryItems: FAQItem[] }) => {
      if (!categoryItems || categoryItems.length === 0) return;

      const currentIndex = categoryItems.findIndex((f) => f.id === id);
      if (currentIndex === -1) return;

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapIndex < 0 || swapIndex >= categoryItems.length) return;

      const current = categoryItems[currentIndex];
      const swap = categoryItems[swapIndex];

      // Swap sort orders
      await supabase.from('site_copy').update({ sort_order: swap.sort_order }).eq('id', current.id);
      await supabase.from('site_copy').update({ sort_order: current.sort_order }).eq('id', swap.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faqs'] });
    },
  });

  // Category mutations
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const maxSort = categoryRecords?.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) || 0;
      const { error } = await supabase.from('site_copy').insert({
        page: 'faq_categories',
        key: `faq_category_${Date.now()}`,
        content: name,
        sort_order: maxSort + 1,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faq-categories'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('site_copy').update({ content: name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faq-categories'] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // Check if any FAQs use this category
      const categoryName = categoryRecords?.find(c => c.id === id)?.content;
      const faqsUsingCategory = faqs?.filter(f => f.section === categoryName).length || 0;
      if (faqsUsingCategory > 0) {
        throw new Error(`Cannot delete category with ${faqsUsingCategory} FAQs. Reassign them first.`);
      }
      const { error } = await supabase.from('site_copy').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'faq-categories'] });
    },
  });

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setCategory('Getting Started');
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (faq: FAQItem) => {
    setEditingId(faq.id);
    setQuestion(faq.description || '');
    setAnswer(faq.content);
    setCategory(faq.section || 'Getting Started');
  };

  const quillModules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet', 'link'];

  // Group FAQs by category
  const groupedFaqs = faqs?.reduce<Record<string, FAQItem[]>>((acc, faq) => {
    const cat = faq.section || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-cream-50">
      <AdminNavBar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-burgundy-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">FAQ Manager</h1>
              <p className="text-sm text-neutral-500">Create and manage FAQ content</p>
            </div>
          </div>

          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-burgundy-500 text-white px-4 py-2 rounded-xl hover:bg-burgundy-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add FAQ
            </button>
          )}
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">
              {isCreating ? 'New FAQ' : 'Edit FAQ'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                  placeholder="How do I join a league?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                >
                  {categoryRecords?.map((cat) => (
                    <option key={cat.id} value={cat.content}>
                      {cat.content}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Answer</label>
                <div className="border border-cream-200 rounded-xl overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={answer}
                    onChange={setAnswer}
                    modules={quillModules}
                    formats={quillFormats}
                    className="bg-white"
                    style={{ minHeight: '150px' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-colors"
                >
                  <X className="h-4 w-4 inline mr-1" />
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingId) {
                      updateFAQ.mutate({
                        id: editingId,
                        updates: { content: answer, description: question, section: category },
                      });
                    } else {
                      createFAQ.mutate();
                    }
                  }}
                  disabled={!question || !answer}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 inline mr-1" />
                  {editingId ? 'Save Changes' : 'Create FAQ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Management */}
        {!isCreating && !editingId && (
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">Categories</h2>
              <button
                onClick={() => {
                  const name = prompt('Enter category name:');
                  if (name) createCategory.mutate(name);
                }}
                className="flex items-center gap-2 text-burgundy-500 hover:text-burgundy-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
            {categoriesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 text-burgundy-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryRecords?.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1 bg-cream-100 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-neutral-700">{cat.content}</span>
                    <button
                      onClick={() => {
                        const newName = prompt('Edit category name:', cat.content);
                        if (newName && newName !== cat.content) {
                          updateCategory.mutate({ id: cat.id, name: newName });
                        }
                      }}
                      className="text-neutral-400 hover:text-burgundy-500 transition-colors p-1"
                      title="Edit category"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${cat.content}"?`)) {
                          deleteCategory.mutate(cat.id).catch(err => alert(err.message));
                        }
                      }}
                      className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                      title="Delete category"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {categoryRecords?.length === 0 && (
                  <p className="text-sm text-neutral-500">No categories yet. Add one to get started.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* FAQ List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {groupedFaqs &&
              Object.entries(groupedFaqs).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                    {cat} ({items.length})
                  </h3>

                  <div className="bg-white rounded-2xl shadow-card border border-cream-200 divide-y divide-cream-100">
                    {items.map((faq, index) => (
                      <div
                        key={faq.id}
                        className="p-4 flex items-start gap-4 hover:bg-cream-50 transition-colors"
                      >
                        {/* Drag handle / reorder */}
                        <div className="flex flex-col gap-1 pt-1">
                          <button
                            onClick={() => moveFAQ.mutate({ id: faq.id, direction: 'up', categoryItems: items })}
                            disabled={index === 0}
                            className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <GripVertical className="h-4 w-4 text-neutral-300" />
                          <button
                            onClick={() => moveFAQ.mutate({ id: faq.id, direction: 'down', categoryItems: items })}
                            disabled={index === items.length - 1}
                            className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800 mb-1">{faq.description}</p>
                          <div
                            className="text-sm text-neutral-500 line-clamp-2 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: faq.content }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(faq)}
                            className="p-2 text-neutral-400 hover:text-burgundy-500 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this FAQ?')) {
                                deleteFAQ.mutate(faq.id);
                              }
                            }}
                            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {(!faqs || faqs.length === 0) && (
              <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-12 text-center">
                <HelpCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No FAQs yet. Click "Add FAQ" to create one.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminFAQ;
