const getDocument: () => Document = await (async () => {
  const document = (globalThis.document as Document) ??
    (await import("@bureaudouble/deno-dom").then(
      ({ DOMParser }) => new DOMParser().parseFromString("", "text/html"),
    ));

  return () => document;
})();

export const convertToPlain = (obj: any): string | null => {
  const innerHTML =
    typeof obj === "string"
      ? obj
      : String(obj).length > 0
      ? JSON.stringify(obj)
      : null;
  return typeof innerHTML === "string" && innerHTML?.trim()
    ? Object.assign(getDocument().createElement("fragment"), {
        innerHTML,
      }).textContent
    : "";
};

export default convertToPlain;
