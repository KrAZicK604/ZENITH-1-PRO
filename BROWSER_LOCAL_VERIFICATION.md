# Stage 10.2 — local browser and source-policy verification

Status: LOCAL_STATIC_PASS; DEPLOYED_HTTP_HEADERS_UNVERIFIED; PAPER_ONLY; PROMOTION_BLOCKED.

The tested HTML and Vercel config were fetched from the isolated branch via the
connected GitHub tool and independently byte-matched against the Git blob SHA-1
using git hash-object before Chromium execution.

- public/index.html Git blob: 0cd97b51483ffb9926015b479658f2f2f08864aa
- vercel.json Git blob: f5ccd42de942d1dd83c30c6d53fcef624b9119e0
- Browser: locally available headless Chromium via Playwright.
- Desktop 1440x900: 2 Stripe CTAs, 1440 document scroll width, 0 JS page errors.
- Mobile 390x844: 2 Stripe CTAs, 390 document scroll width, 0 JS page errors.
- Narrow 320x568: 2 Stripe CTAs, 320 document scroll width, 0 JS page errors.
- Each viewport displayed the Mars Race enrollment hold notice.
- The Vercel configuration source retains CSP default-src 'none',
  frame-ancestors 'none', X-Frame-Options DENY and disabled payment capability.
- No payment or outbound checkout navigation was executed.

**Limitations:** A local HTTP navigation returned
net::ERR_BLOCKED_BY_ADMINISTRATOR. The passing browser exercise used
page.set_content, which does NOT enforce the configured HTTP response headers.
Therefore, actual CSP enforcement, response headers from Vercel, deployed
routing and production browser compatibility remain UNVERIFIED. The local
source layout is not a VR renderer test. The host clock is UNATTESTED.
