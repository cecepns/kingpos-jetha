import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPageNumberItems } from "../utils/paginationItems";

/**
 * Modern Clean Pagination Bar: < 1 2 3 … 10 >
 * @param {{ page: number; pages: number; setPage: (n: number | ((p: number) => number)) => void; variant?: "default" | "compact"; className?: string }} props
 */
export function PaginationBar({ page, pages, setPage, variant = "default", className }) {
  const safePages = Math.max(1, Math.floor(Number(pages) || 1));
  const safePage = Math.min(Math.max(1, Math.floor(Number(page) || 1)), safePages);
  
  // Custom number item generator if safePages is small vs large
  const items = getPageNumberItems(safePage, safePages);
  const compact = variant === "compact";

  const btnNav = compact
    ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    : "inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

  const btnNum = compact
    ? "inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors"
    : "inline-flex h-8 sm:h-9 min-w-[2rem] sm:min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg sm:rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold tabular-nums transition-colors";

  if (safePages <= 1) {
    return (
      <div className={clsx("flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto py-0.5 no-scrollbar", className)}>
        <button type="button" disabled className={btnNav}>
          <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
        <button
          type="button"
          className={clsx(
            btnNum,
            "border border-brand-600 bg-brand-600 text-white shadow-sm"
          )}
        >
          1
        </button>
        <button type="button" disabled className={btnNav}>
          <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto py-0.5 no-scrollbar", className)}>
      <button
        type="button"
        disabled={safePage <= 1}
        className={btnNav}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        title="Sebelumnya"
      >
        <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      {items.map((item, idx) =>
        item.type === "ellipsis" ? (
          <span
            key={item.key ?? `ellipsis-${idx}`}
            className={clsx(
              "flex shrink-0 items-center justify-center px-1 text-slate-400 select-none",
              compact ? "h-7 text-xs" : "h-8 sm:h-9 text-xs sm:text-sm"
            )}
          >
            …
          </span>
        ) : (
          <button
            key={item.value}
            type="button"
            className={clsx(
              btnNum,
              safePage === item.value
                ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
            onClick={() => setPage(item.value)}
          >
            {item.value}
          </button>
        )
      )}

      <button
        type="button"
        disabled={safePage >= safePages}
        className={btnNav}
        onClick={() => setPage((p) => Math.min(safePages, p + 1))}
        title="Berikutnya"
      >
        <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
