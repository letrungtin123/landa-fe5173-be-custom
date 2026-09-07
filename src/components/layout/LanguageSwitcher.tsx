import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppLocale } from "@/i18n";
import { useLocaleStore } from "@/stores/useLocaleStore";
import { cn } from "@/lib/utils";

const OPTIONS: ReadonlyArray<{ locale: AppLocale; key: "vietnamese" | "english" }> = [
  { locale: "vi", key: "vietnamese" },
  { locale: "en", key: "english" },
];

interface LanguageSwitcherProps {
  className?: string;
  variant?: "header" | "public";
}

export function LanguageSwitcher({ className, variant = "header" }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const isPublic = variant === "public";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t("language.change")}
          title={t("language.current", { language: t(`language.${locale === "vi" ? "vietnamese" : "english"}`) })}
          className={cn(
            "h-9 gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold tracking-[0.08em] shadow-sm transition-all hover:-translate-y-px hover:shadow-md focus-visible:ring-2",
            isPublic
              ? "border-slate-200 bg-white/90 text-slate-700 backdrop-blur hover:bg-white"
              : "border-border/70 bg-background/80 text-foreground hover:bg-muted",
            className,
          )}
        >
          <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{locale.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-xl">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
          {t("language.change")}
        </DropdownMenuLabel>
        {OPTIONS.map((option) => {
          const selected = locale === option.locale;
          return (
            <DropdownMenuItem
              key={option.locale}
              onSelect={() => setLocale(option.locale)}
              className={cn("cursor-pointer rounded-lg px-2 py-2 text-sm", selected && "bg-primary/10 font-semibold text-primary")}
            >
              <span className="flex-1">{t(`language.${option.key}`)}</span>
              {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
