'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { uploadsApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import { Upload, FileSpreadsheet, X, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState<string>('premium');

  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; record_type: string }) =>
      uploadsApi.upload(data.file, { record_type: data.record_type }),
    onSuccess: (data) => {
      toast.success('File uploaded successfully! Processing started.');
      router.push(`/uploads/${data.id}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Upload failed';
      toast.error(message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate({ file, record_type: recordType });
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">
              Upload Bordereaux
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          {/* Record Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Record Type
            </label>
            <div className="flex gap-4">
              {[
                { value: 'premium', label: 'Premium Bordereaux' },
                { value: 'claims', label: 'Claims Bordereaux' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRecordType(option.value)}
                  className={`px-6 py-3 rounded-lg border-2 transition-colors ${
                    recordType === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium text-primary-600">
                  Drop the file here...
                </p>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-700 mb-1">
                    Drag & drop your file here
                  </p>
                  <p className="text-gray-500 mb-4">
                    or click to browse
                  </p>
                  <p className="text-sm text-gray-400">
                    Supported formats: XLSX, XLS, CSV (max 50MB)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary-100 rounded-lg p-3">
                    <FileSpreadsheet className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="mt-6 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload & Process
                  </>
                )}
              </button>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your file will be securely uploaded and encrypted</li>
              <li>• The system will parse and extract all data with cell references</li>
              <li>• AI will suggest column mappings for validation</li>
              <li>• Validation rules will check for data quality issues</li>
              <li>• You&apos;ll get a detailed report with evidence for each issue</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
