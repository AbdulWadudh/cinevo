"use client";

import React, {
  useCallback, useEffect, useImperativeHandle, useState, useTransition, useRef,
} from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";
import {
  Pencil, Trash2, Check, X, Shield, ShieldOff,
  Eye, EyeOff, ArrowUp, ArrowDown, Save, Loader2, AlertCircle, Star, GripVertical,
} from "lucide-react";
import {
  createProvider, updateProvider, deleteProvider, reorderProviders, setDefaultProvider,
} from "@/app/actions/providers";
import type { PlayerProvider, ProviderInput, SandboxMode } from "@/lib/providers";
import { SANDBOX_MODES } from "@/lib/providers";
import { clearProvidersCache } from "@/lib/useProviders";

const emptyForm: ProviderInput = {
  key: "", label: "", sub: "", movieUrl: "", tvUrl: "",
  sandboxMode: "balanced", enabled: true, isDefault: false, sortOrder: 0,
};

const SB_LABEL: Record<SandboxMode, string> = { balanced: "Balanced", strict: "Strict", off: "Off" };

const inputCls =
  "w-full bg-bg/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-fg placeholder-muted outline-none focus:border-accent/60 transition-colors";
const labelCls = "text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5 block";

export interface ProviderAdminHandle {
  /** Opens the blank editor. Driven from the panel header, which owns the button. */
  openNew: () => void;
}

interface ProviderAdminProps {
  /** Owned by the panel, so switching tabs doesn't discard an added provider. */
  providers: PlayerProvider[];
  setProviders: React.Dispatch<React.SetStateAction<PlayerProvider[]>>;
  ref?: React.Ref<ProviderAdminHandle>;
}

