# Fixture provenance

These fixtures are real output of `openwiki visualize <wiki> --export <dir>`
from OpenWiki **v0.7.2** (commit `27b3c76cb9b28bc3bb31ccbeb4f0192b0802cf96`).
Each directory holds the exported `graph.json` and, under `source/`, the exact
Markdown tree it was generated from, so the reader can be tested against the
original pages. Only `graph.json` is copied from the export; the other static
files (`index.html`, `client.js`, `client-lib.js`, `styles.css`) are not needed.

| Fixture         | Origin                                                                                                                                   | Pages | Edges |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| `openwiki-repo` | The `openwiki/` wiki shipped in the OpenWiki repository itself (MIT licensed, © LangChain)                                               | 29    | 109   |
| `unicode`       | Re-created from `test/visualize/visualize-graph.test.ts` ("decodes Unicode and special-character links")                                 | 5     | 3     |
| `edge-cases`    | Re-created from `test/visualize/visualize-graph.test.ts` (scaffolding exclusion, self/duplicate/missing links, page without frontmatter) | 3     | 2     |

The `generatedAt` timestamps are whatever the clock said when the export ran;
nothing in the plugin depends on them.

The OpenWiki repository is licensed under the MIT License
(https://github.com/langchain-ai/openwiki/blob/v0.7.2/LICENSE).
