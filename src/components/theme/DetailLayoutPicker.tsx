"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Film, LayoutGrid, Rows3 } from "lucide-react";
import { toast } from "sonner";
import {
  DETAIL_LAYOUTS,
  getDetailLayout,
  type DetailLayoutId,
} from "@/lib/theme/detail-layouts";
import { useTheme } from "@/lib/theme/studio/provider";

const LAYOUT_ICONS: Record<DetailLayoutId, typeof Film> = {
  classic: Rows3,
  stage: Film,
  dossier: FileText,
  console: LayoutGrid,
};

export default function DetailLayoutPicker() {
  const { detailLayout, setDetailLayout } = useTheme();
  const router = useRouter();

  const choose = useCallback(
    (id: DetailLayoutId) => {
      if (id === detailLayout) return;
      const next = getDetailLayout(id);
      setDetailLayout(id);
      router.refresh();
      toast.success(`${next.name} details layout on`, {
        description: "The details page reloads with the new arrangement.",
      });
    },
    [detailLayout, setDetailLayout, router],
  );

  return (
    <div className="flex flex-col gap-2">
      {DETAIL_LAYOUTS.map((layout) => {
        const active = layout.id === detailLayout;
        const Icon = LAYOUT_ICONS[layout.id];
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => choose(layout.id)}
            aria-pressed={active}
            className={`relative flex min-h-17 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              active
                ? "border-accent/60 bg-accent/10"
                : "border-border bg-surface/40 hover:border-accent/40"
            }`}
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-lg border ${
                active
                  ? "border-accent/40 bg-accent/12 text-accent"
                  : "border-border bg-bg/40 text-fg-secondary"
              }`}
              aria-hidden="true"
            >
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold text-fg">{layout.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {layout.description}
              </span>
            </span>
            {active && (
              <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-accent-strong text-white">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
      <p className="text-[11px] leading-relaxed text-muted">
        The layout applies to each title&apos;s details page. Admins can make the current one the
        site default under <strong className="text-fg-secondary">Site default</strong>.
      </p>
    </div>
  );
}
