import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'inventario-restaurante-secret-key-2024'
)

const PUBLIC_PATHS = ['/login', '/setup', '/api/health']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const token = request.cookies.get('session')?.value

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token) {
    try {
      await jwtVerify(token, SECRET)
      if (isPublic) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
