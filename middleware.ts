import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// define route matcher 

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
])

const isDashboardRoute = createRouteMatcher([
  "/dashboard(.*)",
])

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhook/register",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // handle to unAuth users to acccess protected routes

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/sign-in', req.url))
  }

  // if the user is authenticated get its info also role
  if (userId) {
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      const role = await user.publicMetadata.role as String || undefined

      // admin role redirection

      if (role === "admin" && isDashboardRoute(req)) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }

      // prevent non admin users to access admin route

      if (role !== "admin" && isAdminRoute(req)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // prevent auth user to access public route

      if (isPublicRoute(req)) {
        return NextResponse.redirect(new URL(
          role === "admin" ? "/admin/dashboard" : "/dashboard",
          req.url
        ))
      }
    } catch (error) {
      console.log(error)
      return NextResponse.redirect(new URL('/error', req.url))
    }
  }

  return NextResponse.next() 

})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}