import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/access";

export async function GET(_req: NextRequest) {
  const auth = await requireApiAuth(["OWNER", "MANAGER", "TECH", "ACTOR"]);
  if ("error" in auth) return auth.error;

  const files = await prisma.attachment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, email: true, name: true, role: true } },
      play: { select: { id: true, title: true } },
      event: { select: { id: true, title: true, startAt: true } },
    },
  });

  // TECH/ACTOR видят только файлы с visibility = CAST_TECH
  if (auth.role === "TECH" || auth.role === "ACTOR") {
    return NextResponse.json(files.filter((f: any) => f.visibility === "CAST_TECH"));
  }

  return NextResponse.json(files);
}
