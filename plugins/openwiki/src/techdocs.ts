/**
 * Path of a wiki page inside the rendered TechDocs (mkdocs) site, relative to
 * the site root and without a leading slash. mkdocs' default
 * `use_directory_urls: true` maps `foo/bar.md` to `foo/bar/` and
 * `foo/index.md` to `foo/`.
 */
export function techdocsPagePath(docsPrefix: string, nodeId: string): string {
  const prefix = docsPrefix.replace(/^\/+|\/+$/g, '');
  const page = nodeId.replace(/(^|\/)index$/, '');
  const joined = [prefix, page].filter(Boolean).join('/');
  const encoded = joined
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return encoded ? `${encoded}/` : '';
}
