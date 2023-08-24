const document =
  globalThis.document ??
  (await import("https://esm.sh/linkedom@0.15.1").then(
    (linkedom) => linkedom.parseHTML().document
  ));

export const convertToPlain = (obj: any) => {
  const innerHTML =
    typeof obj === "string"
      ? obj
      : String(obj).length > 0
      ? JSON.stringify(obj)
      : null;
  return typeof innerHTML === "string" && innerHTML?.trim()
    ? Object.assign(document.createElement("fragment"), {
        innerHTML,
      }).textContent
    : "";
};

export default convertToPlain;
