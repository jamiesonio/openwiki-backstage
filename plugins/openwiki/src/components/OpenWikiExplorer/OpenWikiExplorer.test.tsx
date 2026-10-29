import { renderInTestApp } from '@backstage/frontend-test-utils';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fixtures } from '../../__fixtures__';
import { parseWikiGraph } from '../../schema/schema';
import { fakeInstances } from '../../test-utils/fakeCytoscape';
import { OpenWikiExplorer } from './OpenWikiExplorer';

jest.mock('cytoscape', () => ({
  __esModule: true,
  default: (options: any) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../test-utils/fakeCytoscape').fakeCytoscape(options),
}));

const graph = parseWikiGraph(fixtures['openwiki-repo']);
const latestCy = () => fakeInstances[fakeInstances.length - 1];

beforeEach(() => {
  fakeInstances.length = 0;
});

describe('OpenWikiExplorer', () => {
  it('renders the graph from the fixture and opens the quickstart page', async () => {
    await renderInTestApp(<OpenWikiExplorer graph={graph} />);

    expect(screen.getByTestId('openwiki-graph')).toBeInTheDocument();
    expect(
      screen.getByText(/openwiki · 29 pages · 109 links/),
    ).toBeInTheDocument();
    // Every node and edge reached cytoscape.
    const cy = latestCy();
    expect(cy.nodes().length).toBe(29);
    expect(cy.edges().length).toBe(109);
    // Legend lists each type.
    expect(
      within(screen.getByLabelText('Page types')).getByText(
        'orientation-guide',
      ),
    ).toBeInTheDocument();

    // Default selection: the quickstart, highlighted with its neighbourhood.
    const reader = screen.getByTestId('openwiki-reader');
    expect(
      within(reader).getByRole('heading', {
        level: 2,
        name: 'OpenWiki Quickstart',
      }),
    ).toBeInTheDocument();
    // The page's own leading "# OpenWiki Quickstart" is folded into the title.
    expect(
      within(reader).queryByRole('heading', { level: 1 }),
    ).not.toBeInTheDocument();
    expect(cy.classesOf('quickstart')).toEqual(['selected']);
    expect(cy.classesOf('architecture/overview')).toEqual(['neighbour']);
    const unrelated = graph.nodes.find(
      n =>
        n.id !== 'quickstart' &&
        !n.links.includes('quickstart') &&
        !n.backlinks.includes('quickstart'),
    )!;
    expect(cy.classesOf(unrelated.id)).toEqual(['faded']);
  });

  it('selects a node when it is tapped in the graph and shows its page', async () => {
    await renderInTestApp(<OpenWikiExplorer graph={graph} />);
    const cy = latestCy();

    act(() => cy.tapNode('concepts/okf-output'));

    const reader = screen.getByTestId('openwiki-reader');
    expect(
      within(reader).getByRole('heading', {
        level: 2,
        name: 'Open Knowledge Format Output',
      }),
    ).toBeInTheDocument();
    const node = graph.nodes.find(n => n.id === 'concepts/okf-output')!;
    // Body Markdown is rendered (first paragraph of the real page).
    const firstLine = node.body
      .split('\n')
      .find(l => l.trim() && !l.startsWith('#'))!;
    expect(reader.textContent).toContain(
      firstLine.slice(0, 40).replace(/[*_`]/g, ''),
    );
    expect(cy.classesOf('concepts/okf-output')).toEqual(['selected']);
    expect(cy.classesOf('quickstart')).not.toContain('selected');
  });

  it('search highlights matches and picking a result selects it', async () => {
    const user = userEvent.setup();
    await renderInTestApp(<OpenWikiExplorer graph={graph} />);
    const cy = latestCy();

    await user.type(screen.getByLabelText('Search wiki pages'), 'telemetry');
    const results = screen.getByRole('listbox', { name: 'Search results' });
    expect(
      within(results).getByText('Telemetry and Diagnostics'),
    ).toBeInTheDocument();
    expect(cy.classesOf('operations/telemetry')).toContain('match');
    expect(screen.getByText(/match(es)?$/)).toBeInTheDocument();

    await user.click(within(results).getByText('Telemetry and Diagnostics'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('openwiki-reader')).getByRole('heading', {
        level: 2,
        name: 'Telemetry and Diagnostics',
      }),
    ).toBeInTheDocument();
    expect(cy.classesOf('operations/telemetry')).toEqual(['match', 'selected']);
  });

  it('wiki links inside the rendered page select the target node instead of navigating', async () => {
    await renderInTestApp(
      <OpenWikiExplorer graph={graph} initialNodeId="index" />,
    );
    const reader = screen.getByTestId('openwiki-reader');
    expect(
      within(reader).getByRole('heading', { level: 2, name: 'Home' }),
    ).toBeInTheDocument();

    const link = within(reader).getByRole('link', {
      name: 'OpenWiki Quickstart',
    });
    // Rendered through Backstage Link; the node id travels in the hash.
    expect(link.getAttribute('href')).toMatch(/#openwiki:quickstart$/);
    const event = fireEvent.click(link);
    expect(event).toBe(false); // default prevented => no navigation
    expect(
      within(reader).getByRole('heading', {
        level: 2,
        name: 'OpenWiki Quickstart',
      }),
    ).toBeInTheDocument();
    expect(latestCy().classesOf('quickstart')).toEqual(['selected']);
  });

  it('rewrites wiki links to TechDocs URLs when available and still intercepts them', async () => {
    const techdocsHref = (id: string) =>
      `/docs/default/component/demo/openwiki/${id}/`;
    await renderInTestApp(
      <OpenWikiExplorer
        graph={graph}
        initialNodeId="index"
        techdocsHref={techdocsHref}
      />,
    );
    const reader = screen.getByTestId('openwiki-reader');
    expect(screen.getByTestId('openwiki-techdocs-link')).toHaveAttribute(
      'href',
      '/docs/default/component/demo/openwiki/index/',
    );
    const link = within(reader).getByRole('link', {
      name: 'OpenWiki Quickstart',
    });
    expect(link).toHaveAttribute(
      'href',
      '/docs/default/component/demo/openwiki/quickstart/',
    );
    fireEvent.click(link);
    expect(
      within(reader).getByRole('heading', {
        level: 2,
        name: 'OpenWiki Quickstart',
      }),
    ).toBeInTheDocument();
  });

  it('backlink chips select the referencing page', async () => {
    await renderInTestApp(
      <OpenWikiExplorer graph={graph} initialNodeId="architecture/overview" />,
    );
    const chips = screen.getAllByTestId('openwiki-backlink');
    expect(chips.length).toBeGreaterThan(0);
    fireEvent.click(chips[0]);
    const node = graph.nodes.find(n => n.id === 'architecture/overview')!;
    const first = graph.nodes.find(n => n.id === node.backlinks[0])!;
    expect(
      within(screen.getByTestId('openwiki-reader')).getByRole('heading', {
        level: 2,
        name: first.title,
      }),
    ).toBeInTheDocument();
  });

  it('handles unicode ids end-to-end', async () => {
    const unicode = parseWikiGraph(fixtures.unicode);
    await renderInTestApp(
      <OpenWikiExplorer graph={unicode} initialNodeId="events/index" />,
    );
    const reader = screen.getByTestId('openwiki-reader');
    fireEvent.click(within(reader).getByRole('link', { name: 'Person' }));
    expect(
      within(reader).getByRole('heading', { level: 2, name: 'Person' }),
    ).toBeInTheDocument();
    expect(latestCy().classesOf('人物/朱棣')).toEqual(['selected']);
  });
});
