"use client";

import { useRef, useState, useTransition } from "react";
import { ACTIVITY_OPTIONS, type Creator } from "@/data/creators";
import {
  logoutAction,
  resetToSeedAction,
  saveCreatorsAction,
  uploadCreatorPhotoAction,
  uploadCreatorVideoAction,
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
    video: null,
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
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function update(id: string, patch: Partial<Creator>) {
    setDrafts((d) => d.map((c) => (c._id === id ? { ...c, ...patch } : c)));
  }

  function add() {
    setDrafts((d) => [...d, blankCreator()]);
  }

  function remove(id: string) {
    if (!confirm("Delete this creator?")) return;
    setDrafts((d) => d.filter((c) => c._id !== id));
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

        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Creators</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {drafts.length} {drafts.length === 1 ? "creator" : "creators"} ·
              edits go live within seconds of saving
            </p>
          </div>
          <button
            onClick={add}
            className="bg-white/[0.06] border border-white/15 rounded-full px-4 py-2 text-sm font-bold hover:bg-white/[0.1] active:scale-95 transition-all"
          >
            + Add creator
          </button>
        </div>

        <div className="space-y-5">
          {drafts.map((draft, i) => (
            <CreatorEditor
              key={draft._id}
              draft={draft}
              index={i}
              total={drafts.length}
              onChange={(patch) => update(draft._id, patch)}
              onRemove={() => remove(draft._id)}
              onMoveUp={() => move(draft._id, -1)}
              onMoveDown={() => move(draft._id, 1)}
            />
          ))}
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
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  draft: Draft;
  index: number;
  total: number;
  onChange: (patch: Partial<Creator>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/40 tabular-nums">
            #{index + 1}
          </span>
          <span className="text-sm font-bold truncate">
            {draft.name || draft.slug || "(untitled)"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up"
            className="w-8 h-8 rounded-full hover:bg-white/[0.06] disabled:opacity-30 transition-colors text-sm"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
            className="w-8 h-8 rounded-full hover:bg-white/[0.06] disabled:opacity-30 transition-colors text-sm"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Delete"
            className="w-8 h-8 rounded-full hover:bg-red-500/20 text-red-400 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-5">
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

          <Field label="Video (optional)">
            <VideoField
              slug={draft.slug}
              value={draft.video}
              onChange={(video) => onChange({ video })}
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

          <p className="text-[10px] text-neutral-500 pt-1">
            Slug:{" "}
            <span className="font-mono text-neutral-400">{draft.slug}</span>
            {" "}· auto-generated
          </p>
        </div>
      </div>
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
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo too large — keep it under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadCreatorPhotoAction(slug, file.name, base64);
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

function VideoField({
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
      setError("Set the slug first.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("That doesn't look like a video.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Video too large — keep it under 25 MB.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadCreatorVideoAction(slug, file.name, base64);
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
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/[0.1] active:scale-95 transition-all disabled:opacity-50"
        >
          {uploading ? "Uploading…" : value ? "Replace video" : "Upload video"}
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
          accept="video/mp4,video/webm,video/quicktime"
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
        placeholder="…or paste a video URL"
      />
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-[10px] text-neutral-500">
          MP4 / WebM / MOV, ≤25 MB. Plays muted on the swipe card if set.
        </p>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
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
