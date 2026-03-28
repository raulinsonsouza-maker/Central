import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

function isAdminAuthorized(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") ?? req.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Use PNG, JPG, WebP, SVG ou GIF." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "logos");

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/logos/${filename}` });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || !url.startsWith("/logos/")) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const filename = path.basename(url);
  const filePath = path.join(process.cwd(), "public", "logos", filename);

  try {
    await unlink(filePath);
  } catch {
    // ignore if file doesn't exist
  }

  return NextResponse.json({ ok: true });
}
