import parse from "@bureaudouble/html-parse-stringify/parse";
import { unescape } from "@std/html/entities";

interface Actions {
  [key: string]: (...args: any[]) => any;
}

type ConvertFunction = (
  h: (...args: any[]) => any,
  hook?: (...args: any[]) => any,
) => (node: any) => string | ReturnType<(...args: any[]) => any>;

let actions: Actions;

const convert: ConvertFunction = (h, hook) => (node) => {
  if (node.type === "text") return unescape(node.content) as string;

  const attrs: { [key: string]: string | Function } = {};
  for (const [name, value] of Object.entries(node.attrs || {})) {
    const m = name.match(/^(?:on:|data-on-?)(.+)$/);
    if (m && actions[value as string]) {
      attrs["on" + m[1]] = actions[value as string] as Function;
    } else attrs[name] = value as string;
  }

  return (hook ?? h)?.(
    node.name,
    attrs,
    (node.children || []).map(convert(h, hook)) as ReturnType<typeof h>[],
  );
};

export const createVirtualNode = (
  { h, html, hook }: {
    h: (...args: any[]) => any;
    html: string;
    hook?: (...args: any[]) => any;
  },
): any[] => {
  actions = {};
  const parsedHtml = parse(html ?? "");
  return parsedHtml.map(convert(h, hook)) as ReturnType<typeof h>[];
};

export default createVirtualNode;
