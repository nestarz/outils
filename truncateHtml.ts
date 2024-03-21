const document: Document = (globalThis.document as Document) ??
  (await import("@bureaudouble/deno-dom").then(({ DOMParser }) =>
    new DOMParser().parseFromString("", "text/html")
  ));
const Node: Node = (globalThis.Node as unknown as Node) ??
  (await import("@bureaudouble/deno-dom").then(({ Node }) => Node));

export interface IFullOptions {
  stripTags: boolean;
  ellipsis: string;
  decodeEntities: boolean;
  excludes: string | string[];
  length: number;
  byWords: boolean;
  reserveLastWord: boolean | number;
  trimTheOnlyWord: boolean;
  keepWhitespaces: boolean;
}

export type IOptions = Partial<IFullOptions>;

interface IHelper {
  options: IOptions;
  limit: IFullOptions["length"];
  ellipsis: IFullOptions["ellipsis"];
  keepWhitespaces: IFullOptions["keepWhitespaces"];
  reserveLastWord: IFullOptions["reserveLastWord"];
  trimTheOnlyWord: IFullOptions["trimTheOnlyWord"];
  setup(len: number, options?: IOptions): void;
  setup(options: IOptions): void;
  extend(a: any, b: any): any;
  isBlank(char: string): boolean;
  truncate(text: string, isLastNode?: boolean): string;
  substr(arr: Array<string>, len: number): string;
}

const defaultOptions: IOptions = {
  stripTags: false,
  ellipsis: "...",
  decodeEntities: false,
  byWords: false,
  excludes: "",
  reserveLastWord: false,
  trimTheOnlyWord: false,
  keepWhitespaces: false,
};

