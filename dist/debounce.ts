export type DebounceFn = (...args: any[]) => any;
export type DebounceReturnType<T extends DebounceFn> = (
  ...args: Parameters<T>
) => ReturnType<T> | undefined;

export function debounce<T extends DebounceFn>(
  func: T,
  delay: number
): DebounceReturnType<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function debouncedFunction(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const context = this;
    const later = () => {
      timeout = undefined;
      return func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
    if (!timeout) return func.apply(context, args);
  } as DebounceReturnType<T>;
}

export default debounce;
