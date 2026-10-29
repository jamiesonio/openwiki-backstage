import openwikiRepoGraph from './openwiki-repo/graph.json';
import unicodeGraph from './unicode/graph.json';
import edgeCasesGraph from './edge-cases/graph.json';

/**
 * Real `openwiki visualize --export` output (v0.7.2). See NOTICE.md. Typed as
 * `unknown` on purpose: tests and the dev app must go through the validator.
 */
export const fixtures = {
  /** 29 pages, 109 edges: the OpenWiki repository's own wiki. */
  'openwiki-repo': openwikiRepoGraph as unknown,
  /** Unicode / percent-encoded ids and links. */
  unicode: unicodeGraph as unknown,
  /** Excluded scaffolding, self/duplicate/missing links, page without frontmatter. */
  'edge-cases': edgeCasesGraph as unknown,
} as const;

export type FixtureName = keyof typeof fixtures;
export const fixtureNames = Object.keys(fixtures) as FixtureName[];
