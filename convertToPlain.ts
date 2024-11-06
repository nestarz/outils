import parse from "@bureaudouble/html-parse-stringify/parse";
import { unescape } from "@std/html/entities";

interface Node {
  type: "text" | "tag";
  content?: string;
  voidElement?: boolean;
  children?: Node[];
  name?: string;
}

type Parse = (arg: string) => Node[];

// List of inline elements that shouldn't add spaces
const inlineElements = new Set([
  'span', 'a', 'strong', 'em', 'b', 'i', 'u', 'small', 'sub', 'sup',
  'mark', 'del', 'ins', 'code', 'kbd', 'samp', 'var', 'time', 'cite',
  'dfn', 'abbr', 'data', 'q', 'label'
]);

const extractContent = (node: Node, isLastNode: boolean = false): string => {
  if (node.type === "text") {
    return node.content ?? "";
  }
  
  if (node.type === "tag") {
    if (node.voidElement) {
      return "";
    }
    
    const content = node.children?.map((child, index) => 
      extractContent(child, index === (node.children?.length ?? 0) - 1)
    ).join("") ?? "";
    
    if (!isLastNode && node.name && !inlineElements.has(node.name)) {
      return content + " ";
    }
    
    return content;
  }
  
  return "";
};

export const convertToPlain = (obj: any): string | null => {
  const innerHTML = typeof obj === "string"
    ? obj
    : String(obj).length > 0
    ? JSON.stringify(obj)
    : null;

  if (typeof innerHTML === "string" && innerHTML?.trim()) {
    if (globalThis.document) {
      return Object.assign(globalThis.document.createElement("fragment"), {
        innerHTML,
      }).textContent;
    } else {
      const parsedHtml = (parse as Parse)(innerHTML);
      return unescape!(
        parsedHtml.map((node, index) => 
          extractContent(node, index === parsedHtml.length - 1)
        ).join("")
      ).trim();
    }
  }

  return "";
};

export default convertToPlain;