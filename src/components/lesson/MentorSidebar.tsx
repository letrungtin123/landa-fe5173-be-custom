import { useState } from "react";
import { User, Mail, Phone, FileText, Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Mentor } from "@/data/types";

interface MentorSidebarProps {
  mentors: Mentor[];
}

const ROLE_LABEL: Record<string, string> = {
  instructor: "Giảng viên",
  staff: "Trợ giảng",
};

export function MentorSidebar({ mentors }: MentorSidebarProps) {
  const [selected, setSelected] = useState<Mentor | null>(null);

  if (mentors.length === 0) {
    return (
      <div className="px-6 py-4">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">
          Giảng viên
        </h3>
        <p className="text-sm text-muted-foreground italic">
          Chưa có thông tin giảng viên cho bài học này.
        </p>
      </div>
    );
  }

  const getAvatar = (m: Mentor) => m.profile_image_url || m.avatar;
  const getAvatarFull = (m: Mentor) => m.profile_image_url_full || m.profile_image_url || m.avatar;

  return (
    <>
      <div className="px-6 py-4">
        <h3 className="mb-4 text-[15px] font-bold text-foreground">
          Giảng viên
        </h3>
        <div className="space-y-3">
          {mentors.map((mentor, i) => (
            <button
              key={mentor.id || i}
              onClick={() => setSelected(mentor)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 -mx-2.5 text-left transition-colors hover:bg-accent/50 group cursor-pointer"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                {getAvatar(mentor) ? (
                  <img
                    src={getAvatar(mentor)!}
                    alt={mentor.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {mentor.name || mentor.full_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {ROLE_LABEL[mentor.role] || mentor.role}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MENTOR DETAIL MODAL ═══ */}
      <AnimatePresence>
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header gradient */}
              <div className="h-24 bg-gradient-to-br from-primary/70 via-primary/50 to-primary/20 dark:from-primary/30 dark:via-primary/15 dark:to-primary/5" />

              {/* Avatar + Name */}
              <div className="relative px-6 pb-6">
                <div className="flex flex-col items-center -mt-12 mb-4">
                  <div className="h-24 w-24 rounded-full border-4 border-card bg-muted shadow-xl overflow-hidden mb-3">
                    {getAvatarFull(selected) ? (
                      <img
                        src={getAvatarFull(selected)!}
                        alt={selected.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10">
                        <User className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground text-center">
                    {selected.name || selected.full_name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Shield className="h-3 w-3" />
                    {ROLE_LABEL[selected.role] || selected.role}
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-3">
                  {selected.email && (
                    <InfoRow icon={Mail} label="Email" value={selected.email} />
                  )}
                  {selected.phone_number && (
                    <InfoRow icon={Phone} label="Điện thoại" value={selected.phone_number} />
                  )}
                  {selected.bio && (
                    <div className="rounded-2xl bg-muted/50 border border-border/50 p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                        <FileText className="h-3.5 w-3.5" />
                        Giới thiệu
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {selected.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border/40 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
