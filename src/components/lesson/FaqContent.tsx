import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBlockDetail } from "@/api/blocks";
import { ChevronDown, HelpCircle, Loader2, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

interface FaqData {
  display_name: string;
  items: FaqItem[];
}

/**
 * FaqContent — Hiển thị danh sách FAQ dạng accordion cho learner.
 * Fetch data từ student_view_data API (qua getBlockDetail), render câu hỏi expand/collapse.
 */
export function FaqContent({ usageKey }: { usageKey: string }) {
  const username = useAuthStore((s) => s.user?.username);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const { data: blockData, isLoading } = useQuery({
    queryKey: ["block-detail", usageKey, username],
    queryFn: () => getBlockDetail(usageKey, username),
    staleTime: 30_000,
  });

  const svd = blockData?.student_view_data as unknown as FaqData | undefined;

  const toggleItem = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="mt-8 rounded-[32px] border-2 border-primary/10 bg-[#F4F9FF] dark:bg-slate-900/50 p-8 shadow-sm">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!svd || !svd.items || svd.items.length === 0) {
    return (
      <div className="mt-8 rounded-[32px] border-2 border-primary/10 bg-[#F4F9FF] dark:bg-slate-900/50 p-8 shadow-sm text-center">
        <MessageCircleQuestion className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Chưa có câu hỏi thường gặp nào.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-[32px] border-2 border-primary/10 bg-[#F4F9FF] dark:bg-slate-900/50 p-6 md:p-10 shadow-sm relative overflow-hidden">

      {/* Trang trí góc phải */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 opacity-[0.07] pointer-events-none">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#0247A6" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.7,-2.1C98.6,13.8,94.2,30.3,85.6,44.8C77,59.3,64.2,71.9,49.2,80.3C34.2,88.7,17.1,92.9,0.5,92.1C-16.1,91.3,-32.2,85.4,-46.8,76.5C-61.4,67.6,-74.6,55.7,-83.5,41.1C-92.4,26.5,-97.1,9.2,-95.7,-7.4C-94.3,-24,-86.7,-39.9,-75.6,-51.9C-64.5,-63.9,-49.9,-71.9,-35.5,-78.9C-21.1,-85.9,-10.5,-91.9,2.8,-96.5C16.1,-101.1,30.5,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
        </svg>
      </div>

      {/* Header */}
      <div className="mb-6 relative z-10">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
            style={{ backgroundColor: "#43FDD7", color: "#000" }}
          >
            FAQ
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground">
          {svd.display_name}
        </h2>
        <p className="mt-2 text-[14px] text-foreground/60 font-medium">
          Nhấn vào câu hỏi bên dưới để xem câu trả lời chi tiết
        </p>
      </div>

      {/* Accordion */}
      <div className="space-y-3 relative z-10 w-full max-w-3xl mx-auto">
        {svd.items.map((item, idx) => {
          const isOpen = openIds.has(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all duration-300 cursor-pointer",
                isOpen
                  ? "border-primary/30 bg-white dark:bg-slate-800 shadow-md shadow-primary/5"
                  : "border-primary/10 bg-white/80 dark:bg-slate-800/60 hover:border-primary/20 hover:shadow-sm"
              )}
            >
              {/* Question header — clickable */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${item.id}`}
                className="w-full flex items-center gap-4 px-5 py-4 md:px-6 md:py-5 text-left cursor-pointer transition-colors group"
              >
                {/* Index badge */}
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm transition-all duration-300",
                    isOpen
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-primary/10 text-primary group-hover:bg-primary/15"
                  )}
                >
                  {idx + 1}
                </div>

                {/* Question text */}
                <span
                  className={cn(
                    "flex-1 text-[14px] md:text-[15px] leading-[22px] font-semibold transition-colors duration-200",
                    isOpen ? "text-foreground" : "text-foreground/85 group-hover:text-foreground"
                  )}
                >
                  {item.question}
                </span>

                {/* Chevron icon */}
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                    isOpen
                      ? "bg-primary text-primary-foreground rotate-180"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                  )}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {/* Answer — collapsible with CSS grid animation */}
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 md:px-6 md:pb-6 ml-[52px] md:ml-[60px]">
                    {/* Divider */}
                    <div className="border-t border-primary/10 pt-4 mb-1" />
                    <p className="text-[14px] md:text-[15px] font-normal leading-[22px] md:leading-[24px] text-foreground/70 whitespace-pre-wrap">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="mt-8 relative z-10 flex items-center justify-center gap-2 text-[12px] text-foreground/40 font-medium">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>{svd.items.length} câu hỏi thường gặp</span>
      </div>
    </div>
  );
}
