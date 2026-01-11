import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  FileText,
  Edit,
  Eye,
  Save,
  X,
  Send,
  Search,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Code,
  Type,
  Users,
  Star,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { supabase } from '@/lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

async function apiWithAuth(endpoint: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return response.json();
}

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  available_variables: string[];
  trigger_type: string | null;
  is_active: boolean;
  is_system: boolean;
  version: number;
  updated_at: string;
  send_frequency: string | null;
  send_time: string | null;
  send_day: string | null;
}

interface SiteCopy {
  id: string;
  key: string;
  page: string;
  section: string | null;
  content_type: string | null;
  content: string;
  description: string | null;
  is_active: boolean | null;
  updated_at: string | null;
}

interface Castaway {
  id: string;
  name: string;
  photo_url: string | null;
  fun_fact: string | null;
  status: string;
}

// Primary category tabs
type CategoryTab = 'emails' | 'sms' | 'castaways' | 'pages';

// Page names for the site content
const PAGE_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leagues', label: 'Leagues' },
  { id: 'castaways', label: 'Castaways' },
  { id: 'how-to-play', label: 'How to Play' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'draft-rankings', label: 'Draft Rankings' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'profile', label: 'Profile' },
  { id: 'contact', label: 'Contact' },
] as const;

export function AdminContent() {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('emails');
  const [activePage, setActivePage] = useState<string>('home');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<SiteCopy | null>(null);
  const [selectedCastaway, setSelectedCastaway] = useState<Castaway | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [castawayFunFact, setCastawayFunFact] = useState('');

  const queryClient = useQueryClient();

  // Fetch email templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin', 'email-templates', categoryFilter],
    queryFn: async () => {
      const response = await apiWithAuth(
        `/api/admin/content/email-templates?category=${categoryFilter}`
      );
      return response.data || [];
    },
  });

  // Fetch site copy for the active page
  const { data: pageContentData, isLoading: pageContentLoading } = useQuery({
    queryKey: ['admin', 'page-content', activePage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('page', activePage)
        .order('section')
        .order('key');
      if (error) throw error;
      return data || [];
    },
    enabled: activeCategory === 'pages',
  });

  // Fetch castaways for Season 50
  const { data: castawaysData, isLoading: castawaysLoading } = useQuery({
    queryKey: ['admin', 'castaways-content'],
    queryFn: async () => {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('number', 50)
        .single();
      if (!season) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('id, name, photo_url, fun_fact, status')
        .eq('season_id', season.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: activeCategory === 'castaways',
  });

  // Update castaway fun fact mutation
  const updateCastawayFunFact = useMutation({
    mutationFn: async ({ id, fun_fact }: { id: string; fun_fact: string }) => {
      const { error } = await supabase.from('castaways').update({ fun_fact }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'castaways-content'] });
      setEditMode(false);
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async (data: {
      slug: string;
      subject: string;
      html_body: string;
      is_active: boolean;
    }) => {
      return apiWithAuth(`/api/admin/content/email-templates/${data.slug}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      setEditMode(false);
    },
  });

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (data: {
      slug: string;
      name: string;
      description: string;
      category: string;
      subject: string;
      html_body: string;
      text_body?: string;
      available_variables: string[];
      trigger_type?: string;
      is_active: boolean;
    }) => {
      return apiWithAuth('/api/admin/content/email-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      setCreateMode(false);
      if (response?.data) {
        setSelectedTemplate(response.data);
      }
    },
  });

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (slug: string) => {
      return apiWithAuth(`/api/admin/content/email-templates/${slug}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      setSelectedTemplate(null);
    },
  });

  // Update site copy mutation
  const updateCopy = useMutation({
    mutationFn: async (data: { key: string; content: string; is_active: boolean }) => {
      return apiWithAuth(`/api/admin/content/site-copy/${encodeURIComponent(data.key)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-copy'] });
      setEditMode(false);
    },
  });

  // Send test email mutation
  const sendTestEmail = useMutation({
    mutationFn: async ({ slug, email }: { slug: string; email: string }) => {
      return apiWithAuth(`/api/admin/content/email-templates/${slug}/send-test`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          variables: getSampleVariables(selectedTemplate?.available_variables || []),
        }),
      });
    },
  });

  // Clear template cache mutation
  const clearCache = useMutation({
    mutationFn: async () => {
      return apiWithAuth('/api/admin/content/clear-cache', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-copy'] });
    },
  });

  const getSampleVariables = (vars: string[]): Record<string, string> => {
    const samples: Record<string, string> = {
      displayName: 'John Doe',
      email: 'john@example.com',
      leagueName: 'Survivor Superfans',
      seasonName: 'Season 50: In the Hands of the Fans',
      seasonNumber: '50',
      episodeNumber: '5',
      hoursRemaining: '3',
      daysRemaining: '7',
      daysUntilPremiere: '14',
      daysSinceSignup: '3',
      daysSinceLastActivity: '7',
      missedEpisodes: '2',
      commissionerName: 'Blake',
      memberCount: '8',
      maxMembers: '12',
      totalPoints: '156',
      bestRank: '3',
      winnerName: 'Mark the Chicken',
      percentComplete: '75',
      accuracy: '85',
      dashboardUrl: 'https://survivor.realitygamesfantasyleague.com/dashboard',
      leagueUrl: 'https://survivor.realitygamesfantasyleague.com/leagues/123',
      browseLeaguesUrl: 'https://survivor.realitygamesfantasyleague.com/leagues/browse',
      triviaUrl: 'https://survivor.realitygamesfantasyleague.com/trivia',
    };
    return vars.reduce((acc, v) => ({ ...acc, [v]: samples[v] || `{{${v}}}` }), {});
  };

  const filteredTemplates = ((templatesData as EmailTemplate[]) || []).filter(
    (t: EmailTemplate) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCastaways = ((castawaysData as Castaway[]) || []).filter((c: Castaway) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />
      <AdminNavBar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-neutral-800">Content Management</h1>
            <p className="text-neutral-600 mt-1">Edit email templates and site copy</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/social"
              className="flex items-center gap-2 px-4 py-2 bg-white text-neutral-700 rounded-xl hover:bg-cream-100 border border-cream-200 transition-colors"
            >
              <Send className="h-4 w-4" />
              Social Media
            </a>
            <a
              href="/admin/campaigns"
              className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Send Campaigns
            </a>
            <button
              onClick={() => clearCache.mutate()}
              disabled={clearCache.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${clearCache.isPending ? 'animate-spin' : ''}`} />
              {clearCache.isPending ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>
        </div>

        {/* Tabs - Organized by category */}
        <div className="mb-6">
          {/* Primary Category Tabs */}
          <div className="flex items-center justify-between border-b border-cream-200 pb-4 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveCategory('emails');
                  setSelectedTemplate(null);
                  setSelectedCopy(null);
                  setSelectedCastaway(null);
                  setEditMode(false);
                  setCreateMode(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeCategory === 'emails'
                    ? 'bg-burgundy-500 text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-cream-100 border border-cream-200'
                }`}
              >
                <Mail className="h-4 w-4" />
                Emails
              </button>
              <button
                onClick={() => {
                  setActiveCategory('sms');
                  setSelectedTemplate(null);
                  setSelectedCopy(null);
                  setSelectedCastaway(null);
                  setEditMode(false);
                  setCreateMode(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeCategory === 'sms'
                    ? 'bg-burgundy-500 text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-cream-100 border border-cream-200'
                }`}
              >
                <Send className="h-4 w-4" />
                SMS
              </button>
              <button
                onClick={() => {
                  setActiveCategory('castaways');
                  setSelectedTemplate(null);
                  setSelectedCopy(null);
                  setSelectedCastaway(null);
                  setEditMode(false);
                  setCreateMode(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeCategory === 'castaways'
                    ? 'bg-burgundy-500 text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-cream-100 border border-cream-200'
                }`}
              >
                <Users className="h-4 w-4" />
                Castaways
              </button>
              <button
                onClick={() => {
                  setActiveCategory('pages');
                  setSelectedTemplate(null);
                  setSelectedCopy(null);
                  setSelectedCastaway(null);
                  setEditMode(false);
                  setCreateMode(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeCategory === 'pages'
                    ? 'bg-burgundy-500 text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-cream-100 border border-cream-200'
                }`}
              >
                <FileText className="h-4 w-4" />
                Pages
              </button>
            </div>
            {activeCategory === 'emails' && (
              <button
                onClick={() => {
                  setCreateMode(true);
                  setSelectedTemplate(null);
                  setEditMode(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            )}
          </div>

          {/* Page Tabs - Only show when Pages category is active */}
          {activeCategory === 'pages' && (
            <div className="flex gap-2 flex-wrap">
              {PAGE_TABS.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    setActivePage(page.id);
                    setSelectedCopy(null);
                    setEditMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activePage === page.id
                      ? 'bg-teal-500 text-white'
                      : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
                  }`}
                >
                  {page.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
              {/* Search */}
              <div className="p-4 border-b border-cream-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder={activeCategory === 'emails' ? 'Search templates...' : activeCategory === 'castaways' ? 'Search castaways...' : 'Search content...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                  />
                </div>

                {/* Category Filter for Emails */}
                {activeCategory === 'emails' && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {['all', 'transactional', 'lifecycle', 'marketing'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1 text-xs rounded-full transition-all ${
                          categoryFilter === cat
                            ? 'bg-burgundy-500 text-white'
                            : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
                        }`}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List */}
              <div className="max-h-[600px] overflow-y-auto">
                {activeCategory === 'sms' ? (
                  <div className="p-8 text-center">
                    <Send className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-700 mb-2">SMS Templates</h3>
                    <p className="text-neutral-500 text-sm mb-4">
                      SMS message templates are managed through the campaigns system.
                    </p>
                    <a
                      href="/admin/campaigns"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Go to Campaigns
                    </a>
                  </div>
                ) : activeCategory === 'pages' ? (
                  pageContentLoading ? (
                    <div className="p-8 text-center text-neutral-500">Loading...</div>
                  ) : !pageContentData || pageContentData.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">
                      No content found for this page
                    </div>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {pageContentData.map((item: SiteCopy) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedCopy(item);
                            setSelectedTemplate(null);
                            setSelectedCastaway(null);
                            setEditMode(false);
                          }}
                          className={`w-full text-left p-4 hover:bg-cream-50 transition-all ${
                            selectedCopy?.id === item.id ? 'bg-cream-100' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-neutral-800">
                                {item.key.split('.').slice(1).join(' › ') || item.key}
                              </p>
                              {item.section && (
                                <p className="text-xs text-teal-600 mt-0.5">
                                  Section: {item.section}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ml-2 ${
                                item.is_active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-neutral-100 text-neutral-500'
                              }`}
                            >
                              {item.content_type || 'text'}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 mt-2 line-clamp-2">
                            {item.content?.replace(/<[^>]*>/g, '').substring(0, 100) || 'No content'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )
                ) : activeCategory === 'emails' ? (
                  templatesLoading ? (
                    <div className="p-8 text-center text-neutral-500">Loading...</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">No templates found</div>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {filteredTemplates.map((template: EmailTemplate) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setSelectedCopy(null);
                            setSelectedCastaway(null);
                            setEditMode(false);
                            setPreviewMode(false);
                          }}
                          className={`w-full text-left p-4 hover:bg-cream-50 transition-all ${
                            selectedTemplate?.id === template.id ? 'bg-cream-100' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-neutral-800">{template.name}</p>
                              <p className="text-xs text-neutral-500 mt-1">{template.slug}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {template.is_system && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  System
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  template.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-neutral-100 text-neutral-500'
                                }`}
                              >
                                {template.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-600 mt-2 line-clamp-1">
                            {template.subject}
                          </p>
                          {template.send_frequency && (
                            <p className="text-xs text-blue-600 mt-1">
                              📅 {template.send_frequency}
                              {template.send_time && ` • ${template.send_time}`}
                              {template.send_day && ` • ${template.send_day}`}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ) : activeCategory === 'castaways' ? (
                  castawaysLoading ? (
                    <div className="p-8 text-center text-neutral-500">Loading...</div>
                  ) : filteredCastaways.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">No castaways found</div>
                  ) : (
                  <div className="divide-y divide-cream-100">
                    {filteredCastaways.map((castaway: Castaway) => (
                      <button
                        key={castaway.id}
                        onClick={() => {
                          setSelectedCastaway(castaway);
                          setSelectedTemplate(null);
                          setSelectedCopy(null);
                          setCastawayFunFact(castaway.fun_fact || '');
                          setEditMode(false);
                        }}
                        className={`w-full text-left p-4 hover:bg-cream-50 transition-all ${
                          selectedCastaway?.id === castaway.id ? 'bg-cream-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {castaway.photo_url && (
                            <img
                              src={castaway.photo_url}
                              alt={castaway.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-800">{castaway.name}</p>
                            <p className="text-xs text-neutral-500 mt-0.5 truncate">
                              {castaway.fun_fact ? '✓ Has fun fact' : '○ No fun fact'}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                              castaway.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-neutral-100 text-neutral-500'
                            }`}
                          >
                            {castaway.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Panel - Editor/Preview */}
          <div className="lg:col-span-2">
            {createMode ? (
              <CreateTemplateForm
                onSave={(data) => createTemplate.mutate(data)}
                onCancel={() => setCreateMode(false)}
                saving={createTemplate.isPending}
                error={createTemplate.error?.message}
              />
            ) : selectedTemplate ? (
              <EmailTemplateEditor
                template={selectedTemplate}
                editMode={editMode}
                previewMode={previewMode}
                setEditMode={setEditMode}
                setPreviewMode={setPreviewMode}
                onSave={(data) => updateTemplate.mutate({ ...data, slug: selectedTemplate.slug })}
                onSendTest={(email) => sendTestEmail.mutate({ slug: selectedTemplate.slug, email })}
                onDelete={() => {
                  if (confirm(`Delete "${selectedTemplate.name}"? This cannot be undone.`)) {
                    deleteTemplate.mutate(selectedTemplate.slug);
                  }
                }}
                saving={updateTemplate.isPending}
                sendingTest={sendTestEmail.isPending}
                deleting={deleteTemplate.isPending}
                getSampleVariables={getSampleVariables}
              />
            ) : selectedCopy ? (
              <PageContentEditor
                copy={selectedCopy}
                editMode={editMode}
                setEditMode={setEditMode}
                onSave={(data) => updateCopy.mutate({ ...data, key: selectedCopy.key })}
                saving={updateCopy.isPending}
                onCancel={() => {
                  setEditMode(false);
                  queryClient.invalidateQueries({ queryKey: ['admin', 'page-content', activePage] });
                }}
              />
            ) : selectedCastaway ? (
              <CastawayFunFactEditor
                castaway={selectedCastaway}
                funFact={castawayFunFact}
                setFunFact={setCastawayFunFact}
                editMode={editMode}
                setEditMode={setEditMode}
                onSave={() =>
                  updateCastawayFunFact.mutate({
                    id: selectedCastaway.id,
                    fun_fact: castawayFunFact,
                  })
                }
                saving={updateCastawayFunFact.isPending}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-12 text-center">
                <div className="text-neutral-400 mb-4">
                  {activeCategory === 'emails' ? (
                    <Mail className="h-16 w-16 mx-auto" />
                  ) : activeCategory === 'castaways' ? (
                    <Users className="h-16 w-16 mx-auto" />
                  ) : (
                    <FileText className="h-16 w-16 mx-auto" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-neutral-700 mb-2">
                  Select{' '}
                  {activeCategory === 'emails'
                    ? 'a template'
                    : activeCategory === 'castaways'
                      ? 'a castaway'
                      : 'content'}{' '}
                  to edit
                </h3>
                <p className="text-neutral-500">
                  {activeCategory === 'emails'
                    ? 'Choose an email template from the list to view or edit it.'
                    : activeCategory === 'castaways'
                      ? 'Choose a castaway from the list to edit their fun fact.'
                      : 'Choose a content item from the list to view or edit it.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Email Template Editor Component
function EmailTemplateEditor({
  template,
  editMode,
  previewMode,
  setEditMode,
  setPreviewMode,
  onSave,
  onSendTest,
  onDelete,
  saving,
  sendingTest,
  deleting,
  getSampleVariables,
}: {
  template: EmailTemplate;
  editMode: boolean;
  previewMode: boolean;
  setEditMode: (v: boolean) => void;
  setPreviewMode: (v: boolean) => void;
  onSave: (data: { subject: string; html_body: string; is_active: boolean }) => void;
  onSendTest: (email: string) => void;
  onDelete: () => void;
  saving: boolean;
  sendingTest: boolean;
  deleting?: boolean;
  getSampleVariables: (vars: string[]) => Record<string, string>;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.html_body);
  const [isActive, setIsActive] = useState(template.is_active);
  const [testEmail, setTestEmail] = useState('');
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'code'>('wysiwyg');

  // Reset state when template changes
  useState(() => {
    setSubject(template.subject);
    setHtmlBody(template.html_body);
    setIsActive(template.is_active);
  });

  // Quill modules configuration
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        ['blockquote', 'code-block'],
        ['clean'],
      ],
    }),
    []
  );

  const quillFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'bullet',
    'align',
    'link',
    'image',
    'blockquote',
    'code-block',
  ];

  const previewHtml = () => {
    let html = htmlBody;
    const vars = getSampleVariables(template.available_variables);
    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return html;
  };

  // Insert variable at cursor position in code mode
  const insertVariable = (variable: string) => {
    const varText = `{{${variable}}}`;
    setHtmlBody((prev) => prev + varText);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">{template.name}</h2>
          <p className="text-sm text-neutral-500">{template.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  previewMode
                    ? 'bg-burgundy-100 text-burgundy-700'
                    : 'bg-cream-100 text-neutral-700 hover:bg-cream-200'
                }`}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={() => {
                  setEditMode(true);
                  setSubject(template.subject);
                  setHtmlBody(template.html_body);
                  setIsActive(template.is_active);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-all"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              {!template.is_system && (
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all disabled:opacity-50"
                  title="Delete Template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-2 px-3 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-all"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => onSave({ subject, html_body: htmlBody, is_active: isActive })}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 bg-cream-50 border-b border-cream-200 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Category:</span>{' '}
          <span className="font-medium text-neutral-700 capitalize">{template.category}</span>
        </div>
        <div>
          <span className="text-neutral-500">Trigger:</span>{' '}
          <span className="font-medium text-neutral-700 capitalize">
            {template.trigger_type || 'Manual'}
          </span>
        </div>
        <div>
          <span className="text-neutral-500">Version:</span>{' '}
          <span className="font-medium text-neutral-700">{template.version}</span>
        </div>
        <div>
          <span className="text-neutral-500">Variables:</span>{' '}
          <span className="font-medium text-neutral-700">
            {template.available_variables.length}
          </span>
        </div>
      </div>

      {/* Schedule Info */}
      {(template.send_frequency || template.send_time || template.send_day) && (
        <div className="p-4 bg-blue-50 border-b border-blue-200 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-semibold">📅 Schedule:</span>
          </div>
          {template.send_frequency && (
            <div>
              <span className="text-blue-500">Frequency:</span>{' '}
              <span className="font-medium text-blue-700">{template.send_frequency}</span>
            </div>
          )}
          {template.send_day && (
            <div>
              <span className="text-blue-500">Day:</span>{' '}
              <span className="font-medium text-blue-700">{template.send_day}</span>
            </div>
          )}
          {template.send_time && (
            <div>
              <span className="text-blue-500">Time:</span>{' '}
              <span className="font-medium text-blue-700">{template.send_time}</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              />
            </div>

            {/* Editor Mode Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-neutral-700">Email Body</label>
                <div className="flex items-center gap-1 bg-cream-100 rounded-lg p-1">
                  <button
                    onClick={() => setEditorMode('wysiwyg')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      editorMode === 'wysiwyg'
                        ? 'bg-white text-burgundy-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-800'
                    }`}
                  >
                    <Type className="h-3.5 w-3.5" />
                    Visual
                  </button>
                  <button
                    onClick={() => setEditorMode('code')}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      editorMode === 'code'
                        ? 'bg-white text-burgundy-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-800'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5" />
                    HTML
                  </button>
                </div>
              </div>

              {editorMode === 'wysiwyg' ? (
                <div className="border border-cream-200 rounded-xl overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={htmlBody}
                    onChange={setHtmlBody}
                    modules={quillModules}
                    formats={quillFormats}
                    className="bg-white"
                    style={{ minHeight: '400px' }}
                  />
                </div>
              ) : (
                <textarea
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 font-mono text-sm"
                  placeholder="Enter HTML email content..."
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
              />
              <label htmlFor="is_active" className="text-sm text-neutral-700">
                Active
              </label>
            </div>

            {/* Variables Reference */}
            <div className="bg-cream-50 rounded-xl p-4">
              <p className="text-sm font-medium text-neutral-700 mb-2">
                Available Variables:{' '}
                <span className="font-normal text-neutral-500">(click to insert)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {template.available_variables.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 bg-white text-xs rounded border border-cream-200 hover:bg-burgundy-50 hover:border-burgundy-300 hover:text-burgundy-700 transition-colors cursor-pointer"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : previewMode ? (
          <div className="space-y-4">
            <div className="bg-neutral-100 rounded-xl p-4">
              <p className="text-sm text-neutral-500 mb-1">Subject:</p>
              <p className="font-medium text-neutral-800">
                {subject.replace(
                  /{{(\w+)}}/g,
                  (_, key) => getSampleVariables(template.available_variables)[key] || `{{${key}}}`
                )}
              </p>
            </div>
            <div className="border border-cream-200 rounded-xl overflow-hidden">
              <div className="bg-neutral-800 text-white text-xs px-4 py-2">Email Preview</div>
              <iframe
                srcDoc={previewHtml()}
                className="w-full h-[500px] bg-white"
                title="Email Preview"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Subject:</p>
              <p className="font-medium text-neutral-800">{template.subject}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">HTML Body:</p>
              <pre className="text-xs bg-cream-50 p-4 rounded-xl overflow-auto max-h-[400px] font-mono">
                {template.html_body}
              </pre>
            </div>
          </div>
        )}

        {/* Test Email */}
        {!editMode && (
          <div className="mt-6 pt-6 border-t border-cream-200">
            <p className="text-sm font-medium text-neutral-700 mb-2">Send Test Email</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              />
              <button
                onClick={() => {
                  onSendTest(testEmail);
                  setTestEmail('');
                }}
                disabled={!testEmail || sendingTest}
                className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 disabled:opacity-50 transition-all"
              >
                <Send className="h-4 w-4" />
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Page Content Editor Component - with rich text support
function PageContentEditor({
  copy,
  editMode,
  setEditMode,
  onSave,
  saving,
  onCancel,
}: {
  copy: SiteCopy;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onSave: (data: { content: string; is_active: boolean }) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(copy.content);
  const [isActive, setIsActive] = useState(copy.is_active ?? true);

  // Reset state when copy changes
  useEffect(() => {
    setContent(copy.content);
    setIsActive(copy.is_active ?? true);
  }, [copy]);

  // Determine if this should use rich text
  const isRichText = copy.content_type === 'html' || copy.content?.includes('<');

  // Quill configuration
  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link'],
        ['blockquote'],
        ['clean'],
      ],
    }),
    []
  );

  const quillFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'bullet',
    'align',
    'link',
    'blockquote',
  ];

  const displayKey = copy.key.split('.').slice(1).join(' › ') || copy.key;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-800 capitalize">{displayKey}</h2>
          <p className="text-sm text-neutral-500">{copy.description || `Edit ${copy.page} content`}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => {
                setEditMode(true);
                setContent(copy.content);
                setIsActive(copy.is_active ?? true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-all"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  onCancel();
                }}
                className="flex items-center gap-2 px-3 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-all"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => onSave({ content, is_active: isActive })}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 bg-cream-50 border-b border-cream-200 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Page:</span>{' '}
          <span className="font-medium text-neutral-700 capitalize">{copy.page}</span>
        </div>
        {copy.section && (
          <div>
            <span className="text-neutral-500">Section:</span>{' '}
            <span className="font-medium text-neutral-700 capitalize">{copy.section}</span>
          </div>
        )}
        <div>
          <span className="text-neutral-500">Type:</span>{' '}
          <span className="font-medium text-neutral-700">{copy.content_type || 'text'}</span>
        </div>
        <div>
          <span className="text-neutral-500">Key:</span>{' '}
          <span className="font-mono text-xs text-neutral-600">{copy.key}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Content</label>
              {isRichText ? (
                <div className="border border-cream-200 rounded-xl overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={quillModules}
                    formats={quillFormats}
                    className="bg-white"
                    style={{ minHeight: '200px' }}
                    placeholder="Enter content..."
                  />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 resize-none"
                  placeholder="Enter content..."
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="page_content_is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
              />
              <label htmlFor="page_content_is_active" className="text-sm text-neutral-700">
                Active
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-cream-50 rounded-xl p-6">
              {isRichText ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <p className="text-neutral-700 whitespace-pre-wrap">{content}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview when editing */}
      {editMode && isRichText && content && (
        <div className="p-4 border-t border-cream-200 bg-cream-50">
          <p className="text-sm text-neutral-600 mb-2 font-medium">Preview:</p>
          <div className="bg-white rounded-xl p-4 border border-cream-200">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Create Template Form Component
function CreateTemplateForm({
  onSave,
  onCancel,
  saving,
  error,
}: {
  onSave: (data: {
    slug: string;
    name: string;
    description: string;
    category: string;
    subject: string;
    html_body: string;
    text_body?: string;
    available_variables: string[];
    trigger_type?: string;
    is_active: boolean;
  }) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('transactional');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(defaultEmailTemplate);
  const [variablesText, setVariablesText] = useState('displayName');
  const [triggerType, setTriggerType] = useState('manual');

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const handleSubmit = () => {
    if (!slug || !name || !subject || !htmlBody) {
      alert('Please fill in all required fields');
      return;
    }

    const variables = variablesText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    onSave({
      slug,
      name,
      description,
      category,
      subject,
      html_body: htmlBody,
      available_variables: variables,
      trigger_type: triggerType === 'manual' ? undefined : triggerType,
      is_active: true,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">Create New Email Template</h2>
          <p className="text-sm text-neutral-500">Build a new email from scratch</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-3 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-all"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !slug || !name || !subject}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Weekly Summary"
              className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="weekly-summary"
              className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of when this email is sent"
            className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="transactional">Transactional</option>
              <option value="lifecycle">Lifecycle</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Trigger Type</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="manual">Manual / API</option>
              <option value="event">Event-based</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Subject Line <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Your weekly Survivor Fantasy update"
            className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Use {'{{variableName}}'} for dynamic content
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Available Variables
          </label>
          <input
            type="text"
            value={variablesText}
            onChange={(e) => setVariablesText(e.target.value)}
            placeholder="displayName, leagueName, episodeNumber"
            className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
          <p className="text-xs text-neutral-500 mt-1">Comma-separated list of variable names</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            HTML Body <span className="text-red-500">*</span>
          </label>
          <textarea
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            rows={16}
            className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Default email template for new emails
const defaultEmailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF8F3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B0000 0%, #6B0000 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🔥 Survivor Fantasy
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px;">
                Hello {{displayName}}!
              </h2>
              <p style="margin: 0 0 16px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your email content goes here. Use {{variableName}} for dynamic content.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #8B0000; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f5f0eb; text-align: center;">
              <p style="margin: 0; color: #6a6a6a; font-size: 14px;">
                Reality Games Fantasy League
              </p>
              <p style="margin: 8px 0 0 0; color: #9a9a9a; font-size: 12px;">
                You're receiving this because you signed up at realitygamesfantasyleague.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Castaway Fun Fact Editor Component
function CastawayFunFactEditor({
  castaway,
  funFact,
  setFunFact,
  editMode,
  setEditMode,
  onSave,
  saving,
}: {
  castaway: Castaway;
  funFact: string;
  setFunFact: (v: string) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onSave: () => void;
  saving: boolean;
}) {
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

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {castaway.photo_url && (
            <img
              src={castaway.photo_url}
              alt={castaway.name}
              className="w-16 h-16 rounded-xl object-cover border border-cream-200"
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-neutral-800">{castaway.name}</h2>
            <p className="text-sm text-neutral-500">Edit fun fact with rich formatting</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-3 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-all"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFunFact(castaway.fun_fact || '');
                }}
                className="flex items-center gap-2 px-3 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-all"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="p-4 bg-cream-50 border-b border-cream-200 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="text-neutral-700 font-medium">Fun Fact</span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            castaway.status === 'active'
              ? 'bg-green-100 text-green-700'
              : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {castaway.status}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {editMode ? (
          <div className="space-y-4">
            <div className="border border-cream-200 rounded-xl overflow-hidden">
              <ReactQuill
                theme="snow"
                value={funFact}
                onChange={setFunFact}
                modules={quillModules}
                formats={quillFormats}
                className="bg-white"
                style={{ minHeight: '200px' }}
                placeholder="Enter interesting trivia about this castaway..."
              />
            </div>
            <p className="text-xs text-neutral-500">
              Use the toolbar to add bold, italic, lists, and links. The content will be displayed
              on the castaway's profile page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {funFact ? (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-amber-500 flex-shrink-0" />
                  <div
                    className="text-amber-700 leading-relaxed prose prose-sm max-w-none prose-amber"
                    dangerouslySetInnerHTML={{ __html: funFact }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-cream-50 rounded-xl p-8 text-center">
                <Star className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No fun fact yet</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Click "Edit" to add interesting trivia about this castaway
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview note */}
      {editMode && funFact && (
        <div className="p-4 border-t border-cream-200 bg-cream-50">
          <p className="text-sm text-neutral-600 mb-2 font-medium">Preview:</p>
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div
                className="text-amber-700 leading-relaxed prose prose-sm max-w-none prose-amber"
                dangerouslySetInnerHTML={{ __html: funFact }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContent;
