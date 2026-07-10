import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin Login - Winkwink Review Gallery",
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-card border border-white/65 bg-white/85 p-6 shadow-card backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-on-primary">
            W
          </div>
          <h1 className="font-display text-2xl font-extrabold text-gradient-primary">
            Winkwink Admin
          </h1>
          <p className="mt-1 text-sm text-label">ล็อกอินก่อนจัดการรีวิวหลังบ้าน</p>
        </div>

        <LoginForm />

        <Link
          href="/reviews"
          className="mt-5 block text-center text-sm font-semibold text-label underline-offset-2 hover:text-primary hover:underline"
        >
          กลับไปหน้ารีวิว
        </Link>
      </section>
    </main>
  );
}
