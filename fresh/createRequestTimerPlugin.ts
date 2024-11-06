import type { Plugin } from "./types.ts";

let reqIndex = 0;
export const createRequestTimerPlugin = (options?: {
  namespace?: string;
}): Plugin => ({
  name: "requestTimerPlugin",
  middlewares: [{
    path: null!,
    middleware: {
      handler: (req, ctx) => {
        const id = `[request-timer:${reqIndex++}${
          options?.namespace ?? ""
        }] ${req.method} ${req.url}`;
        console.time(id);
        return ctx.next().finally(() => {
          console.timeEnd(id);
        });
      },
    },
  }],
});

export default createRequestTimerPlugin;
