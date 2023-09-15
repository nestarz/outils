export const generateAutomatedRoutes = async (
  walkGenerator: AsyncGenerator<{ path: string }>,
  options: { baseUrl: string; routePath: string }
) => {
  const routePath = options?.routePath ?? Deno.cwd().concat("/routes.ts");
  const automatedRoutePaths = [];
  for await (const iterator of walkGenerator)
    automatedRoutePaths.push(`./${iterator.path}`);
  const prevRoutes = (await import(routePath).catch(() => null)) as {
    routes:
      | {
          module: { default: Function; config: { routeOverride: string } };
          path: string;
        }[]
      | null;
  };
  const needUpdate = automatedRoutePaths.some(
    (path) => !prevRoutes?.routes?.some((v) => v.path === path)
  );
  const withWriteAccess = await Deno.permissions
    .query({ name: "write", path: Deno.cwd() })
    .then((d) => d.state === "granted");
  if (needUpdate && withWriteAccess)
    await Deno.writeTextFile(
      routePath,
      `export const routes = [\n${automatedRoutePaths
        .map((v) => JSON.stringify(v))
        .map((path) => `\t{ "module": await import(${path}), "path": ${path} }`)
        .join(",\n")}\n];`
    );
  return (prevRoutes?.routes ?? [])
    .map((route) => route.module)
    .filter((v) => v.config);
};

export default generateAutomatedRoutes;
