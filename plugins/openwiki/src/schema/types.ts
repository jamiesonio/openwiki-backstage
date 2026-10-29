/**
 * TypeScript mirror of OpenWiki's `WikiGraph` / `WikiNode` / `WikiEdge`
 * (src/visualize/graph.ts at v0.7.2). See GRAPH_SCHEMA.md for the derivation.
 *
 * @public
 */
export interface WikiNode {
  /** Page path relative to the wiki root, without `.md`. Not URL-encoded. */
  id: string;
  /** Frontmatter title, section name (index pages), first H1, or filename. */
  title: string;
  /** Frontmatter type, else `Section` for index pages and `Reference` otherwise. Open string. */
  type: string;
  /** Frontmatter description or empty string. */
  description: string;
  /** Frontmatter tags or empty array. */
  tags: string[];
  /** Raw Markdown body with the frontmatter block removed. */
  body: string;
  /** `body.length` in UTF-16 code units. */
  size: number;
  /** Ids of pages this page links to. */
  links: string[];
  /** Ids of pages that link to this page. */
  backlinks: string[];
}

/** @public */
export interface WikiEdge {
  source: string;
  target: string;
}

/** @public */
export interface WikiGraph {
  /** Basename of the wiki directory. */
  root: string;
  /** ISO-8601 build timestamp. */
  generatedAt: string;
  /** Sorted distinct node types. */
  types: string[];
  nodes: WikiNode[];
  edges: WikiEdge[];
}
