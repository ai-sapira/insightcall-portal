import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import NogalLogo from '@/components/branding/NogalLogo';

const VerifyEmailPage = () => {
  const { user, loading, isEmailConfirmed, resendEmailConfirmation } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    } else if (!loading && user && isEmailConfirmed) {
      navigate('/');
    }
  }, [user, loading, isEmailConfirmed, navigate]);

  const handleResend = async () => {
    if (!user?.email) return;

    setResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      await resendEmailConfirmation(user.email);
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar el email');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <NogalLogo className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifica tu email</CardTitle>
          <CardDescription>
            Te hemos enviado un enlace de verificación a tu correo electrónico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email de verificación reenviado exitosamente. Por favor revisa tu bandeja de entrada.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Hemos enviado un email de verificación a:
            </p>
            <p className="text-sm font-medium text-center">{user.email}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Por favor:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Revisa tu bandeja de entrada</li>
              <li>Haz clic en el enlace de verificación</li>
              <li>Espera unos segundos y refresca esta página</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleResend}
              disabled={resending}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Reenviar email de verificación
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;


