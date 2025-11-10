import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar/index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import NogalLogo from '../branding/NogalLogo';
import { 
  BarChart3,
  CreditCard, 
  FlaskConical,
  FolderClosed,
  Home, 
  Lock,
  PhoneCall, 
  Settings,
  ShoppingCart,
  Ticket,
  User,
  Workflow,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

// Navigation data structure
const navigationData = {
  mainNav: [
    {
      title: "Inicio",
      url: "/",
      icon: Home,
    },
  ],
  supportSection: {
    title: "Soporte",
    icon: PhoneCall,
    items: [
      {
        title: "Llamadas",
        url: "/calls",
        icon: PhoneCall,
      },
      {
        title: "Analítica",
        url: "/analytics", 
        icon: BarChart3,
      },
      {
        title: "Acciones",
        url: "/actions",
        icon: FolderClosed,
      },
      {
        title: "Tickets",
        url: "/tickets",
        icon: Ticket,
      },
      {
        title: "Lab",
        url: "/lab",
        icon: FlaskConical,
        badge: "Beta",
      },
    ],
  },
  lockedSections: [
    {
      title: "Ventas",
      icon: ShoppingCart,
      locked: true,
    },
    {
      title: "Operaciones", 
      icon: Workflow,
      locked: true,
    },
  ],
  settingsNav: [
    {
      title: "Usuarios",
      url: "/users",
      icon: User,
    },
    {
      title: "Configuración",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Facturación",
      url: "/invoicing",
      icon: CreditCard,
    },
  ],
};

const AppSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (url: string) => {
    if (url === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(url);
  };

  const getUserInitials = (email: string | undefined) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-background">
                  <NogalLogo className="h-full w-auto object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Nogal</span>
                  <span className="truncate text-xs text-muted-foreground">InsightCall Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {navigationData.mainNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.url)}
                  tooltip={item.title}
                >
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Support Section */}
        <SidebarGroup>
          <SidebarGroupLabel>{navigationData.supportSection.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationData.supportSection.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Locked Sections */}
        <SidebarGroup>
          <SidebarGroupLabel>Próximamente</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationData.lockedSections.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    disabled
                    tooltip={`${item.title} - Próximamente disponible`}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    <Lock className="ml-auto size-4 text-muted-foreground" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Settings Navigation */}
        <SidebarGroup>
          <SidebarMenu>
            {navigationData.settingsNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.url)}
                  tooltip={item.title}
                >
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || 'Usuario'} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                  {getUserInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.email || 'No email'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
