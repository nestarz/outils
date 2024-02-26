// import secureCompare from "https://deno.land/x/secure_compare@1.0.0/mod.ts";
const secureCompare = (a: string, b: string): boolean => {
  let mismatch = a.length === b.length ? 0 : 1;

  if (mismatch) b = a;

  for (let i = 0, il = a.length; i < il; ++i) {
    const ac = a.charCodeAt(i);
    const bc = b.charCodeAt(i);
    mismatch |= ac ^ bc;
  }

  return mismatch === 0;
};

// import { basicAuth } from "https://deno.land/x/basic_auth@v1.1.1/mod.ts";
interface MapWithGettableValues {
  get(headerName: string): string | null;
}

interface Requestlike {
  headers: MapWithGettableValues;
}

function basicAuth(
  request: Requestlike,
  realm: string,
  userPasswordTable: Record<string, string>
): Response | undefined {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Basic\s+(.*)$/);
    if (match) {
      const [user, pw] = atob(match[1]).split(":");
      if (Object.prototype.hasOwnProperty.call(userPasswordTable, user)) {
        const expectedPw = userPasswordTable[user];
        if (secureCompare(pw, expectedPw)) {
          return;
        }
      }
    }
  }

  return new Response("401 Unauthorized", {
    status: 401,
    statusText: "Unauthorized",
    headers: {
      "www-authenticate": `Basic realm="${realm}"`,
    },
  });
}

// mod.ts
import type { Plugin } from "./types.ts";

export const createBasicAuthPlugin = (
  username: string,
  password: string,
  realm = "access"
): Plugin => {
  return {
    name: "basicAuthPlugin",
    middlewares: [
      {
        path: "/",
        middleware: {
          handler: (req, ctx) => {
            const unauthorized =
              username && password
                ? basicAuth(req, realm, { [username]: password })
                : null;
            return unauthorized ?? ctx.next();
          },
        },
      },
    ],
  };
};

export default createBasicAuthPlugin;
