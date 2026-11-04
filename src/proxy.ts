import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

// Vérification optimiste (présence du cookie). La vraie vérification
// de session se fait dans chaque page / action via lib/session.ts.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
