'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { uploadsApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, FileSpreadsheet, Plus, Search, Filter,
  CheckCircle, XCircle, Clock, Loader2, AlertTriangle
} from 'lucide-react';
import { formatDate, formatRelativeTime, formatFileSize, statusConfig, cn } from '@/lib/utils';

export default function UploadsListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['uploads', page, statusFilter],
    queryFn: () => uploadsApi.list(page, pageSize),
  });

  const uploads = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredUploads = uploads.filter((u: any) => {
    if (search && !u.original_filename.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter && u.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                All Uploads
              </h1>
            </div>
            <Link
              href="/uploads/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Upload New
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              {[null, 'pending', 'processing', 'completed', 'failed'].map((status) => (
                <button
                  key={status || 'all'}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm capitalize border transition-colors',
                    statusFilter === status
                      ? status ? statusConfig[status]?.color : 'bg-primary-100 text-primary-800 border-primary-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Uploads Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No uploads found</p>
              <Link
                href="/uploads/new"
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Upload your first bordereaux
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUploads.map((upload: any) => (
                    <tr key={upload.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/uploads/${upload.id}`}
                          className="flex items-center gap-3 hover:text-primary-600"
                        >
                          <FileSpreadsheet className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{upload.original_filename}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-600">
                          {upload.record_type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatFileSize(upload.file_size)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(upload.status)}
                          <span className={cn(
                            'px-2 py-1 rounded text-xs',
                            statusConfig[upload.status]?.color
                          )}>
                            {statusConfig[upload.status]?.label || upload.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {upload.status === 'completed' ? (
                          <Link
                            href={`/issues?upload_id=${upload.id}`}
                            className="flex items-center gap-2 text-sm hover:text-primary-600"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span>View Issues</span>
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatRelativeTime(upload.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
