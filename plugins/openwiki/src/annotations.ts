import { Entity } from '@backstage/catalog-model';
import {
  DEFAULT_WIKI_DOCS_PATH,
  OPENWIKI_ANNOTATION,
  OPENWIKI_DOCS_PATH_ANNOTATION,
  TECHDOCS_ANNOTATION,
} from './constants';

/**
 * Whether the OpenWiki tab should be offered for an entity: it needs both a
 * TechDocs site (`backstage.io/techdocs-ref`) and the explicit opt-in
 * annotation `wikigraph/openwiki: enabled`.
 *
 * @public
 */
export function isOpenWikiAvailable(entity: Entity): boolean {
  const annotations = entity.metadata?.annotations ?? {};
  const techdocsRef = annotations[TECHDOCS_ANNOTATION];
  const optIn = annotations[OPENWIKI_ANNOTATION];
  return (
    typeof techdocsRef === 'string' &&
    techdocsRef.trim().length > 0 &&
    typeof optIn === 'string' &&
    optIn.trim().toLowerCase() === 'enabled'
  );
}

/**
 * Path prefix (no leading or trailing slash) of the wiki pages inside the
 * entity's TechDocs site. Empty string means the wiki is the site root.
 */
export function getWikiDocsPath(entity: Entity): string {
  const raw = entity.metadata?.annotations?.[OPENWIKI_DOCS_PATH_ANNOTATION];
  const value = raw === undefined ? DEFAULT_WIKI_DOCS_PATH : raw;
  return value.replace(/^\/+|\/+$/g, '');
}
