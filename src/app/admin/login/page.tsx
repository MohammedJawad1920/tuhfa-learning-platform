import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { sessionOptions } from "@/config/session";

type AdminSession = {
  authenticated?: boolean;
  createdAt?: number;
};

export default async function AdminLoginPage() {
  const session = await getIronSession<AdminSession>(
    await cookies(),
    sessionOptions,
  );

  const maxAgeSeconds = sessionOptions.cookieOptions?.maxAge ?? 0;

  if (
    session.authenticated === true &&
    typeof session.createdAt === "number" &&
    Date.now() - session.createdAt <= maxAgeSeconds * 1000
  ) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
