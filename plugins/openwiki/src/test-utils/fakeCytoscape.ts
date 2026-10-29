/**
 * A minimal stand-in for cytoscape in jsdom (no canvas). It records elements
 * and their classes so tests can assert on selection highlighting, and lets a
 * test trigger a node tap.
 */
export interface FakeElement {
  id: string;
  group: 'nodes' | 'edges';
  data: Record<string, unknown>;
  classes: Set<string>;
}

/** Collection and single-element API rolled into one, like cytoscape's. */
export class FakeCollection {
  constructor(private readonly items: FakeElement[]) {}
  get length() {
    return this.items.length;
  }
  id() {
    return this.items[0]?.id;
  }
  data(key: string) {
    return this.items[0]?.data[key];
  }
  forEach(fn: (el: FakeCollection) => void) {
    this.items.forEach(item => fn(new FakeCollection([item])));
  }
  addClass(cls: string) {
    const names = cls.split(/\s+/).filter(Boolean);
    this.items.forEach(item => names.forEach(c => item.classes.add(c)));
    return this;
  }
  removeClass(cls: string) {
    const names = cls.split(/\s+/).filter(Boolean);
    this.items.forEach(item => names.forEach(c => item.classes.delete(c)));
    return this;
  }
}

type TapHandler = (evt: { target: { id(): string } }) => void;

export interface FakeCore {
  elements(): FakeCollection;
  nodes(): FakeCollection;
  edges(): FakeCollection;
  getElementById(id: string): FakeCollection;
  on(event: string, selector: string, handler: TapHandler): void;
  batch(fn: () => void): void;
  style(): void;
  animate(): void;
  fit(): void;
  zoom(): number;
  width(): number;
  height(): number;
  resize(): void;
  destroy(): void;
  /** test helper: simulate a tap on a node */
  tapNode(id: string): void;
  /** test helper: sorted classes of an element */
  classesOf(id: string): string[];
}

export const fakeInstances: FakeCore[] = [];

export function fakeCytoscape(options: {
  elements: Array<{ group: 'nodes' | 'edges'; data: Record<string, unknown> }>;
}): FakeCore {
  const elements: FakeElement[] = options.elements.map(el => ({
    id: String(el.data.id),
    group: el.group,
    data: el.data,
    classes: new Set<string>(),
  }));
  const handlers: TapHandler[] = [];
  const core: FakeCore = {
    elements: () => new FakeCollection(elements),
    nodes: () => new FakeCollection(elements.filter(e => e.group === 'nodes')),
    edges: () => new FakeCollection(elements.filter(e => e.group === 'edges')),
    getElementById: id => new FakeCollection(elements.filter(e => e.id === id)),
    on: (_event, _selector, handler) => {
      handlers.push(handler);
    },
    batch: fn => fn(),
    style: () => undefined,
    animate: () => undefined,
    fit: () => undefined,
    zoom: () => 1,
    width: () => 800,
    height: () => 600,
    resize: () => undefined,
    destroy: () => undefined,
    tapNode: id => handlers.forEach(h => h({ target: { id: () => id } })),
    classesOf: id =>
      [...(elements.find(e => e.id === id)?.classes ?? [])].sort(),
  };
  fakeInstances.push(core);
  return core;
}
