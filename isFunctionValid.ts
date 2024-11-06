export const isFunctionValid = (fn: () => any): boolean => {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
};

export default isFunctionValid;
