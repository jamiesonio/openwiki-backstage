# openwiki-backstage

A [Backstage](https://backstage.io) app that includes `@internal/plugin-openwiki`,
a frontend plugin that adds an **OpenWiki** tab to Component entity pages. The
tab renders a repository's [OpenWiki](https://github.com/langchain-ai/openwiki)
knowledge graph (one node per wiki page, one edge per Markdown link) next to a
reader for the selected page.

```sh
yarn install
yarn start
```

The plugin itself is documented in [`plugins/openwiki/README.md`](./plugins/openwiki/README.md).
This page covers what a **repository must publish in TechDocs** for the graph to
render.

## How the graph gets its data

The plugin has no backend. It fetches one file, `graph.json`, from the entity's
**TechDocs site** through the TechDocs storage API, using the same URL, auth and
publisher (local, S3, GCS, Azure, OpenStack) that TechDocs uses for its own
assets. Every wiki page's Markdown is embedded in that file, so the tab needs
nothing else to render.

```
repo/docs/openwiki-graph/graph.json
        │  TechDocs build (mkdocs copies non-Markdown files verbatim)
        ▼
<techdocs-storage>/<namespace>/<kind>/<name>/openwiki-graph/graph.json
        │  fetched by the plugin
        ▼
OpenWiki tab on the entity page
```

## Checklist for a repo that should get the graph

### 1. A working TechDocs site

The repo needs the standard TechDocs setup. If it already publishes docs, skip this.

```yaml
# mkdocs.yml (repo root)
site_name: my-service
plugins:
  - techdocs-core
```

`docs/index.md` must exist. Docs must build and publish through your normal
TechDocs pipeline (`techdocs-cli generate` + `publish` in CI, or the `local`
builder in development).

### 2. Export the graph into `docs/`

Generate the export with the **pinned OpenWiki version (0.7.2)** and commit it:

```sh
npx openwiki@0.7.2 visualize openwiki --export docs/openwiki-graph
```

| Requirement | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Location    | `openwiki-graph/graph.json`, relative to the TechDocs site root             |
| Source      | `docs/openwiki-graph/graph.json` in the repo                                |
| Version     | OpenWiki `0.7.2` (the plugin validates against this exact format)           |
| Regenerate  | Whenever the wiki pages change, ideally in CI or a pre-commit hook          |

- `visualize` is purely local. It does not call an LLM. Do not run
  `openwiki --init` in CI unless you want that.
- The other exported files (`index.html`, `client.js`, `client-lib.js`,
  `styles.css`) are harmless and can be kept or deleted.
- `graph.json` embeds every page body. The 29-page example is about 0.6 MB and
  is fetched once per tab visit.

### 3. Publish the wiki pages in the same site (recommended)

Put the wiki Markdown under `docs/openwiki/**.md`. This only affects the
**Open in TechDocs** links. If the pages are missing, those links 404 but the
tab still works. If the pages live somewhere else in the site, set
`wikigraph/openwiki-docs-path` (below). Use `""` if the wiki is the docs root.

### 4. Annotate the catalog entity

The tab appears only on entities of kind **Component** that have both required
annotations.

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    backstage.io/techdocs-ref: dir:.
    wikigraph/openwiki: enabled
    # optional, default "openwiki"
    # wikigraph/openwiki-docs-path: wiki
spec:
  type: service
  lifecycle: production
  owner: my-team
```

| Annotation                     | Required | Meaning                                                    |
| ------------------------------ | -------- | ---------------------------------------------------------- |
| `backstage.io/techdocs-ref`    | yes      | Standard TechDocs annotation. The export is read from here. |
| `wikigraph/openwiki`           | yes      | Must be `enabled` (case-insensitive).                      |
| `wikigraph/openwiki-docs-path` | no       | Wiki Markdown path inside the site. Default `openwiki`.    |

### 5. Backstage app side

Already wired in this app (`packages/app/src/App.tsx` lists `openwikiPlugin`,
and the TechDocs plugin is installed). Another Backstage app needs:

- `@internal/plugin-openwiki` added to `packages/app` and registered in
  `createApp({ features })`, or discovered with `app.packages: all`.
- The TechDocs frontend and backend plugins enabled.

## What you see in the tab

| State               | Cause                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| No tab              | Entity is not a Component, or one of the two required annotations is missing.                 |
| "No OpenWiki export found" | The site has no `openwiki-graph/graph.json` (404). Also shown if the publisher answers unknown paths with an HTML page. |
| "Invalid export" panel | The file exists but fails validation. The panel names the failing field and the pinned version. Usually an OpenWiki version mismatch. |
| Error panel         | TechDocs storage returned a non-2xx status other than 404, or the request failed.             |
| Graph + reader      | Everything above is in place.                                                                 |

## Troubleshooting

1. **No tab:** check the two annotations on the entity in the catalog, and that
   `kind` is `Component`.
2. **"No OpenWiki export found":** open the "Looked for" URL shown in the
   panel. If it 404s, the file was not in `docs/` at build time, or the docs were
   not rebuilt and republished after you added it.
3. **"Invalid export":** regenerate with exactly `openwiki@0.7.2`. See
   [`GRAPH_SCHEMA.md`](./plugins/openwiki/GRAPH_SCHEMA.md) for the expected shape.
4. **Open in TechDocs 404s:** the wiki pages are not published at
   `docs/openwiki/`. Move them or set `wikigraph/openwiki-docs-path`.
5. **Graph is stale:** TechDocs serves what was last published. Re-export, commit,
   and rebuild the docs.

## Known limitations

- `graph.json` is an undocumented OpenWiki format. The plugin is verified against
  **0.7.2 only**. When upgrading, re-check the schema, regenerate the fixtures and
  bump `OPENWIKI_PINNED_VERSION` in `plugins/openwiki/src/constants.ts`.
- Mermaid blocks in wiki pages render as plain code in the tab.
- Relative images in pages do not load in the tab. They do load in the full
  TechDocs reader.
- Some pages can show empty `tags` if their frontmatter uses Prettier-wrapped
  multi-line arrays, so tag search can be incomplete.

## Development

```sh
yarn workspace @internal/plugin-openwiki start   # dev page with fixtures, no backend
yarn workspace @internal/plugin-openwiki test
yarn tsc
```
