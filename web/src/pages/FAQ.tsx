/**
 * FAQ Page
 *
 * Frequently Asked Questions with collapsible sections.
 * Content is managed via CMS.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { ChevronDown, HelpCircle, Loader2 } from 'lucide-react';
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
          <h1 className="text-3xl font-display font-bold text-neutral-800 mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-neutral-500">
            Everything you need to know about Reality Games Fantasy League
          </p>
        </div>

        {/* Expand/Collapse All */}
        <div className="flex justify-end gap-2 mb-6">
          <button
            onClick={expandAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            Expand All
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
          >
            Collapse All
          </button>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.name}>
              <h2 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-burgundy-500" />
                {category.name}
              </h2>

              <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden divide-y divide-cream-100">
                {category.items.map((faq) => (
                  <div key={faq.id}>
                    <button
                      onClick={() => toggleItem(faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-cream-50 transition-colors"
                    >
                      <span className="font-medium text-neutral-800 pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 text-neutral-400 flex-shrink-0 transition-transform ${
                          openItems.has(faq.id) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openItems.has(faq.id) && (
                      <div className="px-6 pb-4 text-neutral-600 leading-relaxed">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
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
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">Still have questions?</h3>
          <p className="text-neutral-600 mb-4">
            We're here to help! Reach out and we'll get back to you as soon as possible.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-burgundy-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-burgundy-600 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
