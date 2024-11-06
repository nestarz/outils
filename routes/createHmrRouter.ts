import {
  collectAndCleanScripts,
  storeFunctionExecution,
} from "@bureaudouble/scripted";
import { join } from "@std/path/join";
import { createRouter, type Router } from "@fartlabs/rt";
import { dirname } from "@std/path/dirname";

export const hmrGranted: boolean =
  (await Deno.permissions.query({ name: "write", path: Deno.cwd() })).state ===
    "granted";

const DEFAULTS: {
  eventName?: string;
  name?: string;
  mode: "event" | "reload";
  basePath?: string;
} = { eventName: "hmr", mode: "reload" };

export const getHmrScriptPath: (basePath?: string) => string | null = (
  basePath,
) => (hmrGranted ? join(basePath ?? "/", "__hmr", "hmr.js") : null);

interface Hmr {
  trigger: () => void;
  router: Router<unknown>;
}

export const createHmr = ({
  basePath,
  name,
  mode = "reload",
  eventName = "hmr",
} = DEFAULTS): Hmr => {
  const hmrCallbacks: Map<number, () => void> = new Map();
  const trigger = () => [...hmrCallbacks.values()].forEach((fn) => fn());
  const scriptPath = getHmrScriptPath(basePath);
  const ssePath = scriptPath ? dirname(scriptPath) : null;
  if (name) globalThis.addEventListener(name, trigger);

  return {
    trigger,
    router: !hmrGranted || !ssePath || !scriptPath
      ? createRouter()
      : createRouter()
        .get(ssePath, () => {
          if (!hmrGranted) return new Response(null, { status: 404 });

          const id = Math.random();
          const reloadString = new TextEncoder().encode(
            "data: reload\r\n\r\n",
          );
          const body = new ReadableStream({
            start(controller) {
              hmrCallbacks.set(
                id,
                () => void controller.enqueue(reloadString),
              );
            },
            cancel() {
              hmrCallbacks.delete(id);
            },
          });
          return new Response(body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        })
        .get(
          scriptPath,
          () =>
            new Response(
              (storeFunctionExecution(
                (
                  path: string,
                  mode: "event" | "reload",
                  eventName: string,
                ) => {
                  let eventSource: EventSource;
                  const connect = () => {
                    eventSource = new EventSource(path);
                    eventSource.addEventListener(
                      "open",
                      () => console.log("[hmr] open"),
                    );
                    eventSource.addEventListener(
                      "error",
                      () => eventSource.close(),
                    );
                    eventSource.addEventListener("message", () => {
                      console.log("[hmr] dispatch event", eventName);
                      mode === "event"
                        ? globalThis.dispatchEvent(
                          new CustomEvent(eventName),
                        )
                        : globalThis.location?.reload();
                    });
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
                ssePath,
                mode,
                eventName ?? "hmr",
              ),
                collectAndCleanScripts()),
              { headers: { "Content-Type": "text/javascript" } },
            ),
        ),
  };
};

export default createHmr;
