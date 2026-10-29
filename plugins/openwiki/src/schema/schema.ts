import { z } from 'zod';
import { OPENWIKI_PINNED_VERSION } from '../constants';
import type { WikiGraph } from './types';

const stringArray = z.array(z.string());

/**
 * One node of the graph. Unknown keys are allowed (and stripped) so that a
 * newer OpenWiki adding fields does not break the tab; a missing or
 * wrongly-typed known field does.
 */
export const wikiNodeSchema = z.object({
  id: z.string().min(1, 'node id must not be empty'),
  title: z.string(),
  type: z.string(),
  description: z.string(),
  tags: stringArray,
  body: z.string(),
  size: z.number().int().nonnegative(),
  links: stringArray,
  backlinks: stringArray,
});

export const wikiEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
});

export const wikiGraphSchema = z
  .object({
    root: z.string(),
    generatedAt: z.string(),
    types: stringArray,
    nodes: z.array(wikiNodeSchema),
    edges: z.array(wikiEdgeSchema),
  })
  .superRefine((graph, ctx) => {
    const ids = new Set<string>();
    graph.nodes.forEach((node, index) => {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', index, 'id'],
          message: `duplicate node id "${node.id}"`,
        });
      }
      ids.add(node.id);
    });
    graph.edges.forEach((edge, index) => {
      if (!ids.has(edge.source)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges', index, 'source'],
          message: `edge source "${edge.source}" is not a node id`,
        });
      }
      if (!ids.has(edge.target)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges', index, 'target'],
          message: `edge target "${edge.target}" is not a node id`,
        });
      }
    });
  });

/**
 * A single validation failure, flattened for display.
 *
 * @public
 */
export interface GraphValidationIssue {
  /** Dotted path such as `nodes.3.size`, or `(root)` for the top level. */
  field: string;
  message: string;
}

/**
 * Thrown by {@link parseWikiGraph} when the payload is not a graph.json this
 * plugin understands. Carries the first failing field for the error panel.
 *
 * @public
 */
export class GraphValidationError extends Error {
  readonly name = 'GraphValidationError';
  readonly issues: GraphValidationIssue[];
  readonly pinnedVersion = OPENWIKI_PINNED_VERSION;

  constructor(issues: GraphValidationIssue[]) {
    const first = issues[0];
    super(
      first
        ? `graph.json failed validation at "${first.field}": ${first.message}`
        : 'graph.json failed validation',
    );
    this.issues = issues;
  }

  /** The first failing field, e.g. `nodes.3.size`. */
  get field(): string {
    return this.issues[0]?.field ?? '(root)';
  }
}

function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) return '(root)';
  return path.map(segment => String(segment)).join('.');
}

/**
 * Validate an already-parsed JSON value against the OpenWiki graph.json shape
 * documented in GRAPH_SCHEMA.md.
 *
 * @throws GraphValidationError
 * @public
 */
export function parseWikiGraph(input: unknown): WikiGraph {
  const result = wikiGraphSchema.safeParse(input);
  if (!result.success) {
    throw new GraphValidationError(
      result.error.issues.map(issue => ({
        field: formatPath(issue.path),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/**
 * Parse the raw text of a graph.json file. JSON syntax errors are reported as
 * a validation error at `(root)` so the UI treats them like any other
 * malformed export.
 *
 * @throws GraphValidationError
 * @public
 */
export function parseWikiGraphText(text: string): WikiGraph {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new GraphValidationError([
      {
        field: '(root)',
        message: `not valid JSON: ${(e as Error).message}`,
      },
    ]);
  }
  return parseWikiGraph(json);
}
