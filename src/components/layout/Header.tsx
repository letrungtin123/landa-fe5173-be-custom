import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Bell,
  User,
  Menu,
  Palette,
  LogOut,
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
import { cn } from "@/lib/utils";
import logoImg from "@/assets/leandassociate.webp";

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
  const navigate = useNavigate();

  const isLessonRoute = location.pathname.includes("/lessons/");

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 md:px-6">
        {/* Mobile menu toggle - ONLY SHOW IN LESSON ROUTE */}
        {isLessonRoute && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo */}
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
          <img
            src={logoImg}
            alt="Le & Associates"
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Nav Links */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
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
        <div className="flex items-center gap-1">


          {/* Theme Preset Picker */}
          <DropdownMenu>
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

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-background">
              2
            </Badge>
          </Button>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label="User menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <User className="h-4 w-4" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Tài khoản
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
