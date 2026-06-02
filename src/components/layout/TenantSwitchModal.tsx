import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Building2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

interface TenantSwitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantSwitchModal({ open, onOpenChange }: TenantSwitchModalProps) {
  const user = useAuthStore((s) => s.user);
  const managedTenants = useAuthStore((s) => s.managedTenants);
  const switchTenant = useAuthStore((s) => s.switchTenant);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Reset khi mở/đóng
  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setSearch("");
      setPage(1);
    }, 200);
  }, [onOpenChange]);

  // Filter + paginate
  const filtered = useMemo(() => {
    if (!search.trim()) return managedTenants;
    const q = search.toLowerCase().trim();
    return managedTenants.filter((t) =>
      t.name.toLowerCase().includes(q)
    );
  }, [managedTenants, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleSwitch = useCallback(
    (tenantId: string) => {
      switchTenant(tenantId);
      handleClose();
    },
    [switchTenant, handleClose]
  );

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">Chuyển tổ chức</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {filtered.length} tổ chức
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm tổ chức..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm transition-all placeholder:text-muted-foreground/60"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {paginated.length > 0 ? (
                <div className="py-1">
                  {paginated.map((t) => {
                    const isActive = user?.tenantId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSwitch(t.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50",
                          isActive && "bg-primary/5"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold border",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 text-muted-foreground border-border"
                          )}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm truncate",
                              isActive ? "font-semibold text-primary" : "font-medium text-foreground"
                            )}
                          >
                            {t.name}
                          </p>
                          {isActive && (
                            <p className="text-[11px] text-primary/70 font-medium">Đang sử dụng</p>
                          )}
                        </div>
                        {isActive && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Không tìm thấy tổ chức "{search}"
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10">
                <span className="text-[12px] text-muted-foreground">
                  Trang {page}/{totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors",
                          page === pageNum
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border bg-background hover:bg-muted"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
