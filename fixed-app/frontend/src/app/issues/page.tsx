'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, Filter, Search, CheckCircle, AlertTriangle,
  AlertCircle, ChevronDown, ChevronRight, ExternalLink,
  Check, X, FileText
} from 'lucide-react';
import { formatDate, formatRelativeTime, severityConfig, statusConfig, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function IssuesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const initialRunId = searchParams.get('run_id') || undefined;
  const initialUploadId = searchParams.get('upload_id') || undefined;
  
  const [filters, setFilters] = useState({
    run_id: initialRunId,
    upload_id: initialUploadId,
    severity: [] as string[],
    status: ['open', 'acknowledged'] as string[],
    search: '',
  });
  
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [expandedIssue, setExpandedIssue] = useState<string | null>(
    searchParams.get('id') || null
  );

  // Fetch issues
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['issues', filters],
    queryFn: () => issuesApi.list({
      ...filters,
      severity: filters.severity.length > 0 ? filters.severity : undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      search: filters.search || undefined,
      page_size: 100,
    }),
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ issueIds, status }: { issueIds: string[]; status: string }) =>
      issuesApi.bulkUpdate(issueIds, status),
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} issues`);
      setSelectedIssues(new Set());
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: () => {
      toast.error('Failed to update issues');
    },
  });

  // Single issue update
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      issuesApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Issue updated');
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
  });

  const issues = data?.items || [];
  const totalIssues = data?.total || 0;

  const toggleSeverityFilter = (severity: string) => {
    setFilters(prev => ({
      ...prev,
      severity: prev.severity.includes(severity)
        ? prev.severity.filter(s => s !== severity)
        : [...prev.severity, severity],
    }));
  };

  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const toggleSelectAll = () => {
    if (selectedIssues.size === issues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(issues.map((i: any) => i.id)));
    }
  };

  const toggleSelectIssue = (id: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIssues(newSelected);
  };

  const handleBulkAction = (status: string) => {
    if (selectedIssues.size === 0) return;
    bulkUpdateMutation.mutate({
      issueIds: Array.from(selectedIssues),
      status,
    });
  };

  // Count by severity
  const countBySeverity = {
    P0: issues.filter((i: any) => i.severity === 'P0').length,
    P1: issues.filter((i: any) => i.severity === 'P1').length,
    P2: issues.filter((i: any) => i.severity === 'P2').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                Issues {totalIssues > 0 && `(${totalIssues})`}
              </h1>
            </div>
            
            {selectedIssues.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedIssues.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction('acknowledged')}
                  className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleBulkAction('resolved')}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleBulkAction('wont_fix')}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                >
                  Won't Fix
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Severity Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Severity:</span>
              {(['P0', 'P1', 'P2'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => toggleSeverityFilter(sev)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                    filters.severity.includes(sev) || filters.severity.length === 0
                      ? severityConfig[sev].color
                      : 'bg-gray-100 text-gray-400 border-gray-200'
                  )}
                >
                  {sev} ({countBySeverity[sev]})
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              {['open', 'acknowledged', 'resolved'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm capitalize border transition-colors',
                    filters.status.includes(status)
                      ? statusConfig[status]?.color || 'bg-gray-100'
                      : 'bg-white text-gray-400 border-gray-200'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-sm font-medium text-gray-600">
            <input
              type="checkbox"
              checked={selectedIssues.size === issues.length && issues.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div className="w-16">Severity</div>
            <div className="flex-1">Issue</div>
            <div className="w-24">Rule</div>
            <div className="w-24">Status</div>
            <div className="w-32">Detected</div>
            <div className="w-20">Actions</div>
          </div>

          {/* Issues */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading issues...</div>
          ) : issues.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No issues found</p>
              <p className="text-sm text-gray-400 mt-1">
                {filters.search || filters.severity.length > 0 
                  ? 'Try adjusting your filters'
                  : 'All checks passed!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {issues.map((issue: any) => (
                <div key={issue.id}>
                  {/* Issue Row */}
                  <div
                    className={cn(
                      'px-4 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer',
                      expandedIssue === issue.id && 'bg-blue-50'
                    )}
                    onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIssues.has(issue.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectIssue(issue.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    
                    <div className="w-16">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        severityConfig[issue.severity as keyof typeof severityConfig]?.color
                      )}>
                        {issue.severity}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {expandedIssue === issue.id 
                          ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                        <p className="font-medium text-gray-900 truncate">{issue.title}</p>
                      </div>
                      <p className="text-sm text-gray-500 truncate ml-6">{issue.description}</p>
                    </div>
                    
                    <div className="w-24">
                      <span className="text-sm font-mono text-gray-600">{issue.rule_id}</span>
                    </div>
                    
                    <div className="w-24">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs capitalize',
                        statusConfig[issue.status]?.color
                      )}>
                        {issue.status}
                      </span>
                    </div>
                    
                    <div className="w-32 text-sm text-gray-500">
                      {formatRelativeTime(issue.created_at)}
                    </div>
                    
                    <div className="w-20 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {issue.status === 'open' && (
                        <>
                          <button
                            onClick={() => updateMutation.mutate({ id: issue.id, status: 'acknowledged' })}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded"
                            title="Acknowledge"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({ id: issue.id, status: 'resolved' })}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                            title="Resolve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {issue.status === 'acknowledged' && (
                        <button
                          onClick={() => updateMutation.mutate({ id: issue.id, status: 'resolved' })}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                          title="Resolve"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Evidence */}
                  {expandedIssue === issue.id && (
                    <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                      <IssueDetail issue={issue} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Issue Detail Component (inline for now)
function IssueDetail({ issue }: { issue: any }) {
  const evidence = issue.evidence || [];

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
        <p className="text-gray-600">{issue.description}</p>
      </div>

      {/* AI Explanation */}
      {issue.ai_explanation && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-1">AI Explanation</h4>
          <p className="text-sm text-blue-700">{issue.ai_explanation}</p>
        </div>
      )}

      {/* Calculation Details */}
      {issue.calculation && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Calculation Details</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {Object.entries(issue.calculation).map(([key, value]) => (
              <div key={key}>
                <span className="text-amber-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="ml-1 font-mono font-medium text-amber-900">
                  {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Table */}
      {evidence.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Evidence ({evidence.length} cell{evidence.length !== 1 ? 's' : ''})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Cell</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Column</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Actual Value</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Expected</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {evidence.map((e: any, idx: number) => (
                  <tr key={idx} className="hover:bg-yellow-50">
                    <td className="px-3 py-2">
                      <span className="font-mono bg-yellow-100 px-1.5 py-0.5 rounded text-yellow-800">
                        {e.cell_reference}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">({e.sheet_name})</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{e.column_name}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-red-600">
                        {e.actual_value || <span className="text-gray-400 italic">empty</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-green-600">{e.expected_value}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="capitalize text-gray-500">{e.evidence_type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
