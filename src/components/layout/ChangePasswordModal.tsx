import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Eye, EyeOff, X, Lock, CheckCircle } from "lucide-react";
import { changePassword } from "@/api/password";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMessage(null);
      setShowCurrentPw(false);
      setShowNewPw(false);
      setShowConfirmPw(false);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeModal = () => {
    if (pwLoading) return;
    onOpenChange(false);
  };

  const handlePasswordChange = async () => {
    setPwMessage(null);

    if (!currentPw.trim()) {
      setPwMessage({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }
    if (!newPw.trim()) {
      setPwMessage({ type: "error", text: "Vui lòng nhập mật khẩu mới." });
      return;
    }
    if (newPw.length < 8) {
      setPwMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMessage({ type: "error", text: "Mật khẩu mới nhập lại không khớp." });
      return;
    }
    if (currentPw === newPw) {
      setPwMessage({ type: "error", text: "Mật khẩu mới phải khác mật khẩu hiện tại." });
      return;
    }

    setPwLoading(true);
    try {
      const result = await changePassword(currentPw, newPw);
      if (result.success) {
        setPwMessage({ type: "success", text: result.message });
        setTimeout(() => closeModal(), 2000);
      } else {
        setPwMessage({ type: "error", text: result.message });
      }
    } catch {
      setPwMessage({ type: "error", text: "Không thể kết nối máy chủ. Vui lòng thử lại." });
    } finally {
      setPwLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-card p-5 sm:p-8 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 text-[#999] hover:text-[#333] dark:hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Đổi mật khẩu</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Nhập mật khẩu hiện tại và mật khẩu mới
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwMessage(null); }}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-[14px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwMessage(null); }}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 pr-10 text-[14px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Nhập lại mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPw}
                onChange={(e) => { setConfirmPw(e.target.value); setPwMessage(null); }}
                className={`w-full rounded-lg border bg-background px-4 py-3 pr-10 text-[14px] outline-none transition-colors focus:ring-2 focus:ring-primary/20 ${confirmPw && confirmPw !== newPw
                    ? "border-red-400 focus:border-red-400"
                    : "border-border focus:border-primary"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <p className="mt-1 text-[11px] text-red-500">Mật khẩu nhập lại không khớp</p>
            )}
          </div>

          {pwMessage && (
            <div className={`flex items-start gap-2 rounded-lg p-3 text-[13px] leading-relaxed ${pwMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              }`}>
              {pwMessage.type === "success" && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <span>{pwMessage.text}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handlePasswordChange}
              disabled={pwLoading}
              className="flex-1 rounded-lg bg-primary py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pwLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý…
                </span>
              ) : (
                "Xác nhận đổi mật khẩu"
              )}
            </button>
            <button
              onClick={closeModal}
              disabled={pwLoading}
              className="rounded-lg border border-border px-5 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
