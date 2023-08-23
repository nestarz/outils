import type { RouteConfig } from "https://deno.land/x/fresh@1.4.2/server.ts";
import { lookup } from "https://deno.land/x/mrmime@v1.0.1/mod.ts";

export const config: RouteConfig = {
  routeOverride: "GET@/static/*",
};

export const createHandler =
  (options: { baseUrl: string; headers?: Record<string, string> }) =>
  async (req: Request) => {
    const url = new URL(
      "." + decodeURIComponent(new URL(req.url).pathname),
      options.baseUrl
    );
    const resp = await fetch(url);
    const size = resp?.headers.get("content-length");
    return resp.status === 200
      ? new Response(resp.body, {
          headers: {
            "content-type": lookup(url.href),
            ...(size ? { "content-length": String(size) } : {}),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control":
              "public, max-age=604800, must-revalidate, immutable",
            ...(options.headers ?? {}),
          },
        })
      : new Response(null, { status: 404 });
  };
