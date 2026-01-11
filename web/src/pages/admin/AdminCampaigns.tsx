/**
 * Admin Campaigns Page
 *
 * Manage email and SMS campaigns:
 * - Create, schedule, and send campaigns
 * - View campaign history
 * - Archive campaigns
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  MessageSquare,
  Plus,
  Send,
  Clock,
  Archive,
  Trash2,
  Edit,
  Eye,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar,
  ArrowLeft,
  Save,
  X,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';
import { supabase } from '@/lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Link } from 'react-router-dom';

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

type CampaignType = 'email' | 'sms';
type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'archived';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  recipient_segment: string;
  custom_recipients?: string[];
  status: CampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  recipients_count?: number;
  sent_count?: number;
  failed_count?: number;
  error_message?: string;
  recurring?: boolean;
  recurring_day?: string;
  recurring_time?: string;
  created_at: string;
}

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  recipient_segment: string;
  custom_recipients?: string[];
  status: CampaignStatus;
  scheduled_at?: string;
  sent_at?: string;
  recipients_count?: number;
  sent_count?: number;
  failed_count?: number;
  error_message?: string;
  created_at: string;
}

const RECIPIENT_SEGMENTS = [
  { value: 'all', label: 'All Users', description: 'Everyone with notifications enabled' },
  { value: 'active', label: 'Active Players', description: 'Users playing this season' },
  { value: 'commissioners', label: 'Commissioners', description: 'League commissioners only' },
  { value: 'picked', label: 'Already Picked', description: 'Users who made their pick' },
  { value: 'not_picked', label: 'Not Picked Yet', description: 'Users who need to pick' },
  { value: 'custom', label: 'Custom List', description: 'Enter specific addresses' },
];

const SMS_SEGMENTS = [
  { value: 'all', label: 'All Phone Verified', description: 'Everyone with SMS enabled' },
  { value: 'active', label: 'Active Players', description: 'Users playing this season' },
  { value: 'commissioners', label: 'Commissioners', description: 'League commissioners only' },
  { value: 'custom', label: 'Custom List', description: 'Enter specific numbers' },
];

export function AdminCampaigns() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CampaignType>('email');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | SmsCampaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | SmsCampaign | null>(null);

  // Fetch email campaigns
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ['admin', 'campaigns', 'email', statusFilter],
    queryFn: () =>
      apiWithAuth(`/api/admin/campaigns/email?status=${statusFilter}`),
    enabled: activeTab === 'email',
  });

  // Fetch SMS campaigns
  const { data: smsData, isLoading: smsLoading } = useQuery({
    queryKey: ['admin', 'campaigns', 'sms', statusFilter],
    queryFn: () =>
      apiWithAuth(`/api/admin/campaigns/sms?status=${statusFilter}`),
    enabled: activeTab === 'sms',
  });

  // Send campaign mutation
  const sendMutation = useMutation({
    mutationFn: async ({ type, id }: { type: CampaignType; id: string }) => {
      return apiWithAuth(`/api/admin/campaigns/${type}/${id}/send`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  // Archive campaign mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ type, id }: { type: CampaignType; id: string }) => {
      return apiWithAuth(`/api/admin/campaigns/${type}/${id}/archive`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: CampaignType; id: string }) => {
      return apiWithAuth(`/api/admin/campaigns/${type}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
    },
  });

  const isLoading = activeTab === 'email' ? emailLoading : smsLoading;
  const campaigns = activeTab === 'email'
    ? (emailData?.campaigns || [])
    : (smsData?.campaigns || []);

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full flex items-center gap-1">
            <Edit className="h-3 w-3" /> Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" /> Scheduled
          </span>
        );
      case 'sending':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Sending
          </span>
        );
      case 'sent':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Sent
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      case 'archived':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-500 rounded-full flex items-center gap-1">
            <Archive className="h-3 w-3" /> Archived
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation />
      <AdminNavBar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/content"
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-display font-bold text-neutral-800">
                Campaigns
              </h1>
              <p className="text-neutral-600 mt-1">Send email and SMS campaigns to users</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Campaign
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'email'
                  ? 'bg-burgundy-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-cream-100'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email Campaigns
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'sms'
                  ? 'bg-burgundy-500 text-white'
                  : 'bg-white text-neutral-700 hover:bg-cream-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              SMS Campaigns
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['all', 'draft', 'scheduled', 'sent', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  statusFilter === status
                    ? 'bg-neutral-800 text-white'
                    : 'bg-white text-neutral-600 hover:bg-cream-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign List */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-burgundy-500 mx-auto mb-3" />
              <p className="text-neutral-500">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-neutral-300 mb-4">
                {activeTab === 'email' ? (
                  <Mail className="h-16 w-16 mx-auto" />
                ) : (
                  <MessageSquare className="h-16 w-16 mx-auto" />
                )}
              </div>
              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                No campaigns found
              </h3>
              <p className="text-neutral-500 mb-4">
                {statusFilter === 'all'
                  ? 'Create your first campaign to get started'
                  : `No ${statusFilter} campaigns`}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600"
              >
                <Plus className="h-4 w-4" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-cream-100">
              {campaigns.map((campaign: EmailCampaign | SmsCampaign) => (
                <div
                  key={campaign.id}
                  className="p-4 hover:bg-cream-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-neutral-800 truncate">
                          {campaign.name}
                        </h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-neutral-600 truncate mb-2">
                        {'subject' in campaign ? campaign.subject : campaign.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.recipient_segment}
                        </span>
                        {campaign.sent_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Sent {new Date(campaign.sent_at).toLocaleDateString()}
                          </span>
                        )}
                        {campaign.scheduled_at && campaign.status === 'scheduled' && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Scheduled for {new Date(campaign.scheduled_at).toLocaleString()}
                          </span>
                        )}
                        {campaign.sent_count !== undefined && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {campaign.sent_count} sent
                            {campaign.failed_count ? (
                              <span className="text-red-500">
                                , {campaign.failed_count} failed
                              </span>
                            ) : null}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setPreviewCampaign(campaign)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                        <>
                          <button
                            onClick={() => setEditingCampaign(campaign)}
                            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Send this campaign now?')) {
                                sendMutation.mutate({ type: activeTab, id: campaign.id });
                              }
                            }}
                            disabled={sendMutation.isPending}
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Send Now"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {campaign.status !== 'archived' && campaign.status !== 'sending' && (
                        <button
                          onClick={() => archiveMutation.mutate({ type: activeTab, id: campaign.id })}
                          disabled={archiveMutation.isPending}
                          className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}

                      {(campaign.status === 'draft' || campaign.status === 'archived') && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this campaign?')) {
                              deleteMutation.mutate({ type: activeTab, id: campaign.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {campaign.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {campaign.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCampaign) && (
        <CampaignModal
          type={activeTab}
          campaign={editingCampaign}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCampaign(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingCampaign(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });
          }}
        />
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <PreviewModal
          campaign={previewCampaign}
          type={activeTab}
          onClose={() => setPreviewCampaign(null)}
        />
      )}
    </div>
  );
}

