import { type TwindConfig, defineConfig, install, observe } from "https://esm.sh/@twind/core@1.1.3";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.4";
import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.7";
import presetTypography from "https://esm.sh/@twind/preset-typography@1.0.7";
import presetLineClamp from "https://esm.sh/@twind/preset-line-clamp@1.0.7";

export default {
  ...defineConfig({
    hash: true,
    presets: [
      presetAutoprefix(),
      presetTailwind(),
      presetTypography(),
      presetLineClamp(),
    ],
    preflight: {
      ".scrollbar-hide": {
        "-ms-overflow-style": "none",
        "scrollbar-width": "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
      },
      "@font-face": [
        {
          fontFamily: '"Remix Icon"',
          src: `url("${"/static/assets/fonts/RemixIcon/remixicon.woff2"}") format("woff2")`,
          fontStyle: "normal",
          fontDisplay: "swap",
        },
      ],
    },
    theme: {
      fontFamily: {
        icon: ['"Remix Icon"', "Arial"],
      },
    },
  }),
  selfURL: import.meta.url,
};

let done = false;
export const twind = (twindOptions: TwindConfig) => {
  if (done) return;
  done = true;
  const tw = install(twindOptions);
  observe(tw);
};
