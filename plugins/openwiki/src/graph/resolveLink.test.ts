import { fixtures } from '../__fixtures__';
import { parseWikiGraph } from '../schema/schema';
import {
  isWikiPageHref,
  nodeDir,
  normalizeWikiPath,
  resolveWikiLink,
} from './resolveLink';

const ids = new Set([
  'index',
  'quickstart',
  'architecture/index',
  'architecture/overview',
  'concepts/okf-output',
  'events/靖难之役 #1%',
  '人物/朱棣',
  '%E4%B8%80',
]);

describe('resolveWikiLink', () => {
  it('resolves sibling links relative to the source page directory', () => {
    expect(resolveWikiLink('architecture/index', 'overview.md', ids)).toBe(
      'architecture/overview',
    );
    expect(resolveWikiLink('index', 'quickstart.md', ids)).toBe('quickstart');
  });

  it('resolves ../ and ./ segments and strips anchors and queries', () => {
    expect(
      resolveWikiLink(
        'architecture/overview',
        '../concepts/okf-output.md',
        ids,
      ),
    ).toBe('concepts/okf-output');
    expect(
      resolveWikiLink('quickstart', './architecture/overview.md#ids', ids),
    ).toBe('architecture/overview');
    expect(
      resolveWikiLink('quickstart', 'architecture/overview.md?x=1', ids),
    ).toBe('architecture/overview');
  });

  it('decodes percent-encoded hrefs exactly once', () => {
    expect(
      resolveWikiLink(
        'events/index',
        '%E9%9D%96%E9%9A%BE%E4%B9%8B%E5%BD%B9%20%231%25.md',
        ids,
      ),
    ).toBe('events/靖难之役 #1%');
    expect(
      resolveWikiLink(
        'events/index',
        '../%E4%BA%BA%E7%89%A9/%E6%9C%B1%E6%A3%A3.md',
        ids,
      ),
    ).toBe('人物/朱棣');
    // Double-encoded: one decode yields the literal "%E4%B8%80" filename.
    expect(resolveWikiLink('literal', '%25E4%25B8%2580.md', ids)).toBe(
      '%E4%B8%80',
    );
  });

  it('keeps the literal text when decoding fails', () => {
    expect(resolveWikiLink('index', 'bad%ZZ.md', ids)).toBeUndefined();
    expect(resolveWikiLink('index', 'bad%ZZ.md', new Set(['bad%ZZ']))).toBe(
      'bad%ZZ',
    );
  });

  it('ignores links that are not wiki pages', () => {
    expect(
      resolveWikiLink('index', 'https://example.com/a.md', ids),
    ).toBeUndefined();
    expect(resolveWikiLink('index', 'mailto:a@b.md', ids)).toBeUndefined();
    expect(resolveWikiLink('index', '/index.md', ids)).toBeUndefined();
    expect(resolveWikiLink('index', '#heading', ids)).toBeUndefined();
    expect(resolveWikiLink('index', 'architecture/', ids)).toBeUndefined();
    expect(resolveWikiLink('index', 'quickstart', ids)).toBeUndefined();
    expect(resolveWikiLink('index', '', ids)).toBeUndefined();
    expect(resolveWikiLink('index', null, ids)).toBeUndefined();
  });

  it('returns undefined for unknown targets and resolves self-links to self', () => {
    expect(resolveWikiLink('index', 'nope.md', ids)).toBeUndefined();
    expect(resolveWikiLink('index', 'index.md', ids)).toBe('index');
  });

  it('accepts a predicate instead of a set', () => {
    expect(
      resolveWikiLink('index', 'quickstart.md', id => id === 'quickstart'),
    ).toBe('quickstart');
  });

  it('reproduces every edge of every fixture from the page bodies', () => {
    for (const fixture of Object.values(fixtures)) {
      const graph = parseWikiGraph(fixture);
      const known = new Set(graph.nodes.map(n => n.id));
      const linkRe = /\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g;
      for (const node of graph.nodes) {
        const resolved = new Set<string>();
        for (const match of node.body.matchAll(linkRe)) {
          const target = resolveWikiLink(node.id, match[1], known);
          if (target && target !== node.id) resolved.add(target);
        }
        expect([...resolved].sort()).toEqual([...node.links].sort());
      }
    }
  });
});

describe('helpers', () => {
  it('nodeDir', () => {
    expect(nodeDir('index')).toBe('');
    expect(nodeDir('a/b/c')).toBe('a/b');
  });

  it('normalizeWikiPath', () => {
    expect(normalizeWikiPath('', 'a.md')).toBe('a.md');
    expect(normalizeWikiPath('a/b', '../c.md')).toBe('a/c.md');
    expect(normalizeWikiPath('a', './/b//c.md')).toBe('a/b/c.md');
    expect(normalizeWikiPath('a', '../../../x.md')).toBe('x.md');
  });

  it('isWikiPageHref', () => {
    expect(isWikiPageHref('a.md')).toBe(true);
    expect(isWikiPageHref('a.md#x')).toBe(true);
    expect(isWikiPageHref('a.markdown')).toBe(false);
    expect(isWikiPageHref('http://x/a.md')).toBe(false);
  });
});
