import { makeStyles, Theme } from '@material-ui/core/styles';
import { ReactNode, useCallback, useRef, useState, KeyboardEvent } from 'react';

const useStyles = makeStyles<Theme, { direction: 'row' | 'column' }>(theme => ({
  root: {
    display: 'flex',
    flexDirection: ({ direction }) => direction,
    width: '100%',
    height: '100%',
    minHeight: 0,
    minWidth: 0,
  },
  pane: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  divider: {
    flex: '0 0 auto',
    background: theme.palette.divider,
    cursor: ({ direction }) =>
      direction === 'row' ? 'col-resize' : 'row-resize',
    width: ({ direction }) => (direction === 'row' ? 6 : '100%'),
    height: ({ direction }) => (direction === 'row' ? '100%' : 6),
    touchAction: 'none',
    userSelect: 'none',
    transition: 'background 120ms',
    '&:hover, &:focus-visible': {
      background: theme.palette.primary.main,
      outline: 'none',
    },
  },
}));

export interface SplitPaneProps {
  /** `row` puts panes side by side, `column` stacks them. */
  direction?: 'row' | 'column';
  /** Initial share of the first pane, 0..1. */
  initialRatio?: number;
  /** Smallest share either pane may shrink to. */
  minRatio?: number;
  primary: ReactNode;
  secondary: ReactNode;
  primaryLabel?: string;
  className?: string;
}

/**
 * Two panes with a draggable (and keyboard-adjustable) divider. Pointer events
 * keep it working for mouse and touch; no extra dependency.
 */
export const SplitPane = (props: SplitPaneProps) => {
  const {
    direction = 'row',
    initialRatio = 0.55,
    minRatio = 0.2,
    primary,
    secondary,
    primaryLabel = 'Resize panes',
    className,
  } = props;
  const classes = useStyles({ direction });
  const rootRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);

  const clamp = useCallback(
    (value: number) => Math.min(1 - minRatio, Math.max(minRatio, value)),
    [minRatio],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    event.preventDefault();
    const divider = event.currentTarget;
    divider.setPointerCapture?.(event.pointerId);
    const move = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const next =
        direction === 'row'
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
      setRatio(clamp(next));
    };
    const up = () => {
      divider.removeEventListener('pointermove', move);
      divider.removeEventListener('pointerup', up);
      divider.removeEventListener('pointercancel', up);
    };
    divider.addEventListener('pointermove', move);
    divider.addEventListener('pointerup', up);
    divider.addEventListener('pointercancel', up);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = direction === 'row' ? 'ArrowRight' : 'ArrowDown';
    const shrink = direction === 'row' ? 'ArrowLeft' : 'ArrowUp';
    if (event.key === grow) setRatio(r => clamp(r + 0.05));
    else if (event.key === shrink) setRatio(r => clamp(r - 0.05));
    else if (event.key === 'Home') setRatio(minRatio);
    else if (event.key === 'End') setRatio(1 - minRatio);
    else return;
    event.preventDefault();
  };

  const primaryStyle =
    direction === 'row'
      ? { flex: `0 0 calc(${ratio * 100}% - 3px)` }
      : { flex: `0 0 calc(${ratio * 100}% - 3px)` };

  return (
    <div ref={rootRef} className={`${classes.root} ${className ?? ''}`}>
      <div className={classes.pane} style={primaryStyle}>
        {primary}
      </div>
      {/* WAI-ARIA "window splitter": a focusable separator with aria-valuenow. */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        role="separator"
        aria-label={primaryLabel}
        aria-orientation={direction === 'row' ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(minRatio * 100)}
        aria-valuemax={Math.round((1 - minRatio) * 100)}
        tabIndex={0}
        className={classes.divider}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        data-testid="openwiki-split-divider"
      />
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div className={classes.pane} style={{ flex: '1 1 0' }}>
        {secondary}
      </div>
    </div>
  );
};
