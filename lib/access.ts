import { NextResponse } from "next/server";
import { getAuthSession } from "./auth";

// Локальные типы вместо импорта enums из @prisma/client (Vercel иногда не видит enums при сборке)
export type Role = "OWNER" | "MANAGER" | "TECH" | "ACTOR";
export type AttachmentVisibility = "INTERNAL" | "CAST_TECH";

type AuthOk = {
  role: Role;
  session: any;
};

export async function requireApiAuth(allow: Role[]): Promise<AuthOk | { error: NextResponse }> {
  const session = await getAuthSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = (session.user as any).role as Role | undefined;
  if (!role || !allow.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { role, session };
}

// helper: можно использовать в API для фильтрации видимости файлов
export function canSeeAttachment(visibility: AttachmentVisibility, role: Role) {
  if (visibility === "INTERNAL") return role === "OWNER" || role === "MANAGER";
  return true; // CAST_TECH видят все роли
}
