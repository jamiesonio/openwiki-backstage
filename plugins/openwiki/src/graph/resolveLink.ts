/**
 * Link-to-node resolution, mirroring OpenWiki's builder (`linkNodes` in
 * src/visualize/graph.ts) and static client (`normalize` + `rewriteLinks`).
 * See GRAPH_SCHEMA.md, "How edges are resolved".
 */

/** Directory part of a node id (`architecture/overview` -> `architecture`). */
export function nodeDir(nodeId: string): string {
  const slash = nodeId.lastIndexOf('/');
  return slash === -1 ? '' : nodeId.slice(0, slash);
}

/**
 * Collapse a relative path against a base directory the way OpenWiki's client
 * `normalize()` does: `.` is dropped, `..` pops, leading/duplicate slashes are
 * ignored. `..` above the root is clamped (matching `path.resolve` semantics
 * only when the wiki root is the filesystem root; OpenWiki never produces such
 * links, so the difference is academic).
 */
export function normalizeWikiPath(baseDir: string, rel: string): string {
  const parts = (baseDir ? baseDir.split('/') : []).concat(rel.split('/'));
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

/**
 * Whether an href looks like a wiki page link (`*.md` or `*.md#anchor`).
 * Anything with a scheme (`https:`, `mailto:`) or a leading `/` or `#` is not.
 */
export function isWikiPageHref(href: string): boolean {
  if (!href) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  if (href.startsWith('/') || href.startsWith('#')) return false;
  const clean = href.split('#')[0].split('?')[0];
  return clean.endsWith('.md');
}

/**
 * Resolve an href found in `fromNodeId`'s rendered Markdown to the id of the
 * node it points at, or `undefined` if it is not a link to a known page.
 *
 * Steps, as in the builder: strip anchor, decode once (keep literal text if
 * decoding throws), resolve against the source page's directory, drop `.md`,
 * require a matching node. Self-links resolve to the page itself (the caller
 * decides whether that is a no-op).
 */
export function resolveWikiLink(
  fromNodeId: string,
  href: string | null | undefined,
  knownIds: ReadonlySet<string> | ((id: string) => boolean),
): string | undefined {
  if (!href || !isWikiPageHref(href)) return undefined;
  const clean = href.split('#')[0].split('?')[0];
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    // Malformed escape: keep the literal text, like the builder does.
  }
  const target = normalizeWikiPath(nodeDir(fromNodeId), decoded).replace(
    /\.md$/,
    '',
  );
  if (!target) return undefined;
  const isKnown =
    typeof knownIds === 'function'
      ? knownIds
      : (id: string) => knownIds.has(id);
  return isKnown(target) ? target : undefined;
}
