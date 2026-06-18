import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Bell,
  User,
  Menu,
  Palette,
  LogOut,
  Shield,
  BookOpen,
  Info,
  Settings,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  useThemeStore,
  THEME_PRESETS,
} from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotifications, useUnreadNotificationCount, useMarkAllRead } from "@/hooks/useNotifications";
import type { Notification } from "@/data/types";
import { cn } from "@/lib/utils";
import { useBranding } from "@/hooks/useBranding";
import { NotificationModal } from "@/components/dashboard/NotificationModal";
import { TenantSwitchModal } from "@/components/layout/TenantSwitchModal";

const ICON_MAP: Record<Notification["icon"], React.ElementType> = {
  badge: Shield,
  course: BookOpen,
  system: Info,
};

const NAV_ITEMS = [
  { label: "Khám phá", path: "/dashboard" },
  { label: "Chương trình học", path: "/explore" },
  { label: "Thư viện", path: "/library" },
  { label: "Danh hiệu", path: "/badges" },
];

export function Header() {
  const location = useLocation();
  const { colorMode, preset, toggleColorMode, setPreset } =
    useThemeStore();
  const { toggleSidebar, sidebarOpen, setSidebarOpen } = useAppStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const managedTenants = useAuthStore((s) => s.managedTenants);
  const navigate = useNavigate();
  const { count: unreadCount } = useUnreadNotificationCount();
  const { notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const { branding, isLoading: brandingLoading } = useBranding();
  const currentHeaderLogo = colorMode === 'dark' ? branding.headerLogoDark : branding.headerLogo;

  const currentTenantName = useMemo(() => {
    if (!user?.tenantId) return null;
    const found = managedTenants.find((t) => t.id === user.tenantId);
    return found?.name || user.tenantName || null;
  }, [user?.tenantId, user?.tenantName, managedTenants]);

  const isCourseRoute = location.pathname.includes("/courses/");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Spacer for fixed header */}
      <div className="h-16 w-full shrink-0" />
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background !mr-0">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 md:px-6">
        {/* Mobile menu toggle - ONLY SHOW IN COURSE ROUTE */}
        {isCourseRoute && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo */}
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2 -translate-x-[2px]">
          <img
            src={currentHeaderLogo}
            alt="Logo"
            className={`h-10 w-auto object-contain transition-opacity duration-300 ${brandingLoading ? 'opacity-0' : 'opacity-100'}`}
          />
        </Link>

        {/* Nav Links */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" &&
                location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-colors rounded-md",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-2 -bottom-[1.05rem] h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1 translate-x-[2px] ml-auto">


          {/* Theme Preset Picker */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Theme preset">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Bảng màu
              </DropdownMenuLabel>
              {THEME_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "gap-2",
                    preset === p.id && "bg-accent/10 text-accent font-medium"
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Light/Dark Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleColorMode}
            aria-label="Toggle dark mode"
          >
            {colorMode === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenuSeparator className="mx-1 h-6 w-px bg-border" />

          {/* Notifications Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <h4 className="text-sm font-semibold">Thông báo</h4>
                {unreadCount > 0 && (
                  <span className="text-[11px] text-primary font-medium">{unreadCount} mới</span>
                )}
              </div>
              
              <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="p-3 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-2/5 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-full bg-muted animate-pulse rounded" />
                          <div className="h-2.5 w-1/4 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Chưa có thông báo mới</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.slice(0, 2).map((notification) => {
                      const Icon = ICON_MAP[notification.icon] || Info;
                      return (
                        <div key={notification.id} className={cn("flex gap-3 p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors", !notification.read && "bg-primary/5")}>
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5", !notification.read ? "bg-primary/10" : "bg-muted")}>
                            <Icon className={cn("h-4 w-4", !notification.read ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[13px] leading-tight mb-1", !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                              {notification.title}
                            </p>
                            <div 
                              className="text-[12px] text-muted-foreground leading-snug line-clamp-2 [&>p]:inline [&>table]:hidden"
                              dangerouslySetInnerHTML={{ __html: notification.message }}
                            />
                            <p className="mt-1 text-[10px] text-muted-foreground/80">{notification.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-2 border-t border-border bg-muted/10">
                <Button variant="ghost" className="w-full text-xs h-8" onClick={() => setNotifModalOpen(true)}>
                  Xem tất cả thông báo
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notification Modal */}
          <NotificationModal open={notifModalOpen} onOpenChange={setNotifModalOpen} />

          {/* User Avatar */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="User menu"
              >
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
              {user?.fullName || user?.username || "Tài khoản"}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Hồ sơ cá nhân
              </DropdownMenuItem>
              {(user?.role === 'staff' || user?.role === 'superuser' || user?.role === 'superadmin' || user?.role === 'learner_plus') && (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      const { apiClient } = await import("@/api/client");
                      const { data } = await apiClient.post("/api/auth/ott/generate");
                      const ott = data?.data?.ott;
                      const adminUrl = branding.adminUrl || '/admin/';
                      const separator = adminUrl.includes('?') ? '&' : '?';
                      window.open(`${adminUrl}${separator}ott=${ott}`, '_blank');
                    } catch {
                      // Fallback: mở admin mà không có OTT
                      window.open(branding.adminUrl || '/admin/', '_blank');
                    }
                  }} 
                  className="cursor-pointer text-primary focus:text-primary"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Quản trị hệ thống
                </DropdownMenuItem>
              )}
              {/* Tenant Switcher — CHỈ cho superadmin */}
              {user?.role === 'superadmin' && managedTenants.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setTenantModalOpen(true)}
                    className="cursor-pointer gap-2"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">Chuyển tổ chức</span>
                      {currentTenantName && (
                        <p className="text-[11px] text-muted-foreground truncate">{currentTenantName}</p>
                      )}
                    </div>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    {/* Tenant Switch Modal */}
    <TenantSwitchModal open={tenantModalOpen} onOpenChange={setTenantModalOpen} />
    </>
  );
}
