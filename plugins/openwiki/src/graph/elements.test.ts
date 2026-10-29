import { fixtures } from '../__fixtures__';
import { parseWikiGraph } from '../schema/schema';
import {
  colorsForTypes,
  defaultNode,
  neighbourhood,
  nodeRadius,
  searchNodes,
  toCytoscapeElements,
  TYPE_PALETTE,
} from './elements';

const graph = parseWikiGraph(fixtures['openwiki-repo']);

describe('toCytoscapeElements', () => {
  it('emits one element per node and edge with stable ids', () => {
    const elements = toCytoscapeElements(graph);
    expect(elements).toHaveLength(graph.nodes.length + graph.edges.length);
    const nodeEl = elements.find(e => e.data.id === 'quickstart')!;
    expect(nodeEl.group).toBe('nodes');
    expect(nodeEl.data.label).toBe('OpenWiki Quickstart');
    expect(nodeEl.data.color).toBe(
      colorsForTypes(graph.types)['orientation-guide'],
    );
    const edgeEl = elements.find(
      e => e.data.id === 'quickstart->architecture/overview',
    );
    expect(edgeEl?.group).toBe('edges');
    expect(edgeEl?.data.source).toBe('quickstart');
  });
});

describe('colorsForTypes / nodeRadius', () => {
  it('cycles the palette by type position', () => {
    const colors = colorsForTypes(['a', 'b']);
    expect(colors.a).toBe(TYPE_PALETTE[0]);
    expect(colors.b).toBe(TYPE_PALETTE[1]);
    expect(
      colorsForTypes(Array.from({ length: 9 }, (_, i) => `t${i}`)).t8,
    ).toBe(TYPE_PALETTE[0]);
  });

  it('grows slowly with body size', () => {
    expect(nodeRadius(0)).toBe(10);
    expect(nodeRadius(1000)).toBeGreaterThan(nodeRadius(100));
    expect(nodeRadius(60_000)).toBeLessThan(30);
  });
});

describe('neighbourhood', () => {
  it('includes the node, its links and its backlinks', () => {
    const node = graph.nodes.find(n => n.id === 'architecture/overview')!;
    const hood = neighbourhood(graph, node.id);
    expect(hood.has(node.id)).toBe(true);
    for (const id of [...node.links, ...node.backlinks]) {
      expect(hood.has(id)).toBe(true);
    }
    expect(hood.size).toBe(
      new Set([node.id, ...node.links, ...node.backlinks]).size,
    );
  });
});

describe('searchNodes', () => {
  it('ranks title matches before description/tag matches and is case-insensitive', () => {
    const hits = searchNodes(graph.nodes, 'OKF');
    expect(hits[0].id).toBe('concepts/okf-output');
    expect(hits.length).toBeGreaterThan(1); // other pages mention it in descriptions
  });

  it('returns nothing for a blank query and respects the limit', () => {
    expect(searchNodes(graph.nodes, '   ')).toEqual([]);
    expect(searchNodes(graph.nodes, 'e', 3)).toHaveLength(3);
  });
});

describe('defaultNode', () => {
  it('prefers a quickstart, then index/overview/home, then the first node', () => {
    expect(defaultNode(graph)?.id).toBe('quickstart');
    expect(defaultNode(parseWikiGraph(fixtures['edge-cases']))?.id).toBe(
      'index',
    );
    expect(defaultNode(parseWikiGraph(fixtures.unicode))?.id).toBe(
      'events/index',
    );
  });
});
