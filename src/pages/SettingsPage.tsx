import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SettingsPage = () => {
  const { user, loading } = useAuth();

  const getUserInitials = (email: string | undefined) => {
    if (!email) return "U";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-muted-foreground">
            Información de tu cuenta
          </p>
        </div>

        {/* Información del usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Información del usuario</CardTitle>
            <CardDescription>
              Datos de tu cuenta de usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-medium text-primary">
                    {getUserInitials(user?.email)}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Usuario</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-semibold">{user?.email || "No disponible"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enlace a gestión de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de usuarios</CardTitle>
            <CardDescription>
              Administra los usuarios con acceso al portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Ir a gestión de usuarios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
