import { walk } from "https://deno.land/std@0.216.0/fs/mod.ts";

async function updateDenoJsonExports() {
  const filePaths: string[] = [];
  for await (
    const entry of walk(Deno.cwd(), {
      includeDirs: false,
      exts: ["ts", "js"],
    })
  ) {
    filePaths.push(entry.path.replace(/\\/g, "/")); // Normalize path for Windows
  }

  const exports: Record<string, string> = {};
  filePaths.forEach((path) => {
    const value = "./" + path.replace(Deno.cwd().replace(/\\/g, "/") + "/", "");
    const key = "./" +
      path.slice(0, -3).replace(Deno.cwd().replace(/\\/g, "/") + "/", "");
    exports[key.replace("@", "_")] = value;
    exports[value.replace("@", "_")] = value;
  });

  let denoConfig: any = {};
  const configPath = "deno.json";
  try {
    denoConfig = JSON.parse(await Deno.readTextFile(configPath));
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error; // Ignore file not found to create a new one
  }

  denoConfig.exports = exports;

  await Deno.writeTextFile(configPath, JSON.stringify(denoConfig, null, 2));
}

await updateDenoJsonExports();
