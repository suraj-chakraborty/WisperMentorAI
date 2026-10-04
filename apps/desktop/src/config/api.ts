/**
 * Centralized API & WebSocket configuration for WhisperMentor AI Desktop.
 * Resolves endpoints from Vite environment variables with localhost fallbacks.
 */

export const API_BASE_URL: string = (
    import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'
).replace(/\/+$/, '');

export const WS_BASE_URL: string = (
    import.meta.env.VITE_WS_URL || API_BASE_URL
).replace(/\/+$/, '');

/**
 * Helper to construct an absolute API endpoint URL.
 */
export function apiEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
}
