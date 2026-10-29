// Jest runs in Node; the fixture sources are read from disk only in tests.
// eslint-disable-next-line no-restricted-imports
import fs from 'fs';
// eslint-disable-next-line no-restricted-imports
import path from 'path';
import { fixtureNames, fixtures } from '../__fixtures__';
import {
  GraphValidationError,
  parseWikiGraph,
  parseWikiGraphText,
} from './schema';
import { OPENWIKI_PINNED_VERSION } from '../constants';

describe('parseWikiGraph', () => {
  it.each(fixtureNames)('accepts the real %s export', name => {
    const graph = parseWikiGraph(fixtures[name]);
    expect(graph.nodes.length).toBeGreaterThan(0);
    // Invariants the builder guarantees (GRAPH_SCHEMA.md).
    const ids = new Set(graph.nodes.map(n => n.id));
    expect(ids.size).toBe(graph.nodes.length);
    for (const edge of graph.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
      expect(edge.source).not.toBe(edge.target);
    }
    for (const node of graph.nodes) {
      expect(node.size).toBe(node.body.length);
      expect(graph.types).toContain(node.type);
      for (const link of node.links) {
        expect(graph.edges).toContainEqual({ source: node.id, target: link });
      }
    }
    expect([...graph.types]).toEqual([...graph.types].sort());
  });

  it('matches the source Markdown of each fixture (body = file minus frontmatter)', () => {
    for (const name of fixtureNames) {
      const graph = parseWikiGraph(fixtures[name]);
      const sourceDir = path.join(
        __dirname,
        '..',
        '__fixtures__',
        name,
        'source',
      );
      for (const node of graph.nodes) {
        const raw = fs.readFileSync(
          path.join(sourceDir, `${node.id}.md`),
          'utf8',
        );
        expect(raw.endsWith(node.body)).toBe(true);
      }
      // Scaffolding never becomes a node.
      expect(graph.nodes.map(n => n.id)).not.toContain('INSTRUCTIONS');
      expect(graph.nodes.map(n => n.id)).not.toContain('log');
    }
  });

  it('parses the largest fixture end-to-end from text', () => {
    const text = fs.readFileSync(
      path.join(__dirname, '..', '__fixtures__', 'openwiki-repo', 'graph.json'),
      'utf8',
    );
    const graph = parseWikiGraphText(text);
    expect(graph.root).toBe('openwiki');
    expect(graph.nodes).toHaveLength(29);
    expect(graph.edges).toHaveLength(109);
    expect(graph.types).toHaveLength(16);
  });

  it('documents the multi-line tags surprise from GRAPH_SCHEMA.md', () => {
    const graph = parseWikiGraph(fixtures['openwiki-repo']);
    const overview = graph.nodes.find(n => n.id === 'architecture/overview')!;
    const quickstart = graph.nodes.find(n => n.id === 'quickstart')!;
    expect(overview.tags).toEqual([]); // wrapped YAML array -> lost by the builder
    expect(quickstart.tags).toContain('quickstart'); // single-line array -> kept
  });

  const malformed = (): any =>
    JSON.parse(JSON.stringify(fixtures['edge-cases']));

  const caught = (fn: () => unknown): unknown => {
    try {
      fn();
    } catch (e) {
      return e;
    }
    return undefined;
  };

  it('reports the failing field when a node field has the wrong type', () => {
    const bad = malformed();
    bad.nodes[1].size = 'eighty-one';
    const err = caught(() => parseWikiGraph(bad)) as GraphValidationError;
    expect(err).toBeInstanceOf(GraphValidationError);
    expect(err.field).toBe('nodes.1.size');
    expect(err.pinnedVersion).toBe(OPENWIKI_PINNED_VERSION);
    expect(err.message).toContain('nodes.1.size');
    expect(err.issues[0]).toEqual({
      field: 'nodes.1.size',
      message: expect.stringMatching(/number/i),
    });
  });

  it('reports a missing required field', () => {
    const bad = malformed();
    delete bad.nodes[0].backlinks;
    expect(() => parseWikiGraph(bad)).toThrow(/nodes\.0\.backlinks/);
  });

  it('reports a missing top-level array', () => {
    const bad = malformed();
    delete bad.edges;
    expect(() => parseWikiGraph(bad)).toThrow(/"edges"/);
  });

  it('rejects dangling edges and duplicate ids', () => {
    const dangling = malformed();
    dangling.edges.push({ source: 'index', target: 'ghost' });
    expect(() => parseWikiGraph(dangling)).toThrow(/edges\.2\.target.*ghost/);

    const dup = malformed();
    dup.nodes.push({ ...dup.nodes[0] });
    expect(() => parseWikiGraph(dup)).toThrow(/nodes\.3\.id.*duplicate/);
  });

  it('rejects things that are not a graph at all', () => {
    expect(() => parseWikiGraph(null)).toThrow(GraphValidationError);
    expect(() => parseWikiGraph([])).toThrow(GraphValidationError);
    expect(() => parseWikiGraph({ nodes: [], edges: [] })).toThrow(/root/);
    expect(() => parseWikiGraphText('<html>not json</html>')).toThrow(
      /not valid JSON/,
    );
  });

  it('ignores unknown extra fields so newer exports keep working', () => {
    const extended = malformed();
    extended.version = 99;
    extended.nodes[0].weight = 3;
    const graph = parseWikiGraph(extended);
    expect((graph as any).version).toBeUndefined();
    expect(graph.nodes[0].id).toBe('architecture');
  });
});