export default function ProviderAdmin({ providers, setProviders, ref }: ProviderAdminProps) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ProviderInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Editing a row low in the list expands the form inside the scroll area, so
  // pull it into view. Deferred past the 250ms expand — measured any earlier
  // the editor is still `height: 0` and the scroll lands short.
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editingId) return;
    const handle = setTimeout(() => editorRef.current?.scrollIntoView({ block: "nearest" }), 260);
    return () => clearTimeout(handle);
  }, [editingId]);

  // Guarded so a second click on "Add provider" can't wipe a half-filled form.
  const openNew = useCallback(() => {
    if (editingId === "new") return;
    setForm({ ...emptyForm, sortOrder: providers.length });
    setError(null);
    setEditingId("new");
  }, [editingId, providers.length]);

  useImperativeHandle(ref, () => ({ openNew }), [openNew]);

  const openEdit = (p: PlayerProvider) => {
    setForm({
      key: p.key, label: p.label, sub: p.sub ?? "", movieUrl: p.movieUrl,
      tvUrl: p.tvUrl, sandboxMode: p.sandboxMode, enabled: p.enabled,
      isDefault: p.isDefault, sortOrder: p.sortOrder,
    });
    setError(null);
    setEditingId(p.id);
  };

  const closeEditor = () => {
    setEditingId(null);
    setError(null);
  };

  const set = <K extends keyof ProviderInput>(k: K, v: ProviderInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = editingId === "new"
        ? await createProvider(form)
        : await updateProvider(editingId as string, form);

      if (!res.success || !res.data) {
        setError(res.error || "Something went wrong");
        return;
      }
      const saved = res.data;
      setProviders((prev) => {
        // If the saved provider is the default, clear the flag on every other row.
        const cleared = saved.isDefault ? prev.map((p) => ({ ...p, isDefault: false })) : prev;
        const merged = editingId === "new"
          ? [...cleared, saved]
          : cleared.map((p) => (p.id === saved.id ? saved : p));
        return merged.sort((a, b) => a.sortOrder - b.sortOrder);
      });
      clearProvidersCache(); // so the player picks up the change on next load
      closeEditor();
    });
  };

  const makeDefault = (id: string) => {
    startTransition(async () => {
      const res = await setDefaultProvider(id);
      if (res.success && res.data) { setProviders(res.data); clearProvidersCache(); }
      else setError(res.error || "Failed to set default");
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteProvider(id);
      if (res.success) {
        setProviders((prev) => prev.filter((p) => p.id !== id));
        clearProvidersCache();
        setConfirmDelete(null);
      } else {
        setError(res.error || "Failed to delete");
      }
    });
  };

  // Persist a given ordering to the DB (shared by the arrow buttons and drag).
  const persistOrder = (ordered: PlayerProvider[], revertTo: PlayerProvider[]) => {
    const withOrder = ordered.map((p, i) => ({ ...p, sortOrder: i }));
    setProviders(withOrder); // optimistic
    clearProvidersCache();
    startTransition(async () => {
      const res = await reorderProviders(withOrder.map((p) => p.id));
      if (!res.success) {
        setProviders(revertTo); // revert
        setError(res.error || "Failed to reorder");
      }
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = providers.findIndex((p) => p.id === id);
    const next = idx + dir;
    if (next < 0 || next >= providers.length) return;
    const reordered = [...providers];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    persistOrder(reordered, providers);
  };

  // Drag-to-reorder: update order live during the drag, commit once on drop.
  // `providers` here is the post-drag order (the list re-renders as it moves).
  const preDragOrder = useRef<PlayerProvider[]>(providers);
  const onDragStart = () => { preDragOrder.current = providers; };
  const commitOrder = () => persistOrder(providers, preDragOrder.current);

  const editor = (
    <motion.div
      ref={editorRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-bg/40 border border-accent/20 rounded-2xl p-5 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Key (slug)</label>
            <input className={inputCls} value={form.key} placeholder="vidcore"
              onChange={(e) => set("key", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Label</label>
            <input className={inputCls} value={form.label} placeholder="VidCore"
              onChange={(e) => set("label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Sub-label (server name)</label>
            <input className={inputCls} value={form.sub ?? ""} placeholder="Server Beta"
              onChange={(e) => set("sub", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Movie URL template</label>
            <input className={inputCls} value={form.movieUrl} placeholder="https://host/movie/{id}"
              onChange={(e) => set("movieUrl", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>TV URL template</label>
            <input className={inputCls} value={form.tvUrl} placeholder="https://host/tv/{id}/{season}/{episode}"
              onChange={(e) => set("tvUrl", e.target.value)} />
            <p className="text-[10px] text-muted mt-1.5">
              Placeholders: <code className="text-accent">{"{id}"}</code>, <code className="text-accent">{"{season}"}</code>, <code className="text-accent">{"{episode}"}</code>, <code className="text-accent">{"{progress}"}</code>. Pick an ad-block mode below — <b>Balanced</b> blocks pop-ups/redirects while playing on most providers; <b>Off</b> only if the provider refuses to load.
            </p>
          </div>
          <div>
            <label className={labelCls}>Sort order</label>
            <input type="number" className={inputCls} value={form.sortOrder}
              onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Ad-block mode</label>
            <div className="inline-flex items-center rounded-lg border border-white/[0.1] overflow-hidden">
              {SANDBOX_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("sandboxMode", m)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all cursor-pointer ${form.sandboxMode === m
                    ? (m === "off" ? "bg-orange-500/20 text-orange-300" : m === "strict" ? "bg-sky-500/20 text-sky-300" : "bg-emerald-500/20 text-emerald-300")
                    : "text-muted hover:text-fg hover:bg-white/[0.04]"}`}
                >
                  {m === "off" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  {SB_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-4 pb-1">
            <button type="button" onClick={() => set("enabled", !form.enabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${form.enabled
                ? "bg-accent/10 border-accent/25 text-accent"
                : "bg-white/[0.04] border-white/[0.1] text-muted"}`}>
              {form.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {form.enabled ? "Enabled" : "Hidden"}
            </button>
            <button type="button" onClick={() => set("isDefault", !form.isDefault)}
              title="The default provider is used when a link has no ?source="
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${form.isDefault
                ? "bg-gold/10 border-gold/30 text-gold"
                : "bg-white/[0.04] border-white/[0.1] text-muted"}`}>
              <Star className={`w-3.5 h-3.5 ${form.isDefault ? "fill-gold" : ""}`} />
              {form.isDefault ? "Default" : "Set default"}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 mt-5">
          <button onClick={save} disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-60">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId === "new" ? "Create provider" : "Save changes"}
          </button>
          <button onClick={closeEditor} disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-fg hover:bg-white/[0.09] transition-all cursor-pointer">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>{editingId === "new" && editor}</AnimatePresence>

      {/* The list owns the scrollbar — the panel header, its Add provider
          button and the tabs stay put however many providers are configured. */}
      <Reorder.Group
        as="div"
        axis="y"
        values={providers}
        onReorder={setProviders}
        className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto overscroll-contain pr-1"
      >
        {providers.map((p, i) => (
          <ProviderRow
            key={p.id}
            p={p}
            index={i}
            total={providers.length}
            pending={pending}
            confirmDelete={confirmDelete}
            expanded={editingId === p.id ? editor : null}
            onDragStart={onDragStart}
            onDragEnd={commitOrder}
            onMove={move}
            onMakeDefault={makeDefault}
            onEdit={openEdit}
            onAskDelete={setConfirmDelete}
            onConfirmDelete={remove}
          />
        ))}
      </Reorder.Group>
    </>
  );
}

/* ─── Draggable provider row ─────────────────────────────────── */
function ProviderRow({
  p, index, total, pending, confirmDelete, expanded,
  onDragStart, onDragEnd, onMove, onMakeDefault, onEdit, onAskDelete, onConfirmDelete,
}: {
  p: PlayerProvider;
  index: number;
  total: number;
  pending: boolean;
  confirmDelete: string | null;
  expanded: React.ReactNode;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onMakeDefault: (id: string) => void;
  onEdit: (p: PlayerProvider) => void;
  onAskDelete: (id: string | null) => void;
  onConfirmDelete: (id: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={p}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileDrag={{ scale: 1.01, boxShadow: "0 12px 30px rgba(0,0,0,0.55)", cursor: "grabbing" }}
      transition={{ duration: 0.2 }}
    >
      <div className={`bg-bg/40 border rounded-2xl px-4 py-3 transition-colors ${p.enabled ? "border-white/[0.07]" : "border-white/[0.04] opacity-60"}`}>
        <div className="flex items-center gap-3">
          {/* drag handle */}
          <button
            onPointerDown={(e) => dragControls.start(e)}
            className="flex-none p-1 -ml-1 text-muted hover:text-accent transition-colors cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* reorder arrows */}
          <div className="flex flex-col gap-0.5">
            <button onClick={() => onMove(p.id, -1)} disabled={index === 0 || pending}
              className="p-0.5 text-muted hover:text-accent disabled:opacity-30 transition-colors cursor-pointer" aria-label="Move up">
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onMove(p.id, 1)} disabled={index === total - 1 || pending}
              className="p-0.5 text-muted hover:text-accent disabled:opacity-30 transition-colors cursor-pointer" aria-label="Move down">
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-fg">{p.label}</span>
              <span className="text-[10px] font-mono text-muted bg-white/[0.05] px-1.5 py-0.5 rounded">{p.key}</span>
              {p.isDefault && (
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-1.5 py-0.5 rounded">
                  <Star className="w-2.5 h-2.5 fill-gold" /> Default
                </span>
              )}
              {p.sub && <span className="text-[10px] text-muted">{p.sub}</span>}
            </div>
            <p className="text-[11px] text-muted truncate mt-0.5">{p.movieUrl}</p>
          </div>

          {/* badges */}
          <div className="hidden sm:flex items-center gap-1.5 flex-none">
            <span title={`Sandbox: ${SB_LABEL[p.sandboxMode]}`}
              className={`flex items-center gap-1 px-2 h-7 rounded-lg border text-[9px] font-extrabold uppercase tracking-wider ${p.sandboxMode === "off" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : p.sandboxMode === "strict" ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
              {p.sandboxMode === "off" ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{SB_LABEL[p.sandboxMode]}</span>
            </span>
            <span title={p.enabled ? "Visible" : "Hidden"}
              className={`flex items-center justify-center w-7 h-7 rounded-lg border ${p.enabled ? "bg-accent/10 border-accent/20 text-accent" : "bg-white/[0.04] border-white/[0.08] text-muted"}`}>
              {p.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </span>
          </div>

          {/* actions */}
          <div className="flex items-center gap-1.5 flex-none">
            {confirmDelete === p.id ? (
              <>
                <button onClick={() => onConfirmDelete(p.id)} disabled={pending}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer" aria-label="Confirm delete">
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => onAskDelete(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-muted hover:text-fg transition-all cursor-pointer" aria-label="Cancel delete">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => onMakeDefault(p.id)} disabled={p.isDefault || pending}
                  title={p.isDefault ? "This is the default provider" : "Set as default provider"}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer ${p.isDefault
                    ? "bg-gold/15 border-gold/30 text-gold cursor-default"
                    : "bg-white/[0.05] border-white/[0.1] text-fg-secondary hover:text-gold hover:border-gold/40"}`}
                  aria-label="Set as default">
                  <Star className={`w-3.5 h-3.5 ${p.isDefault ? "fill-gold" : ""}`} />
                </button>
                <button onClick={() => onEdit(p)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-accent hover:border-accent/40 transition-all cursor-pointer" aria-label="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onAskDelete(p.id)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-fg-secondary hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer" aria-label="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>{expanded}</AnimatePresence>
      </div>
    </Reorder.Item>
  );
}
