import { createClient } from '@supabase/supabase-js';
import config from '../../../config/index';

// Create admin client with service role key
const supabaseAdmin = createClient(
  config.nogalSupabaseUrl,
  config.nogalSupabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface UserListItem {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_super_admin: boolean | null;
}

export interface UserInviteResult {
  user: any | null;
  error: Error | null;
}

export interface UserDeleteResult {
  error: Error | null;
}

/**
 * Service for managing users using Supabase Admin API
 */
class UsersService {
  /**
   * List all users
   */
  async listUsers(): Promise<UserListItem[]> {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      throw new Error(`Error listing users: ${error.message}`);
    }

    return users.map((user) => ({
      id: user.id,
      email: user.email || '',
      email_confirmed_at: user.email_confirmed_at || null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      is_super_admin: (user as any).is_super_admin || null,
    }));
  }

  /**
   * Invite a user by email
   */
  async inviteUser(
    email: string,
    redirectTo?: string
  ): Promise<UserInviteResult> {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: redirectTo || `${process.env.FRONTEND_URL || 'https://insightcall-portal.onrender.com'}/accept-invite`,
        }
      );

      if (error) {
        return {
          user: null,
          error: new Error(error.message),
        };
      }

      return {
        user: user || null,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        error: err instanceof Error ? err : new Error('Error al invitar usuario'),
      };
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<UserDeleteResult> {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        return {
          error: new Error(error.message),
        };
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Error al eliminar usuario'),
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserListItem | null> {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      email_confirmed_at: user.email_confirmed_at || null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      is_super_admin: (user as any).is_super_admin || null,
    };
  }
}

export const usersService = new UsersService();

