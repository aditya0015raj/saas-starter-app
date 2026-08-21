import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = [
  "/",
  "/api/webhook/register",
  "/sign-in",
  "/sign-up",
];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const pathname = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(pathname);

  // Unauthenticated user trying to access protected route
  if (!userId && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);

      const role = user.publicMetadata.role as string | undefined;

      // Admin accessing /dashboard
      if (role === "admin" && pathname === "/dashboard") {
        return NextResponse.redirect(
          new URL("/admin/dashboard", req.url)
        );
      }

      // Non-admin accessing /admin routes
      if (role !== "admin" && pathname.startsWith("/admin")) {
        return NextResponse.redirect(
          new URL("/dashboard", req.url)
        );
      }

      // Authenticated user trying to access public routes
      if (isPublicRoute) {
        return NextResponse.redirect(
          new URL(
            role === "admin" ? "/admin/dashboard" : "/dashboard",
            req.url
          )
        );
      }
    } catch (error) {
      console.error("Error fetching user data from Clerk:", error);

      return NextResponse.redirect(
        new URL("/error", req.url)
      );
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.[\\w]+$).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};