"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAdmin, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-gradient-primary px-5 py-3 text-sm font-bold text-on-primary shadow-glow transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? "กำลังเข้า..." : "เข้าสู่หลังบ้าน"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username" className="mb-1 block text-xs font-bold text-label">
          ชื่อผู้ใช้
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-control border border-outline/35 bg-surface-cream px-4 py-3 text-sm font-semibold text-text-strong outline-none transition focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-bold text-label">
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-control border border-outline/35 bg-surface-cream px-4 py-3 text-sm font-semibold text-text-strong outline-none transition focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {state.error && (
        <p className="rounded-control bg-error/10 px-3 py-2 text-sm font-semibold text-error">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
