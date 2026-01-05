import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Heart,
  Clock,
  CheckCircle,
  Building2,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { apiGet } from '../../lib/api';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { AdminNavBar } from '@/components/AdminNavBar';

interface LeagueFundBalance {
  league_id: string;
  league_name: string;
  league_status: string;
  charity_name: string | null;
  charity_selected_at: string | null;
  funds_disbursed_at: string | null;
  payment_count: number;
  total_donations: number;
  total_processing_fees: number;
  total_operational_fund: number;
  total_restricted_fund: number;
  fund_status:
    | 'disbursed'
    | 'ready_to_disburse'
    | 'awaiting_charity_selection'
    | 'league_in_progress';
}

interface GlobalFundSummary {
  total_paid_leagues: number;
  total_payments: number;
  total_donations_received: number;
  total_processing_fees_paid: number;
  total_operational_fund: number;
  total_restricted_fund: number;
  total_disbursed_to_charity: number;
  total_restricted_fund_held: number;
  leagues_pending_disbursement: number;
}

export function AdminNonprofitFunds() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { session } = useAuth();

  // Fetch global fund summary
  const { data: globalSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['nonprofit-global-summary'],
    queryFn: async () => {
      const response = await apiGet<GlobalFundSummary>(
        '/api/admin/nonprofit/summary',
        session?.access_token
      );
      return response.data;
    },
    enabled: !!session?.access_token,
  });

  // Fetch per-league fund balances
  const { data: leagueFunds, isLoading: fundsLoading } = useQuery({
    queryKey: ['nonprofit-league-funds'],
    queryFn: async () => {
      const response = await apiGet<LeagueFundBalance[]>(
        '/api/admin/nonprofit/league-funds',
        session?.access_token
      );
      return response.data;
    },
    enabled: !!session?.access_token,
  });

  const filteredLeagues = leagueFunds?.filter((league) => {
    if (statusFilter === 'all') return true;
    return league.fund_status === statusFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: LeagueFundBalance['fund_status']) => {
    const badges = {
      disbursed: { label: 'Disbursed', color: 'bg-green-100 text-green-800' },
      ready_to_disburse: { label: 'Ready to Disburse', color: 'bg-yellow-100 text-yellow-800' },
      awaiting_charity_selection: {
        label: 'Awaiting Charity',
        color: 'bg-orange-100 text-orange-800',
      },
      league_in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <AdminNavBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nonprofit Fund Tracking</h1>
              <p className="mt-2 text-sm text-gray-600">
                501(c)(3) Fund Management & Charitable Disbursements
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : globalSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Donations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Donations</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(globalSummary.total_donations_received)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {globalSummary.total_payments} payments
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Operational Fund (7%) */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Operational Fund</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {formatCurrency(globalSummary.total_operational_fund)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">7% unrestricted</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Restricted Fund (93%) */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Held for Charity</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {formatCurrency(globalSummary.total_restricted_fund_held)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">93% restricted</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Disbursed to Charity */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Disbursed</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">
                    {formatCurrency(globalSummary.total_disbursed_to_charity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">to charities</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Alert for pending disbursements */}
        {globalSummary && globalSummary.leagues_pending_disbursement > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Action Required: {globalSummary.leagues_pending_disbursement} league
                  {globalSummary.leagues_pending_disbursement > 1 ? 's' : ''} ready for charity
                  disbursement
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Winners have selected charities. Review and disburse funds below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { value: 'all', label: 'All Leagues' },
                {
                  value: 'ready_to_disburse',
                  label: 'Ready to Disburse',
                  count: leagueFunds?.filter((l) => l.fund_status === 'ready_to_disburse').length,
                },
                {
                  value: 'awaiting_charity_selection',
                  label: 'Awaiting Charity',
                  count: leagueFunds?.filter((l) => l.fund_status === 'awaiting_charity_selection')
                    .length,
                },
                { value: 'league_in_progress', label: 'In Progress' },
                { value: 'disbursed', label: 'Disbursed' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    statusFilter === tab.value
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* League Fund Balances Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">League Fund Balances</h2>
            <p className="text-sm text-gray-600 mt-1">
              Track restricted and unrestricted funds per league
            </p>
          </div>

          {fundsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading fund data...</p>
            </div>
          ) : filteredLeagues && filteredLeagues.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      League
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donations
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operational (7%)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restricted (93%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeagues.map((league) => (
                    <tr key={league.league_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {league.league_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {league.payment_count} payment{league.payment_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(league.total_donations)}
                        </div>
                        <div className="text-xs text-gray-500">
                          -{formatCurrency(league.total_processing_fees)} fees
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(league.total_operational_fund)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-orange-600">
                          {formatCurrency(league.total_restricted_fund)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {league.charity_name ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {league.charity_name}
                            </div>
                            {league.charity_selected_at && (
                              <div className="text-xs text-gray-500">
                                Selected {formatDate(league.charity_selected_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not selected</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(league.fund_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {league.fund_status === 'ready_to_disburse' ? (
                          <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto">
                            <CheckCircle className="w-4 h-4" />
                            Disburse
                          </button>
                        ) : (
                          <Link
                            to={`/admin/leagues/${league.league_id}`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No leagues match the current filter</p>
            </div>
          )}
        </div>

        {/* Fund Accounting Notes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">📊 Fund Accounting Notes</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>Operational Fund (7%):</strong> Unrestricted funds for platform operations,
              salaries, and administrative costs
            </li>
            <li>
              <strong>Restricted Fund (93%):</strong> Donor-restricted funds designated for
              charitable organizations selected by league winners
            </li>
            <li>
              <strong>FASB Compliance:</strong> All funds are tracked separately per league for
              nonprofit accounting standards
            </li>
            <li>
              <strong>Disbursement Process:</strong> Restricted funds are disbursed after league
              completion and charity selection
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
