import { storeFunctionExecution } from "scripted";
import type { RouteConfig } from "./createRenderPipe.ts";
import type { MiddlewareHandler } from "./fresh/middleware.ts";

export const config: RouteConfig["config"] = {
  routeOverride: "/_hmr",
};

const withWritePermission: boolean =
  (await Deno.permissions.query({ name: "write", path: Deno.cwd() })).state ===
  "granted";

export const middleware: MiddlewareHandler = (_req, ctx) => {
  if (withWritePermission) {
    storeFunctionExecution(() => {
      new EventSource("/_hmr").addEventListener("message", () =>
        globalThis.location?.reload()
      );
    });
  }
  return ctx.next();
};

export const createHandler = ({
  hmrEventName,
}: { hmrEventName?: string } = {}): (() => Response) => {
  const hmrCallbacks: Map<number, () => void> = new Map();
  globalThis.addEventListener(hmrEventName ?? "hmr", () => {
    [...hmrCallbacks.values()].forEach((fn) => fn());
    hmrCallbacks.clear();
  });

  return () => {
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
      headers: {
        "Content-Type": "text/event-stream",
      },
    });
  };
};
