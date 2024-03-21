interface Actions {
  [key: string]: (...args: any[]) => any;
}

type ConvertFunction = (
  h: (...args: any[]) => any,
  hook?: (...args: any[]) => any,
) => (node: any) => string | ReturnType<(...args: any[]) => any>;

const DOMParser = globalThis.DOMParser ??
  await import("@bureaudouble/deno-dom").then((r) => r.DOMParser) as DOMParser;

let actions: Actions; // current actions to apply when walking the tree

const convert: ConvertFunction = (h, hook) => (node) => {
  if (node.nodeType === 3) return node.data as string;
  let attrs: { [key: string]: string | Function } = {};
  for (let i = 0; i < node.attributes.length; i++) {
    const { name, value } = node.attributes[i];
    const m = name.match(/^(?:on:|data-on-?)(.+)$/);
    if (m && actions[value]) attrs["on" + m[1]] = actions[value] as Function;
    else attrs[name] = value as string;
  }
  return (hook ?? h)?.(
    node.localName,
    attrs,
    Array.from(node.childNodes).map(convert(h, hook)) as ReturnType<typeof h>[],
  );
};

export const createVirtualNode = (
  { h, html, mimeType = "text/html", hook }: {
    h: (...args: any[]) => any;
    html: string;
    mimeType?: DOMParserSupportedType;
    hook?: (...args: any[]) => any;
  },
): any[] => {
  const dom: Document = new DOMParser().parseFromString(html ?? "", mimeType);
  actions = {};
  return Array.from(dom.childNodes).map(convert(h, hook)) as ReturnType<
    typeof h
  >[];
};

export default createVirtualNode;
