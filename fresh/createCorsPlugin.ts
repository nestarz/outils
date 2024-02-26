import type { Plugin } from "./types.ts";

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export const createCorsPlugin = ({
  hostnames,
}: {
  hostnames?: string[];
}): Plugin => {
  return {
    name: "corsPlugin",
    middlewares: [
      {
        path: "/",
        middleware: {
          handler: (req, ctx) => {
            const isOptions = req.method === "OPTIONS";
            const origin = req.headers.get("Origin")
              ? new URL(req.headers.get("Origin")!)
              : null;
            const allowedOrigin = hostnames
              ? origin?.hostname.match(/^localhost$/) ||
                  ((origin?.hostname.endsWith("." + hostnames[0]) ||
                    origin?.hostname === hostnames[0]) &&
                    origin?.hostname.match(
                      new RegExp(`(\\.|^)${escapeRegExp(hostnames[0])}$`),
                    ))
                ? origin.origin
                : null
              : origin?.origin;
            const reqHeaders = (
              req.headers.get("Access-Control-Request-Headers") ?? ""
            ).split(",");
            return Promise.resolve(
              isOptions ? new Response() : ctx.next(),
            )
              .catch(() => new Response(null, { status: 500 }))
              .then((res) =>
                Object.entries({
                  Vary: "Origin",
                  "Access-Control-Allow-Headers": [
                    ...new Set(["Authorization", ...reqHeaders]),
                  ],
                  "Access-Control-Allow-Credentials": true,
                  "Access-Control-Allow-Origin": allowedOrigin,
                  "Access-Control-Allow-Methods":
                    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
                }).reduce((prev, [key, value]) => {
                  if (
                    typeof prev === "object" &&
                    prev &&
                    "headers" in prev &&
                    value
                  ) {
                    prev.headers.set(key, String(value));
                  }
                  return prev;
                }, res)
              );
          },
        },
      },
    ],
  };
};

export default createCorsPlugin;
