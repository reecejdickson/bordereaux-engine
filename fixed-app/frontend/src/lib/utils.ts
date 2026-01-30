/**
 * Utility functions
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

// Classname utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format date
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm');
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Severity colors and labels
export const severityConfig = {
  P0: {
    label: 'P0 - Critical',
    color: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  P1: {
    label: 'P1 - Material',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  P2: {
    label: 'P2 - Warning',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
};

// Status colors and labels
export const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
  queued: { label: 'Queued', color: 'bg-gray-100 text-gray-800' },
  parsing: { label: 'Parsing', color: 'bg-blue-100 text-blue-800' },
  mapping: { label: 'Mapping', color: 'bg-indigo-100 text-indigo-800' },
  validating: { label: 'Validating', color: 'bg-purple-100 text-purple-800' },
  open: { label: 'Open', color: 'bg-red-100 text-red-800' },
  acknowledged: { label: 'Acknowledged', color: 'bg-yellow-100 text-yellow-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  wont_fix: { label: "Won't Fix", color: 'bg-gray-100 text-gray-800' },
};

// Download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
