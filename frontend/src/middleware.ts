import { NextRequest, NextResponse } from 'next/server';
export function middleware(req: NextRequest) {
  if (!req.cookies.get('token')?.value) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*','/buyer/:path*','/farmer/:path*','/logistics/:path*'] };
