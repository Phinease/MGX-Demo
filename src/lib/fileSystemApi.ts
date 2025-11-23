import { FileNode } from '@/types';

/**
 * File system API configuration
 * 
 * Priority:
 * 1. Environment variable VITE_API_BASE_URL
 * 2. Auto-infer from current access address (replace port with 8000)
 * 3. Default value for local development: localhost:8000
 */
const getApiBaseUrl = () => {
  // 1. Priority: use environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. In browser environment, infer backend address from current access address
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    // If frontend runs on cloud server (not localhost), use same host with port 8000
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:8000`;
    }
  }
  
  // 3. Default value (local development environment)
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * API Error class
 */
export class FileSystemApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'FileSystemApiError';
  }
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new FileSystemApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorData.detail
    );
  }
  return response.json();
}

/**
 * Get directory tree structure
 * 
 * @param path - Directory path (absolute path)
 * @param maxDepth - Maximum recursion depth, default 5
 * @returns Array of file tree nodes with absolute paths
 */
export async function getFileTree(path: string, maxDepth: number = 5): Promise<FileNode[]> {
  try {
    const url = new URL('/api/files/tree', API_BASE_URL);
    url.searchParams.set('path', path);
    url.searchParams.set('max_depth', maxDepth.toString());

    const response = await fetch(url.toString());
    return handleResponse<FileNode[]>(response);
  } catch (error) {
    if (error instanceof FileSystemApiError) {
      throw error;
    }
    throw new FileSystemApiError(
      `Failed to fetch file tree: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file content
 * 
 * @param path - File path (absolute path)
 * @returns File content information
 */
export async function getFileContent(path: string): Promise<{
  path: string;
  name: string;
  content: string;
  language: string;
}> {
  try {
    const url = new URL('/api/files/content', API_BASE_URL);
    url.searchParams.set('path', path);

    const response = await fetch(url.toString());
    return handleResponse(response);
  } catch (error) {
    if (error instanceof FileSystemApiError) {
      throw error;
    }
    throw new FileSystemApiError(
      `Failed to fetch file content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Save file content
 * 
 * @param path - File path (absolute path)
 * @param content - File content to save
 * @returns Save result
 */
export async function saveFileContent(path: string, content: string): Promise<{
  success: boolean;
  message: string;
  path: string;
}> {
  try {
    const url = new URL('/api/files/save', API_BASE_URL);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, content }),
    });
    return handleResponse(response);
  } catch (error) {
    if (error instanceof FileSystemApiError) {
      throw error;
    }
    throw new FileSystemApiError(
      `Failed to save file content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check backend connection status
 * 
 * @returns Whether connection is successful
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}

