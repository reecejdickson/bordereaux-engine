'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { uploadsApi } from '@/lib/api';
import Link from 'next/link';
import { 
  FileUp, AlertTriangle, CheckCircle, Clock, 
  ArrowRight, BarChart3, FileText, Settings
} from 'lucide-react';
import { formatRelativeTime, statusConfig, formatFileSize } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch recent uploads
  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ['uploads', 1],
    queryFn: () => uploadsApi.list(1, 5),
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Bordereaux Exception Engine
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user.full_name}
              </span>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.full_name.split(' ')[0]}
          </h2>
          <p className="text-gray-600 mt-1">
            Detect and resolve bordereaux data quality issues
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/uploads/new"
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-6 flex items-center gap-4 transition-colors"
          >
            <div className="bg-primary-500 rounded-lg p-3">
              <FileUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Upload Bordereaux</h3>
              <p className="text-primary-100 text-sm">Upload a new file for processing</p>
            </div>
          </Link>

          <Link
            href="/issues"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center gap-4 transition-colors"
          >
            <div className="bg-amber-100 rounded-lg p-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Review Issues</h3>
              <p className="text-gray-500 text-sm">View and resolve open issues</p>
            </div>
          </Link>

          <Link
            href="/query-packs"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center gap-4 transition-colors"
          >
            <div className="bg-blue-100 rounded-lg p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Query Packs</h3>
              <p className="text-gray-500 text-sm">Generate and export queries</p>
            </div>
          </Link>
        </div>

        {/* Secondary Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/uploads"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
          >
            <FileUp className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">All Uploads</span>
          </Link>
          <Link
            href="/counterparties"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Counterparties</span>
          </Link>
          <Link
            href="/mappings"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Mappings</span>
          </Link>
          <Link
            href="/issues"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">All Issues</span>
          </Link>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Uploads</h3>
            <Link 
              href="/uploads" 
              className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {uploadsLoading ? (
            <div className="p-8 text-center text-gray-500">
              Loading...
            </div>
          ) : uploadsData?.items?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {uploadsData.items.map((upload: any) => (
                <Link
                  key={upload.id}
                  href={`/uploads/${upload.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {upload.original_filename}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(upload.file_size)} • {formatRelativeTime(upload.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[upload.status]?.color || ''}`}>
                    {statusConfig[upload.status]?.label || upload.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No uploads yet</p>
              <Link
                href="/uploads/new"
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Upload your first bordereaux
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
