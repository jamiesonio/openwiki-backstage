import cytoscape, { Core } from 'cytoscape';
import { IconButton, Tooltip, makeStyles, useTheme } from '@material-ui/core';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import FitIcon from '@material-ui/icons/ZoomOutMap';
import { useEffect, useMemo, useRef } from 'react';
import {
  colorsForTypes,
  neighbourhood,
  toCytoscapeElements,
} from '../../graph/elements';
import type { WikiGraph as WikiGraphData } from '../../schema/types';
import { buildGraphStyle } from './graphStyle';

const useStyles = makeStyles(theme => ({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 240,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
  },
  controls: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    zIndex: 1,
  },
  legend: {
    position: 'absolute',
    left: theme.spacing(1),
    bottom: theme.spacing(1),
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5, 1.5),
    maxWidth: 'calc(100% - 16px)',
    maxHeight: 72,
    overflow: 'auto',
    padding: theme.spacing(0.5, 1),
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    fontSize: theme.typography.caption.fontSize,
    color: theme.palette.text.secondary,
    zIndex: 1,
  },
  swatch: {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 4,
    verticalAlign: 'middle',
  },
}));

export interface WikiGraphProps {
  graph: WikiGraphData;
  selectedId?: string;
  /** Node ids to flag as search matches. */
  matchIds?: ReadonlySet<string>;
  onSelect: (nodeId: string) => void;
}

/**
 * Cytoscape canvas: zoom/pan, click-to-select, selected node + neighbourhood
 * highlight, search-match flagging and a per-type legend.
 */
export const WikiGraph = ({
  graph,
  selectedId,
  matchIds,
  onSelect,
}: WikiGraphProps) => {
  const classes = useStyles();
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core>();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const typeColors = useMemo(() => colorsForTypes(graph.types), [graph.types]);

  // (Re)build the instance whenever the graph data changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const cy = cytoscape({
      container,
      elements: toCytoscapeElements(graph),
      style: buildGraphStyle(theme),
      layout: {
        name: 'cose',
        animate: false,
        padding: 30,
        nodeRepulsion: () => 12000,
        idealEdgeLength: () => 90,
        randomize: true,
      } as cytoscape.LayoutOptions,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      autounselectify: true,
    });
    cy.on('tap', 'node', event => onSelectRef.current(event.target.id()));
    cyRef.current = cy;

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => cy.resize());
      observer.observe(container);
    }
    return () => {
      observer?.disconnect();
      cy.destroy();
      cyRef.current = undefined;
    };
    // The theme is applied by the effect below; rebuilding on theme change
    // would lose the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Follow light/dark mode without re-laying out.
  useEffect(() => {
    cyRef.current?.style(buildGraphStyle(theme) as any);
  }, [theme]);

  // Selected node + neighbours.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.elements().removeClass('selected neighbour faded');
      if (!selectedId) return;
      const hood = neighbourhood(graph, selectedId);
      cy.nodes().forEach(node => {
        const id = node.id();
        if (id === selectedId) node.addClass('selected');
        else if (hood.has(id)) node.addClass('neighbour');
        else node.addClass('faded');
      });
      cy.edges().forEach(edge => {
        const touches =
          edge.data('source') === selectedId ||
          edge.data('target') === selectedId;
        edge.addClass(touches ? 'neighbour' : 'faded');
      });
    });
    const selected = selectedId ? cy.getElementById(selectedId) : undefined;
    if (selected && selected.length > 0) {
      cy.animate({ center: { eles: selected }, duration: 250 } as any);
    }
  }, [graph, selectedId]);

  // Search matches.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().removeClass('match');
      matchIds?.forEach(id => cy.getElementById(id).addClass('match'));
    });
  }, [graph, matchIds]);

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({
      level: cy.zoom() * factor,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };

  return (
    <div className={classes.root} data-testid="openwiki-graph">
      <div
        ref={containerRef}
        className={classes.canvas}
        role="img"
        aria-label={`OpenWiki graph with ${graph.nodes.length} pages and ${graph.edges.length} links`}
      />
      <div className={classes.controls}>
        <Tooltip title="Zoom in" placement="left">
          <IconButton
            size="small"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.25)}
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out" placement="left">
          <IconButton
            size="small"
            aria-label="Zoom out"
            onClick={() => zoomBy(0.8)}
          >
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to view" placement="left">
          <IconButton
            size="small"
            aria-label="Fit to view"
            onClick={() => cyRef.current?.fit(undefined, 30)}
          >
            <FitIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      {graph.types.length > 0 && (
        <div className={classes.legend} aria-label="Page types">
          {graph.types.map(type => (
            <span key={type}>
              <span
                className={classes.swatch}
                style={{ background: typeColors[type] }}
              />
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
