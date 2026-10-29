# @internal/plugin-openwiki

A Backstage frontend plugin that adds an **OpenWiki** tab to Component entity
pages. The tab shows the repository's [OpenWiki](https://github.com/langchain-ai/openwiki)
knowledge graph (one node per wiki page, one edge per Markdown link between
pages) next to a reader for the selected page.

| Pinned OpenWiki version | Backstage | Frontend system                                        |
| ----------------------- | --------- | ------------------------------------------------------ |
| **0.7.2** (`27b3c76`)   | 1.56.0    | New frontend system (`@backstage/frontend-plugin-api`) |

> ⚠️ **`graph.json` is an undocumented format.** OpenWiki publishes no schema
> for the file this plugin reads. Its shape was reverse-engineered from the
> OpenWiki source and verified against real exports of version **0.7.2** only
> (see [GRAPH_SCHEMA.md](./GRAPH_SCHEMA.md)). A later OpenWiki may change it
> without notice. Keep the exporter pinned to the version above; when you
> upgrade OpenWiki, re-verify the schema, regenerate the fixtures and bump
> `OPENWIKI_PINNED_VERSION` in [`src/constants.ts`](./src/constants.ts).

## What it does

- **Graph** – a [Cytoscape.js](https://js.cytoscape.org/) canvas (bundled from
  npm, no CDN) with zoom/pan, a fit button, a per-type colour legend, a search
  box that flags matching nodes, and a highlight of the selected node and its
  direct neighbours (everything else fades).
- **Reader** – the selected page's Markdown rendered with `MarkdownContent`
  from `@backstage/core-components`, with type, description, tags and
  "Referenced by" backlinks. Links to other wiki pages select that node instead
  of navigating away; an **Open in TechDocs** link opens the same page in the
  full TechDocs reader.
- **Layout** – a resizable split pane (drag or arrow keys) that stacks
  vertically on narrow screens. Colours come from the Backstage theme, so dark
  mode works.
- **States** – loading, an empty state when the export is missing (with a link
  to the prerequisites below), and an error panel that names the failing field
  and the pinned version when `graph.json` fails validation.

## Install

The plugin lives in this monorepo as `plugins/openwiki` and is already wired
into `packages/app`:

1. `packages/app/package.json` depends on `"@internal/plugin-openwiki": "workspace:^"`.
2. `packages/app/src/App.tsx` lists `openwikiPlugin` in `createApp({ features })`
   (with `app.packages: all` in `app-config.yaml` it would also be discovered
   automatically).

The plugin registers the extension `entity-content:openwiki/graph` on the
catalog entity page, at path `openwiki`, in the _documentation_ group. It is
only shown for entities of kind **Component** that pass `isOpenWikiAvailable`
(both annotations below). You can override the filter, title or path per app in
`app-config.yaml`:

```yaml
app:
  extensions:
    - entity-content:openwiki/graph:
        config:
          title: Wiki
          filter: kind:component,api # shows it on APIs too (annotations still apply)
```

The "Open in TechDocs" link uses the external route `viewTechDoc`, bound to
`techdocs.docRoot` by default. If TechDocs is not installed the link is simply
omitted.

### Dependencies added

`cytoscape` (+ `@types/cytoscape`), `zod`, `@backstage/plugin-catalog-react`,
`@backstage/plugin-techdocs-react`, `@backstage/catalog-model`. No backend
plugin and no new backend routes.

## Deployment prerequisites

These are **assumed**, not built here. For each entity that should get the tab:

1. **An OpenWiki export inside the entity's TechDocs site**, at
   `openwiki-graph/graph.json` relative to the site root. Generate it in the
   repository with the pinned version and commit it next to the docs:

   ```sh
   npx openwiki@0.7.2 visualize openwiki --export docs/openwiki-graph
   ```

   mkdocs copies non-Markdown files in `docs/` verbatim, so after the TechDocs
   build the file is served at
   `<techdocs-storage>/<namespace>/<kind>/<name>/openwiki-graph/graph.json`.
   The other exported files (`index.html`, `client.js`, `client-lib.js`,
   `styles.css`) are harmless and may be kept or deleted. Do not run
   `openwiki --init` from CI unless you want it to call an LLM; `visualize` is
   purely local.

2. **The wiki pages published in the same TechDocs site** (optional but
   recommended), by default under `openwiki/` (i.e. `docs/openwiki/**.md`).
   This is what the "Open in TechDocs" links point at. If the pages live
   elsewhere in the site, set the `wikigraph/openwiki-docs-path` annotation; if
   they are not published at all the links will 404 in TechDocs but the tab
   itself still works because the page bodies are inside `graph.json`.

3. **Annotations on the entity:**

   ```yaml
   metadata:
     annotations:
       backstage.io/techdocs-ref: dir:.
       wikigraph/openwiki: enabled
       # optional, default "openwiki"; "" means the wiki is the docs root
       # wikigraph/openwiki-docs-path: wiki
   ```

