# OpenWiki `graph.json` schema (as of OpenWiki v0.7.2)

> **Status: reverse-engineered, not a public contract.** OpenWiki publishes no
> specification for `graph.json`. Everything below was derived from the source
> at tag `v0.7.2` (commit
> [`27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96`](https://github.com/langchain-ai/openwiki/tree/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96))
> and confirmed against real exports produced by that exact version (the
> fixtures in [`src/__fixtures__`](./src/__fixtures__/NOTICE.md)). Re-verify it
> before bumping `OPENWIKI_PINNED_VERSION` in [`src/constants.ts`](./src/constants.ts).

## Where the file comes from

`openwiki visualize <wiki-dir> --export <dir>` is parsed in
[`src/cli/commands.ts`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/cli/commands.ts#L440-L496)
and ends in
[`exportStaticVisualizer()`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/static-export.ts#L46-L80),
which writes five sibling files: `index.html`, `client.js`, `client-lib.js`,
`styles.css` and `graph.json`. `graph.json` is
`JSON.stringify(buildGraph(wikiRoot), null, 2) + "\n"`, where `buildGraph` lives in
[`src/visualize/graph.ts`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts).
The same object is what the live server returns from `/api/graph`; the static
client fetches `./graph.json` instead
([`client.ts#L337`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/client.ts#L337)).

The authoritative TypeScript types are `WikiGraph`, `WikiNode` and `WikiEdge` in
[`graph.ts#L7-L130`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L37-L135).
The compiled `dist/visualize/graph.js` in the npm package `openwiki@0.7.2` was
diffed against the tag and matches.

## Top level: `WikiGraph`

| Field         | Type         | Optional | Meaning                                                                                                                           |
| ------------- | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `root`        | `string`     | no       | `path.basename(wikiRoot)`; the wiki directory name (`"openwiki"` for a standard repo wiki). Header text only.                     |
| `generatedAt` | `string`     | no       | `new Date().toISOString()` at build time. ISO-8601 with milliseconds and `Z`. Changes on every export.                            |
| `types`       | `string[]`   | no       | Sorted (`Array.prototype.sort`, i.e. UTF-16 code unit order) set of every distinct `node.type`. Drives the legend/colour mapping. |
| `nodes`       | `WikiNode[]` | no       | One per Markdown page, ordered by the sorted absolute file path.                                                                  |
| `edges`       | `WikiEdge[]` | no       | Every resolved, de-duplicated directed link between two pages.                                                                    |

No field is ever omitted and no other top-level keys are written. JSON `null` never
appears anywhere in the file.

## `WikiNode`

| Field         | Type       | Optional | How it is produced                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`   | no       | Path of the `.md` file relative to the wiki root, `\` normalised to `/`, with the trailing `.md` removed ([`toId`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L222-L227)). **Not URL-encoded**: spaces, `#`, `%` and non-ASCII characters appear verbatim (`"events/靖难之役 #1%"`). A file literally named `%E4%B8%80.md` yields the id `"%E4%B8%80"`. |
| `title`       | `string`   | no       | `frontmatter.title`, else for `index.md` files the capitalised directory name (`"Home"` for the root index), else the first `# ` H1 in the body, else the filename without `.md`.                                                                                                                                                                                                                                          |
| `type`        | `string`   | no       | `frontmatter.type`, else `"Section"` for `index.md` files, else `"Reference"`. Real wikis use free-form kebab-case values (`"architecture-overview"`, `"operations-guide"`, even `"integration guide"` with a space), so treat it as an open string.                                                                                                                                                                       |
| `description` | `string`   | no       | `frontmatter.description`, else `""`.                                                                                                                                                                                                                                                                                                                                                                                      |
| `tags`        | `string[]` | no       | `frontmatter.tags` when it parsed as a list, else `[]`. See the parser caveat below.                                                                                                                                                                                                                                                                                                                                       |
| `body`        | `string`   | no       | The **raw Markdown** with the frontmatter block removed. Links inside it are left exactly as written (still relative, still `.md`, still percent-encoded if the author encoded them).                                                                                                                                                                                                                                      |
| `size`        | `number`   | no       | `body.length` (UTF-16 code units, not bytes). Non-negative integer. Used by the client to scale node radius.                                                                                                                                                                                                                                                                                                               |
| `links`       | `string[]` | no       | Ids of pages this page links to, in order of first appearance, de-duplicated, self-links removed. Always consistent with `edges` where `source === id`.                                                                                                                                                                                                                                                                    |
| `backlinks`   | `string[]` | no       | Ids of pages that link here, in the order their source pages were processed (sorted path order).                                                                                                                                                                                                                                                                                                                           |

The frontmatter keys OpenWiki recognises are only `type`, `title`, `description`
and `tags` ([`readMeta`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L201-L212)).
Everything else in the frontmatter (`okf_version`, `sources`, provenance, ...) is
dropped and does **not** reach `graph.json`.

## `WikiEdge`

| Field    | Type     | Optional | Meaning                          |
| -------- | -------- | -------- | -------------------------------- |
| `source` | `string` | no       | `id` of the page the link is in. |
| `target` | `string` | no       | `id` of the page it points to.   |

Both always refer to ids present in `nodes`; dangling edges cannot occur.

## How edges are resolved

[`linkNodes`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L302-L330),
for every node, in node order:

1. Find link targets in the **body** with the regex
   `/\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g`
   ([`MARKDOWN_LINK`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L145)).
   Consequences: only inline `[text](target.md)` and `[text](target.md#anchor)`
   links count; reference-style links, bare URLs, `<a href>` HTML, links with a
   space or `)` in the target, links to directories (`[x](architecture/)`) and
   links without a `.md` suffix are ignored. The regex is run on the body
   verbatim, so a link inside a fenced code block also counts.
2. `decodeURIComponent` the target once; if that throws (malformed `%ZZ`), keep
   the literal text.
3. Resolve it against the **directory of the source page** with `path.resolve`
   and turn it back into an id with `toId`. `../` therefore works, and absolute
   paths (`/foo.md`) resolve against the filesystem root and never match.
4. Drop the link if the target id is not a node, equals the source id
   (self-link), or the `(source, target)` pair was already seen.
5. Otherwise push `{source, target}` to `edges`, `target` to `source.links` and
   `source` to `target.backlinks`.

The static client re-implements step 3 in the browser as
[`normalize()`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/client-lib.ts#L182-L191)
(pure string path collapsing) and intercepts clicks on rendered `.md` links whose
normalised target is a known node
([`rewriteLinks`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/client.ts#L726-L745)).
This plugin's `resolveWikiLink()` mirrors that behaviour, plus the single
`decodeURIComponent` from the builder, which the client's `rewriteLinks` does
not do (so in the original UI a percent-encoded link to a Unicode page is an
edge in the graph but not a clickable in-app link).

## What is excluded

[`collectMarkdown`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L251-L270):

- Only regular files whose name ends in `.md`. Directories are recursed into,
  including dot-directories such as `.claims/` (they just rarely contain `.md`).
- Files named exactly `INSTRUCTIONS.md` or `log.md` are skipped **at any depth**
  ([`EXCLUDED_FILES`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/graph.ts#L140)).
  Note the task brief only mentioned `INSTRUCTIONS.md`; `log.md` is excluded too.
- Symlinks are never followed (a symlink dirent is neither a directory nor a
  file), and anything whose resolved path leaves the wiki root is ignored.

Links to excluded or missing files are silently dropped from `edges` but remain
in `body` as plain text links.

## What the static client actually reads

From [`client.ts`](https://github.com/langchain-ai/openwiki/blob/27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96/src/visualize/client.ts):
`root` and `nodes.length` (header), `types` (legend and per-type colours via
`colorsForTypes`), `edges[].source/target` (force-graph links) and on each node
`id`, `title`, `type`, `size`, `tags`, `description`, `body`, `backlinks`.
`node.links` and `generatedAt` are **never read** by the client; they are only
present because the builder writes the full object. The reader also runs
`stripFrontmatter()` on `body` again before rendering, even though the builder
already stripped it (defensive; no fixture has a body that starts with `---`).

## Source vs. real output: discrepancies and surprises

1. **Multi-line `tags:` arrays are lost.** OpenWiki's own generator emits
   Prettier-wrapped YAML such as
   ```yaml
   tags: [architecture, cli]
   ```
   `splitFrontmatter` only understands `key: [a, b]` on one line or a dashed
   list. An empty value after `tags:` starts a dashed list, the `[` lines match
   nothing, so the node ends up with `tags: []`. Confirmed on six of the 29 pages
   in the `openwiki-repo` fixture (e.g. `architecture/overview` has eight tags in
   its source and `[]` in `graph.json`). Downstream: never assume `tags` reflects
   the page.
2. **`type` is not an enum.** The source comments describe `"Reference"` /
   `"Section"`, but those are only the fallbacks. Real pages carry whatever the
   generator wrote in frontmatter; the fixture has 16 distinct values.
3. **Quoted frontmatter scalars lose exactly one pair of quotes**, so
   `description: "Quoted description"` becomes `Quoted description`, but YAML
   escapes inside are not processed.
4. **Ids are decoded, bodies are not.** The id for a page linked as
   `%E9%9D%96...%25.md` is the decoded filename, while the `body` still contains
   the encoded href. Resolving links from `body` therefore needs the same decode
   step as the builder.
5. **`generatedAt` is not stable**; two exports of an identical wiki differ only
   in this field.
6. **`size === body.length`** held for every node in every export; it is
   derived, not independent data. The validator still requires it (it is a
   number the client uses) but does not enforce the equality.

## Validation policy used by this plugin

`src/schema/schema.ts` requires exactly the shape above (all fields present,
correct primitive types, `size` a finite non-negative number) and additionally
checks referential integrity (every `edge.source`/`edge.target` is a node id,
ids are unique). Unknown extra keys are **allowed and ignored** so a future
OpenWiki that adds fields keeps working; a future OpenWiki that renames or drops
a field will fail validation with the offending path, which the UI shows next
to the pinned version.