const astralRange: RegExp =
  /\ud83c[\udffb-\udfff](?=\ud83c[\udffb-\udfff])|(?:[^\ud800-\udfff][\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]?|[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*/g;

const helper = {
  setup(length: number | IOptions, options?: IOptions) {
    switch (typeof length) {
      case "object":
        options = length;
        break;
      case "number":
        if (typeof options === "object") {
          options.length = length;
        } else {
          options = {
            length: length,
          } as IOptions;
        }
    }
    const fullOptions = this.extend(options, defaultOptions) as IFullOptions;
    if (fullOptions.excludes) {
      if (!Array.isArray(fullOptions.excludes)) {
        fullOptions.excludes = [fullOptions.excludes];
      }
      fullOptions.excludes = fullOptions.excludes.join(",");
    }
    this.options = fullOptions;
    this.limit = fullOptions.length;
    this.ellipsis = fullOptions.ellipsis;
    this.keepWhitespaces = fullOptions.keepWhitespaces;
    this.reserveLastWord = fullOptions.reserveLastWord;
    this.trimTheOnlyWord = fullOptions.trimTheOnlyWord;
  },
  // extend obj with dft
  extend(obj, dft) {
    if (obj == null) {
      obj = {};
    }
    for (const k in dft) {
      const v = dft[k];
      if (obj[k] != null) {
        continue;
      }
      obj[k] = v;
    }
    return obj;
  },
  // test a char whether a whitespace char
  isBlank(char) {
    return (
      char === " " ||
      char === "\f" ||
      char === "\n" ||
      char === "\r" ||
      char === "\t" ||
      char === "\v" ||
      char === "\u00A0" ||
      char === "\u2028" ||
      char === "\u2029"
    );
  },

  truncate(text: string, isLastNode: boolean): string {
    if (!this.keepWhitespaces) {
      text = text.replace(/\s+/g, " ");
    }
    const byWords = this.options.byWords;
    const match = text.match(astralRange);
    const astralSafeCharacterArray = match === null ? [] : match;
    const strLen = match === null ? 0 : astralSafeCharacterArray.length;
    let idx = 0;
    let count = 0;
    let prevIsBlank = byWords;
    let curIsBlank = false;
    while (idx < strLen) {
      curIsBlank = this.isBlank(astralSafeCharacterArray[idx++]);
      // keep same then continue
      if (byWords && prevIsBlank === curIsBlank) continue;
      if (count === this.limit) {
        // reserve trailing whitespace, only when prev is blank too
        if (prevIsBlank && curIsBlank) {
          prevIsBlank = curIsBlank;
          continue;
        }
        // fix idx because current char belong to next words which exceed the limit
        --idx;
        break;
      }

      if (byWords) {
        curIsBlank || ++count;
      } else {
        (curIsBlank && prevIsBlank) || ++count;
      }
      prevIsBlank = curIsBlank;
    }
    this.limit -= count;
    if (this.limit) {
      return text;
    } else {
      let str;
      if (byWords) {
        str = text.substr(0, idx);
      } else {
        str = this.substr(astralSafeCharacterArray, idx);
      }
      if (str === text) {
        // if is lat node, no need of ellipsis, or add it
        return isLastNode ? text : text + this.ellipsis;
      } else {
        return str + this.ellipsis;
      }
    }
  },
  // deal with cut string in the middle of a word
  substr(astralSafeCharacterArray, len) {
    // var boundary, cutted, result
    const cutted = astralSafeCharacterArray.slice(0, len).join("");
    if (!this.reserveLastWord || astralSafeCharacterArray.length === len) {
      return cutted;
    }
    const boundary = astralSafeCharacterArray.slice(len - 1, len + 1).join("");
    // if truncate at word boundary, just return
    if (/\W/.test(boundary)) {
      return cutted;
    }
    if (+this.reserveLastWord < 0) {
      const result = cutted.replace(/\w+$/, "");
      // if the cutted is not the first and the only word
      //   then return result, or return the whole word
      if (!(result.length === 0 && cutted.length === this.options.length)) {
        return result;
      }
      if (this.trimTheOnlyWord) return cutted;
    }

    // set max exceeded to 10 if this.reserveLastWord is true or < 0
    const maxExceeded =
      this.reserveLastWord !== true && this.reserveLastWord > 0
        ? this.reserveLastWord
        : 10;
    const mtc = astralSafeCharacterArray.slice(len).join("").match(/(\w+)/);
    const exceeded = mtc ? mtc[1] : "";
    return cutted + exceeded.substr(0, maxExceeded);
  },
} as IHelper;

/**
 * truncate html interface
 */
interface ITruncateHtml {
  (html: string, length?: number, options?: IOptions): string;
  (html: string, options?: IOptions): string;
  setup: (option: IOptions) => void;
}

const truncate = function (html: string, length?: any, options?: any): string {
  helper.setup(
    typeof length === "number" ? Math.floor(length) : length,
    options,
  );
  if (
    !html ||
    isNaN(helper.limit) ||
    helper.limit <= 0 ||
    helper.limit === Infinity
  ) {
    return html;
  }

  // if (helper.limit)

  // Add a wrapper for text node without tag like:
  //   <p>Lorem ipsum <p>dolor sit => <div><p>Lorem ipsum <p>dolor sit</div>
  const node = document.createElement("div");
  node.innerHTML = html;
  // remove excludes elements
  helper.options.excludes &&
    node
      .querySelectorAll(helper.options.excludes as string)
      .forEach((el) => el.remove());
  // strip tags and get pure text
  if (helper.options.stripTags) {
    return helper.truncate((node as any).body.textContent || "");
  }
  const travelChildren = function (
    element: ChildNode,
    isParentLastNode = true,
  ) {
    const contents = Array.from(element.childNodes);
    const lastIdx = contents.length - 1;
    contents.forEach((currentNode, idx) => {
      switch (currentNode.nodeType) {
        case Node.TEXT_NODE:
          if (!helper.limit) {
            element.removeChild(currentNode);
            return;
          }
          currentNode.nodeValue = helper.truncate(
            currentNode.textContent || "",
            isParentLastNode && idx === lastIdx,
          );
          break;
        case Node.ELEMENT_NODE:
          if (!helper.limit) {
            element.removeChild(currentNode);
          } else {
            return travelChildren(
              currentNode,
              isParentLastNode && idx === lastIdx,
            );
          }
          break;
        default:
          // for comments
          element.removeChild(currentNode);
      }
    });
  };
  travelChildren(node);
  return node.innerHTML;
} as ITruncateHtml;

truncate.setup = (options = {}) => {
  return Object.assign(defaultOptions, options);
};

export default truncate;
