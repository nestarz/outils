import { lookup } from "mrmime";
import type { Plugin } from "./types.ts";

export const createStaticFilePlugin = (options: {
  baseUrl: string;
  headers?: HeadersInit;
  prefix?: string;
}): Plugin => ({
  name: "staticFilePlugin",
  middlewares: [
    {
      path: "GET@/static/*",
      middleware: {
        handler: async (req) => {
          const url = new URL(
            "." +
              decodeURIComponent(new URL(req.url).pathname).slice(
                options.prefix?.length
              ),
            options.baseUrl
          );
          const resp = await fetch(url).catch(() => null);
          const size = resp?.headers.get("content-length");
          return resp?.status === 200
            ? new Response(resp.body, {
                headers: {
                  "content-type": lookup(url.href)!,
                  ...(size ? { "content-length": String(size) } : {}),
                  "Access-Control-Allow-Credentials": "true",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods":
                    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
                  "Access-Control-Allow-Headers": "*",
                  "Cache-Control":
                    "public, max-age=604800, must-revalidate, immutable",
                  ...(options.headers ?? {}),
                },
              })
            : new Response(null, { status: 404 });
        },
      },
    },
  ],
});

export default createStaticFilePlugin;