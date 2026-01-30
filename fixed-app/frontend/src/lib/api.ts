/**
 * API Client for Bordereaux Exception Engine
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  tenant_id: string;
}

export interface Upload {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_hash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  record_type?: 'premium' | 'claims' | 'risk';
  created_at: string;
}

export interface Run {
  id: string;
  upload_id: string;
  run_number: number;
  status: 'queued' | 'parsing' | 'mapping' | 'validating' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  total_rows: number;
  issues_p0: number;
  issues_p1: number;
  issues_p2: number;
  error_message?: string;
}

export interface Evidence {
  id: string;
  sheet_name: string;
  cell_reference: string;
  row_index: number;
  column_index: number;
  column_name: string;
  actual_value?: string;
  expected_value?: string;
  evidence_type: string;
}

export interface Issue {
  id: string;
  rule_id: string;
  severity: 'P0' | 'P1' | 'P2';
  status: 'open' | 'acknowledged' | 'resolved' | 'wont_fix';
  title: string;
  description: string;
  ai_explanation?: string;
  evidence: Evidence[];
  calculation?: Record<string, any>;
  created_at: string;
}

export interface QueryPack {
  id: string;
  title: string;
  content: string;
  issue_ids: string[];
  exported_format?: string;
  created_at: string;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, password: string, full_name: string) => {
    const response = await api.post('/auth/register', { email, password, full_name });
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Uploads API
export const uploadsApi = {
  list: async (page = 1, pageSize = 20) => {
    const response = await api.get('/uploads', { params: { page, page_size: pageSize } });
    return response.data;
  },
  
  get: async (id: string): Promise<Upload> => {
    const response = await api.get(`/uploads/${id}`);
    return response.data;
  },
  
  upload: async (file: File, metadata?: {
    counterparty_id?: string;
    record_type?: string;
    period_start?: string;
    period_end?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
    }
    
    const response = await api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  getRuns: async (uploadId: string): Promise<Run[]> => {
    const response = await api.get(`/uploads/${uploadId}/runs`);
    return response.data;
  },
  
  getRunSummary: async (uploadId: string, runId: string) => {
    const response = await api.get(`/uploads/${uploadId}/runs/${runId}`);
    return response.data;
  },
  
  reprocess: async (uploadId: string): Promise<Run> => {
    const response = await api.post(`/uploads/${uploadId}/reprocess`);
    return response.data;
  },
  
  delete: async (uploadId: string) => {
    await api.delete(`/uploads/${uploadId}`);
  },
};

// Issues API
export const issuesApi = {
  list: async (params: {
    run_id?: string;
    upload_id?: string;
    severity?: string[];
    status?: string[];
    rule_id?: string[];
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await api.get('/issues', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<Issue> => {
    const response = await api.get(`/issues/${id}`);
    return response.data;
  },
  
  update: async (id: string, data: { status: string; resolution_notes?: string }) => {
    const response = await api.patch(`/issues/${id}`, data);
    return response.data;
  },
  
  bulkUpdate: async (issueIds: string[], status: string, notes?: string) => {
    const response = await api.post('/issues/bulk-update', {
      issue_ids: issueIds,
      status,
      resolution_notes: notes,
    });
    return response.data;
  },
  
  getEvidence: async (issueId: string): Promise<Evidence[]> => {
    const response = await api.get(`/issues/${issueId}/evidence`);
    return response.data;
  },
};

// Query Packs API
export const queryPacksApi = {
  list: async (runId?: string): Promise<QueryPack[]> => {
    const response = await api.get('/query-packs', { params: { run_id: runId } });
    return response.data;
  },
  
  create: async (data: { title: string; issue_ids: string[]; include_evidence?: boolean }) => {
    const response = await api.post('/query-packs', data);
    return response.data;
  },
  
  get: async (id: string): Promise<QueryPack> => {
    const response = await api.get(`/query-packs/${id}`);
    return response.data;
  },
  
  export: async (id: string, format: 'docx' | 'pdf' | 'markdown') => {
    const response = await api.post(`/query-packs/${id}/export`, { format }, {
      responseType: 'blob',
    });
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/query-packs/${id}`);
  },
};

// Mappings API
export const mappingsApi = {
  list: async (runId: string) => {
    const response = await api.get('/mappings', { params: { run_id: runId } });
    return response.data;
  },
  
  update: async (id: string, data: { canonical_field?: string; status: string }) => {
    const response = await api.patch(`/mappings/${id}`, data);
    return response.data;
  },
  
  bulkUpdate: async (mappings: { id: string; canonical_field?: string; status: string }[]) => {
    const response = await api.post('/mappings/bulk-update', { mappings });
    return response.data;
  },
  
  getCanonicalSchema: async (recordType?: string) => {
    const response = await api.get('/mappings/schema/canonical', { 
      params: { record_type: recordType } 
    });
    return response.data;
  },
  
  getValidationRules: async () => {
    const response = await api.get('/mappings/schema/rules');
    return response.data;
  },
};

// Counterparties API
export interface Counterparty {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
  upload_count: number;
}

export const counterpartiesApi = {
  list: async (): Promise<Counterparty[]> => {
    const response = await api.get('/counterparties');
    return response.data;
  },
  
  create: async (data: { name: string; code: string; contact_email?: string }): Promise<Counterparty> => {
    const response = await api.post('/counterparties', data);
    return response.data;
  },
  
  get: async (id: string): Promise<Counterparty> => {
    const response = await api.get(`/counterparties/${id}`);
    return response.data;
  },
  
  update: async (id: string, data: { name?: string; code?: string; contact_email?: string }): Promise<Counterparty> => {
    const response = await api.patch(`/counterparties/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/counterparties/${id}`);
  },
};

export default api;
