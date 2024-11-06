export interface FreshContext<
  State = Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  Data = any,
> {
  request: Request;
  remoteAddr: Deno.NetAddr;
  url: URL;
  route: string;
  params: Record<string, string>;
  state: State;
  data: Data;
  render: (
    data?: Data,
    options?: RenderOptions,
  ) => Response | Promise<Response>;
  Component: ComponentType<unknown>;
  next: () => Promise<Response>;
}

export type MiddlewareHandler<State = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<State>,
) => Response | Promise<Response>;

export interface Middleware<State = Record<string, unknown>> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

// deno-lint-ignore no-explicit-any
export interface MiddlewareModule<State = any> {
  name?: string;
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

export interface PluginMiddleware<State = Record<string, unknown>> {
  /** A path in the format of a filename path without filetype */
  path: string;
  middleware: Middleware<State>;
}

export type FinalHandler = (
  req: Request,
  ctx: FreshContext,
) => {
  handler: () => Response | Promise<Response>;
};

export interface PluginMiddleware<State = Record<string, unknown>> {
  /** A path in the format of a filename path without filetype */
  path: string;
  middleware: Middleware<State>;
}

export interface PluginRoute<State = Record<string, unknown>> {
  /** A path in the format of a filename path without filetype */
  path: string;
  component?: any;
  handler?: Handler<any, State> | Handlers<any, State>;
}

export interface Plugin<State = Record<string, unknown>> {
  /** The name of the plugin. Must be snake-case. */
  name: string;
  entrypoints?: Record<string, string>;
  routes?: PluginRoute<State>[];
  middlewares?: PluginMiddleware<State>[];

  transformEnd?: (
    stream: ReadableStream | string,
  ) => (ReadableStream | string) | Promise<ReadableStream | string>;
}

// TODO:
type RenderFunction = Function;
type RouterOptions = any;
type ComponentType<T = any> = any;
type ComponentChildren<T = any> = any;
//

// deno-lint-ignore no-namespace
export namespace router {
  export const knownMethods = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH",
  ] as const;

  export type DestinationKind = "internal" | "static" | "route" | "notFound";
  export type KnownMethod = (typeof knownMethods)[number];
}

// deno-lint-ignore no-empty-interface
export interface RenderOptions extends ResponseInit {}

export interface ResolvedFreshConfig {
  dev: boolean;
  build: {
    outDir: string;
    target: string | string[];
  };
  render: RenderFunction;
  plugins: Plugin[];
  staticDir: string;
  router?: RouterOptions;
  server: Partial<Deno.ServeOptions>;
  basePath: string;
}

export type AsyncLayout<T = any, S = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<S, T>,
) => Promise<ComponentChildren | Response>;

export type Handler<T = any, State = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<State, T>,
) => Response | Promise<Response>;

export type Handlers<T = any, State = Record<string, unknown>> = {
  [K in router.KnownMethod]?: Handler<T, State>;
};

export interface RouteConfig {
  routeOverride?: string;
  csp?: boolean;
  skipInheritedLayouts?: boolean;
  skipAppWrapper?: boolean;
}

export interface Route<Data = any> {
  baseRoute: string;
  pattern: string;
  url: string;
  name: string;
  component?: PageComponent<Data> | AsyncLayout<Data> | AsyncRoute<Data>;
  handler: Handler<Data> | Handlers<Data>;
  csp: boolean;
  appWrapper: boolean;
  inheritLayouts: boolean;
}

export type AsyncRoute<T = any, S = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<S, T>,
) => Promise<ComponentChildren | Response>;

export type PageProps<T = any, S = Record<string, unknown>> = Omit<
  FreshContext<S, T>,
  "render" | "next" | "renderNotFound"
>;

export type VNode<T = any> = {
  type: T;
  props: any;
  key?: string | null | number | symbol;
};

export type PageComponent<T = any, S = Record<string, unknown>> =
  | ComponentType<PageProps<T, S>>
  | AsyncRoute<T, S>
  // deno-lint-ignore no-explicit-any
  | ((props: any) => VNode<any> | ComponentChildren);

export interface RouteModule {
  name?: string;
  default?: PageComponent<PageProps>;
  // deno-lint-ignore no-explicit-any
  handler?: Handler<any, any> | Handlers<any, any>;
  config?: RouteConfig;
}

export type RequestHandler<JSXElement extends VNode = VNode> = (
  req: Request,
  ctx: FreshContext<any, any>,
) => Promise<JSXElement | Response>;

export type PropHandler<JSXElement extends VNode = VNode> = (
  props: Record<string, unknown>,
) => Promise<JSXElement | Response>;

export type RenderPipe = <JSXElement extends VNode>(options: {
  responseInit?: ResponseInit;
  Layout?: {
    default: AsyncLayout<any, any>;
  };
  virtualNodePipe: (
    req: Request,
    ctx: FreshContext<{ virtualNode: VNode }>,
  ) => Promise<BodyInit | null | undefined | Response>;
}) => (route: Route) => {
  handler: (req: Request, ctx: FreshContext) => Promise<Response>;
};
