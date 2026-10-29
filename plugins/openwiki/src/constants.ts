/**
 * The OpenWiki release whose `graph.json` output this plugin was built and
 * tested against. Bump it only after re-verifying GRAPH_SCHEMA.md against the
 * new release's `src/visualize/graph.ts` and re-generating the fixtures.
 */
export const OPENWIKI_PINNED_VERSION = '0.7.2';

/**
 * Git commit of the pinned release, for linking into the OpenWiki source.
 */
export const OPENWIKI_PINNED_COMMIT =
  '27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96';

/**
 * Standard TechDocs annotation. Required so the plugin knows the entity has a
 * TechDocs site to read the export from.
 */
export const TECHDOCS_ANNOTATION = 'backstage.io/techdocs-ref';

/**
 * Opt-in annotation. Value must be exactly `enabled`.
 */
export const OPENWIKI_ANNOTATION = 'wikigraph/openwiki';

/**
 * Optional annotation overriding where the wiki Markdown pages live inside the
 * TechDocs site, used to build "open in TechDocs" links. Defaults to
 * {@link DEFAULT_WIKI_DOCS_PATH}.
 */
export const OPENWIKI_DOCS_PATH_ANNOTATION = 'wikigraph/openwiki-docs-path';

/**
 * Default location of the wiki pages within the TechDocs site, relative to the
 * site root (i.e. `docs/openwiki/**.md` in the mkdocs project).
 */
export const DEFAULT_WIKI_DOCS_PATH = 'openwiki';

/**
 * Where the OpenWiki export is expected inside an entity's TechDocs site,
 * relative to the site root.
 */
export const GRAPH_EXPORT_DIR = 'openwiki-graph';
export const GRAPH_FILE_NAME = 'graph.json';

/**
 * README anchor shown in the empty state when no export was found.
 */
export const README_PREREQUISITES_URL =
  'https://github.com/jamiesonio/openwiki-backstage/blob/main/plugins/openwiki/README.md#deployment-prerequisites';
