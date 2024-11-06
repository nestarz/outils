import type { Plugin } from "./types.ts";
import { storeFunctionExecution } from "@bureaudouble/scripted";
import { join } from "@std/path/join";

export const createHmrPlugin = async (
  {
    hmrEventName = "hmr",
    basePath,
    path = "/__hmr",
    mode = "reload",
    clientHmrEventName = "hmr",
  }: {
    hmrEventName?: string;
    clientHmrEventName?: string;
    basePath?: string;
    path: string;
    mode: "event" | "reload";
  } = {
    hmrEventName: "hmr",
    clientHmrEventName: "hmr",
    path: "/__hmr",
    mode: "reload",
  },
): Promise<Plugin> => {
  const withWritePermission: boolean =
    (await Deno.permissions.query({ name: "write", path: Deno.cwd() }))
      .state === "granted";

  const hmrCallbacks: Map<number, () => void> = new Map();
  globalThis.addEventListener(hmrEventName ?? "hmr", () => {
    [...hmrCallbacks.values()].forEach((fn) => fn());
  });

  return {
    name: "hmrPlugin",
    middlewares: [
      {
        path,
        middleware: {
          handler: (_req, ctx) => {
            if (withWritePermission) {
              storeFunctionExecution(
                (
                  path: string,
                  mode: "event" | "reload",
                  eventName: string,
                ) => {
                  let eventSource: EventSource;
                  const connect = () => {
                    eventSource = new EventSource(path);
                    eventSource.addEventListener(
                      "error",
                      () => eventSource.close(),
                    );
                    eventSource.addEventListener(
                      "message",
                      () =>
                        mode === "event"
                          ? globalThis.dispatchEvent(new CustomEvent(eventName))
                          : globalThis.location?.reload(),
                    );
                  };
                  connect();
                  let reconnecting = false;
                  setInterval(() => {
                    if (eventSource?.readyState == EventSource.CLOSED) {
                      reconnecting = true;
                      console.log("[hmr] reconnecting...");
                      connect();
                    } else if (reconnecting) {
                      reconnecting = false;
                      console.log("[hmr] reconnected!");
                    }
                  }, 3000);
                },
                join(basePath ?? "", path),
                mode,
                clientHmrEventName ?? "hmr",
              );
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
