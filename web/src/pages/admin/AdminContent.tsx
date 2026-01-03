import { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Code,
  Type,
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
}

interface SiteCopy {
  id: string;
  key: string;
  page: string;
  section: string | null;
  content_type: string;
  content: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

type TabType = 'emails' | 'site-copy';

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<TabType>('emails');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<SiteCopy | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [_pageFilter, _setPageFilter] = useState<string>('all');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(['home', 'dashboard']));

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

  // Fetch site copy
  const { data: copyData, isLoading: copyLoading } = useQuery({
    queryKey: ['admin', 'site-copy', _pageFilter],
    queryFn: async () => {
      const response = await apiWithAuth(`/api/admin/content/site-copy?page=${_pageFilter}`);
      return response || { data: [], grouped: {} };
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
      winnerName: 'Player One',
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

  const _filteredCopy = ((copyData?.data as SiteCopy[]) || []).filter(
    (c: SiteCopy) =>
      c.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePage = (page: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(page)) {
      newExpanded.delete(page);
    } else {
      newExpanded.add(page);
    }
    setExpandedPages(newExpanded);
  };

  const groupedCopy = (copyData?.grouped || {}) as Record<string, SiteCopy[]>;
  const pages = Object.keys(groupedCopy).sort();

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
          <button
            onClick={() => clearCache.mutate()}
            disabled={clearCache.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-neutral-700 rounded-xl hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${clearCache.isPending ? 'animate-spin' : ''}`} />
            {clearCache.isPending ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('emails');
                setSelectedTemplate(null);
                setSelectedCopy(null);
                setEditMode(false);
                setCreateMode(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'emails'
                  ? 'bg-burgundy-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-cream-100'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email Templates
            </button>
            <button
              onClick={() => {
                setActiveTab('site-copy');
                setSelectedTemplate(null);
                setSelectedCopy(null);
                setEditMode(false);
                setCreateMode(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'site-copy'
                  ? 'bg-burgundy-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-cream-100'
              }`}
            >
              <FileText className="h-4 w-4" />
              Site Copy
            </button>
          </div>
          {activeTab === 'emails' && (
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
                    placeholder={activeTab === 'emails' ? 'Search templates...' : 'Search copy...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                  />
                </div>

                {/* Category Filter for Emails */}
                {activeTab === 'emails' && (
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
                {activeTab === 'emails' ? (
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
                        </button>
                      ))}
                    </div>
                  )
                ) : copyLoading ? (
                  <div className="p-8 text-center text-neutral-500">Loading...</div>
                ) : pages.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">No content found</div>
                ) : (
                  <div className="divide-y divide-cream-100">
                    {pages.map((page) => (
                      <div key={page}>
                        <button
                          onClick={() => togglePage(page)}
                          className="w-full flex items-center justify-between p-4 hover:bg-cream-50 transition-all"
                        >
                          <span className="font-medium text-neutral-800 capitalize">{page}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500">
                              {groupedCopy[page]?.length || 0} items
                            </span>
                            {expandedPages.has(page) ? (
                              <ChevronDown className="h-4 w-4 text-neutral-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-neutral-400" />
                            )}
                          </div>
                        </button>
                        {expandedPages.has(page) && (
                          <div className="bg-cream-50">
                            {groupedCopy[page]?.map((item: SiteCopy) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setSelectedCopy(item);
                                  setSelectedTemplate(null);
                                  setEditMode(false);
                                }}
                                className={`w-full text-left p-4 pl-8 hover:bg-cream-100 transition-all ${
                                  selectedCopy?.id === item.id ? 'bg-cream-200' : ''
                                }`}
                              >
                                <p className="text-sm font-medium text-neutral-700">
                                  {item.key.split('.').pop()}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                                  {item.content}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <SiteCopyEditor
                copy={selectedCopy}
                editMode={editMode}
                setEditMode={setEditMode}
                onSave={(data) => updateCopy.mutate({ ...data, key: selectedCopy.key })}
                saving={updateCopy.isPending}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-12 text-center">
                <div className="text-neutral-400 mb-4">
                  {activeTab === 'emails' ? (
                    <Mail className="h-16 w-16 mx-auto" />
                  ) : (
                    <FileText className="h-16 w-16 mx-auto" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-neutral-700 mb-2">
                  Select {activeTab === 'emails' ? 'a template' : 'content'} to edit
                </h3>
                <p className="text-neutral-500">
                  {activeTab === 'emails'
                    ? 'Choose an email template from the list to view or edit it.'
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

// Site Copy Editor Component
function SiteCopyEditor({
  copy,
  editMode,
  setEditMode,
  onSave,
  saving,
}: {
  copy: SiteCopy;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onSave: (data: { content: string; is_active: boolean }) => void;
  saving: boolean;
}) {
  const [content, setContent] = useState(copy.content);
  const [isActive, setIsActive] = useState(copy.is_active);

  // Reset state when copy changes
  useState(() => {
    setContent(copy.content);
    setIsActive(copy.is_active);
  });

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-800">{copy.key}</h2>
          <p className="text-sm text-neutral-500">{copy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => {
                setEditMode(true);
                setContent(copy.content);
                setIsActive(copy.is_active);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-all"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
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
          <span className="font-medium text-neutral-700">{copy.content_type}</span>
        </div>
        <div className="flex items-center gap-1">
          {copy.is_active ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-neutral-400" />
          )}
          <span className="text-neutral-500">{copy.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Content</label>
              {copy.content_type === 'text' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 font-mono text-sm"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="copy_is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
              />
              <label htmlFor="copy_is_active" className="text-sm text-neutral-700">
                Active
              </label>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-500 mb-2">Current Content:</p>
            <div className="bg-cream-50 rounded-xl p-4">
              {copy.content_type === 'html' ? (
                <div dangerouslySetInnerHTML={{ __html: copy.content }} />
              ) : (
                <p className="text-neutral-800 whitespace-pre-wrap">{copy.content}</p>
              )}
            </div>
          </div>
        )}
      </div>
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

export default AdminContent;
