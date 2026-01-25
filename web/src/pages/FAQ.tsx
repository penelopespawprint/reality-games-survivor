/**
 * FAQ Page
 *
 * Frequently Asked Questions with collapsible sections.
 * Content is managed via CMS. Admins can edit inline when edit mode is on.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { useAuth } from '@/lib/auth';
import { useEditMode } from '@/lib/hooks/useEditMode';
import { ChevronDown, HelpCircle, Loader2, Pencil, Check, X, Trash2, ChevronUp, LayoutDashboard, Trophy, BookOpen, Calculator, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sort_order: number;
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

// Default FAQ content (used if CMS is empty)
const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'How do I join a league?',
    answer: 'You can join a league by browsing public leagues on the Leagues page, or by entering an invite code from a friend. If the league requires a donation, you\'ll be redirected to complete payment before joining.',
    category: 'Getting Started',
    sort_order: 1,
  },
  {
    id: '2',
    question: 'How does the draft work?',
    answer: 'Each league holds a draft where players take turns selecting castaways. The draft order is randomized, and you can set your draft rankings ahead of time. If you miss your pick, the system will auto-draft based on your rankings.',
    category: 'Getting Started',
    sort_order: 2,
  },
  {
    id: '3',
    question: 'How do weekly picks work?',
    answer: 'Each week, you select one castaway from your roster to be your "active" pick. That castaway earns points for you based on their performance in the episode. Picks lock before each episode airs.',
    category: 'Gameplay',
    sort_order: 3,
  },
  {
    id: '4',
    question: 'How is scoring calculated?',
    answer: 'Castaways earn points for various actions like winning challenges, finding idols, receiving confessionals, and surviving tribal council. Check the Scoring Rules page for the full breakdown of point values.',
    category: 'Gameplay',
    sort_order: 4,
  },
  {
    id: '5',
    question: 'What happens if my castaway is eliminated?',
    answer: 'If a castaway on your roster is eliminated, they remain on your roster but can no longer be selected as your weekly pick. You\'ll need to choose from your remaining active castaways.',
    category: 'Gameplay',
    sort_order: 5,
  },
  {
    id: '6',
    question: 'Can I be in multiple leagues?',
    answer: 'Yes! You can join as many leagues as you want. Each league has its own draft, roster, and standings. Your performance in one league doesn\'t affect your other leagues.',
    category: 'Leagues',
    sort_order: 6,
  },
  {
    id: '7',
    question: 'How do paid leagues work?',
    answer: 'Some leagues require a donation to join. 100% of donations go to charity through our 501(c)(3) nonprofit partner. You\'ll receive a tax receipt via email after your donation.',
    category: 'Leagues',
    sort_order: 7,
  },
  {
    id: '8',
    question: 'How do I create my own league?',
    answer: 'Click "Create League" on the Leagues page. You can set the league name, whether it\'s public or private, and optionally require a donation. You\'ll receive an invite code to share with friends.',
    category: 'Leagues',
    sort_order: 8,
  },
  {
    id: '9',
    question: 'When are scores updated?',
    answer: 'Scores are typically updated within 24 hours after each episode airs. You\'ll receive a notification when scores are finalized and standings are updated.',
    category: 'Scoring',
    sort_order: 9,
  },
  {
    id: '10',
    question: 'What is the global leaderboard?',
    answer: 'The global leaderboard ranks all players across all leagues based on a weighted scoring system. It accounts for the number of leagues you\'re in and your average performance.',
    category: 'Scoring',
    sort_order: 10,
  },
  {
    id: '11',
    question: 'How do I contact support?',
    answer: 'You can reach us through the Contact page. We typically respond within 24-48 hours. For urgent issues, include "URGENT" in your subject line.',
    category: 'Support',
    sort_order: 11,
  },
  {
    id: '12',
    question: 'Can I change my weekly pick after submitting?',
    answer: 'Yes, you can change your pick as many times as you want until picks lock. Once locked (typically before the episode airs), picks cannot be changed.',
    category: 'Gameplay',
    sort_order: 12,
  },
];

export default function FAQ() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const { getCopy } = useSiteCopy();
  const { isAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const queryClient = useQueryClient();

  // Mutation to update FAQ item
  const updateFAQ = useMutation({
    mutationFn: async ({ id, question, answer }: { id: string; question: string; answer: string }) => {
      const { error } = await supabase
        .from('site_copy')
        .update({
          key: `faq.${question.toLowerCase().replace(/\s+/g, '_').replace(/[?]/g, '')}`,
          content: answer
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-content'] });
      setEditingId(null);
    },
  });

  // Mutation to delete FAQ item
  const deleteFAQ = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('site_copy')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-content'] });
    },
  });

  // Mutation to swap sort orders of two FAQ items
  const swapFAQOrder = useMutation({
    mutationFn: async ({ item1Id, item1NewOrder, item2Id, item2NewOrder }: {
      item1Id: string;
      item1NewOrder: number;
      item2Id: string;
      item2NewOrder: number;
    }) => {
      // Use a transaction-like approach: update both in sequence
      const { error: error1 } = await supabase
        .from('site_copy')
        .update({ sort_order: item1NewOrder })
        .eq('id', item1Id);
      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('site_copy')
        .update({ sort_order: item2NewOrder })
        .eq('id', item2Id);
      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-content'] });
    },
  });

  const handleDelete = (id: string, question: string) => {
    if (confirm(`Delete FAQ: "${question}"?`)) {
      deleteFAQ.mutate(id);
    }
  };

  const handleMoveUp = (faq: FAQItem, categoryItems: FAQItem[]) => {
    const currentIndex = categoryItems.findIndex(item => item.id === faq.id);
    if (currentIndex > 0) {
      const prevItem = categoryItems[currentIndex - 1];
      // Swap sort orders in a single mutation
      swapFAQOrder.mutate({
        item1Id: faq.id,
        item1NewOrder: prevItem.sort_order,
        item2Id: prevItem.id,
        item2NewOrder: faq.sort_order,
      });
    }
  };

  const handleMoveDown = (faq: FAQItem, categoryItems: FAQItem[]) => {
    const currentIndex = categoryItems.findIndex(item => item.id === faq.id);
    if (currentIndex < categoryItems.length - 1) {
      const nextItem = categoryItems[currentIndex + 1];
      // Swap sort orders in a single mutation
      swapFAQOrder.mutate({
        item1Id: faq.id,
        item1NewOrder: nextItem.sort_order,
        item2Id: nextItem.id,
        item2NewOrder: faq.sort_order,
      });
    }
  };

  const startEditing = (faq: FAQItem) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    // Make sure item is open when editing
    setOpenItems((prev) => new Set([...prev, faq.id]));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const saveEditing = () => {
    if (editingId) {
      updateFAQ.mutate({ id: editingId, question: editQuestion, answer: editAnswer });
    }
  };

  // Fetch FAQ content from CMS (site_copy table)
  const { data: faqData, isLoading } = useQuery({
    queryKey: ['faq-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('page', 'faq')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // If we have CMS content, parse it into FAQ format
      if (data && data.length > 0) {
        return data.map((item, index) => ({
          id: item.id,
          question: item.key.replace('faq.', '').replace(/_/g, ' '),
          answer: item.content,
          category: item.section || 'General',
          sort_order: index,
        })) as FAQItem[];
      }

      // Fall back to default FAQs
      return DEFAULT_FAQS;
    },
  });

  const faqs = faqData || DEFAULT_FAQS;

  // Group FAQs by category
  const groupedFaqs = faqs.reduce<Record<string, FAQItem[]>>((acc, faq) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  const categories: FAQCategory[] = Object.entries(groupedFaqs).map(([name, items]) => ({
    name,
    items: items.sort((a, b) => a.sort_order - b.sort_order),
  }));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenItems(new Set(faqs.map((f) => f.id)));
  };

  const collapseAll = () => {
    setOpenItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-burgundy-600" />
          </div>
          <EditableText copyKey="faq.header.title" as="h1" className="text-3xl font-display font-bold text-neutral-800 mb-2">
            {getCopy('faq.header.title', 'Frequently Asked Questions')}
          </EditableText>
          <EditableText copyKey="faq.header.subtitle" as="p" className="text-neutral-500">
            {getCopy('faq.header.subtitle', 'Everything you need to know about Reality Games Fantasy League')}
          </EditableText>
        </div>

        {/* Quick Links */}
        <div className="mb-10 bg-white rounded-2xl shadow-card border border-cream-200 p-6">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4 text-center">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link
              to="/dashboard"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-burgundy-50 border border-cream-200 hover:border-burgundy-200 transition-colors group"
            >
              <LayoutDashboard className="h-6 w-6 text-burgundy-500 group-hover:text-burgundy-600" />
              <span className="text-sm font-medium text-neutral-700 group-hover:text-burgundy-700">Dashboard</span>
            </Link>
            <Link
              to="/draft/rankings"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-burgundy-50 border border-cream-200 hover:border-burgundy-200 transition-colors group"
            >
              <Trophy className="h-6 w-6 text-burgundy-500 group-hover:text-burgundy-600" />
              <span className="text-sm font-medium text-neutral-700 group-hover:text-burgundy-700">Draft Rankings</span>
            </Link>
            <Link
              to="/how-to-play"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-burgundy-50 border border-cream-200 hover:border-burgundy-200 transition-colors group"
            >
              <BookOpen className="h-6 w-6 text-burgundy-500 group-hover:text-burgundy-600" />
              <span className="text-sm font-medium text-neutral-700 group-hover:text-burgundy-700">How to Play</span>
            </Link>
            <Link
              to="/scoring-rules"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-burgundy-50 border border-cream-200 hover:border-burgundy-200 transition-colors group"
            >
              <Calculator className="h-6 w-6 text-burgundy-500 group-hover:text-burgundy-600" />
              <span className="text-sm font-medium text-neutral-700 group-hover:text-burgundy-700">Score Rules</span>
            </Link>
            <Link
              to="/timeline"
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-burgundy-50 border border-cream-200 hover:border-burgundy-200 transition-colors group"
            >
              <Calendar className="h-6 w-6 text-burgundy-500 group-hover:text-burgundy-600" />
              <span className="text-sm font-medium text-neutral-700 group-hover:text-burgundy-700">Weekly Timeline</span>
            </Link>
          </div>
        </div>

        {/* Expand/Collapse All */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={expandAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            <EditableText copyKey="faq.expand_all" as="span" className="">{getCopy('faq.expand_all', 'Expand All')}</EditableText>
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            <EditableText copyKey="faq.collapse_all" as="span" className="">{getCopy('faq.collapse_all', 'Collapse All')}</EditableText>
          </button>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.name}>
              <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-burgundy-500" />
                <EditableText
                  copyKey={`faq.category.${category.name.toLowerCase().replace(/\s+/g, '_')}`}
                  as="span"
                  className=""
                >
                  {getCopy(`faq.category.${category.name.toLowerCase().replace(/\s+/g, '_')}`, category.name)}
                </EditableText>
              </h2>

              <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden divide-y divide-cream-100">
                {category.items.map((faq) => (
                  <div key={faq.id}>
                    {/* Question row */}
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleItem(faq.id)}
                        className="flex-1 px-6 py-4 flex items-center justify-between text-left hover:bg-cream-50 transition-colors"
                      >
                        {editingId === faq.id ? (
                          <input
                            type="text"
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 mr-4 px-3 py-1 border-2 border-burgundy-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                          />
                        ) : (
                          <span className={`font-medium text-neutral-800 pr-4 ${isAdmin && isEditMode ? 'border-b-2 border-dashed border-burgundy-300' : ''}`}>
                            {faq.question}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-5 w-5 text-neutral-400 flex-shrink-0 transition-transform ${
                            openItems.has(faq.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {/* Admin controls: Edit, Reorder, Delete */}
                      {isAdmin && isEditMode && editingId !== faq.id && (
                        <div className="flex items-center gap-1 mr-2">
                          <button
                            onClick={() => handleMoveUp(faq, category.items)}
                            className="p-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 rounded transition-all"
                            title="Move Up"
                            disabled={category.items.indexOf(faq) === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(faq, category.items)}
                            className="p-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 rounded transition-all"
                            title="Move Down"
                            disabled={category.items.indexOf(faq) === category.items.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => startEditing(faq)}
                            className="p-1.5 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded transition-all"
                            title="Edit FAQ"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id, faq.question)}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-all"
                            title="Delete FAQ"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Answer section */}
                    {openItems.has(faq.id) && (
                      <div className="px-6 pb-4 text-neutral-600 leading-relaxed">
                        {editingId === faq.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border-2 border-burgundy-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                              placeholder="Answer (HTML supported)"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEditing}
                                disabled={updateFAQ.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                              >
                                {updateFAQ.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={updateFAQ.isPending}
                                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-400 hover:bg-neutral-500 text-white rounded-lg text-sm"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`prose prose-sm max-w-none ${isAdmin && isEditMode ? 'border-b-2 border-dashed border-burgundy-300' : ''}`}
                            dangerouslySetInnerHTML={{ __html: faq.answer }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions? */}
        <div className="mt-12 bg-gradient-to-r from-burgundy-50 to-amber-50 rounded-2xl p-8 text-center border border-burgundy-100">
          <EditableText copyKey="faq.cta.title" as="h3" className="text-xl font-semibold text-neutral-800 mb-2">
            {getCopy('faq.cta.title', 'Still have questions?')}
          </EditableText>
          <EditableText copyKey="faq.cta.description" as="p" className="text-neutral-600 mb-4">
            {getCopy('faq.cta.description', "We're here to help! Reach out and we'll get back to you as soon as possible.")}
          </EditableText>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-burgundy-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-burgundy-600 transition-colors"
          >
            <EditableText copyKey="faq.cta.button" as="span" className="">
              {getCopy('faq.cta.button', 'Contact Us')}
            </EditableText>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
