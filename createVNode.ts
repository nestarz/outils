import { DOMParser } from "https://esm.sh/linkedom";

let actions; // current actions to apply when walking the tree

const convert = (h, hook) => (node) => {
  if (node.nodeType === 3) return node.data;
  let attrs = {};
  for (let i = 0; i < node.attributes.length; i++) {
    const { name, value } = node.attributes[i];
    const m = name.match(/^(?:on:|data-on-?)(.+)$/); // <a on:click="go" data-on-mouseover="blink">
    if (m && actions[value]) attrs["on" + m[1]] = actions[value];
    else attrs[name] = value;
  }
  return (hook ?? h)?.(
    node.localName,
    attrs,
    [].map.call(node.childNodes, convert(h, hook))
  );
};

export default ({ h, html, mimeType = "text/html", hook }) => {
  const dom = new DOMParser().parseFromString(html ?? "", mimeType);
  actions = {};
  return [].map.call(dom.childNodes, convert(h, hook));
};
