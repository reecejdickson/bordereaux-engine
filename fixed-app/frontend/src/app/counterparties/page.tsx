'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { counterpartiesApi, Counterparty } from '@/lib/api';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Building2, Pencil, Trash2, 
  Loader2, X, Check, Mail, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CounterpartiesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', contact_email: '' });

  // Fetch counterparties
  const { data: counterparties, isLoading } = useQuery({
    queryKey: ['counterparties'],
    queryFn: counterpartiesApi.list,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: counterpartiesApi.create,
    onSuccess: () => {
      toast.success('Counterparty created');
      setShowForm(false);
      setFormData({ name: '', code: '', contact_email: '' });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      counterpartiesApi.update(id, data),
    onSuccess: () => {
      toast.success('Counterparty updated');
      setEditingId(null);
      setFormData({ name: '', code: '', contact_email: '' });
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: counterpartiesApi.delete,
    onSuccess: () => {
      toast.success('Counterparty deleted');
      queryClient.invalidateQueries({ queryKey: ['counterparties'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const startEdit = (cp: Counterparty) => {
    setEditingId(cp.id);
    setFormData({ name: cp.name, code: cp.code, contact_email: cp.contact_email || '' });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', code: '', contact_email: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                Counterparties (MGAs)
              </h1>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({ name: '', code: '', contact_email: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Counterparty
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Counterparty' : 'Add Counterparty'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Alpha MGA Ltd"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    required
                    placeholder="ALPHA"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="bordereaux@alpha.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : !counterparties || counterparties.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No counterparties yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2"
              >
                Add your first counterparty
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {counterparties.map((cp) => (
                  <tr key={cp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <span className="font-medium text-gray-900">{cp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {cp.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cp.contact_email ? (
                        <a 
                          href={`mailto:${cp.contact_email}`}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600"
                        >
                          <Mail className="h-4 w-4" />
                          {cp.contact_email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cp.upload_count > 0 ? (
                        <Link
                          href={`/uploads?counterparty=${cp.id}`}
                          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <FileText className="h-4 w-4" />
                          {cp.upload_count} file{cp.upload_count !== 1 ? 's' : ''}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">No uploads</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(cp)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${cp.name}?`)) {
                              deleteMutation.mutate(cp.id);
                            }
                          }}
                          disabled={cp.upload_count > 0}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title={cp.upload_count > 0 ? "Can't delete - has uploads" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
