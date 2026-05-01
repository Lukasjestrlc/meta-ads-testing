"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const INITIAL: LoginState = {};

export default function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <main className="min-h-screen grid place-items-center bg-[hsl(0_0%_4%)] text-white p-6">
      <form
        action={formAction}
        className="max-w-sm w-full space-y-5 animate-[fadeIn_400ms_ease-out]"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
              peach club admin
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
        </div>

        <input type="hidden" name="from" value={from} />

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-wider font-bold text-white/60"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="w-full bg-white/[0.04] border border-white/10 focus:border-[hsl(330_80%_70%)]/60 focus:outline-none rounded-2xl px-4 py-3 text-base"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-red-400 text-center">{state.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-gradient-pink text-white font-bold py-3.5 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in →"}
        </button>
      </form>
    </main>
  );
}
