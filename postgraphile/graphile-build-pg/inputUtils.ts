import "graphile-build";

import type { PgCodec, PgCodecRelation, PgResource } from "@dataplan/pg";

/**
 * Metadata for a specific PgCodec
 */
export interface PgCodecMeta {
  /**
   * Given a `situation` such as 'input', 'output', 'patch', etc. returns the
   * name of the GraphQL type to use for this PgCodec.
   */
  typeNameBySituation: {
    [situation: string]: string;
  };
}

/**
 * A map from PgCodec to its associated metadata.
 */
export type PgCodecMetaLookup = Map<PgCodec, PgCodecMeta>;

/**
 * Creates an empty meta object for the given codec.
 */
export function makePgCodecMeta(_codec: PgCodec): PgCodecMeta {
  return {
    typeNameBySituation: Object.create(null),
  };
}

/**
 * Given the input object, this function walks through all the pgResources and
 * all their codecs and relations and extracts the full set of reachable
 * codecs.
 *
 * Memoized for performance, using a WeakMap.
 */
export function getCodecMetaLookupFromInput(
  input: GraphileBuild.BuildInput,
): PgCodecMetaLookup {
  const metaLookup: PgCodecMetaLookup = new Map();
  const seenResources = new Set<PgResource>();
  for (const codec of Object.values(input.pgRegistry.pgCodecs) as PgCodec[]) {
    walkCodec(codec, metaLookup);
  }
  for (const resource of Object.values(input.pgRegistry.pgResources)) {
    walkResource(resource, metaLookup, seenResources);
  }
  return metaLookup;
}

/**
 * Walks the given resource's codecs/relations and pushes all discovered codecs
 * into `metaLookup`
 *
 * @internal
 */
function walkResource(
  resource: PgResource,
  metaLookup: PgCodecMetaLookup,
  seenResources: Set<PgResource>,
): void {
  if (seenResources.has(resource)) {
    return;
  }
  seenResources.add(resource);
  if (!metaLookup.has(resource.codec)) {
    walkCodec(resource.codec, metaLookup);
  }
  const relations = resource.getRelations() as Record<string, PgCodecRelation>;
  if (relations) {
    for (const relationshipName in relations) {
      walkResource(
        relations[relationshipName].remoteResource,
        metaLookup,
        seenResources,
      );
    }
  }
}

/**
 * Adds the given codec to `metaLookup` and also walks the related codecs (for
 * attributes, and inner-codecs).
 *
 * @internal
 */
function walkCodec(codec: PgCodec, metaLookup: PgCodecMetaLookup): void {
  if (metaLookup.has(codec)) {
    return;
  }
  metaLookup.set(codec, makePgCodecMeta(codec));
  if (codec.attributes) {
    for (const attributeName in codec.attributes) {
      walkCodec(codec.attributes[attributeName].codec, metaLookup);
    }
  }
  if (codec.arrayOfCodec) {
    walkCodec(codec.arrayOfCodec, metaLookup);
  }
  if (codec.domainOfCodec) {
    walkCodec(codec.domainOfCodec, metaLookup);
  }
  if (codec.rangeOfCodec) {
    walkCodec(codec.rangeOfCodec, metaLookup);
  }
}
