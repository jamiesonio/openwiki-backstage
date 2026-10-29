import type { ElementDefinition } from 'cytoscape';
import type { WikiGraph, WikiNode } from '../schema/types';

/**
 * Colours for node types. Same eight hues OpenWiki's visualizer uses
 * (src/visualize/client-lib.ts `PALETTE`), assigned by position in
 * `graph.types`, so colours match what people see in the stand-alone export.
 * They are saturated enough to read on both light and dark backgrounds.
 */
export const TYPE_PALETTE: readonly string[] = [
  '#4FA8F0',
  '#B6DE3E',
  '#D96FA6',
  '#A97FE0',
  '#D98A6B',
  '#3FBFA0',
  '#E0A63E',
  '#6E8FF0',
];

export function colorsForTypes(
  types: readonly string[],
  palette: readonly string[] = TYPE_PALETTE,
): Record<string, string> {
  const colors: Record<string, string> = {};
  types.forEach((type, i) => {
    colors[type] = palette[i % palette.length];
  });
  return colors;
}

/** Node radius from body length: log-scaled so a 60 KB page is not 100x a 600 B one. */
export function nodeRadius(size: number): number {
  const safe = Math.max(0, size);
  return Math.round(10 + 4 * Math.log10(1 + safe / 100));
}

/** Data attached to each cytoscape node element. */
export interface WikiNodeElementData {
  id: string;
  label: string;
  type: string;
  description: string;
  color: string;
  radius: number;
}

/**
 * Convert a validated graph into cytoscape element definitions. Edge ids are
 * `source->target`, which the builder guarantees unique.
 */
export function toCytoscapeElements(graph: WikiGraph): ElementDefinition[] {
  const colors = colorsForTypes(graph.types);
  const nodes: ElementDefinition[] = graph.nodes.map(node => ({
    group: 'nodes',
    data: {
      id: node.id,
      label: node.title,
      type: node.type,
      description: node.description,
      color: colors[node.type] ?? TYPE_PALETTE[0],
      radius: nodeRadius(node.size),
    } satisfies WikiNodeElementData,
  }));
  const edges: ElementDefinition[] = graph.edges.map(edge => ({
    group: 'edges',
    data: {
      id: `${edge.source}->${edge.target}`,
      source: edge.source,
      target: edge.target,
    },
  }));
  return [...nodes, ...edges];
}

/**
 * The selected node plus every node one edge away in either direction.
 */
export function neighbourhood(graph: WikiGraph, nodeId: string): Set<string> {
  const result = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.source === nodeId) result.add(edge.target);
    if (edge.target === nodeId) result.add(edge.source);
  }
  return result;
}

/**
 * Case-insensitive search over id, title, description and tags. Returns nodes
 * in graph order, most relevant (title match) first.
 */
export function searchNodes(
  nodes: readonly WikiNode[],
  query: string,
  limit = 12,
): WikiNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const titleHits: WikiNode[] = [];
  const otherHits: WikiNode[] = [];
  for (const node of nodes) {
    if (
      node.title.toLowerCase().includes(q) ||
      node.id.toLowerCase().includes(q)
    ) {
      titleHits.push(node);
    } else if (
      node.description.toLowerCase().includes(q) ||
      node.tags.some(tag => tag.toLowerCase().includes(q)) ||
      node.type.toLowerCase().includes(q)
    ) {
      otherHits.push(node);
    }
  }
  return [...titleHits, ...otherHits].slice(0, limit);
}

/**
 * The page the reader opens first: a quickstart, then an index/overview/home
 * page, then the first node. Same heuristic as OpenWiki's client.
 */
export function defaultNode(graph: WikiGraph): WikiNode | undefined {
  return (
    graph.nodes.find(n => /quickstart/i.test(n.id)) ??
    graph.nodes.find(n => /(^|\/)(index|overview|home)$/i.test(n.id)) ??
    graph.nodes[0]
  );
}
