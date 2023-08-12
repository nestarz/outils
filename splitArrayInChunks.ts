export const splitArrayInChunks = <T>(array: T[], chunkSize: number) =>
  array.reduce(
    (acc: T[][], item: T, idx: number) => (
      (acc[Math.floor(idx / chunkSize)] ??= []).push(item), acc
    ),
    []
  );

export default splitArrayInChunks;
