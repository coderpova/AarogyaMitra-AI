import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";


export function middleware(request: NextRequest) {


  const token = request.cookies.get("token")?.value;


  const protectedRoutes = [
    "/dashboard",
    "/profile",
    "/settings",
    "/chat",
    "/hospital",
    "/medicines",
    "/schemes",
  ];



  const isProtectedRoute = protectedRoutes.some((route)=>
    request.nextUrl.pathname.startsWith(route)
  );



  if(isProtectedRoute && !token){


    return NextResponse.redirect(
      new URL("/login", request.url)
    );


  }



  return NextResponse.next();

}




export const config = {


  matcher:[

    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/chat/:path*",
    "/hospital/:path*",
    "/medicines/:path*",
    "/schemes/:path*",

  ],


};