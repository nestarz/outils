import { join } from "@std/path/join";
import { fromFileUrl } from "@std/path/from-file-url";
import { dirname } from "@std/path/dirname";
import { getHashSync } from "@bureaudouble/scripted";

type ConfigModule = { default: any; globalCss?: string };
type Import = (arg: string) => ConfigModule | Promise<ConfigModule>;
interface TailwindPlugin {
  namespace?: string;
  inline?: boolean;
  tailwindConfig:
    | ConfigModule
    | ((importNSA: Import) => ConfigModule | Promise<ConfigModule>);
  outDirectoryURL: string;
}

export interface TailwindPluginState<Namespace extends string = "default"> {
  tailwind: Record<Namespace, { id?: string; path?: string; css?: string }>;
}

export const createTailwindClient = async ({
  namespace,
  outDirectoryURL,
  tailwindConfig: getTailwindConfig,
}: TailwindPlugin): Promise<{
  getResponse: () => Promise<Response>;
  getOutput: () => Promise<{
    id: string | undefined;
    css: void | {
      text: string;
      snapshot: any;
    } | null;
  }>;
}> => {
  const outDirectoryNsURL = new URL(
    join(namespace ?? ".", "/"),
    outDirectoryURL,
  );
  const snapshotFileURL = new URL("./snapshot.json", outDirectoryNsURL);
  const withWritePermission: boolean =
    (await Deno.permissions.query({ name: "write", path: Deno.cwd() }))
      .state === "granted";

  let currhash = "";
  const update = async () => {
    if (withWritePermission && outDirectoryNsURL.protocol === "file:") {
      const importNSA: Import = (arg: string) => import("" + arg);
      const tailwindBuild: (tailwindConfig: ConfigModule) => Promise<string> = (
        await importNSA("./createTailwindBuild.ts")
      ).default;
      const tailwindConfig = typeof getTailwindConfig === "function"
        ? await getTailwindConfig(importNSA)
        : getTailwindConfig;
      const newCss = await tailwindBuild(tailwindConfig);
      const hash = getHashSync(newCss);

      const snapshot = await Deno.readTextFile(fromFileUrl(snapshotFileURL))
        .then(JSON.parse)
        .catch(() => null);

      if (currhash !== hash) {
        const fileURL = new URL(`${hash}.css`, snapshotFileURL);
        await Deno.mkdir(dirname(fromFileUrl(fileURL)), {
          recursive: true,
        }).catch(() => null);
        if (snapshot?.filename) {
          await Deno.remove(
            fromFileUrl(new URL(snapshot?.filename, snapshotFileURL)),
          ).catch(() => null);
        }
        console.log("[tailwind] write snapshot", snapshotFileURL.href);
        await Deno.writeTextFile(
          fromFileUrl(snapshotFileURL),
          JSON.stringify({ filename: `${hash}.css` }),
        );
        await Deno.writeTextFile(fromFileUrl(fileURL), newCss);
      }
      currhash = hash;
    }

    const css = await fetch(snapshotFileURL)
      .then((response) => response.json())
      .then((snapshot) =>
        fetch(new URL(snapshot.filename, snapshotFileURL))
          .then((response) => response.text())
          .then((text) => ({ text, snapshot }))
          .catch((v) =>
            console.error(new URL(snapshot.filename, snapshotFileURL), v)
          )
      )
      .catch((v) => console.error(snapshotFileURL, v))
      .catch(() => null);

    return css;
  };

  let promise = update();
  globalThis.addEventListener("hmr", () => {
    promise = update();
  });

  return {
    getResponse: async () =>
      new Response((await promise)?.text ?? "", {
        headers: {
          "content-type": "text/css",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "public, max-age=604800, must-revalidate, immutable",
        },
      }),
    getOutput: async () => {
      const css = await promise;
      return {
        snapshotFileURL,
        id: css?.snapshot.filename as string | undefined,
        css,
      };
    },
  };
};

export default createTailwindClient;
