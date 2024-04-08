export const convertToPlain = (obj: any): string | null => {
  const innerHTML = typeof obj === "string"
    ? obj
    : String(obj).length > 0
    ? JSON.stringify(obj)
    : null;
  return typeof innerHTML === "string" && innerHTML?.trim()
    ? globalThis.document
      ? Object.assign(globalThis.document.createElement("fragment"), {
        innerHTML,
      }).textContent
      : innerHTML.replace(/<[^>]+>/g, "")
    : "";
};

export default convertToPlain;
