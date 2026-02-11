export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/', '/plays/:path*', '/venues/:path*', '/people/:path*', '/events/:path*', '/calendar/:path*', '/files/:path*', '/api/:path*']
};
