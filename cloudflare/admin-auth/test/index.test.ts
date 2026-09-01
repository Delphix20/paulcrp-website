import { beforeAll, describe, expect, it, vi } from "vitest";

import { handleRequest } from "../src/auth";

const USERNAME = "paul";
const PASSWORD = "correct-horse-battery-staple";
const TOKEN = btoa(`${USERNAME}:${PASSWORD}`);
let testEnv: Env;

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

beforeAll(async () => {
  testEnv = { ADMIN_BASIC_AUTH_SHA256: await sha256Hex(TOKEN) };
});

function request(path: string, authorization?: string): Request {
  return new Request(`https://paulcrp.com${path}`, {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

describe("admin authentication Worker", () => {
  it("challenges unauthenticated protected requests without calling the origin", async () => {
    const originFetch = vi.fn<(request: Request) => Promise<Response>>();

    const response = await handleRequest(
      request("/youbecome_analytics"),
      testEnv,
      originFetch,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("Basic");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("rejects incorrect credentials", async () => {
    const originFetch = vi.fn<(request: Request) => Promise<Response>>();
    const wrongToken = btoa("paul:incorrect");

    const response = await handleRequest(
      request("/youbecome_content.html", `Basic ${wrongToken}`),
      testEnv,
      originFetch,
    );

    expect(response.status).toBe(401);
    expect(originFetch).not.toHaveBeenCalled();
  });

  it("forwards authenticated requests and never leaks credentials upstream", async () => {
    const originFetch = vi.fn(async (originRequest: Request) => {
      expect(originRequest.headers.has("Authorization")).toBe(false);
      return new Response("origin", { status: 200 });
    });

    const response = await handleRequest(
      request("/youbecome_content_renderer.js", `Basic ${TOKEN}`),
      testEnv,
      originFetch,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("origin");
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("passes unrelated paths through if a route is accidentally broadened", async () => {
    const originFetch = vi.fn(async () => new Response("public", { status: 200 }));

    const response = await handleRequest(request("/robots.txt"), testEnv, originFetch);

    expect(response.status).toBe(200);
    expect(originFetch).toHaveBeenCalledOnce();
  });

  it("fails closed when the configured digest is invalid", async () => {
    const originFetch = vi.fn<(request: Request) => Promise<Response>>();

    const response = await handleRequest(
      request("/youbecome_analytics", `Basic ${TOKEN}`),
      { ADMIN_BASIC_AUTH_SHA256: "invalid" },
      originFetch,
    );

    expect(response.status).toBe(401);
    expect(originFetch).not.toHaveBeenCalled();
  });
});
