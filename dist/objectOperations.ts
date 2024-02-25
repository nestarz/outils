export const eq =
  <A extends string | number | symbol>(key: A) =>
  <B,>(valueToTest: B) =>
  <O extends Record<string | A, B | unknown>>(obj: O) =>
    obj[key] === valueToTest;

export const assign =
  <A extends string | number | symbol>(key: A) =>
  <B,>(value: B) =>
  <O extends Record<string, B | unknown>>(obj: O) => ({
    ...obj,
    [key]: value,
  });
