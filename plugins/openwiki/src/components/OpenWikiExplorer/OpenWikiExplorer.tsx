import {
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
  makeStyles,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultNode, searchNodes } from '../../graph/elements';
import type { WikiGraph as WikiGraphData } from '../../schema/types';
import { SplitPane } from '../SplitPane';
import { WikiGraph } from '../WikiGraph';
import { WikiReader } from '../WikiReader';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    // Fill the entity page below its header/tabs; never collapse on short screens.
    height: 'calc(100vh - 260px)',
    minHeight: 560,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    flexWrap: 'wrap',
  },
  search: {
    position: 'relative',
    flex: '1 1 320px',
    maxWidth: 520,
  },
  results: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: theme.zIndex.modal,
    maxHeight: 320,
    overflow: 'auto',
    marginTop: 4,
  },
  meta: {
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
  },
  split: {
    flex: '1 1 0',
    minHeight: 0,
  },
}));

export interface OpenWikiExplorerProps {
  graph: WikiGraphData;
  /** Page to open first; defaults to the quickstart/index heuristic. */
  initialNodeId?: string;
  /** Builds the TechDocs reader href for a node id, if TechDocs is available. */
  techdocsHref?: (nodeId: string) => string | undefined;
}

/**
 * The tab body: search, graph and reader in a resizable split that stacks
 * vertically on narrow screens.
 */
export const OpenWikiExplorer = ({
  graph,
  initialNodeId,
  techdocsHref,
}: OpenWikiExplorerProps) => {
  const classes = useStyles();
  const theme = useTheme();
  const stacked = useMediaQuery(theme.breakpoints.down('sm'));

  const nodesById = useMemo(
    () => new Map(graph.nodes.map(node => [node.id, node] as const)),
    [graph],
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    initialNodeId && nodesById.has(initialNodeId)
      ? initialNodeId
      : defaultNode(graph)?.id,
  );
  // If the graph is swapped out from under us (dev app, re-fetch), keep a valid selection.
  useEffect(() => {
    if (selectedId && !nodesById.has(selectedId)) {
      setSelectedId(defaultNode(graph)?.id);
    }
  }, [graph, nodesById, selectedId]);

  const [query, setQuery] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  // Close the results when clicking anywhere outside the search box.
  useEffect(() => {
    if (!resultsOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setResultsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [resultsOpen]);
  const results = useMemo(
    () => searchNodes(graph.nodes, query),
    [graph.nodes, query],
  );
  const matchIds = useMemo(
    () => (query.trim() ? new Set(results.map(node => node.id)) : undefined),
    [results, query],
  );

  const select = (id: string) => {
    setSelectedId(id);
    setResultsOpen(false);
  };

  const selected = selectedId ? nodesById.get(selectedId) : undefined;

  return (
    <div className={classes.root} data-testid="openwiki-explorer">
      <div className={classes.toolbar}>
        <div className={classes.search} ref={searchRef}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Search pages by title, tag or description"
            inputProps={{ 'aria-label': 'Search wiki pages' }}
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setResultsOpen(true);
            }}
            onFocus={() => setResultsOpen(true)}
            onKeyDown={event => {
              if (event.key === 'Enter' && results[0]) select(results[0].id);
              if (event.key === 'Escape') setResultsOpen(false);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {resultsOpen && query.trim() && (
            <Paper className={classes.results} elevation={4}>
              <List dense role="listbox" aria-label="Search results">
                {results.length === 0 && (
                  <ListItem>
                    <ListItemText secondary="No pages match" />
                  </ListItem>
                )}
                {results.map(node => (
                  <ListItem
                    key={node.id}
                    button
                    role="option"
                    aria-selected={node.id === selectedId}
                    onClick={() => select(node.id)}
                  >
                    <ListItemText
                      primary={node.title}
                      secondary={`${node.type} · ${node.id}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </div>
        <Typography variant="body2" className={classes.meta}>
          {graph.root} · {graph.nodes.length} pages · {graph.edges.length} links
          {matchIds
            ? ` · ${matchIds.size} match${matchIds.size === 1 ? '' : 'es'}`
            : ''}
        </Typography>
      </div>
      <SplitPane
        className={classes.split}
        direction={stacked ? 'column' : 'row'}
        initialRatio={stacked ? 0.45 : 0.55}
        primaryLabel="Resize graph and reader"
        primary={
          <WikiGraph
            graph={graph}
            selectedId={selectedId}
            matchIds={matchIds}
            onSelect={select}
          />
        }
        secondary={
          selected ? (
            <WikiReader
              graph={graph}
              node={selected}
              onSelect={select}
              techdocsHref={techdocsHref}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              This wiki has no pages.
            </Typography>
          )
        }
      />
    </div>
  );
};
