import * as DialogPrimitive from "@radix-ui/react-dialog";
import clockIcon from "@/assets/InitConfirmEnrollModal/clock-icon.png";
import fileIcon from "@/assets/InitConfirmEnrollModal/folder-icon.png";
import lineIcon from "@/assets/InitConfirmEnrollModal/line-icon.png";
import roundIcon from "@/assets/InitConfirmEnrollModal/round-icon.png";

interface ConfirmEnrollModalProps {
  open: boolean;
  courseName: string;
  logoSrc: string;
  tenantName?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmEnrollModal({
  open,
  courseName,
  logoSrc,
  tenantName,
  onOpenChange,
  onConfirm,
}: ConfirmEnrollModalProps) {
  const displayCourseName = courseName || tenantName || "Khóa học";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 h-[462px] max-h-[calc(100dvh-24px)] w-[375px] max-w-[100vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border-[6px] border-white bg-card p-0 shadow-[0_24px_80px_rgba(15,23,42,0.32)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-border dark:shadow-[0_24px_90px_rgba(0,0,0,0.68)] md:h-[517px] md:w-[847px] md:max-w-[calc(100vw-64px)] md:rounded-[30px] md:border-[9px]">
          <DialogPrimitive.Title className="sr-only">
            Xác nhận bắt đầu khóa học {displayCourseName}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Xác nhận bạn đã sẵn sàng trước khi vào trang chi tiết khóa học.
          </DialogPrimitive.Description>

          <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,hsl(var(--primary)/0.46)_0%,hsl(var(--accent)/0.20)_48%,hsl(var(--card))_100%)] px-5 text-center text-foreground dark:bg-[linear-gradient(180deg,hsl(var(--primary)/0.30)_0%,hsl(var(--accent)/0.16)_48%,hsl(var(--card))_100%)] md:rounded-[21px]">
            <img
              src={roundIcon}
              alt=""
              className="pointer-events-none absolute left-[22px] top-[68px] h-[54px] w-[54px] object-contain drop-shadow-[0_14px_22px_hsl(var(--primary)/0.28)] md:left-[71px] md:top-[136px] md:h-[68px] md:w-[68px]"
            />
            <img
              src={fileIcon}
              alt=""
              className="pointer-events-none absolute right-[36px] top-[100px] h-[24px] w-[30px] object-contain drop-shadow-[0_12px_22px_hsl(var(--primary)/0.26)] md:right-[96px] md:top-[101px] md:h-[52px] md:w-[62px]"
            />

            <div className="mt-[35px] flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-[0_9px_20px_rgba(15,23,42,0.16)] dark:border-white/15 dark:bg-card md:mt-[43px] md:h-[58px] md:w-[58px]">
              <img
                src={logoSrc}
                alt={tenantName || "Logo"}
                className="h-full w-full object-contain"
              />
            </div>

            <h2 className="mt-[18px] max-w-[300px] text-[28px] font-semibold leading-[32px] tracking-normal text-[color-mix(in_srgb,hsl(var(--foreground))_62%,hsl(var(--primary))_38%)] dark:text-[color-mix(in_srgb,hsl(var(--foreground))_72%,hsl(var(--primary))_28%)] md:mt-[20px] md:max-w-[620px] md:text-[43px] md:leading-[52px]">
              <span className="block">
                Bạn đã <span className="font-bold text-primary">sẵn sàng</span>
              </span>
              <span className="flex items-center justify-center whitespace-nowrap">
                <span>bắt đầu</span>
                <img
                  src={clockIcon}
                  alt=""
                  className="mx-[2px] h-[29px] w-[29px] shrink-0 object-contain drop-shadow-[0_8px_12px_hsl(var(--primary)/0.22)] md:mx-1 md:h-[40px] md:w-[40px]"
                />
                <span>khóa học?</span>
              </span>
            </h2>

            <p className="mt-[26px] max-w-[300px] truncate text-[16px] font-extrabold leading-[22px] text-foreground md:mt-[24px] md:max-w-[600px]">
              {displayCourseName}
            </p>
            <img
              src={lineIcon}
              alt=""
              className="mt-[10px] h-px w-[270px] object-fill md:w-[360px]"
            />
            <div className="mt-[11px] text-center font-normal italic text-foreground/80 md:mt-[17px]">
              <p className="max-w-[285px] text-[10px] leading-[12px] md:hidden">
                <span className="block">
                  *Hệ thống sẽ bắt đầu tính thời gian làm bài ngay khi
                </span>
                <span className="block">
                  bạn xác nhận. Hãy đảm bảo bạn đã sẵn sàng nhé!
                </span>
              </p>
              <p className="hidden max-w-[360px] text-[12px] leading-[14px] md:block">
                <span className="block">
                  *Hệ thống sẽ bắt đầu tính thời gian làm bài ngay khi
                </span>
                <span className="block">
                  bạn xác nhận. Hãy đảm bảo bạn đã sẵn sàng nhé!
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              className="mt-[26px] inline-flex h-[38px] min-w-[164px] items-center justify-center rounded-full bg-primary px-6 text-[14px] font-semibold text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.28)] outline-none transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card md:mt-[46px]"
            >
              Bắt đầu học ngay
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
