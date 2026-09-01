import { handleRequest, UNAUTHORIZED_HEADERS } from "./auth";

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "admin_auth_error",
          error: error instanceof Error ? error.message : "Unknown error",
          pathname: new URL(request.url).pathname,
        }),
      );
      return new Response("Service temporarily unavailable.\n", {
        status: 503,
        headers: {
          ...UNAUTHORIZED_HEADERS,
          "Retry-After": "60",
        },
      });
    }
  },
} satisfies ExportedHandler<Env>;
