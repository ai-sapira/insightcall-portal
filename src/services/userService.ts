import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Get API base URL
 * In development: uses VITE_API_URL or defaults to localhost:3000
 * In production: uses VITE_API_URL or same origin
 */
const getApiBaseUrl = (): string => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development, default to localhost:3000
  if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // In production, use same origin (assuming server is proxied or on same domain)
  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

export interface UserInvitation {
  email: string;
  redirectTo?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_super_admin: boolean | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Service for managing users via server API endpoints
 */
class UserService {
  /**
   * Get auth headers with current session token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  /**
   * List all users
   */
  async listUsers(): Promise<UserListItem[]> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${API_BASE_URL}/api/v1/users`;
      
      console.log('[UserService] Fetching users from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      // Check if response is HTML (common when API endpoint doesn't exist)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.warn('[UserService] Received HTML instead of JSON. API endpoint may not be available.');
          throw new Error(
            `El endpoint de usuarios no está disponible. ` +
            `Verifica que VITE_API_URL esté configurada correctamente ` +
            `(actualmente: ${API_BASE_URL || 'no configurada'})`
          );
        }
        // If it's not HTML but also not JSON, try to parse as JSON anyway
        try {
          const result: ApiResponse<UserListItem[]> = JSON.parse(text);
          if (!result.success || !result.data) {
            throw new Error(result.message || result.error || 'Error al obtener usuarios');
          }
          return result.data;
        } catch (parseError) {
          throw new Error(`Respuesta inválida del servidor: ${response.status} ${response.statusText}`);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`;
        console.error('[UserService] API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const result: ApiResponse<UserListItem[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || result.error || 'Error al obtener usuarios');
      }

      return result.data;
    } catch (err) {
      console.error('[UserService] Error listing users:', err);
      
      // Provide more helpful error messages
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error(
          `No se pudo conectar al servidor. ` +
          `Verifica que el servidor esté corriendo en ${API_BASE_URL} ` +
          `y que la variable VITE_API_URL esté configurada correctamente.`
        );
      }
      
      // Re-throw if it's already a formatted error
      if (err instanceof Error && err.message.includes('no está disponible')) {
        throw err;
      }
      
      throw err instanceof Error ? err : new Error('Error al listar usuarios');
    }
  }

  /**
   * Invite a user by email
   */
  async inviteUser(invitation: UserInvitation): Promise<{ user: User | null; error: Error | null }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: invitation.email,
          redirectTo: invitation.redirectTo || `${window.location.origin}/accept-invite`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          user: null,
          error: new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`),
        };
      }

      const result: ApiResponse<any> = await response.json();

      if (!result.success) {
        return {
          user: null,
          error: new Error(result.message || result.error || 'Error al invitar usuario'),
        };
      }

      return {
        user: result.data || null,
        error: null,
      };
    } catch (err) {
      console.error('Error inviting user:', err);
      return {
        user: null,
        error: err instanceof Error ? err : new Error('Error al invitar usuario'),
      };
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<{ error: Error | null }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: new Error(errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`),
        };
      }

      const result: ApiResponse<void> = await response.json();

      if (!result.success) {
        return {
          error: new Error(result.message || result.error || 'Error al eliminar usuario'),
        };
      }

      return { error: null };
    } catch (err) {
      console.error('Error deleting user:', err);
      return {
        error: err instanceof Error ? err : new Error('Error al eliminar usuario'),
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
}

export const userService = new UserService();

