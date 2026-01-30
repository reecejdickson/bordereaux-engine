'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mappingsApi, uploadsApi } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, Check, X, AlertCircle, CheckCircle, 
  HelpCircle, Loader2, Save, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function MappingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const runId = searchParams.get('run_id');
  const uploadId = searchParams.get('upload_id');

  const [editedMappings, setEditedMappings] = useState<Record<string, { canonical_field: string | null; status: string }>>({});
  const [showCanonicalDropdown, setShowCanonicalDropdown] = useState<string | null>(null);

  // Fetch mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['mappings', runId],
    queryFn: () => mappingsApi.list(runId!),
    enabled: !!runId,
  });

  // Fetch canonical schema
  const { data: schemaData } = useQuery({
    queryKey: ['canonical-schema'],
    queryFn: () => mappingsApi.getCanonicalSchema(),
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (mappings: { id: string; canonical_field?: string; status: string }[]) =>
      mappingsApi.bulkUpdate(mappings),
    onSuccess: () => {
      toast.success('Mappings saved');
      setEditedMappings({});
      queryClient.invalidateQueries({ queryKey: ['mappings', runId] });
    },
    onError: () => {
      toast.error('Failed to save mappings');
    },
  });

  const canonicalFields = schemaData?.fields || [];

  const handleFieldChange = (mappingId: string, canonicalField: string | null) => {
    setEditedMappings(prev => ({
      ...prev,
      [mappingId]: {
        canonical_field: canonicalField,
        status: canonicalField ? 'user_approved' : 'rejected',
      },
    }));
    setShowCanonicalDropdown(null);
  };

  const handleApprove = (mappingId: string, currentField: string | null) => {
    if (!currentField) return;
    setEditedMappings(prev => ({
      ...prev,
      [mappingId]: {
        canonical_field: currentField,
        status: 'user_approved',
      },
    }));
  };

  const handleReject = (mappingId: string) => {
    setEditedMappings(prev => ({
      ...prev,
      [mappingId]: {
        canonical_field: null,
        status: 'rejected',
      },
    }));
  };

  const handleSave = () => {
    const updates = Object.entries(editedMappings).map(([id, data]) => ({
      id,
      canonical_field: data.canonical_field || undefined,
      status: data.status,
    }));
    
    if (updates.length === 0) {
      toast.error('No changes to save');
      return;
    }
    
    bulkUpdateMutation.mutate(updates);
  };

  const hasChanges = Object.keys(editedMappings).length > 0;

  const getEffectiveMapping = (mapping: any) => {
    if (editedMappings[mapping.id]) {
      return {
        canonical_field: editedMappings[mapping.id].canonical_field,
        status: editedMappings[mapping.id].status,
      };
    }
    return {
      canonical_field: mapping.canonical_field,
      status: mapping.status,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Auto-approved</span>;
      case 'user_approved':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">Rejected</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Pending Review</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{status}</span>;
    }
  };

  const pendingCount = (mappings || []).filter((m: any) => m.status === 'pending').length;

  if (!runId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No run ID specified</p>
          <Link href="/uploads" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
            Go to uploads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href={uploadId ? `/uploads/${uploadId}` : '/uploads'} 
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Column Mapping Review
                </h1>
                {pendingCount > 0 && (
                  <p className="text-sm text-amber-600">{pendingCount} mappings need review</p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || bulkUpdateMutation.isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
                hasChanges
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes {hasChanges && `(${Object.keys(editedMappings).length})`}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-1">How it works</h3>
          <p className="text-sm text-blue-700">
            Review each source column and confirm or change its mapping to a canonical field.
            High-confidence mappings are auto-approved. Lower confidence mappings need your review.
          </p>
        </div>

        {/* Mappings Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {mappingsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : !mappings || mappings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No mappings found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source Column</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mapped To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((mapping: any) => {
                  const effective = getEffectiveMapping(mapping);
                  const isEdited = !!editedMappings[mapping.id];
                  
                  return (
                    <tr 
                      key={mapping.id} 
                      className={cn(
                        'hover:bg-gray-50',
                        mapping.status === 'pending' && !isEdited && 'bg-yellow-50',
                        isEdited && 'bg-blue-50'
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{mapping.source_header}</span>
                        <span className="text-gray-400 text-xs ml-2">Col {mapping.source_index + 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                'h-2 rounded-full',
                                mapping.confidence >= 0.9 ? 'bg-green-500' :
                                mapping.confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${mapping.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round(mapping.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setShowCanonicalDropdown(
                            showCanonicalDropdown === mapping.id ? null : mapping.id
                          )}
                          className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 min-w-[200px] justify-between"
                        >
                          <span className={effective.canonical_field ? 'text-gray-900' : 'text-gray-400'}>
                            {effective.canonical_field || 'Select field...'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        
                        {/* Dropdown */}
                        {showCanonicalDropdown === mapping.id && (
                          <div className="absolute z-10 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            <button
                              onClick={() => handleFieldChange(mapping.id, null)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-500 italic"
                            >
                              None (unmapped)
                            </button>
                            {canonicalFields.map((field: any) => (
                              <button
                                key={field.name}
                                onClick={() => handleFieldChange(mapping.id, field.name)}
                                className={cn(
                                  'w-full px-3 py-2 text-left hover:bg-gray-100',
                                  effective.canonical_field === field.name && 'bg-primary-50'
                                )}
                              >
                                <div className="font-medium text-gray-900">{field.display_name}</div>
                                <div className="text-xs text-gray-500">{field.name}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(effective.status)}
                        {isEdited && (
                          <span className="ml-2 text-xs text-blue-600">(modified)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {effective.status === 'pending' && effective.canonical_field && (
                            <button
                              onClick={() => handleApprove(mapping.id, effective.canonical_field)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {effective.status !== 'rejected' && (
                            <button
                              onClick={() => handleReject(mapping.id)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions Footer */}
        {hasChanges && (
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => setEditedMappings({})}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              disabled={bulkUpdateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {bulkUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save All Changes
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
