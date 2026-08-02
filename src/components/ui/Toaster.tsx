"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast host (shadcn-style, built on sonner) themed to Cinevo's
 * design tokens. Trigger toasts anywhere with `import { toast } from "sonner"`.
 */
export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      richColors={false}
      closeButton
      toastOptions={{
        style: {
          background: "var(--color-surface)",
          color: "var(--color-fg)",
          border: "1px solid var(--color-border)",
          borderRadius: "0.875rem",
          fontSize: "0.8125rem",
        },
        classNames: {
          toast: "shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl",
          title: "font-bold",
          description: "text-fg-secondary",
          actionButton: "bg-accent-strong text-white",
          cancelButton: "bg-white/10 text-fg-secondary",
          error: "!border-red-500/30",
          success: "!border-emerald-500/30",
        },
      }}
    />
  );
}
