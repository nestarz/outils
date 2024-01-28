import { clsx, type ClassValue } from "https://esm.sh/clsx@2.1.0";
import { twMerge } from "https://esm.sh/tailwind-merge@2.2.1";
 
export function cn(...args: ClassValue[]) {
  return twMerge(clsx(args));
}

export default cn;
