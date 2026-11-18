"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";

export function ActivityActions(p: { id: string; title: string; notes: string | null; isPrivate: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(p.isPrivate);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Give it a title.");
    setBusy("save");
    try {
      await api(`/api/activities/${p.id}`, { method: "PATCH", body: { title: title.trim(), notes: notes.trim() || null, isPrivate } });
      toast.success("Saved");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api(`/api/activities/${p.id}`, { method: "DELETE" });
      toast.success("Activity deleted");
      router.replace("/activity");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  const input =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none";

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-4 rounded-3xl bg-[var(--color-surface-1)] p-5">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Title
          <input id="edit-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={`${input} h-12`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Notes
          <textarea id="edit-notes" value={notes} maxLength={1000} rows={3} onChange={(e) => setNotes(e.target.value)} className={`${input} py-3`} placeholder="How did it go?" />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-[var(--color-surface-2)] p-4">
          <span className="font-semibold">Only me</span>
          <input id="edit-private" type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-6 w-6 accent-[var(--color-brand-500)]" />
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={busy !== null} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-500)] font-black uppercase tracking-widest text-black disabled:opacity-60">
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-12 rounded-2xl px-5 font-semibold">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={() => setEditing(true)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] font-semibold">
        <Pencil className="h-4 w-4" /> Edit title, notes or privacy
      </button>
      {confirmDelete ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 p-3">
          <p className="flex-1 text-sm">Delete this activity? This can&apos;t be undone.</p>
          <button onClick={remove} disabled={busy !== null} className="flex h-10 items-center gap-1 rounded-xl bg-[var(--color-error-500)] px-4 text-sm font-bold text-white disabled:opacity-60">
            {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" />} Delete
          </button>
          <button onClick={() => setConfirmDelete(false)} className="h-10 rounded-xl px-3 text-sm font-semibold">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-[var(--color-error-400)]">
          <Trash2 className="h-4 w-4" /> Delete activity
        </button>
      )}
    </div>
  );
}
