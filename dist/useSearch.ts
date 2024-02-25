import { useSignal, useComputed, useSignalEffect } from "@preact/signals";

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) =>
    new Promise<ReturnType<T>>((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          try {
            resolve(func(...args));
          } catch (error) {
            reject(error);
          }
        },
        timeoutId ? delay : 0
      );
    });
};

interface Props {
  search: (value: string) => Promise<Array<any>>;
  onEnter: (selectedItem: any) => void;
  debounceMs?: number;
}

interface Autocomplete {
  data: Array<any>;
  onChange: (event: Event) => void;
  onKeyUp: (event: KeyboardEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

export default ({ search, onEnter, debounceMs }: Props): Autocomplete => {
  const data = useSignal<Array<any>>([]);
  const index = useSignal<number>(0);
  const length = useComputed<number>(() => data.value.length);
  useSignalEffect(() => void (index.value = length.value - length.value));

  const onChange = debounce(
    ({ target: { value } }: { target: HTMLInputElement }) =>
      void (!(value?.length > 0)
        ? (data.value = [])
        : Promise.resolve(search(value)).then(
            (result) => (data.value = result)
          )),
    debounceMs
  );

  return {
    data,
    onChange,
    onKeyUp: onChange,
    onKeyDown: ({ key }: KeyboardEvent) => {
      if (key === "Enter") onEnter(data.peek()?.[index.peek()]);
      else {
        const dir = key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0;
        index.value = (index.peek() + dir) % length.peek();
      }
    },
  };
};
