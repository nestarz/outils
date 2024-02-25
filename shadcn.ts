import { walk } from "@std/fs/walk";

const regEscape = (str: string) =>
  str.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");

const checkExists = (filename: string) =>
  Deno.stat(filename)
    .then(() => true)
    .catch(() => false);

const open = async (filename: string, contents?: any) => {
  const exists = await checkExists(filename);
  if (!exists) {
    await Deno.writeTextFile(filename, JSON.stringify(contents ?? {}));
  }
  return {
    filename,
    close: () =>
      exists ? Promise.resolve(false) : Deno.remove(filename)
        .then(() => true)
        .catch(() => false),
    read: () => Deno.readTextFile(filename).then(JSON.parse),
  };
};

const denoConfig = await open("deno.json");
const denoConfigContent = await denoConfig.read();
const shadcnUiConfig = denoConfigContent["shadcn-ui"];
const componentsConfig = await open(
  "components.json",
  shadcnUiConfig.components,
);
const packageConfig = await open("package.json");
const packageLockConfig = await open("package-lock.json");
const tsconfig = await open("tsconfig.json", shadcnUiConfig);

const cmd = new Deno.Command("npx", {
  args: ["shadcn-ui@latest", ...Deno.args],
  stdout: "piped",
  stderr: "piped",
});

const childProcess = cmd.spawn();

await Promise.all(
  [
    { log: console.log, readableStream: childProcess.stdout },
    { log: console.error, readableStream: childProcess.stderr },
  ].map(async ({ readableStream, log }) => {
    for await (const chunk of readableStream) {
      log(new TextDecoder().decode(chunk));
    }
  }),
);

await Promise.all(
  Object.entries(denoConfigContent.imports)
    .filter(([key]) =>
      shadcnUiConfig.components.aliases.components.startsWith(key)
    )
    .map(([key, value]) =>
      shadcnUiConfig.components.aliases.components.replace(
        new RegExp(`^${key}`),
        value,
      )
    )
    .map(async (dir) => {
      const regEscaped = regEscape(
        shadcnUiConfig.components.aliases.components,
      );
      const regex = new RegExp(`from "(${regEscaped}/.*?)"`, "g");
      for await (
        const { path } of walk(dir, {
          exts: ["ts", "tsx"],
          includeDirs: false,
        })
      ) {
        console.log(path);
        const content = await Deno.readTextFile(path);
        await Deno.writeTextFile(
          path,
          content.replace(
            regex,
            (_, $1: string) =>
              `from "${$1.match(/\.ts(x|)$/) ? $1 : `${$1}.tsx`}"`,
          ),
        );
      }
    }),
);

const { dependencies } = await packageConfig.read();
const versions = Object.fromEntries(
  Object.entries(dependencies ?? {}).map(([key, version]) => [
    key,
    `npm:${key}@${version}`,
  ]),
);
await Deno.writeTextFile(
  denoConfig.filename,
  JSON.stringify(
    {
      ...denoConfigContent,
      imports: { ...denoConfigContent.imports, ...versions },
    },
    null,
    2,
  ),
);
tsconfig.close();
packageConfig
  .close()
  .then(async (has) =>
    has
      ? await Deno.remove("node_modules", { recursive: true }).catch(() =>
        false
      )
      : false
  );
packageLockConfig.close();
componentsConfig.close();
