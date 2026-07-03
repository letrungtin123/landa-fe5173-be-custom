import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Home,
  Loader2,
  RefreshCw,
  TimerReset,
  UserRound,
} from "lucide-react";
import {
  claimDemoQrAccountApi,
  getDemoQrAccountsApi,
  type DemoQrAccount,
  type DemoQrAccountsResponse,
} from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import { storageUrl } from "@/utils/storageUrl";

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} giây`;
  if (seconds === 0) return `${minutes} phút`;
  return `${minutes} phút ${seconds.toString().padStart(2, "0")} giây`;
}

function getInitials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function readErrorMessage(error: unknown): string {
  const maybeAxios = error as { response?: { data?: { message?: string } } };
  return maybeAxios.response?.data?.message || "Không thể thực hiện lúc này. Vui lòng thử lại.";
}

function accountAvatar(account: DemoQrAccount): string {
  return account.avatar_url ? storageUrl(account.avatar_url) : "";
}

function DemoLoginNotFoundPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.55) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,hsl(var(--primary)/0.10),transparent)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,hsl(var(--muted)/0.45),transparent)]" aria-hidden="true" />

      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:py-14">
        <div className="order-2 mx-auto w-full max-w-xl text-center lg:order-1 lg:mx-0 lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
            <AlertCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            Mã lỗi 404
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl lg:text-6xl">
            Không tìm thấy trang
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Đường dẫn này không tồn tại hoặc chưa sẵn sàng để truy cập.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-md sm:w-auto"
              onClick={() => window.location.assign("/")}
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Về trang chính
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full rounded-md bg-background/70 sm:w-auto"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tải lại
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Trạng thái
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Không khả dụng
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4 text-left shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Gợi ý
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Kiểm tra lại đường dẫn
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[420px] lg:order-2 lg:max-w-[500px]">
          <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-foreground/10">
            <div className="absolute inset-5 rounded-md border border-dashed border-border" aria-hidden="true" />
            <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="absolute right-5 top-5 rounded-md border border-border bg-background/80 px-3 py-1.5 text-xs font-bold text-muted-foreground">
              404
            </div>

            <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-1 px-4">
              <span className="text-[84px] font-black leading-none tracking-normal text-foreground sm:text-[112px] lg:text-[132px]">
                4
              </span>
              <span className="text-[84px] font-black leading-none tracking-normal text-primary sm:text-[112px] lg:text-[132px]">
                0
              </span>
              <span className="text-[84px] font-black leading-none tracking-normal text-foreground sm:text-[112px] lg:text-[132px]">
                4
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function DemoQrLoginPage() {
  const { branding, isLoading: brandingLoading } = useBranding();
  const [demoInfo, setDemoInfo] = useState<DemoQrAccountsResponse | null>(null);
  const [accounts, setAccounts] = useState<DemoQrAccount[]>([]);
  const [ttlSeconds, setTtlSeconds] = useState(300);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const tenantName = branding.tenantName || demoInfo?.tenant.name || "Demo";
  const lockedCount = demoInfo?.locked_count || 0;
  const nextResetSeconds = demoInfo?.next_reset_in_seconds || 0;

  const heroLogo = branding.squareIcon;

  async function loadAccounts(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await getDemoQrAccountsApi();
      if (!result.is_enabled) {
        setNotFound(true);
        return;
      }
      setDemoInfo(result);
      setAccounts(result.accounts);
      setTtlSeconds(result.ttl_seconds);
      setNotFound(false);
      setError(null);
    } catch (err) {
      const maybeAxios = err as { response?: { status?: number } };
      if (maybeAxios.response?.status === 404) {
        setNotFound(true);
        setError(null);
        return;
      }
      setError(readErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleClaim(accountId: string) {
    setClaimingId(accountId);
    setError(null);

    try {
      const result = await claimDemoQrAccountApi(accountId);
      window.location.assign(result.redirect_url);
    } catch (err) {
      setError(readErrorMessage(err));
      await loadAccounts({ silent: true });
    } finally {
      setClaimingId(null);
    }
  }

  useEffect(() => {
    loadAccounts();
    const timer = window.setInterval(() => {
      loadAccounts({ silent: true });
    }, 10_000);

    return () => window.clearInterval(timer);
  }, []);

  if (notFound) return <DemoLoginNotFoundPage />;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef7f1_50%,#fff7ed_100%)] text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-8 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-md border border-white/70 bg-slate-950 text-white shadow-2xl shadow-slate-900/20">
          <div className="flex min-h-[270px] flex-col justify-between bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(20,83,45,0.9)_56%,rgba(146,64,14,0.84))] p-5 sm:min-h-[360px] sm:p-8 lg:min-h-[560px]">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                  {brandingLoading ? (
                    <Loader2 className="h-8 w-8 shrink-0 animate-spin text-white/70" aria-hidden="true" />
                  ) : (
                    <img
                      src={heroLogo}
                      alt={tenantName}
                      className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                      {tenantName}
                    </p>
                    <p className="text-sm text-white/75">Truy cập demo học viên</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-white hover:bg-white/10 hover:text-white"
                  disabled={refreshing || claimingId !== null}
                  onClick={() => loadAccounts({ silent: true })}
                  aria-label="Làm mới danh sách tài khoản"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", refreshing && "animate-spin")}
                    aria-hidden="true"
                  />
                </Button>
              </div>

              <div className="max-w-md space-y-3">
                <h1 className="text-3xl font-bold leading-tight tracking-normal sm:text-4xl lg:text-5xl">
                  Chọn tài khoản học viên
                </h1>
                <p className="text-sm leading-6 text-white/80 sm:text-base">
                  Mỗi tài khoản sau khi chọn sẽ được ẩn trong {formatSeconds(ttlSeconds)} rồi tự mở lại.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-3xl font-bold">{accounts.length}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/65">
                  Còn trống
                </p>
              </div>
              <div className="rounded-md border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-3xl font-bold">{lockedCount}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/65">
                  Đang giữ
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-white/70 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Danh sách khả dụng
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">
                Vào lớp demo
              </h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Tự động đăng nhập
            </div>
          </div>

          {error ? (
            <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-700" aria-hidden="true" />
                <span>Đang tải danh sách tài khoản...</span>
              </div>
            </div>
          ) : accounts.length > 0 ? (
            <div className="grid gap-3">
              {accounts.map((account, index) => {
                const isClaiming = claimingId === account.id;
                const avatar = accountAvatar(account);
                const accentClasses = [
                  "bg-emerald-50 text-emerald-800 ring-emerald-100",
                  "bg-orange-50 text-orange-800 ring-orange-100",
                  "bg-sky-50 text-sky-800 ring-sky-100",
                ];

                return (
                  <button
                    key={account.id}
                    type="button"
                    className="group flex min-h-[88px] w-full items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:pointer-events-none disabled:opacity-60 sm:min-h-[96px] sm:px-5"
                    disabled={claimingId !== null}
                    onClick={() => handleClaim(account.id)}
                  >
                    <span className="flex min-w-0 items-center gap-4">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={account.label}
                          className="h-[52px] w-[52px] shrink-0 rounded-md object-cover ring-1 ring-slate-200 sm:h-14 sm:w-14"
                        />
                      ) : (
                        <span
                          className={cn(
                            "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md text-base font-bold ring-1 sm:h-14 sm:w-14",
                            accentClasses[index % accentClasses.length],
                          )}
                        >
                          {getInitials(account.label) || <UserRound className="h-5 w-5" aria-hidden="true" />}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-semibold text-slate-950">
                          {account.label}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                          Sẵn sàng đăng nhập
                        </span>
                      </span>
                    </span>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white transition group-hover:bg-emerald-700">
                      {isClaiming ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                <TimerReset className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-950">
                Tạm hết tài khoản demo
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                Tài khoản gần nhất sẽ mở lại sau{" "}
                {nextResetSeconds ? formatSeconds(nextResetSeconds) : "vài giây"}.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 rounded-md"
                disabled={refreshing || claimingId !== null}
                onClick={() => loadAccounts({ silent: true })}
              >
                <RefreshCw
                  className={cn(refreshing && "animate-spin")}
                  aria-hidden="true"
                />
                Làm mới
              </Button>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Trang sẽ tự cập nhật mỗi 10 giây.</span>
            {nextResetSeconds > 0 ? (
              <span>Mở lại gần nhất: {formatSeconds(nextResetSeconds)}</span>
            ) : (
              <span>Trạng thái đã sẵn sàng.</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
