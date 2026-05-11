/** @type {import('next').NextConfig} */

// ----------------------------------------------------------------------------
// Content-Security-Policy
// ----------------------------------------------------------------------------
// Built once at module load and reused for every response.
//
// Known compromise: `script-src` and `style-src` retain `'unsafe-inline'`, and
// `script-src` retains `'unsafe-eval'`. This is required by:
//   - Clerk (some auth flows JIT-eval crypto helpers)
//   - PostHog (autocapture inlines snippets)
//   - Next.js streaming (inline runtime hydration markers)
// We do NOT use a nonce-based CSP yet, so dropping unsafe-inline would break
// the app. Revisit when Next 16 + Clerk both support nonce propagation.
//
// Newlines inside a CSP header value are invalid per spec (RFC 7230 section
// 3.2.4). The template literal below is collapsed to single spaces before use.
// ----------------------------------------------------------------------------
const cspDirectives = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
    https://*.clerk.accounts.dev
    https://*.clerk.com
    https://challenges.cloudflare.com
    https://*.posthog.com
    https://us-assets.i.posthog.com;
  style-src 'self' 'unsafe-inline' https://*.clerk.com;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://*.clerk.com;
  connect-src 'self'
    https://*.clerk.accounts.dev
    https://*.clerk.com
    https://*.convex.cloud
    wss://*.convex.cloud
    https://*.posthog.com
    https://us-assets.i.posthog.com
    https://*.supabase.co
    https://api.cloudflare.com;
  frame-src 'self' blob:
    https://*.clerk.com
    https://challenges.cloudflare.com
    https://www.youtube.com
    https://www.youtube-nocookie.com
    https://player.vimeo.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  worker-src 'self' blob:;
  child-src 'self' blob:;
  object-src 'none';
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    "/api/pdf/\\[id\\]": ["./docs/pdf/**/*"],
    "/api/admin/rag/\\[id\\]/bundle": [
      "./docs/pdf/**/*",
      "./docs/extracted/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/api/storage/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
export default nextConfig;
