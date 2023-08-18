export type RemoveNodesAndEdges<T> = {
  [K in keyof T]: T[K] extends { nodes: infer U }[] // If T[K] is an array with elements of type { nodes: U }
    ? U[] // Replace T[K] with U[]
    : T[K] extends { nodes: infer U } // If T[K] is an object with a property 'nodes' of type U
    ? U // Replace T[K] with U
    : T[K] extends { edges: infer U }[] // If T[K] is an array with elements of type { edges: U }
    ? RemoveNodesAndEdges<U>[] // Replace T[K] with RemoveNodesAndEdges<U>[]
    : T[K] extends { edges: infer U } // If T[K] is an object with a property 'edges' of type U
    ? RemoveNodesAndEdges<U> // Replace T[K] with RemoveNodesAndEdges<U>
    : T[K]; // Otherwise keep T[K] as is
};

export type GraphQLClientRequestHeaders =
  | Headers
  | string[][]
  | Record<string, string>;

export const request = (
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  requestHeaders?: GraphQLClientRequestHeaders
) =>
  fetch(url, {
    method: "POST",
    body: JSON.stringify({ query, variables }),
    headers: {
      "content-type": "application/json",
      ...(requestHeaders ?? {}),
    },
  }).then(async (r) => {
    if (r.ok) return r;
    throw Error(await r.text());
  });

export const createGraphQLClient = (
  url: string,
  requestHeaders?: GraphQLClientRequestHeaders
) => ({
  request: (query: string, variables?: Record<string, unknown>) =>
    request(url, query, variables, requestHeaders),
});

export type GraphQLClient = ReturnType<typeof createGraphQLClient>;
