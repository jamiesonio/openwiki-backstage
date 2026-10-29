import { Link, MarkdownContent } from '@backstage/core-components';
import { Chip, Typography, makeStyles } from '@material-ui/core';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { MouseEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  WIKI_LINK_HASH_PREFIX,
  nodeIdFromHash,
  stripLeadingTitle,
} from './readerLinks';
import { resolveWikiLink } from '../../graph/resolveLink';
import type { WikiGraph, WikiNode } from '../../schema/types';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    overflow: 'auto',
    padding: theme.spacing(2, 3),
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    marginBottom: theme.spacing(1),
  },
  type: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    color: theme.palette.text.secondary,
  },
  description: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(2),
  },
  body: {
    '& a[data-openwiki-node]': { cursor: 'pointer' },
    '& img': { maxWidth: '100%' },
    '& pre': { overflow: 'auto' },
  },
  backlinks: {
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  chip: { margin: theme.spacing(0.25) },
}));

export interface WikiReaderProps {
  graph: WikiGraph;
  node: WikiNode;
  onSelect: (nodeId: string) => void;
  /** Absolute app href of this page in the TechDocs reader, if TechDocs is installed. */
  techdocsHref?: (nodeId: string) => string | undefined;
}

/**
 * Renders the selected page's Markdown (from `node.body`) with Backstage's
 * MarkdownContent. Links to other wiki pages select the matching node instead
 * of navigating; everything else behaves like a normal link.
 */
export const WikiReader = ({
  graph,
  node,
  onSelect,
  techdocsHref,
}: WikiReaderProps) => {
  const classes = useStyles();
  const knownIds = useMemo(() => new Set(graph.nodes.map(n => n.id)), [graph]);
  const titles = useMemo(
    () => new Map(graph.nodes.map(n => [n.id, n.title] as const)),
    [graph],
  );

  // href as rendered -> node id, filled while MarkdownContent transforms links.
  const hrefToNode = useRef(new Map<string, string>());
  hrefToNode.current = new Map();

  // MarkdownContent renders every anchor through Backstage's <Link to=...>,
  // which hands relative hrefs to react-router (so `quickstart.md` would become
  // `/quickstart.md` and navigate the app). Wiki links are therefore rewritten
  // to either the page's TechDocs URL (when TechDocs is installed: open-in-new-
  // tab keeps working) or a `#openwiki:<id>` hash that carries the node id.
  const transformLinkUri = useCallback(
    (href: string) => {
      const target = resolveWikiLink(node.id, href, knownIds);
      if (!target) return href;
      const rendered =
        techdocsHref?.(target) ??
        `${WIKI_LINK_HASH_PREFIX}${encodeURIComponent(target)}`;
      hrefToNode.current.set(rendered, target);
      return rendered;
    },
    [node.id, knownIds, techdocsHref],
  );

  // Capture phase: react-router's Link skips navigation when the event is
  // already defaultPrevented, so we must run before it.
  const onBodyClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const anchor = (event.target as HTMLElement).closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') ?? '';
    let target = nodeIdFromHash(anchor.hash);
    if (!target) {
      // Absolute TechDocs hrefs may carry the app basename; match by suffix.
      for (const [rendered, id] of hrefToNode.current) {
        if (href === rendered || href.endsWith(rendered)) {
          target = id;
          break;
        }
      }
    }
    if (!target || !knownIds.has(target)) return;
    event.preventDefault();
    if (target !== node.id) onSelect(target);
  };

  const body = useMemo(
    () => stripLeadingTitle(node.body, node.title),
    [node.body, node.title],
  );

  const fullReaderHref = techdocsHref?.(node.id);

  // A newly selected page starts at the top, not where the previous one was.
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    articleRef.current?.scrollTo?.({ top: 0 });
  }, [node.id]);

  return (
    <article
      ref={articleRef}
      className={classes.root}
      data-testid="openwiki-reader"
      aria-live="polite"
    >
      <div className={classes.eyebrow}>
        <span className={classes.type}>{node.type}</span>
        {fullReaderHref && (
          <Link to={fullReaderHref} data-testid="openwiki-techdocs-link">
            Open in TechDocs{' '}
            <OpenInNewIcon style={{ fontSize: 14, verticalAlign: 'middle' }} />
          </Link>
        )}
      </div>
      <Typography variant="h4" component="h2" gutterBottom>
        {node.title}
      </Typography>
      {node.description && (
        <Typography variant="body2" className={classes.description}>
          {node.description}
        </Typography>
      )}
      {node.tags.length > 0 && (
        <div className={classes.tags}>
          {node.tags.map(tag => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className={classes.body} onClickCapture={onBodyClickCapture}>
        <MarkdownContent content={body} transformLinkUri={transformLinkUri} />
      </div>
      {node.backlinks.length > 0 && (
        <div className={classes.backlinks}>
          <Typography variant="overline" color="textSecondary">
            Referenced by
          </Typography>
          <div>
            {node.backlinks.map(id => (
              <Chip
                key={id}
                className={classes.chip}
                size="small"
                label={titles.get(id) ?? id}
                onClick={() => onSelect(id)}
                data-testid="openwiki-backlink"
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
