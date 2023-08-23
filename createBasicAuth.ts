import { basicAuth } from "https://deno.land/x/basic_auth@v1.1.1/mod.ts";

export const createBasicAuth =
  (username: string, password: string, realm = "access") =>
  <T extends Request, U, V>(fn: (arg1: T, arg2: U) => V) =>
  (req: T, ctx: U) => {
    const unauthorized =
      username && password
        ? basicAuth(req, realm, { [username]: password })
        : null;
    return unauthorized ?? fn(req, ctx);
  };

export default createBasicAuth;
