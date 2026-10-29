import { getCompoundEntityRef } from '@backstage/catalog-model';
import { ErrorPanel, Progress } from '@backstage/core-components';
import { useRouteRef } from '@backstage/frontend-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useCallback } from 'react';
import { getWikiDocsPath } from '../../annotations';
import { useOpenWikiGraph } from '../../api/useOpenWikiGraph';
import { viewTechDocRouteRef } from '../../routes';
import { techdocsPagePath } from '../../techdocs';
import { OpenWikiExplorer } from '../OpenWikiExplorer';
import { InvalidGraphPanel, MissingGraphState } from '../states';

/**
 * The entity tab. Reads the current entity, loads its export through the
 * TechDocs storage API and renders the right state.
 */
export const OpenWikiContent = () => {
  const { entity } = useEntity();
  const state = useOpenWikiGraph(entity);
  const techdocsRoute = useRouteRef(viewTechDocRouteRef);
  const docsPath = getWikiDocsPath(entity);
  const { namespace, kind, name } = getCompoundEntityRef(entity);

  const techdocsHref = useCallback(
    (nodeId: string) => {
      if (!techdocsRoute) return undefined;
      const base = techdocsRoute({ namespace, kind, name }).replace(/\/+$/, '');
      return `${base}/${techdocsPagePath(docsPath, nodeId)}`;
    },
    [techdocsRoute, namespace, kind, name, docsPath],
  );

  switch (state.status) {
    case 'loading':
      return <Progress />;
    case 'missing':
      return <MissingGraphState graphUrl={state.graphUrl} />;
    case 'invalid':
      return (
        <InvalidGraphPanel error={state.error} graphUrl={state.graphUrl} />
      );
    case 'error':
      return (
        <ErrorPanel
          title="Could not load the OpenWiki export"
          error={state.error}
        />
      );
    case 'ready':
      return (
        <OpenWikiExplorer graph={state.graph} techdocsHref={techdocsHref} />
      );
    default:
      return null;
  }
};
