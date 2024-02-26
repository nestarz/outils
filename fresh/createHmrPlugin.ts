import { storeFunctionExecution } from "@bureaudouble/scripted";
import type { Plugin } from "./types.ts";

export const createHmrPlugin = async (
  { hmrEventName, path = "/_hmr" }: { hmrEventName?: string; path: string } = {
    path: "/_hmr",
  }
): Promise<Plugin> => {
  const withWritePermission: boolean =
    (await Deno.permissions.query({ name: "write", path: Deno.cwd() }))
      .state === "granted";

  const hmrCallbacks: Map<number, () => void> = new Map();
  globalThis.addEventListener(hmrEventName ?? "hmr", () => {
    [...hmrCallbacks.values()].forEach((fn) => fn());
    hmrCallbacks.clear();
  });

  return {
    name: "hmrPlugin",
    middlewares: [
      {
        path,
        middleware: {
          handler: (_req, ctx) => {
            if (withWritePermission) {
              storeFunctionExecution(() => {
                new EventSource(path).addEventListener("message", () =>
                  globalThis.location?.reload()
                );
              });
            }
            return ctx.next();
          },
        },
      },
    ],
    routes: [
      {
        path,
        handler: () => {
          if (!withWritePermission) return new Response(null, { status: 404 });

          const id = Math.random();
          const reloadString = new TextEncoder().encode("data: reload\r\n\r\n");
          const body = new ReadableStream({
            start(controller) {
              hmrCallbacks.set(id, () => void controller.enqueue(reloadString));
            },
            cancel() {
              hmrCallbacks.delete(id);
            },
          });
          return new Response(body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        },
      },
    ],
  };
};

export default createHmrPlugin;
