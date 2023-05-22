export default function removeEmpty<T>(data: T): T {
  const checkNotEmpty = (v: unknown) => v !== null && typeof v !== "undefined";
  if (Array.isArray(data)) {
    return (data as unknown[])
      .filter(checkNotEmpty)
      .map((value) => removeEmpty(value)) as unknown as T;
  }
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, value]) => checkNotEmpty(value)
  );
  const clean = entries.map(([key, v]) => {
    const value = typeof v === "object" ? removeEmpty(v) : v;
    return [key, value];
  });
  return Object.fromEntries(clean) as T;
}
