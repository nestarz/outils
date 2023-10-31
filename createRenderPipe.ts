import type { defineLayout } from "$fresh/src/server/defines.ts";
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
    config?: {
      responseInit?: ResponseInit;
      Layout?: { default: ReturnType<typeof defineLayout> };
    }
  ) =>
  (req: Request, ctx: HandlerContext, matcher?: Record<string, string>) => {
    const url = new URL(req.url);
    const newCtx = matcher ? { ...ctx, params: matcher, url } : { ...ctx, url };
    const props = { url, ctx: newCtx };

    const vNodePipe = pipe(
      firstFn,
      ...fns as any[],
      (result: Response | BodyInit | null) =>
        result instanceof Response
          ? result
          : new Response(result, {
              headers: {
                "content-type": "text/html; charset=utf-8",
              },
              ...(config?.responseInit ?? {}),
            })
    );

  const render = route.default
    ? pipe(
      (data: unknown) =>
        route.handler?.GET ? [{ ...props, data }] : [req, newCtx],
      ([p1, p2]) =>
        Promise.resolve().then(() => route.default?.(p1, p2))
          .catch((err) => (console.error(err), Promise.reject(err))),
      (node) => [node, { ...newCtx, Component: () => node }],
      ([node, ctx]) =>
        node instanceof Response ? node : vNodePipe(
          Promise.resolve().then(() => config?.Layout?.default(req, ctx)).catch(
            (err) => (console.error(err), Promise.reject(err)),
          ) ?? node,
        ),
    )
    : undefined;
    
    return (
      route.handler?.[req.method]?.(req, { ...newCtx, render, vNodePipe }) ??
      (req.method === "GET" ? render?.() : new Response(null, { status: 404 }))
    );
  };

export default createRenderPipe;
