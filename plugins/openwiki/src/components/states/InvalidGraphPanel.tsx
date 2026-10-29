import { Link, WarningPanel } from '@backstage/core-components';
import { List, ListItem, ListItemText, Typography } from '@material-ui/core';
import {
  OPENWIKI_PINNED_VERSION,
  README_PREREQUISITES_URL,
} from '../../constants';
import type { GraphValidationError } from '../../schema/schema';

export interface InvalidGraphPanelProps {
  error: GraphValidationError;
  graphUrl?: string;
}

const MAX_ISSUES = 8;

export const InvalidGraphPanel = ({
  error,
  graphUrl,
}: InvalidGraphPanelProps) => (
  <WarningPanel
    severity="error"
    defaultExpanded
    title="OpenWiki graph.json failed validation"
    message={
      <>
        Field <code>{error.field}</code>: {error.issues[0]?.message}. This
        plugin is pinned to OpenWiki <strong>{OPENWIKI_PINNED_VERSION}</strong>;
        the graph.json format is undocumented and may have changed if the export
        was produced by another version.
      </>
    }
  >
    <Typography variant="body2" paragraph>
      Regenerate the export with <code>openwiki@{OPENWIKI_PINNED_VERSION}</code>{' '}
      or update the plugin's schema (see <code>GRAPH_SCHEMA.md</code>).{' '}
      <Link to={README_PREREQUISITES_URL}>Prerequisites</Link>
    </Typography>
    {graphUrl && (
      <Typography variant="caption" color="textSecondary" component="p">
        Source: {graphUrl}
      </Typography>
    )}
    <List dense data-testid="openwiki-validation-issues">
      {error.issues.slice(0, MAX_ISSUES).map((issue, index) => (
        <ListItem key={`${issue.field}-${index}`} disableGutters>
          <ListItemText primary={issue.field} secondary={issue.message} />
        </ListItem>
      ))}
      {error.issues.length > MAX_ISSUES && (
        <ListItem disableGutters>
          <ListItemText
            secondary={`…and ${error.issues.length - MAX_ISSUES} more`}
          />
        </ListItem>
      )}
    </List>
  </WarningPanel>
);
