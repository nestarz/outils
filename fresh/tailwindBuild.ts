import postcss from "postcss";
import cssnanoPlugin from "cssnano";
import autoprefixer from "autoprefixer";
import tailwindcss, { type Config } from "tailwindcss";

export default async (
  tailwindConfig: { default: Config; globalCss: string },
) => {
  return await postcss([
    tailwindcss(tailwindConfig.default),
    cssnanoPlugin(),
    autoprefixer(),
  ])
    .process(tailwindConfig.globalCss ?? "", { from: undefined })
    .then((v: { css: string }) => v.css);
};
