import type { Plugin } from "./types.ts";
import { join } from "@std/path/join";
import { getHashSync } from "@bureaudouble/scripted";

type ConfigModule = { default: any; globalCss?: string };
type Import = (
  arg: string,
) => ConfigModule | Promise<ConfigModule>;
interface TailwindPlugin {
  basePath?: string;
  baseUrl: string;
  tailwindConfig:
    | ConfigModule
    | ((importNSA: Import) => ConfigModule | Promise<ConfigModule>);
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
      const importNSA: Import = (arg: string) => import("" + arg);
      const tailwindBuild: (tailwindConfig: ConfigModule) => Promise<string> =
        (await importNSA("jsr:@bureaudouble/outils/fresh/tailwindBuild.ts")).default;
      const tailwindConfig = typeof getTailwindConfig === "function"
        ? await getTailwindConfig(importNSA)
        : getTailwindConfig;
      const newCss = await tailwindBuild(tailwindConfig);
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
