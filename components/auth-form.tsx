"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type FormState } from "@/app/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<FormState, FormData>(isLogin ? signIn : signUp, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      {!isLogin && (
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" autoComplete="given-name" className="field" required />
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" className="field" required />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} className="field" required />
        {!isLogin && <p className="mt-1.5 text-sm text-muted">At least 8 characters.</p>}
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm">
        {state?.error && <span className="text-red-400">{state.error}</span>}
        {state?.message && <span className="text-emerald-400">{state.message}</span>}
      </p>
      <button className="btn w-full" disabled={pending}>
        {pending ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {isLogin ? "New to AETHR? " : "Already have an account? "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-accent underline-offset-4 hover:underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
