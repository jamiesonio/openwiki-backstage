import {
  createExternalRouteRef,
  createRouteRef,
} from '@backstage/frontend-plugin-api';

/** Route of the OpenWiki entity tab itself. */
export const entityContentRouteRef = createRouteRef();

/**
 * Link into the TechDocs reader. Bound to `techdocs.docRoot` by default; the
 * tab simply omits "Open in TechDocs" links when TechDocs is not installed.
 */
export const viewTechDocRouteRef = createExternalRouteRef({
  params: ['namespace', 'kind', 'name'],
  defaultTarget: 'techdocs.docRoot',
});
