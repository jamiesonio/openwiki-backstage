import { createFrontendPlugin } from '@backstage/frontend-plugin-api';
import { EntityContentBlueprint } from '@backstage/plugin-catalog-react/alpha';
import { isOpenWikiAvailable } from './annotations';
import { entityContentRouteRef, viewTechDocRouteRef } from './routes';

/**
 * The "OpenWiki" tab on Component entity pages. Only shown when the entity
 * carries both `backstage.io/techdocs-ref` and `wikigraph/openwiki: enabled`.
 * Extension id: `entity-content:openwiki/graph`.
 */
export const openwikiEntityContent = EntityContentBlueprint.make({
  name: 'graph',
  params: {
    path: 'openwiki',
    title: 'OpenWiki',
    group: 'documentation',
    routeRef: entityContentRouteRef,
    filter: entity =>
      entity.kind.toLocaleLowerCase('en-US') === 'component' &&
      isOpenWikiAvailable(entity),
    loader: () =>
      import('./components/OpenWikiContent').then(m => <m.OpenWikiContent />),
  },
});

/** @public */
export const openwikiPlugin = createFrontendPlugin({
  pluginId: 'openwiki',
  extensions: [openwikiEntityContent],
  routes: {
    entityContent: entityContentRouteRef,
  },
  externalRoutes: {
    viewTechDoc: viewTechDocRouteRef,
  },
});