4. **Pinned OpenWiki version:** `0.7.2`. Record the same version wherever the
   export is produced (CI, pre-commit, Makefile). The plugin shows it in its
   error panel so mismatches are easy to spot.

## Annotations

| Annotation                     | Required | Meaning                                                                 |
| ------------------------------ | -------- | ----------------------------------------------------------------------- |
| `backstage.io/techdocs-ref`    | yes      | Standard TechDocs annotation; the export is read from this site.        |
| `wikigraph/openwiki`           | yes      | Must be `enabled` (case-insensitive) to show the tab.                   |
| `wikigraph/openwiki-docs-path` | no       | Path of the wiki Markdown inside the TechDocs site; default `openwiki`. |

`isOpenWikiAvailable(entity)` is exported for use in your own entity-page
logic and checks the first two.

## How page content is loaded

`graph.json` is fetched through the TechDocs storage API:
`techdocsStorageApiRef.getBaseUrl('graph.json', entityRef, 'openwiki-graph/')`
gives the same storage URL the TechDocs reader uses for its assets, and the
request goes through `fetchApiRef`, so it carries the user's Backstage
credentials and works with every TechDocs publisher (local, S3, GCS, Azure,
OpenStack) because the TechDocs backend proxies the static files. A `404`
renders the empty state; any other non-2xx renders an error panel.

`getEntityDocs()` was not usable for this: it always appends `/index.html` to
the requested path because it is designed for rendered pages.

**Page Markdown comes from `graph.json` itself.** Each node carries a `body`
field: the raw Markdown with the frontmatter stripped (OpenWiki's own
visualizer renders pages from the same field). No second request is made per
page. TechDocs' rendered pages were not used because they are HTML, not
Markdown, and would have required stripping the mkdocs theme chrome;
re-fetching the raw `.md` from TechDocs storage was not needed since the export
already contains it. Trade-off: images and non-wiki relative links inside a page
are not rewritten to TechDocs storage URLs, so relative images will not load in
the tab (they do in the full TechDocs reader, one click away).

## Development

```sh
# run the plugin's dev page: fixtures only, no TechDocs/catalog/backend
yarn workspace @internal/plugin-openwiki start

# tests, lint, types
yarn workspace @internal/plugin-openwiki test
yarn backstage-cli repo lint plugins/openwiki packages/app
yarn tsc
```

The dev page lets you switch between the three bundled fixtures and the
ready / missing / invalid / loading states, and follows the app theme toggle.

### Fixtures

`src/__fixtures__/` holds real `openwiki visualize --export` output of version
0.7.2 plus the exact Markdown each was generated from (see
[`NOTICE.md`](./src/__fixtures__/NOTICE.md)). The largest, `openwiki-repo`
(29 pages, 109 edges), is the OpenWiki repository's own wiki.

### What is tested

- **Validator** (`src/schema/schema.test.ts`): every fixture parses and
  satisfies the builder's invariants; each fixture's node bodies equal the
  source files minus frontmatter; wrong types, missing fields, dangling edges,
  duplicate ids, non-JSON and non-objects fail with the right field path;
  unknown extra fields are tolerated.
- **Link resolution** (`src/graph/resolveLink.test.ts`): relative, `../`,
  anchored, percent-encoded (single decode), malformed-encoding, external,
  absolute, directory and self links; and a property test that re-deriving
  every fixture's edges from page bodies reproduces `node.links` exactly.
- **Graph helpers, annotations, TechDocs paths, reader link helpers**.
- **Components** (`OpenWikiExplorer.test.tsx`, `OpenWikiContent.test.tsx`, with
  a Cytoscape test double and mocked `techdocsStorageApiRef`/`fetchApiRef`):
  renders the fixture graph, highlights selection and neighbours, selects via
  graph tap, search result and in-page wiki link (without navigating),
  rewrites links to TechDocs URLs when available, and covers the missing,
  HTML-shell, invalid and error states.

## Known limitations and open questions

- The Cytoscape canvas is not exercised in jsdom; its wiring is covered through
  a test double. Check it visually with the dev page.
- Mermaid code blocks in wiki pages render as plain code (OpenWiki's own viewer
  renders them). `MarkdownContent` has no Mermaid support.
- Relative images in pages are not rewritten to TechDocs storage URLs.
- Six of the 29 pages in the real fixture have `tags: []` in `graph.json`
  although their source declares tags: OpenWiki's frontmatter parser does not
  understand Prettier-wrapped multi-line arrays (GRAPH_SCHEMA.md, surprise 1).
  Search over tags is therefore incomplete for such pages.
- `graph.json` embeds every page body; a very large wiki means a large file
  (the 29-page fixture is ~0.6 MB). It is fetched once per tab visit.
- The `cose` layout runs in the browser on every visit and is randomised, so
  node positions differ between visits.
