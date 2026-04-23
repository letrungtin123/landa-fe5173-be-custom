import { User } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { config } from "@/config/env";
import { useNavigate } from "react-router-dom";

export function UserProfileCard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const displayName = user?.name || "Learner";
  const joinDate = user?.dateJoined
    ? new Date(user.dateJoined).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })
    : "";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="overflow-hidden rounded-3xl bg-[#F9FAFB] dark:bg-card border border-transparent dark:border-border/50">
      <div className="flex flex-col items-center p-8 text-center">
        {/* Avatar Placeholder mapped to image */}
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden border-4 border-white shadow-sm relative">
          {user?.avatar ? (
            <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary/80 rounded-t-[50%]" />
              <User className="h-12 w-12 relative z-10" />
            </>
          )}
        </div>

        {/* User Info */}
        <h3 className="text-[17px] font-bold text-foreground">{displayName}</h3>
        <p className="mt-1 text-xs text-foreground font-medium">{user?.email || ""}</p>
        <p className="text-[11px] text-foreground font-medium mt-0.5">
          {joinDate && `Ngày tham gia: ${joinDate}`}
        </p>

        {/* Liên kết nhanh */}
        <div className="w-full space-y-4 mt-8">
          <a
            href={`${config.lmsBaseUrl}/account/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-[13px] font-medium text-foreground transition-colors hover:text-primary"
          >
            Hồ sơ cá nhân
          </a>
          <a
            href={`${config.lmsBaseUrl}/account/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-[13px] font-medium text-foreground transition-colors hover:text-primary"
          >
            Đổi mật khẩu
          </a>
          <button
            onClick={handleLogout}
            className="block w-full text-left text-[13px] font-medium text-foreground transition-colors hover:text-primary"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
