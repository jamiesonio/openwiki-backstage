import { EmptyState, LinkButton } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import {
  GRAPH_EXPORT_DIR,
  GRAPH_FILE_NAME,
  OPENWIKI_PINNED_VERSION,
  README_PREREQUISITES_URL,
} from '../../constants';

export interface MissingGraphStateProps {
  /** The URL that was tried, shown so operators can check the site. */
  graphUrl?: string;
}

export const MissingGraphState = ({ graphUrl }: MissingGraphStateProps) => (
  <EmptyState
    missing="content"
    title="No OpenWiki export found"
    description={
      <>
        <Typography variant="body1" paragraph>
          This entity opts in to OpenWiki, but its TechDocs site has no{' '}
          <code>
            {GRAPH_EXPORT_DIR}/{GRAPH_FILE_NAME}
          </code>
          . Publish one with{' '}
          <code>
            openwiki visualize openwiki --export docs/{GRAPH_EXPORT_DIR}
          </code>{' '}
          (OpenWiki {OPENWIKI_PINNED_VERSION}) and rebuild the docs.
        </Typography>
        {graphUrl && (
          <Typography variant="caption" color="textSecondary" component="p">
            Looked for: {graphUrl}
          </Typography>
        )}
      </>
    }
    action={
      <LinkButton
        variant="contained"
        color="primary"
        to={README_PREREQUISITES_URL}
      >
        Read the prerequisites
      </LinkButton>
    }
  />
);
