import type {
  HandlerContext,
  Handlers,
} from "https://deno.land/x/fresh@1.4.2/server.ts";
import { pipe } from "./pipe.ts";

type PipelineFunction<In, Out> = (arg: In) => Out | Promise<Out>;

export const createRenderPipe =
  <
    First extends <T>(vnode: T) => any | Promise<any>,
    Middle extends PipelineFunction<any, any>[],
    Last extends PipelineFunction<
      any,
      BodyInit | null | Promise<BodyInit | null>
    >
  >(
    firstFn: First,
    ...fns: [...Middle, Last]
  ) =>
  (
    route: {
      default: (<T>(props: Record<string, unknown>) => T) | Handlers["GET"];
      handler: Handlers;
      config?: { routeOverride?: string };
    },
    config?: { responseInit?: ResponseInit }
  ) =>
  (req: Request, ctx: HandlerContext, matcher?: Record<string, string>) => {
    const url = new URL(req.url);
    const newCtx = matcher ? { ...ctx, params: matcher, url } : { ...ctx, url };
    const props = { url, ctx: newCtx };
    const render = route.default
      ? pipe(
          (data: unknown) =>
            route.handler?.GET ? [{ ...props, data }] : [req, newCtx],
          ([p1, p2]) => route.default?.(p1, p2),
          firstFn,
          ...fns,
          (body: BodyInit | null) =>
            new Response(body, {
              headers: { "content-type": "text/html; charset=utf-8" },
              ...(config?.responseInit ?? {}),
            })
        )
      : undefined;
    return (
      route.handler?.[req.method]?.(req, { ...newCtx, render }) ??
      (req.method === "GET" ? render?.() : new Response(null, { status: 404 }))
    );
  };

export default createRenderPipe;
