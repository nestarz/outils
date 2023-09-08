export const range = (start: number, end?: number): number[] =>
  Array.from(
    { length: (end ??= [start, (start = 0)][0]) - start },
    (_, i) => i + start
  );

export default range;
