const PROTECTED_PATH_PREFIXES = [
  "/youbecome_analytics",
  "/youbecome_content",
] as const;

export const UNAUTHORIZED_HEADERS = {
  "Cache-Control": "no-store, private, max-age=0",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Content-Type": "text/plain; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "WWW-Authenticate": 'Basic realm="Paul CRP Admin", charset="UTF-8"',
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
} as const;

type OriginFetch = (request: Request) => Promise<Response>;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function unauthorized(): Response {
  return new Response("Authentication required.\n", {
    status: 401,
    headers: UNAUTHORIZED_HEADERS,
  });
}

function stripAuthorization(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete("Authorization");
  return new Request(request, { headers });
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function hasValidAuthorization(
  authorization: string | null,
  expectedDigestHex: string,
): Promise<boolean> {
  if (!authorization) {
    return false;
  }

  const match = /^Basic\s+([^\s]+)$/i.exec(authorization);
  const expectedDigest = hexToBytes(expectedDigestHex);
  if (!match || !expectedDigest) {
    return false;
  }

  const suppliedDigest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(match[1])),
  );
  return crypto.subtle.timingSafeEqual(suppliedDigest, expectedDigest);
}

export async function handleRequest(
  request: Request,
  env: Env,
  originFetch: OriginFetch = fetch,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  if (
    isProtectedPath(pathname) &&
    !(await hasValidAuthorization(
      request.headers.get("Authorization"),
      env.ADMIN_BASIC_AUTH_SHA256,
    ))
  ) {
    console.log(
      JSON.stringify({
        event: "admin_auth_denied",
        method: request.method,
        pathname,
      }),
    );
    return unauthorized();
  }

  return originFetch(stripAuthorization(request));
}
