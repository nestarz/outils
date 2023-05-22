export const obfuscateHOC =
  (h) =>
  ({ text, ...props }: { text: string }) =>
    text &&
    h(
      "span",
      { ...props, dir: "rtl", style: { "unicode-bidi": "bidi-override" } },
      String(text)
        .split("")
        .reverse()
        .flatMap((char: string) => [
          h(
            "em",
            { style: { display: "none" } },
            Math.random().toString(36).substring(7)
          ),
          h("span", null, char),
        ])
    );

export const atobClick = (node: HTMLElement, str: string) => {
  node.addEventListener("click", (ev: Event) => {
    ev.preventDefault();
    window.location.href = atob(str);
  });
};
