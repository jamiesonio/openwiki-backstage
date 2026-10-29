import type cytoscape from 'cytoscape';
import type { Theme } from '@material-ui/core/styles';

/**
 * Cytoscape stylesheet derived from the active Backstage theme so the canvas
 * follows light/dark mode. Node colours come from element data (per type).
 */
export function buildGraphStyle(theme: Theme): cytoscape.StylesheetStyle[] {
  const dark = theme.palette.type === 'dark';
  const edgeColor = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)';
  const accent = theme.palette.primary.main;
  const match = theme.palette.warning?.main ?? '#E0A63E';
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        width: 'data(radius)',
        height: 'data(radius)',
        label: 'data(label)',
        color: theme.palette.text.primary,
        'font-family': theme.typography.fontFamily ?? 'sans-serif',
        'font-size': 10,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'text-wrap': 'ellipsis',
        'text-max-width': '120px',
        'text-outline-color': theme.palette.background.paper,
        'text-outline-width': 2,
        'text-outline-opacity': 0.9,
        'min-zoomed-font-size': 7,
        'border-width': 1,
        'border-color': dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
        'overlay-opacity': 0,
        'transition-property': 'opacity, border-width',
        'transition-duration': 120,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.2,
        'line-color': edgeColor,
        'target-arrow-color': edgeColor,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.7,
        'curve-style': 'bezier',
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node.match',
      style: {
        'border-width': 4,
        'border-color': match,
        'border-style': 'double',
      },
    },
    {
      selector: 'node.neighbour',
      style: {
        'border-width': 2.5,
        'border-color': accent,
      },
    },
    {
      selector: 'edge.neighbour',
      style: {
        width: 2.2,
        'line-color': accent,
        'target-arrow-color': accent,
      },
    },
    {
      selector: 'node.selected',
      style: {
        'border-width': 5,
        'border-color': accent,
        'font-weight': 'bold',
        'z-index': 10,
      },
    },
    {
      selector: '.faded',
      style: {
        opacity: 0.18,
      },
    },
  ];
}
