import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '@/services/authService';
import type { LoginCredentials, SignupCredentials } from '@/services/authService';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignupCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  isEmailConfirmed: boolean;
  resendEmailConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

/**
 * Hook for managing authentication state and operations
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        const user = await authService.getUser();
        
        setSession(session);
        setUser(user);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Error al inicializar la sesión');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.signIn(credentials);

      if (response.error) {
        setError(response.error.message || 'Error al iniciar sesión');
        throw new Error(response.error.message);
      }

      setUser(response.user);
      setSession(response.session);

      // Check if email is confirmed
      if (response.user && !authService.isEmailConfirmed(response.user)) {
        navigate('/verify-email');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (credentials: SignupCredentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.signUp(credentials);

      if (response.error) {
        setError(response.error.message || 'Error al registrarse');
        throw new Error(response.error.message);
      }

      setUser(response.user);
      setSession(response.session);

      // Redirect to email verification page
      navigate('/verify-email');
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await authService.signOut();

      if (error) {
        setError(error.message || 'Error al cerrar sesión');
        throw new Error(error.message);
      }

      setUser(null);
      setSession(null);
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendEmailConfirmation = async (email: string) => {
    setError(null);

    try {
      const { error } = await authService.resendEmailConfirmation(email);

      if (error) {
        setError(error.message || 'Error al reenviar el email');
        throw new Error(error.message);
      }
    } catch (err) {
      console.error('Resend email error:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);

    try {
      const { error } = await authService.resetPassword(email);

      if (error) {
        setError(error.message || 'Error al enviar el email de recuperación');
        throw new Error(error.message);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      throw err;
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isEmailConfirmed: authService.isEmailConfirmed(user),
    resendEmailConfirmation,
    resetPassword,
  };
};



