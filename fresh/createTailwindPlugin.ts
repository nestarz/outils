import type { Plugin } from "./types.ts";
import type { Config } from "tailwindcss";
import { join } from "@std/path/join";

type ConfigModule = { default: Config; globalCss?: string };
interface TailwindPlugin {
  basePath?: string;
  baseUrl: string;
  tailwindConfig: ConfigModule | (() => ConfigModule | Promise<ConfigModule>);
  outDirectory?: string;
}

export const createTailwindPlugin = async ({
  basePath,
  baseUrl,
  outDirectory,
  tailwindConfig: getTailwindConfig,
}: TailwindPlugin): Promise<Plugin> => {
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

  const update = async () => {
    if (withWritePermission && baseUrl.startsWith("file://")) {
      const postcss = (await import("postcss")).default;
      const cssnano = (await import("cssnano")).default;
      const autoprefixer = (await import("autoprefixer")).default;
      const tailwindCss = (await import("tailwindcss")).default;
      const { getHashSync } = await import("@bureaudouble/scripted");
      const tailwindConfig = typeof getTailwindConfig === "function"
        ? await getTailwindConfig()
        : getTailwindConfig;
      const newCss = await postcss([
        tailwindCss(tailwindConfig.default) as any,
        cssnano(),
        autoprefixer(),
      ])
        .process(tailwindConfig.globalCss ?? "", { from: undefined })
        .then((v) => v.css);
      const hash = getHashSync(newCss);
      const filename = getPrefix(`${hash}.css`);
      await Deno.remove(getPrefix(""), { recursive: true }).catch(() => null);
      await Deno.mkdir(getPrefix(""), { recursive: true });
      await Deno.writeTextFile(
        getPrefix("snapshot.json"),
        JSON.stringify({ filename: `${hash}.css` }),
      );
      await Deno.writeTextFile(filename, newCss);
    }
    const cssText = await fetch(getPrefix("snapshot.json"))
      .then((response) => response.json())
      .then((snapshot) => fetch(getPrefix(snapshot.filename)))
      .then((response) => response.text())
      .catch(console.error)
      .catch(() => null);

    return cssText;
  };

  let promise = update();
  globalThis.addEventListener("hmr", () => {
    promise = update();
  });

  return {
    name: "tailwindPlugin",
    transformEnd: async (stream) => {
      const string = await new Response(stream).text();
      const cssText = await promise;
      return string.replace(
        string.includes("</head>") ? /(<\/head>)/ : /(.*)/,
        (_, $1) => (cssText ? `<style tailwind>${cssText}</style>${$1}` : $1),
      );
    },
  };
};

export default createTailwindPlugin;
