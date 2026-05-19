import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBlockDetail } from "@/api/blocks";
import { ChevronDown, Loader2 } from "lucide-react";
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
      <div className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card">
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!svd || !svd.items || svd.items.length === 0) {
    return (
      <div className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card text-center text-muted-foreground">
        Chưa có câu hỏi thường gặp nào.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border px-8 py-7 shadow-sm bg-card">
      {/* Header */}
      <div className="mb-5">
        <span
          className="mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold leading-[14px] uppercase tracking-widest"
          style={{ backgroundColor: "#43FDD7", color: "#000" }}
        >
          FAQ
        </span>
        <h3 className="text-[20px] 2xl:text-[24px] font-bold leading-[26px] 2xl:leading-[30px] text-foreground">
          {svd.display_name}
        </h3>
      </div>

      {/* Accordion */}
      <div className="space-y-2">
        {svd.items.map((item) => {
          const isOpen = openIds.has(item.id);

          return (
            <div
              key={item.id}
              className="border border-border rounded-2xl overflow-hidden bg-background transition-shadow hover:shadow-sm"
            >
              {/* Question header — clickable */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300",
                    isOpen
                      ? "bg-primary text-primary-foreground rotate-180"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
                <span className="text-[14px] 2xl:text-[16px] font-semibold leading-[20px] 2xl:leading-[22px] text-foreground flex-1">
                  {item.question}
                </span>
              </button>

              {/* Answer — collapsible with CSS grid animation */}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 pt-1 ml-10 text-[14px] 2xl:text-[16px] font-normal leading-[20px] 2xl:leading-[24px] text-foreground/70 whitespace-pre-wrap">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
