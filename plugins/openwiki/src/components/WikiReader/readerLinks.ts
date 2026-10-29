/** Hash prefix used for in-reader wiki links when no TechDocs URL is available. */
export const WIKI_LINK_HASH_PREFIX = '#openwiki:';

/** Node id encoded in an anchor's hash by {@link WIKI_LINK_HASH_PREFIX}, if any. */
export function nodeIdFromHash(
  hash: string | null | undefined,
): string | undefined {
  if (!hash || !hash.startsWith(WIKI_LINK_HASH_PREFIX)) return undefined;
  const encoded = hash.slice(WIKI_LINK_HASH_PREFIX.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * The reader prints the page title itself, and OpenWiki pages almost always
 * repeat it as a leading `# Title`. Drop that one heading when it matches, so
 * the title is not shown twice. Anything else is left untouched.
 */
export function stripLeadingTitle(body: string, title: string): string {
  const match = body.match(/^\s*#\s+(.+?)\s*#*\s*(\r?\n|$)/);
  if (!match) return body;
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalize(match[1]) !== normalize(title)) return body;
  return body.slice(match[0].length).replace(/^\s*\n/, '');
}
