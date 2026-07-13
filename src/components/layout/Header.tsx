import { useState, useMemo, useEffect } from "react";
import DOMPurify from "dompurify";
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
  Lock,
  BadgeCheck,
  Search,
  X,
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
import {
  useThemeStore,
  THEME_PRESETS,
  THEME_PRESET_SWITCHER_ENABLED,
} from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { useSearchStore } from "@/stores/useSearchStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from "@/hooks/useNotifications";
import type { Notification } from "@/data/types";
import { cn } from "@/lib/utils";
import { useBranding } from "@/hooks/useBranding";
import { NotificationModal } from "@/components/dashboard/NotificationModal";
import { AssignmentFeedbackNotificationDialog } from "@/components/dashboard/AssignmentFeedbackNotificationDialog";
import { TenantSwitchModal } from "@/components/layout/TenantSwitchModal";
import { useMyEnrollments, useCourses } from "@/hooks/useCourses";
import { useAverageCourseCompletion } from "@/hooks/useProgress";
import { ChangePasswordModal } from "@/components/layout/ChangePasswordModal";

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
  const markNotificationRead = useMarkNotificationRead();
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [feedbackNotification, setFeedbackNotification] = useState<Notification | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const { branding, isLoading: brandingLoading } = useBranding();
  const currentHeaderLogo = colorMode === 'dark' ? branding.headerLogoDark : branding.headerLogo;

  const { data: enrollments } = useMyEnrollments();
  const { data: courseList } = useCourses();
  
  const publicCourseIds = new Set((courseList?.data || []).map((c: any) => c.id));
  const visibleEnrollments = (enrollments || []).filter(
    (e: any) => publicCourseIds.has(e.course_id)
  );
  
  const enrolledCourseIds = visibleEnrollments.map((e: any) => e.course_id);
  const { data: averagePercent = 0 } = useAverageCourseCompletion(enrolledCourseIds);

  const currentTenantName = useMemo(() => {
    if (!user?.tenantId) return null;
    const found = managedTenants.find((t) => t.id === user.tenantId);
    return found?.name || user.tenantName || null;
  }, [user?.tenantId, user?.tenantName, managedTenants]);

  const isCourseRoute = location.pathname.includes("/courses/");
  const isSearchableRoute = ['/dashboard', '/explore', '/library'].includes(location.pathname);
  const { globalSearchTerm, setGlobalSearchTerm, isSearchOpen, setSearchOpen } = useSearchStore();

  // Reset search term on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setGlobalSearchTerm("");
      setSearchOpen(false);
    }
  }, [location.pathname, setGlobalSearchTerm, setSearchOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markNotificationRead.mutate(notification.id);
    }
    if (notification.type === "assignment_feedback") {
      setFeedbackNotification(notification);
    }
  };

  return (
    <>
      {/* Spacer for fixed header */}
      <div className="h-16 w-full shrink-0" />

      {/* MOBILE SEARCH OVERLAY */}
      {isSearchOpen && isSearchableRoute && (
        <header className="fixed top-0 left-0 right-0 z-[60] w-full border-b border-border bg-background lg:hidden">
          <div className="mx-auto flex h-16 items-center gap-2 px-4">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input 
              autoFocus
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
            />
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(false)} className="shrink-0 -mr-2">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      <header className={cn("fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background !mr-0", isSearchOpen && isSearchableRoute ? "hidden lg:block" : "")}>
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

          {/* Nút Search Mobile */}
          {isSearchableRoute && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            {/* Theme Preset Picker */}
            {THEME_PRESET_SWITCHER_ENABLED && (
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
            )}

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
          </div>

          {/* Notifications Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
                    aria-hidden="true"
                  />
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
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn("flex gap-3 p-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors", !notification.read && "bg-primary/5")}
                        >
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5", !notification.read ? "bg-primary/10" : "bg-muted")}>
                            <Icon className={cn("h-4 w-4", !notification.read ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[13px] leading-tight mb-1", !notification.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                              {notification.title}
                            </p>
                            <div 
                              className="text-[12px] text-muted-foreground leading-snug line-clamp-2 [&>p]:inline [&>table]:hidden"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notification.message) }}
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
          <AssignmentFeedbackNotificationDialog
            notification={feedbackNotification}
            open={!!feedbackNotification}
            onOpenChange={(open) => {
              if (!open) setFeedbackNotification(null);
            }}
          />

          {/* User Avatar (Universal) */}
          <div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:ml-1 rounded-full"
                  aria-label="User menu"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px] p-0 overflow-hidden rounded-2xl border-border/50 shadow-xl pb-2">
                {/* Top Banner & Avatar area */}
                <div className="relative bg-gradient-to-br from-primary/90 via-primary to-primary/50 h-20 mb-10 mx-1.5 mt-1.5 rounded-xl">
                  {/* Pattern overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-60 mix-blend-overlay rounded-xl pointer-events-none"></div>
                  
                  {/* Theme controls in top right matching the image */}
                  <div className="absolute top-3 right-3 sm:hidden flex items-center bg-background/80 backdrop-blur-md rounded-lg shadow-sm p-0.5 border border-border/20 z-10">
                    {THEME_PRESET_SWITCHER_ENABLED && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" aria-label="Theme preset">
                            <Palette className="h-3.5 w-3.5 text-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Bảng màu</DropdownMenuLabel>
                          {THEME_PRESETS.map((p) => (
                            <DropdownMenuItem
                              key={p.id}
                              onClick={() => setPreset(p.id)}
                              className={cn("gap-2", preset === p.id && "bg-accent/10 text-accent font-medium")}
                            >
                              <span className="h-3.5 w-3.5 rounded-full shrink-0 border border-border" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={toggleColorMode}>
                      {colorMode === "light" ? <Moon className="h-3.5 w-3.5 text-foreground" /> : <Sun className="h-3.5 w-3.5 text-foreground" />}
                    </Button>
                  </div>
                  
                  {/* Avatar */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 p-1 bg-background rounded-full z-10">
                    <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground overflow-hidden flex items-center justify-center border border-border/10 shadow-sm relative">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover relative z-10" />
                      ) : (
                        <span className="text-2xl font-bold relative z-10">{user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="text-center px-4">
                  <h4 className="text-[15px] font-bold text-foreground flex items-center justify-center gap-1">
                    {user?.fullName || user?.username || "Tài khoản"}
                    <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  </h4>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{user?.email || ""}</p>
                  
                  {/* Progress */}
                  <div className="mt-4 mb-4 text-left">
                    <p className="text-[11px] text-foreground mb-2 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                      Bạn đã hoàn thành <span className="text-primary font-medium">{averagePercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</span> tất cả khóa học
                    </p>
                    <div className="h-1 w-full bg-muted overflow-hidden rounded-full relative">
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-r-full" style={{ width: `${averagePercent}%` }} />
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator className="mx-4 my-2 bg-border/50" />

                {/* Menu Items */}
                <div className="px-2 space-y-1">
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer rounded-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground py-1.5 transition-colors group">
                    <User className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-focus:text-primary-foreground" />
                    <span className="font-medium text-[13px]">Hồ sơ cá nhân</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setPwModalOpen(true)} className="cursor-pointer rounded-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground py-1.5 transition-colors group">
                    <Lock className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-focus:text-primary-foreground" />
                    <span className="font-medium text-[13px]">Đổi mật khẩu</span>
                  </DropdownMenuItem>

                  {(user?.role === 'staff' || user?.role === 'superuser' || user?.role === 'superadmin' || user?.role === 'learner_plus') && (
                    <DropdownMenuItem 
                      onClick={async () => {
                        const newWin = window.open('about:blank', '_blank');
                        try {
                          const { apiClient } = await import("@/api/client");
                          const { data } = await apiClient.post("/api/auth/ott/generate");
                          const ott = data?.data?.ott;
                          const adminUrl = branding.adminUrl || '/admin/';
                          const separator = adminUrl.includes('?') ? '&' : '?';
                          const finalUrl = `${adminUrl}${separator}ott=${ott}`;
                          if (newWin) newWin.location.href = finalUrl;
                          else window.location.href = finalUrl;
                        } catch {
                          const fallbackUrl = branding.adminUrl || '/admin/';
                          if (newWin) newWin.location.href = fallbackUrl;
                          else window.location.href = fallbackUrl;
                        }
                      }} 
                      className="cursor-pointer rounded-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground py-1.5 transition-colors group"
                    >
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-focus:text-primary-foreground" />
                      <span className="font-medium text-[13px]">Quản trị hệ thống</span>
                    </DropdownMenuItem>
                  )}
                  
                  {user?.role === 'superadmin' && managedTenants.length > 1 && (
                    <DropdownMenuItem
                      onClick={() => setTenantModalOpen(true)}
                      className="cursor-pointer rounded-lg hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground py-1.5 transition-colors group"
                    >
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary-foreground group-focus:text-primary-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[13px]">Chuyển tổ chức</span>
                        {currentTenantName && (
                          <p className="text-[11px] text-muted-foreground group-hover:text-primary-foreground/80 group-focus:text-primary-foreground/80 truncate">{currentTenantName}</p>
                        )}
                      </div>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors mt-1">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="font-medium text-[13px]">Đăng xuất</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>

    {/* Tenant Switch Modal */}
    <TenantSwitchModal open={tenantModalOpen} onOpenChange={setTenantModalOpen} />
    
    {/* Change Password Modal */}
    <ChangePasswordModal open={pwModalOpen} onOpenChange={setPwModalOpen} />
    </>
  );
}
