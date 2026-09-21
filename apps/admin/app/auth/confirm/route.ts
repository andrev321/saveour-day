import { NextResponse } from "next/server";
import { sessionDb } from "../../../lib/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    token = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  if (token && (type === "invite" || type === "recovery" || type === "email")) {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ token_hash: token, type });
    if (!error) return NextResponse.redirect(new URL("/account", url.origin));
  }
  return NextResponse.redirect(new URL("/?error=expired", url.origin));
}
