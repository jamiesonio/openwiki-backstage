import {
  Entity,
  getCompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { fetchApiRef, useApi } from '@backstage/frontend-plugin-api';
import { techdocsStorageApiRef } from '@backstage/plugin-techdocs-react';
import useAsync from 'react-use/esm/useAsync';
import { GRAPH_EXPORT_DIR, GRAPH_FILE_NAME } from '../constants';
import { GraphValidationError, parseWikiGraphText } from '../schema/schema';
import type { WikiGraph } from '../schema/types';

/**
 * Result of loading an entity's OpenWiki export.
 *
 * @public
 */
export type OpenWikiGraphState =
  | { status: 'loading' }
  /** The TechDocs site has no `openwiki-graph/graph.json`. */
  | { status: 'missing'; graphUrl: string }
  /** The file exists but is not a graph.json this plugin understands. */
  | { status: 'invalid'; error: GraphValidationError; graphUrl: string }
  /** Network / backend failure. */
  | { status: 'error'; error: Error }
  | { status: 'ready'; graph: WikiGraph; graphUrl: string };

/**
 * Fetch `openwiki-graph/graph.json` from the entity's TechDocs site.
 *
 * Why not `techdocsStorageApi.getEntityDocs()`: that method always appends
 * `/index.html` to the path (it is built for rendered pages), so it cannot
 * return an arbitrary file. `getBaseUrl()` gives the storage URL the TechDocs
 * reader itself uses for assets, and `fetchApi` carries the Backstage identity
 * token, so the request goes through exactly the same auth and proxying as the
 * documentation pages. No extra backend is involved.
 */
export function useOpenWikiGraph(entity: Entity): OpenWikiGraphState {
  const storageApi = useApi(techdocsStorageApiRef);
  const fetchApi = useApi(fetchApiRef);
  const entityRef = getCompoundEntityRef(entity);
  const entityRefKey = stringifyEntityRef(entityRef);

  const { loading, error, value } = useAsync(async (): Promise<
    Exclude<OpenWikiGraphState, { status: 'loading' | 'error' }>
  > => {
    const graphUrl = await storageApi.getBaseUrl(
      GRAPH_FILE_NAME,
      entityRef,
      `${GRAPH_EXPORT_DIR}/`,
    );
    const response = await fetchApi.fetch(graphUrl, {
      headers: { accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
    });
    if (response.status === 404) {
      return { status: 'missing', graphUrl };
    }
    if (!response.ok) {
      throw new Error(
        `TechDocs storage returned ${response.status} ${response.statusText} for ${graphUrl}`,
      );
    }
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    // Some publishers answer unknown paths with the site's HTML shell and a
    // 200. That is "no export", not "broken export".
    if (/text\/html/i.test(contentType) && /^\s*</.test(text)) {
      return { status: 'missing', graphUrl };
    }
    try {
      return { status: 'ready', graph: parseWikiGraphText(text), graphUrl };
    } catch (e) {
      if (e instanceof GraphValidationError) {
        return { status: 'invalid', error: e, graphUrl };
      }
      throw e;
    }
    // storageApi/fetchApi are stable per app; the entity ref is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityRefKey, storageApi, fetchApi]);

  if (loading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  return value ?? { status: 'loading' };
}
