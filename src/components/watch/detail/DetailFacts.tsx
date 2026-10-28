import Link from "next/link";
import type { DetailFact, DetailLink } from "./types";

interface DetailFactsProps {
  facts: DetailFact[];
  keywords?: string[];
  links?: DetailLink[];
  columns?: 1 | 2;
  className?: string;
}

export default function DetailFacts({
  facts,
  keywords = [],
  links = [],
  columns = 1,
  className = "",
}: DetailFactsProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`.trim()}>
      <dl className={`grid gap-x-8 gap-y-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-baseline justify-between gap-6 border-b border-border/70 pb-2"
          >
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
              {fact.label}
            </dt>
            <dd className="text-right text-sm font-medium text-fg-secondary">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      {keywords.length > 0 && (
        <div>
          <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Link
                key={keyword}
                href={`/search?q=${encodeURIComponent(keyword)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg-secondary transition-colors hover:border-accent hover:text-accent"
              >
                {keyword}
              </Link>
            ))}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold uppercase tracking-[0.14em] text-accent transition-colors hover:text-accent-hover"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
