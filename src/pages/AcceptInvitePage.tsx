import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import NogalLogo from '@/components/branding/NogalLogo';

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Supabase redirects with token in hash or query params
    // Format: #access_token=...&token_type=...&type=invite
    // Or: ?token_hash=...&type=invite
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Try to get token from hash (most common)
    const accessTokenMatch = hash.match(/access_token=([^&]+)/);
    const tokenHashMatch = hash.match(/token_hash=([^&]+)/) || search.match(/token_hash=([^&]+)/);
    const typeMatch = hash.match(/type=([^&]+)/) || search.match(/type=([^&]+)/);
    
    const tokenToUse = accessTokenMatch?.[1] || tokenHashMatch?.[1];
    const tokenType = typeMatch?.[1];

    if (tokenToUse && tokenType === 'invite') {
      setToken(tokenToUse);
    } else if (tokenToUse) {
      // Token exists but type might be different, still try
      setToken(tokenToUse);
    }

    // Try to get email from query params
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }

    // If we have an access_token in hash, Supabase might have already authenticated
    if (accessTokenMatch) {
      // Supabase client will automatically handle this via onAuthStateChange
    }
  }, [searchParams]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/(?=.*[0-9])/.test(pwd)) {
      return 'La contraseña debe contener al menos un número';
    }
    return null;
  };

  useEffect(() => {
    // Check if user is already authenticated (Supabase might have auto-authenticated from the invite link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || null);
        // If user is authenticated but password not set, they can set it now
        // If password is already set, redirect to dashboard
        if (session.user.email_confirmed_at) {
          navigate('/');
        }
      }
    };
    checkSession();

    // Listen for auth state changes (Supabase might authenticate when clicking invite link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setEmail(session.user.email || null);
        if (session.user.email_confirmed_at) {
          navigate('/');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // Check if user is already authenticated from the invite link
      // When Supabase redirects after invite verification, it automatically creates a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated from the invite link, just update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          throw updateError;
        }

        setSuccess(true);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // User not authenticated yet
        // Try to extract token from URL and verify
        const hash = window.location.hash;
        const search = window.location.search;
        
        // Parse token_hash from URL
        const tokenHashMatch = hash.match(/token_hash=([^&]+)/) || search.match(/token_hash=([^&]+)/);
        const typeMatch = hash.match(/type=([^&]+)/) || search.match(/type=([^&]+)/);
        
        if (tokenHashMatch && typeMatch?.[1] === 'invite') {
          const tokenHash = decodeURIComponent(tokenHashMatch[1]);
          
          // Verify the invite token
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'invite',
          });

          if (verifyError || !data.session) {
            throw new Error(
              verifyError?.message ||
              'El token de invitación no es válido o ha expirado. ' +
              'Por favor, solicita una nueva invitación o contacta al administrador.'
            );
          }

          // After verifying, update password
          const { error: updateError } = await supabase.auth.updateUser({
            password: password,
          });

          if (updateError) {
            throw updateError;
          }

          setSuccess(true);
          
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          throw new Error(
            'Token de invitación no encontrado en la URL. ' +
            'Por favor, usa el link completo del email de invitación.'
          );
        }
      }
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      setError(
        err.message || 
        'Error al aceptar la invitación. El token puede haber expirado. Por favor, solicita una nueva invitación.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <NogalLogo className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">¡Invitación aceptada!</CardTitle>
            <CardDescription>
              Tu contraseña ha sido establecida correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Serás redirigido al login en unos segundos...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <NogalLogo className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Aceptar invitación</CardTitle>
          <CardDescription>
            {email ? `Establece tu contraseña para ${email}` : 'Establece tu contraseña para completar tu registro'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!token && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No se encontró un token de invitación válido en la URL.
                  Por favor, usa el link completo del email de invitación.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading || !token}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, con mayúsculas, minúsculas y números
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading || !token}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Estableciendo contraseña...
                </>
              ) : (
                'Aceptar invitación'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitePage;

