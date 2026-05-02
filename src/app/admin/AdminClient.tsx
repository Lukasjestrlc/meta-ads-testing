"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ACTIVITY_OPTIONS, type Creator } from "@/data/creators";
import {
  logoutAction,
  resetToSeedAction,
  saveCreatorsAction,
  uploadCreatorPhotoAction,
} from "./actions";

type Draft = Creator & { _id: string };

let draftIdSeed = 0;
function newDraftId() {
  return `d-${Date.now()}-${draftIdSeed++}`;
}

function toDraft(c: Creator): Draft {
  return { ...c, _id: newDraftId() };
}

function randomSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function blankCreator(): Draft {
  return {
    _id: newDraftId(),
    slug: randomSlug(),
    name: "",
    age: 21,
    bio: "",
    photo: null,
    destUrl: "",
    activity: "", // empty = render-time random
  };
}

export default function AdminClient({
  initial,
  storeConfigured,
}: {
  initial: Creator[];
  storeConfigured: boolean;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map(toDraft));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleDrafts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.bio.toLowerCase().includes(q)
    );
  }, [drafts, search]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function update(id: string, patch: Partial<Creator>) {
    setDrafts((d) => d.map((c) => (c._id === id ? { ...c, ...patch } : c)));
  }

  function add() {
    const fresh = blankCreator();
    setDrafts((d) => [fresh, ...d]); // newcomers appear at the top
    setExpanded((prev) => new Set([fresh._id, ...prev])); // and start expanded
    setSearch(""); // clear filter so they're visible
  }

  function remove(id: string) {
    if (!confirm("Delete this creator?")) return;
    setDrafts((d) => d.filter((c) => c._id !== id));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function move(id: string, dir: -1 | 1) {
    setDrafts((d) => {
      const i = d.findIndex((c) => c._id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.length) return d;
      const next = d.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const payload: Creator[] = drafts.map(({ _id, ...c }) => {
        void _id;
        return c;
      });
      const res = await saveCreatorsAction(payload);
      setFeedback(
        res.ok
          ? {
              kind: "ok",
              msg: "Committed. Vercel rebuilds in ~30–60s, then the live site shows the new list.",
            }
          : { kind: "err", msg: res.error }
      );
    });
  }

  function resetToSeed() {
    if (
      !confirm(
        "Reset to the default creators baked into the repo? This will overwrite the live list in KV."
      )
    )
      return;
    setFeedback(null);
    startTransition(async () => {
      const res = await resetToSeedAction();
      if (res.ok) {
        // Reload to pull the seed back into the editor.
        window.location.reload();
      } else {
        setFeedback({ kind: "err", msg: res.error });
      }
    });
  }

  return (
    <main className="min-h-screen bg-[hsl(0_0%_4%)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[hsl(0_0%_4%)]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
              peach club · admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/stats"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Stats →
            </a>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              View site →
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-7 space-y-6">
        {!storeConfigured && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 leading-relaxed">
            <strong className="block font-bold mb-1">
              GitHub commits aren&apos;t configured
            </strong>
            Saves will fail until you set{" "}
            <span className="font-mono text-xs">GITHUB_TOKEN</span> (PAT with
            Contents: Write) and{" "}
            <span className="font-mono text-xs">
              GITHUB_REPO=&quot;owner/name&quot;
            </span>{" "}
            in Vercel → Settings → Environment Variables, then redeploy.
          </div>
        )}

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Creators</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {drafts.length} {drafts.length === 1 ? "creator" : "creators"}
              {search.trim() &&
                drafts.length !== visibleDrafts.length &&
                ` · ${visibleDrafts.length} match search`}
              {" · edits go live ~30–60s after saving"}
            </p>
          </div>
          <button
            onClick={add}
            className="bg-gradient-pink text-white rounded-full px-4 py-2 text-sm font-bold shadow-[0_4px_18px_-4px_rgba(240,117,179,0.6)] active:scale-95 transition-all"
          >
            + Add creator
          </button>
        </div>

        {drafts.length > 3 && (
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, slug, or bio…"
              className="w-full bg-white/[0.04] border border-white/10 focus:border-white/25 focus:outline-none rounded-2xl pl-10 pr-4 py-2.5 text-sm placeholder:text-white/30"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">
              ⌕
            </span>
          </div>
        )}

        <div className="space-y-2">
          {visibleDrafts.map((draft) => {
            const i = drafts.findIndex((d) => d._id === draft._id);
            return (
              <CreatorEditor
                key={draft._id}
                draft={draft}
                index={i}
                total={drafts.length}
                expanded={expanded.has(draft._id)}
                onToggle={() => toggleExpanded(draft._id)}
                onChange={(patch) => update(draft._id, patch)}
                onRemove={() => remove(draft._id)}
                onMoveUp={() => move(draft._id, -1)}
                onMoveDown={() => move(draft._id, 1)}
              />
            );
          })}
        </div>

        {drafts.length === 0 && (
          <div className="text-center py-12 text-sm text-neutral-500">
            No creators yet. Click <strong>+ Add creator</strong> to start, or{" "}
            <button
              onClick={resetToSeed}
              className="underline text-[#4ade80] hover:text-[#22c55e]"
            >
              reset to the default list
            </button>
            .
          </div>
        )}

        {drafts.length > 0 && visibleDrafts.length === 0 && (
          <div className="text-center py-12 text-sm text-neutral-500">
            No creators match{" "}
            <span className="font-mono text-white/70">
              &ldquo;{search}&rdquo;
            </span>
            .
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-white/10 bg-[hsl(0_0%_4%)]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-400">
            {feedback && (
              <span
                className={
                  feedback.kind === "ok" ? "text-[#4ade80]" : "text-red-400"
                }
              >
                {feedback.msg}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToSeed}
              disabled={pending}
              className="text-xs text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Reset to seed
            </button>
            <button
              onClick={save}
              disabled={pending}
              className="bg-gradient-pink text-white font-bold py-2.5 px-6 rounded-full text-sm shadow-[0_4px_18px_-4px_rgba(240,117,179,0.6)] active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function CreatorEditor({
  draft,
  index,
  total,
  expanded,
  onToggle,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  draft: Draft;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Creator>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-colors ${
        expanded
          ? "border-[hsl(330_80%_70%)]/40 bg-white/[0.04]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      {/* Compact row — always visible, click to toggle */}
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-expanded={expanded}
        >
          <Thumb url={draft.photo} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold truncate">
                {draft.name || (
                  <span className="text-white/40 italic">(untitled)</span>
                )}
              </span>
              {draft.age ? (
                <span className="text-xs text-white/50 flex-shrink-0">
                  · {draft.age}
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {draft.activity || "Random activity"}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up"
            className="w-7 h-7 rounded-full hover:bg-white/[0.08] disabled:opacity-30 transition-colors text-xs"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
            className="w-7 h-7 rounded-full hover:bg-white/[0.08] disabled:opacity-30 transition-colors text-xs"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="w-7 h-7 rounded-full hover:bg-white/[0.08] transition-colors text-xs text-white/60"
          >
            {expanded ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {/* Body — only when expanded */}
      {expanded ? (
        <div className="border-t border-white/10 px-5 py-5 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-5">
          <PhotoPreview url={draft.photo} />

        <div className="space-y-3 min-w-0">
          <Row>
            <Field label="Name">
              <input
                value={draft.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className={inputClass}
                placeholder="Kylie"
              />
            </Field>
            <Field label="Age">
              <input
                type="number"
                min={18}
                value={draft.age}
                onChange={(e) =>
                  onChange({ age: Number(e.target.value) || 18 })
                }
                className={inputClass}
              />
            </Field>
          </Row>

          <Field label="Bio">
            <textarea
              value={draft.bio}
              onChange={(e) => onChange({ bio: e.target.value })}
              rows={2}
              className={inputClass}
              placeholder="Sun-chasing, coffee-loving, weekend hiker."
            />
          </Field>

          <Field label="Photo">
            <PhotoField
              slug={draft.slug}
              value={draft.photo}
              onChange={(photo) => onChange({ photo })}
            />
          </Field>

          <Field label="Destination URL (tracking link)">
            <input
              value={draft.destUrl}
              onChange={(e) => onChange({ destUrl: e.target.value })}
              className={inputClass}
              placeholder="https://www.fanvue.com/…"
            />
          </Field>

          <Field label="Activity tag">
            <select
              value={draft.activity}
              onChange={(e) => onChange({ activity: e.target.value })}
              className={inputClass}
            >
              {ACTIVITY_OPTIONS.map((opt) => (
                <option
                  key={opt.value || "random"}
                  value={opt.value}
                  className="bg-neutral-900"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
            <p className="text-[10px] text-neutral-500">
              Slug:{" "}
              <span className="font-mono text-neutral-400">{draft.slug}</span>
              {" "}· auto-generated
            </p>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
            >
              Delete creator
            </button>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/[0.04] border border-white/10 flex-shrink-0 grid place-items-center text-[8px] text-neutral-500">
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        "no photo"
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] uppercase tracking-wider font-bold text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function PhotoField({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFile(file: File) {
    setError(null);
    if (!slug.trim()) {
      setError("Set the slug first — uploads are saved as <slug>.<ext>.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      return;
    }
    // Hard cap on the *original* file too. Even with compression there's
    // some memory cost, and 25MB+ phone HEICs that come through as JPEG
    // can cause real slowness on lower-end devices.
    if (file.size > 30 * 1024 * 1024) {
      setError("Photo is huge — try one under 30 MB.");
      return;
    }

    setUploading(true);
    try {
      // Always compress in the browser. A 1600px JPEG @ 0.86 quality is
      // ~200–500KB, which fits Vercel's 4.5MB body cap with room to spare
      // and keeps the repo from ballooning with full-res phone photos.
      const compressed = await compressImage(file);
      const filename = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      const base64 = await fileToBase64(compressed);
      const res = await uploadCreatorPhotoAction(slug, filename, base64);
      if (res.ok) {
        onChange(res.url);
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/[0.1] active:scale-95 transition-all disabled:opacity-50"
        >
          {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={uploading}
            className="text-xs text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickFile(file);
          }}
        />
      </div>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass}
        placeholder="…or paste a photo URL"
      />
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-[10px] text-neutral-500">
          Uploads commit to <span className="font-mono">public/creators/</span>{" "}
          and live within ~30–60s of saving.
        </p>
      )}
    </div>
  );
}

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<payload>" — strip the data URL prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

/**
 * Resizes + recompresses photos in the browser before they hit the server.
 * Vercel caps serverless function bodies at 4.5MB regardless of plan, so
 * a raw 8MB phone photo (≈11MB base64) blows the limit and the upload
 * action blows up as a generic "Server Components render" error.
 *
 * 1600px max dimension at 0.86 JPEG quality is visually indistinguishable
 * from a phone original on any screen we'll show it on, and lands a
 * typical photo at 200–500KB.
 */
async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.86
): Promise<Blob> {
  // GIFs would lose their animation through canvas — pass them through.
  if (file.type === "image/gif") return file;

  const img = await loadImageElement(file);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", quality)
  );
  // If something goes wrong with toBlob, fall back to the original file —
  // server-side limits will still catch a too-large payload.
  return blob && blob.size < file.size ? blob : file;
}

function PhotoPreview({ url }: { url: string | null }) {
  return (
    <div className="w-[120px] h-[160px] rounded-xl overflow-hidden bg-white/[0.04] border border-white/10 grid place-items-center text-[10px] text-neutral-500 text-center px-2">
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        "No photo"
      )}
    </div>
  );
}

const inputClass =
  "w-full bg-white/[0.04] border border-white/10 focus:border-[hsl(330_80%_70%)]/60 focus:outline-none rounded-xl px-3 py-2 text-sm font-mono text-white placeholder:text-white/30";
