export const partialTrigger = (
  node: HTMLElement,
  { eventName }: { eventName: string },
) =>
  node.addEventListener(eventName, (event) => {
    event.preventDefault();
    const target: HTMLButtonElement | HTMLFormElement = event.target;
    const form: HTMLFormElement = target.form ?? target;
    const formData = new FormData(form);
    const formMethod = target.getAttribute("formmethod") ??
      form.getAttribute("method") ?? "GET";
    const formAction = target.getAttribute("formaction") ??
      form.getAttribute("action") ?? window.location.href;

    fetch(formAction, {
      method: formMethod,
      body: formMethod === "GET" ? undefined : formData,
    })
      .then((r) =>
        r.text().then((v) =>
          r.status === 200 ? Promise.resolve(v) : Promise.reject(v)
        )
      )
      .then((str: string) => {
        const partialDocument =
          new DOMParser().parseFromString(str, "text/html")
            .documentElement;
        document.documentElement.append(
          ...partialDocument.querySelectorAll<
            HTMLScriptElement | HTMLHeadElement
          >("script, head > *"),
        );
        partialDocument
          .querySelectorAll<HTMLElement>("[data-partial-id]")
          .forEach(
            (newNode) =>
              document.querySelectorAll<HTMLElement>(
                `[data-partial-id=${newNode.dataset.partialId}]`,
              )
                .forEach((node) =>
                  ["append", "prepend"].includes(
                      newNode.dataset.partialMode ?? "",
                    )
                    ? newNode.dataset.partialMode === "append"
                      ? node.append("test", ...newNode.childNodes)
                      : node.prepend(...newNode.childNodes)
                    : node.replaceChildren(...newNode.childNodes)
                ),
          );
      });
  });

export default (
  { children, name, mode = "replace" }: {
    mode: "append" | "prepend" | "replace";
    name: string;
    children: any;
  },
) => (
  <fragment data-partial-id={name} data-partial-mode={mode}>
    {children}
  </fragment>
);