// Campaign Create/Edit Modal
function CampaignModal({
  type,
  campaign,
  onClose,
  onSuccess,
}: {
  type: CampaignType;
  campaign: EmailCampaign | SmsCampaign | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(campaign?.name || '');
  const [subject, setSubject] = useState(
    campaign && 'subject' in campaign ? campaign.subject : ''
  );
  const [htmlBody, setHtmlBody] = useState(
    campaign && 'html_body' in campaign ? campaign.html_body : ''
  );
  const [message, setMessage] = useState(
    campaign && 'message' in campaign ? campaign.message : ''
  );
  const [segment, setSegment] = useState(campaign?.recipient_segment || 'all');
  const [customRecipients, setCustomRecipients] = useState(
    campaign?.custom_recipients?.join('\n') || ''
  );
  const [scheduledAt, setScheduledAt] = useState(
    campaign?.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : ''
  );
  const [sendImmediately, setSendImmediately] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recipient preview
  const { data: recipientPreview } = useQuery({
    queryKey: ['recipients-preview', type, segment],
    queryFn: () =>
      apiWithAuth(
        `/api/admin/campaigns/${type}/recipients/${segment}`
      ),
    enabled: segment !== 'custom',
  });

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name,
        recipient_segment: segment,
        send_immediately: sendImmediately,
        scheduled_at: scheduledAt || null,
      };

      if (segment === 'custom') {
        payload.custom_recipients = customRecipients
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean);
      }

      if (type === 'email') {
        payload.subject = subject;
        payload.html_body = htmlBody;
      } else {
        payload.message = message;
      }

      const endpoint = campaign
        ? `/api/admin/campaigns/${type}/${campaign.id}`
        : `/api/admin/campaigns/${type}`;
      const method = campaign ? 'PUT' : 'POST';

      await apiWithAuth(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const segments = type === 'email' ? RECIPIENT_SEGMENTS : SMS_SEGMENTS;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-cream-200 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-neutral-800">
            {campaign ? 'Edit' : 'Create'} {type === 'email' ? 'Email' : 'SMS'} Campaign
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Pick Reminder"
              className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            />
          </div>

          {type === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Don't forget to make your pick!"
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Use {'{{displayName}}'} for personalization
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Body
                </label>
                <div className="border border-cream-200 rounded-xl overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={htmlBody}
                    onChange={setHtmlBody}
                    className="bg-white"
                    style={{ minHeight: '250px' }}
                  />
                </div>
              </div>
            </>
          )}

          {type === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Message ({message.length}/1600 characters)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 1600))}
                placeholder="Don't forget to make your pick this week!"
                rows={4}
                className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Use {'{{displayName}}'} for personalization. Will be sent from your Twilio number.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Recipients
            </label>
            <div className="grid grid-cols-2 gap-2">
              {segments.map((seg) => (
                <button
                  key={seg.value}
                  onClick={() => setSegment(seg.value)}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    segment === seg.value
                      ? 'border-burgundy-500 bg-burgundy-50'
                      : 'border-cream-200 hover:border-cream-300'
                  }`}
                >
                  <p className="font-medium text-sm text-neutral-800">{seg.label}</p>
                  <p className="text-xs text-neutral-500">{seg.description}</p>
                </button>
              ))}
            </div>

            {segment !== 'custom' && recipientPreview && (
              <div className="mt-3 p-3 bg-cream-50 rounded-xl">
                <p className="text-sm text-neutral-600">
                  <Users className="h-4 w-4 inline mr-1" />
                  {recipientPreview.count} recipients will receive this campaign
                </p>
              </div>
            )}

            {segment === 'custom' && (
              <div className="mt-3">
                <textarea
                  value={customRecipients}
                  onChange={(e) => setCustomRecipients(e.target.value)}
                  placeholder={
                    type === 'email'
                      ? 'Enter email addresses, one per line'
                      : 'Enter phone numbers, one per line'
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500 font-mono text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Scheduling
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendImmediately}
                  onChange={(e) => {
                    setSendImmediately(e.target.checked);
                    if (e.target.checked) setScheduledAt('');
                  }}
                  className="rounded border-cream-300 text-burgundy-500 focus:ring-burgundy-500"
                />
                <span className="text-sm text-neutral-700">Send immediately after saving</span>
              </label>

              {!sendImmediately && (
                <div>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-2 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Leave empty to save as draft
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cream-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:bg-cream-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name || (type === 'email' ? !subject || !htmlBody : !message)}
            className="flex items-center gap-2 px-4 py-2 bg-burgundy-500 text-white rounded-xl hover:bg-burgundy-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sendImmediately ? (
              <Send className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : sendImmediately ? 'Send Now' : 'Save Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Preview Modal
function PreviewModal({
  campaign,
  type,
  onClose,
}: {
  campaign: EmailCampaign | SmsCampaign;
  type: CampaignType;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-cream-200 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-neutral-800">
            Preview: {campaign.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-cream-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 max-h-[calc(90vh-100px)] overflow-y-auto">
          {type === 'email' && 'subject' in campaign && (
            <>
              <div className="mb-4 p-3 bg-cream-50 rounded-xl">
                <p className="text-sm text-neutral-500">Subject:</p>
                <p className="font-medium text-neutral-800">{campaign.subject}</p>
              </div>
              <div className="border border-cream-200 rounded-xl overflow-hidden">
                <div className="bg-neutral-800 text-white text-xs px-4 py-2">Email Preview</div>
                <iframe
                  srcDoc={campaign.html_body}
                  className="w-full h-[400px] bg-white"
                  title="Email Preview"
                />
              </div>
            </>
          )}

          {type === 'sms' && 'message' in campaign && (
            <div className="max-w-sm mx-auto">
              <div className="bg-neutral-100 rounded-2xl p-4">
                <div className="bg-green-500 text-white rounded-2xl rounded-bl-none p-3">
                  <p className="text-sm">{campaign.message}</p>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  SMS Preview ({campaign.message.length} chars)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminCampaigns;
