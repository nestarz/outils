import postcss from "postcss";
import cssnanoPlugin from "cssnano";
import autoprefixer from "autoprefixer";
import tailwindcss, { type Config } from "tailwindcss";

export default async (
  tailwindConfig: { default: Config; globalCss: string },
): Promise<string> => {
  return await (postcss as any)([
    tailwindcss(tailwindConfig.default) as any,
    cssnanoPlugin() as any,
    autoprefixer() as any,
  ])
    .process(tailwindConfig.globalCss ?? "", { from: undefined })
    .then((v: { css: string }) => v.css);
};
