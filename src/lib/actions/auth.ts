"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  getAdminUser,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/auth/admin";

export interface LoginState {
  error: string | null;
}

export async function loginAdmin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return { error: "กรอกชื่อผู้ใช้และรหัสผ่านก่อนนะ" };

  let user;
  try {
    user = await getAdminUser(username);
  } catch {
    return {
      error: "ยังไม่พบตาราง admin_users ใน Supabase หรือเชื่อมต่อไม่ได้ ให้รัน SQL ที่เตรียมไว้ก่อน",
    };
  }

  if (!user?.is_active || !verifyAdminPassword(password, user.password_hash)) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  await setAdminSession(user.username);
  redirect("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login");
}
