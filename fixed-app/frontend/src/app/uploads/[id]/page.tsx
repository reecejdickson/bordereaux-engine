'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadsApi, issuesApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, FileSpreadsheet, RefreshCw, Clock, CheckCircle, 
  AlertTriangle, XCircle, Loader2, FileText, ExternalLink, Settings
} from 'lucide-react';
import { formatDate, formatFileSize, statusConfig, severityConfig } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UploadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const uploadId = params.id as string;

  // Fetch upload details
  const { data: upload, isLoading: uploadLoading } = useQuery({
    queryKey: ['upload', uploadId],
    queryFn: () => uploadsApi.get(uploadId),
    refetchInterval: (data) => 
      data?.status === 'processing' || data?.status === 'pending' ? 3000 : false,
  });

  // Fetch runs
  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ['runs', uploadId],
    queryFn: () => uploadsApi.getRuns(uploadId),
    enabled: !!upload,
    refetchInterval: (data) => 
      data?.some((r: any) => ['queued', 'parsing', 'mapping', 'validating'].includes(r.status)) ? 3000 : false,
  });

  // Fetch issues for latest run
  const latestRun = runs?.[0];
  const { data: issuesData } = useQuery({
    queryKey: ['issues', latestRun?.id],
    queryFn: () => issuesApi.list({ run_id: latestRun.id, page_size: 100 }),
    enabled: !!latestRun && latestRun.status === 'completed',
  });

  // Reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: () => uploadsApi.reprocess(uploadId),
    onSuccess: () => {
      toast.success('Reprocessing started');
      queryClient.invalidateQueries({ queryKey: ['runs', uploadId] });
      queryClient.invalidateQueries({ queryKey: ['upload', uploadId] });
    },
    onError: () => {
      toast.error('Failed to start reprocessing');
    },
  });

  if (uploadLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Upload not found</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
      case 'parsing':
      case 'mapping':
      case 'validating':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
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
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {upload.original_filename}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[upload.status]?.color || ''}`}>
                {statusConfig[upload.status]?.label || upload.status}
              </span>
              <button
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending || upload.status === 'processing'}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                Reprocess
              </button>
              {latestRun?.status === 'completed' && (
                <>
                  <Link
                    href={`/mappings?run_id=${latestRun.id}&upload_id=${uploadId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Review Mappings
                  </Link>
                  <Link
                    href={`/query-packs?run_id=${latestRun.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <FileText className="h-4 w-4" />
                    Create Query Pack
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">File Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Size</dt>
                <dd className="font-medium">{formatFileSize(upload.file_size)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="font-medium capitalize">{upload.record_type || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Uploaded</dt>
                <dd className="font-medium">{formatDate(upload.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">File Hash</dt>
                <dd className="font-mono text-xs text-gray-600 break-all">
                  {upload.file_hash.slice(0, 16)}...
                </dd>
              </div>
            </dl>
          </div>

          {/* Processing Status */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Processing Runs</h2>
            
            {runsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : runs && runs.length > 0 ? (
              <div className="space-y-4">
                {runs.map((run: any) => (
                  <div
                    key={run.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <span className="font-medium">Run #{run.run_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusConfig[run.status]?.color || ''}`}>
                          {statusConfig[run.status]?.label || run.status}
                        </span>
                      </div>
                      {run.completed_at && (
                        <span className="text-sm text-gray-500">
                          {formatDate(run.completed_at)}
                        </span>
                      )}
                    </div>

                    {run.status === 'completed' && (
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-600">
                          {run.total_rows} rows
                        </span>
                        {run.issues_p0 > 0 && (
                          <span className="text-red-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {run.issues_p0} P0
                          </span>
                        )}
                        {run.issues_p1 > 0 && (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {run.issues_p1} P1
                          </span>
                        )}
                        {run.issues_p2 > 0 && (
                          <span className="text-blue-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            {run.issues_p2} P2
                          </span>
                        )}
                        {run.issues_p0 === 0 && run.issues_p1 === 0 && run.issues_p2 === 0 && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            No issues found
                          </span>
                        )}
                      </div>
                    )}

                    {run.error_message && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        {run.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No processing runs yet</p>
            )}
          </div>
        </div>

        {/* Issues Section */}
        {latestRun?.status === 'completed' && issuesData?.items?.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">
                Issues ({issuesData.total})
              </h2>
              <Link
                href={`/issues?run_id=${latestRun.id}`}
                className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
              >
                View all <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="divide-y divide-gray-100">
              {issuesData.items.slice(0, 5).map((issue: any) => (
                <Link
                  key={issue.id}
                  href={`/issues?id=${issue.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${severityConfig[issue.severity as keyof typeof severityConfig]?.dot}`} />
                    <div>
                      <p className="font-medium text-gray-900">{issue.title}</p>
                      <p className="text-sm text-gray-500">Rule: {issue.rule_id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${severityConfig[issue.severity as keyof typeof severityConfig]?.color}`}>
                    {issue.severity}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
