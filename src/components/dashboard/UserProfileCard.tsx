import { User } from "lucide-react";
import { mockUser } from "@/data/mock";

const PROFILE_LINKS = [
  { label: "Hồ sơ cá nhân", href: "#" },
  { label: "Đổi mật khẩu", href: "#" },
  { label: "Đăng xuất", href: "#" },
];

export function UserProfileCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#F9FAFB] dark:bg-card border border-transparent dark:border-border/50">
      <div className="flex flex-col items-center p-8 text-center">
        {/* Avatar Placeholder mapped to image */}
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden border-4 border-white shadow-sm relative">
           <div className="absolute inset-x-0 bottom-0 h-1/2 bg-primary/80 rounded-t-[50%]" />
           <User className="h-12 w-12 relative z-10" />
        </div>

        {/* User Info */}
        <h3 className="text-[17px] font-bold text-foreground">{mockUser.name}</h3>
        <p className="mt-1 text-xs text-foreground font-medium">{mockUser.role}</p>
        <p className="text-[11px] text-foreground font-medium mt-0.5">
          Ngày tham gia: {mockUser.joinDate}
        </p>

        {/* Links */}
        <div className="w-full space-y-4 mt-8">
          {PROFILE_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block w-full text-[13px] font-medium text-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
