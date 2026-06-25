import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (
    !user &&
    (path.startsWith("/admin") ||
      path.startsWith("/operacao") ||
      path.startsWith("/calendar") ||
      path.startsWith("/clientes") ||
      path.startsWith("/estoque") ||
      path.startsWith("/fornecedor") ||
      path.startsWith("/financeiro") ||
      path.startsWith("/ordens-servico") ||
      path.startsWith("/os/"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
