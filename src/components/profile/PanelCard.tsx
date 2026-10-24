import React from "react";

/** Accent tones for the icon chip, matching the admin panels already on this page. */
type Tone = "accent" | "purple" | "orange" | "blue" | "emerald";

const TONES: Record<Tone, string> = {
  accent: "border-accent/25 bg-accent/15 text-accent",
  purple: "border-accent/25 bg-accent/10 text-accent",
  orange: "border-warning/25 bg-warning/15 text-warning",
  blue: "border-blue/25 bg-blue/15 text-blue",
  emerald: "border-success/25 bg-success/15 text-success",
};

interface PanelCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: Tone;
  /** Right-aligned control in the header row. */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * The shared card shell for every section of the profile workspace, so the
 * account panes and the admin panels read as one family.
 */
export default function PanelCard({
  icon,
  title,
  subtitle,
  tone = "accent",
  action,
  children,
  className = "",
}: PanelCardProps) {
  return (
    <section className={`rounded-2xl border border-white/6 bg-surface/40 p-6 sm:p-8 ${className}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-9 flex-none items-center justify-center rounded-xl border ${TONES[tone]}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight font-bold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
