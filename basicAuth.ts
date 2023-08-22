import { basicAuth as auth } from "https://deno.land/x/basic_auth@v1.1.1/mod.ts";

export const basicAuth =
  <T extends Request, U, V>(
    fn: (arg1: T, arg2: U) => V,
    username: string,
    password: string
  ) =>
  (req: T, ctx: U) => {
    const unauthorized =
      username && password
        ? auth(req, "access", { [username]: password })
        : null;
    return unauthorized ?? fn(req, ctx);
  };

export default basicAuth;
