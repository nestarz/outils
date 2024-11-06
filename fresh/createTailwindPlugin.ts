import type { Plugin } from "./types.ts";
import { join } from "@std/path/join";
import { getHashSync } from "@bureaudouble/scripted";

type ConfigModule = { default: any; globalCss?: string };
type Import = (arg: string) => ConfigModule | Promise<ConfigModule>;
interface TailwindPlugin {
  inline?: boolean;
  basePath?: string;
  namespace?: string | "default";
  baseUrl: string;
  tailwindConfig:
    | ConfigModule
    | ((importNSA: Import) => ConfigModule | Promise<ConfigModule>);
  outDirectory?: string;
}

export interface TailwindPluginState<
  Namespace extends string = "default",
> {
  tailwind: Record<Namespace, { id?: string; path?: string; css?: string }>;
}

export const createTailwindPlugin = async ({
  basePath,
  baseUrl,
  outDirectory,
  inline,
  namespace: namespace_,
  tailwindConfig: getTailwindConfig,
}: TailwindPlugin): Promise<Plugin<TailwindPluginState>> => {
  const namespace = namespace_ ?? "default";
  const withWritePermission: boolean =
    (await Deno.permissions.query({ name: "write", path: Deno.cwd() }))
      .state === "granted";

  const getPrefixFn = (basePath?: string) => (key: string) => {
    const path = join(
      outDirectory ?? ".build",
      basePath ?? "",
      "tailwindcss",
      key,
    );
    return new URL(join(baseUrl, "./".concat(path)));
  };
  const getPrefix = getPrefixFn(basePath);

  let currhash = "";
  const update = async () => {
    if (withWritePermission && baseUrl.startsWith("file://")) {
      const importNSA: Import = (arg: string) => import("" + arg);
      const tailwindBuild: (tailwindConfig: ConfigModule) => Promise<string> = (
        await importNSA("./tailwindBuild.ts")
      ).default;
      const tailwindConfig = typeof getTailwindConfig === "function"
        ? await getTailwindConfig(importNSA)
        : getTailwindConfig;
      const newCss = await tailwindBuild(tailwindConfig);
      const hash = getHashSync(newCss);
      if (currhash !== hash) {
        const filename = getPrefix(`${hash}.css`);
        await Deno.remove(getPrefix(""), { recursive: true }).catch(() => null);
        await Deno.mkdir(getPrefix(""), { recursive: true });
        await Deno.writeTextFile(
          getPrefix("snapshot.json"),
          JSON.stringify({ filename: `${hash}.css` }),
        );
        await Deno.writeTextFile(filename, newCss);
      }
      currhash = hash;
    }
    const css = await fetch(getPrefix("snapshot.json"))
      .then((response) => response.json())
      .then((snapshot) =>
        fetch(getPrefix(snapshot.filename))
          .then((response) => response.text())
          .then((text) => ({ text, snapshot }))
      )
      .catch(console.error)
      .catch(() => null);

    return css;
  };

  let promise = update();
  globalThis.addEventListener("hmr", () => {
    promise = update();
  });

  return {
    name: "tailwindPlugin",
    routes: [
      {
        path: "GET@/styles/:id",
        handler: async () => {
          const css = await promise;
          return new Response(css?.text ?? "", {
            headers: {
              "content-type": "text/css",
              "Access-Control-Allow-Credentials": "true",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods":
                "GET,OPTIONS,PATCH,DELETE,POST,PUT",
              "Access-Control-Allow-Headers": "*",
              "Cache-Control":
                "public, max-age=604800, must-revalidate, immutable",
            },
          });
        },
      },
    ],
    middlewares: [{
      path: "",
      middleware: {
        handler: async (_req, ctx) => {
          const css = await promise;
          ctx.state.tailwind = {
            ...ctx.state.tailwind ?? {},
            [namespace]: {
              id: (css?.snapshot.filename as string | undefined),
              path: `${basePath ?? ""}/styles/${css?.snapshot.filename}`,
              css,
            },
          };
          return ctx.next();
        },
      },
    }],
    transformEnd: async (stream) => {
      const string = await new Response(stream).text();
      const css = await promise;
      return string.replace(
        string.includes("</head>") ? /(<\/head>)/ : /(.*)/,
        (_, $1) =>
          css
            ? inline
              ? `<style tailwind>${css.text}</style>${$1}`
              : `<link rel="stylesheet" href="${
                basePath ?? ""
              }/styles/${css.snapshot.filename}">${$1}`
            : $1,
      );
    },
  };
};

export default createTailwindPlugin;
