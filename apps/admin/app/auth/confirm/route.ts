import { NextResponse } from "next/server";
import { sessionDb } from "../../../lib/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code"),
    oauthError = url.searchParams.get("error"),
    token = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");

  if (oauthError) {
    const redirectUrl = new URL("/", url.origin);
    redirectUrl.searchParams.set("error", oauthError);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/", url.origin));
    }
    return NextResponse.redirect(new URL("/?error=oauth_failed", url.origin));
  }

  if (
    token &&
    (type === "invite" ||
      type === "recovery" ||
      type === "email" ||
      type === "signup")
  ) {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ token_hash: token, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "signup" ? "/?emailConfirmed=1" : "/account",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(new URL("/?error=expired", url.origin));
}
