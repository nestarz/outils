import type { MiddlewareHandler, RouteConfig } from "https://deno.land/x/fresh@1.5.2/server.ts";
import { storeFunctionExecution } from "https://deno.land/x/scripted@0.0.3/mod.ts";

export const config: RouteConfig = {
  routeOverride: "/_hmr",
};

const withWritePermission =
  (await Deno.permissions.query({ name: "write", path: Deno.cwd() }))
    .state === "granted";

export const middleware: MiddlewareHandler = (_req, ctx) => {
  if (withWritePermission) {
    storeFunctionExecution(() => {
      new EventSource("/_hmr").addEventListener(
        "message",
        () => globalThis.location?.reload(),
      );
    });
  }
  return ctx.next();
};

export const createHandler = (
  { hmrEventName }: { hmrEventName?: string } = {},
) => {
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
