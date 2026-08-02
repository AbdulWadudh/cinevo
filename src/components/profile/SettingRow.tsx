import React from "react";

interface SettingRowProps {
  title: string;
  description: string;
  /** The control for this setting — a button, toggle, or link. */
  children: React.ReactNode;
}

/**
 * One labelled setting inside a {@link PanelCard}: copy on the left, its
 * control on the right, stacking on narrow screens so the control stays
 * full-width and tappable.
 */
export default function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/6 bg-bg/40 p-4 transition-colors hover:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-fg">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}
