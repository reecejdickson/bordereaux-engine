'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryPacksApi, issuesApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, Download, Check, AlertTriangle,
  Loader2, Copy, CheckCircle, Eye
} from 'lucide-react';
import { severityConfig, cn, downloadBlob, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function QueryPacksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const runId = searchParams.get('run_id');
  
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Fetch issues for selection
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues-for-querypack', runId],
    queryFn: () => issuesApi.list({ 
      run_id: runId || undefined, 
      status: ['open', 'acknowledged'],
      page_size: 200 
    }),
    enabled: activeTab === 'create',
  });

  // Fetch existing query packs
  const { data: queryPacks, isLoading: packsLoading } = useQuery({
    queryKey: ['query-packs', runId],
    queryFn: () => queryPacksApi.list(runId || undefined),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { title: string; issue_ids: string[]; include_evidence: boolean }) =>
      queryPacksApi.create(data),
    onSuccess: (pack) => {
      toast.success('Query pack created');
      setPreviewContent(pack.content);
      setSelectedIssues(new Set());
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['query-packs'] });
    },
    onError: () => {
      toast.error('Failed to create query pack');
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'docx' | 'pdf' | 'markdown' }) =>
      queryPacksApi.export(id, format),
    onSuccess: (blob, { format }) => {
      const ext = format === 'markdown' ? 'md' : format;
      downloadBlob(blob, `query-pack.${ext}`);
      toast.success('Downloaded!');
    },
    onError: () => {
      toast.error('Export failed');
    },
  });

  const issues = issuesData?.items || [];

  const toggleIssue = (id: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllBySeverity = (severity: string) => {
    const toSelect = issues.filter((i: any) => i.severity === severity).map((i: any) => i.id);
    setSelectedIssues(new Set([...selectedIssues, ...toSelect]));
  };

  const handleCreate = () => {
    if (selectedIssues.size === 0) {
      toast.error('Select at least one issue');
      return;
    }
    if (!title.trim()) {
      toast.error('Enter a title');
      return;
    }
    
    createMutation.mutate({
      title: title.trim(),
      issue_ids: Array.from(selectedIssues),
      include_evidence: true,
    });
  };

  const handleCopyContent = async (content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      toast.success('Copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                Query Packs
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('create')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'create' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Create New
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Previous ({queryPacks?.length || 0})
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'create' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issue Selection */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Select Issues</h2>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => selectAllBySeverity('P0')}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    + All P0
                  </button>
                  <button
                    onClick={() => selectAllBySeverity('P1')}
                    className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded"
                  >
                    + All P1
                  </button>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
                {issuesLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  </div>
                ) : issues.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle className="h-10 w-10 text-green-300 mx-auto mb-2" />
                    No open issues to query
                  </div>
                ) : (
                  issues.map((issue: any) => (
                    <label
                      key={issue.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50',
                        selectedIssues.has(issue.id) && 'bg-primary-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIssues.has(issue.id)}
                        onChange={() => toggleIssue(issue.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-xs font-medium',
                            severityConfig[issue.severity as keyof typeof severityConfig]?.color
                          )}>
                            {issue.severity}
                          </span>
                          <span className="font-medium text-gray-900 truncate">
                            {issue.title}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {issue.description}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {selectedIssues.size > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-600">
                    {selectedIssues.size} issue{selectedIssues.size !== 1 ? 's' : ''} selected
                  </span>
                </div>
              )}
            </div>

            {/* Create Form & Preview */}
            <div className="space-y-6">
              {/* Create Form */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-4">Create Query Pack</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Q1 2024 Premium Queries - Alpha MGA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={selectedIssues.size === 0 || !title.trim() || createMutation.isPending}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium',
                    selectedIssues.size > 0 && title.trim()
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate Query Pack
                    </>
                  )}
                </button>
              </div>

              {/* Preview */}
              {previewContent && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Preview</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyContent(previewContent)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                        title="Copy"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                      {previewContent}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Previous Query Packs List */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {packsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : !queryPacks || queryPacks.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No query packs created yet</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-primary-600 hover:text-primary-700 text-sm mt-2"
                >
                  Create your first one
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {queryPacks.map((pack: any) => (
                  <div key={pack.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{pack.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {pack.issue_ids?.length || 0} issues included
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewContent(pack.content)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopyContent(pack.content)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => exportMutation.mutate({ id: pack.id, format: 'docx' })}
                          disabled={exportMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                        >
                          <Download className="h-3 w-3" />
                          DOCX
                        </button>
                        <button
                          onClick={() => exportMutation.mutate({ id: pack.id, format: 'pdf' })}
                          disabled={exportMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Preview Modal */}
        {previewContent && activeTab === 'list' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Query Pack Preview</h2>
                <button
                  onClick={() => setPreviewContent(null)}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto flex-1">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {previewContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
