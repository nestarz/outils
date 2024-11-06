export const urledit = (url: URL, fn: (url: URL) => void): URL => {
  const copy = new URL(url);
  fn(copy);
  return copy;
};

export default urledit;
