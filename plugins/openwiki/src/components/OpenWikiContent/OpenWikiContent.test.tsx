import { Entity } from '@backstage/catalog-model';
import { fetchApiRef } from '@backstage/frontend-plugin-api';
import {
  renderInTestApp,
  TestApiProvider,
} from '@backstage/frontend-test-utils';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import {
  techdocsStorageApiRef,
  TechDocsStorageApi,
} from '@backstage/plugin-techdocs-react';
import { screen, within } from '@testing-library/react';
import { fixtures } from '../../__fixtures__';
import { OpenWikiContent } from './OpenWikiContent';

jest.mock('cytoscape', () => ({
  __esModule: true,
  default: (options: any) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../test-utils/fakeCytoscape').fakeCytoscape(options),
}));

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'demo',
    namespace: 'default',
    annotations: {
      'backstage.io/techdocs-ref': 'dir:.',
      'wikigraph/openwiki': 'enabled',
    },
  },
  spec: { type: 'service', lifecycle: 'production', owner: 'team-a' },
};

const STORAGE = 'http://localhost:7007/api/techdocs/static/docs';

const storageApi: jest.Mocked<Pick<TechDocsStorageApi, 'getBaseUrl'>> = {
  getBaseUrl: jest.fn(async (oldBaseUrl, ref, path) =>
    new URL(
      oldBaseUrl,
      `${STORAGE}/${ref.namespace}/${ref.kind}/${ref.name}/${path}`,
    ).toString(),
  ),
};

function render(response: {
  status: number;
  body: string;
  contentType?: string;
}) {
  const fetch = jest.fn(
    async () =>
      new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.contentType ?? 'application/json' },
      }),
  );
  const ui = renderInTestApp(
    <TestApiProvider
      apis={[
        [techdocsStorageApiRef, storageApi as unknown as TechDocsStorageApi],
        [fetchApiRef, { fetch }],
      ]}
    >
      <EntityProvider entity={entity}>
        <OpenWikiContent />
      </EntityProvider>
    </TestApiProvider>,
  );
  return { ui, fetch };
}

describe('OpenWikiContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches openwiki-graph/graph.json through the TechDocs storage URL and renders the graph', async () => {
    const { ui, fetch } = render({
      status: 200,
      body: JSON.stringify(fixtures['openwiki-repo']),
    });
    await ui;

    expect(await screen.findByTestId('openwiki-explorer')).toBeInTheDocument();
    expect(storageApi.getBaseUrl).toHaveBeenCalledWith(
      'graph.json',
      { kind: 'Component', namespace: 'default', name: 'demo' },
      'openwiki-graph/',
    );
    expect(fetch).toHaveBeenCalledWith(
      `${STORAGE}/default/Component/demo/openwiki-graph/graph.json`,
      expect.anything(),
    );
    const reader = screen.getByTestId('openwiki-reader');
    expect(
      within(reader).getByRole('heading', {
        level: 2,
        name: 'OpenWiki Quickstart',
      }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with a prerequisites link when graph.json is missing', async () => {
    const { ui } = render({
      status: 404,
      body: 'Not found',
      contentType: 'text/plain',
    });
    await ui;

    expect(
      await screen.findByText('No OpenWiki export found'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/^Looked for: .*openwiki-graph\/graph\.json$/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Read the prerequisites').closest('a'),
    ).toHaveAttribute(
      'href',
      expect.stringContaining('README.md#deployment-prerequisites'),
    );
    expect(screen.queryByTestId('openwiki-explorer')).not.toBeInTheDocument();
  });

  it('treats an HTML shell answer as missing', async () => {
    const { ui } = render({
      status: 200,
      body: '<!doctype html><html></html>',
      contentType: 'text/html',
    });
    await ui;
    expect(
      await screen.findByText('No OpenWiki export found'),
    ).toBeInTheDocument();
  });

  it('shows the failing field and pinned version when graph.json is invalid', async () => {
    const broken: any = JSON.parse(JSON.stringify(fixtures['edge-cases']));
    broken.nodes[1].size = 'eighty-one';
    const { ui } = render({ status: 200, body: JSON.stringify(broken) });
    await ui;

    expect(
      await screen.findByText(/OpenWiki graph\.json failed validation/),
    ).toBeInTheDocument();
    const issues = screen.getByTestId('openwiki-validation-issues');
    expect(within(issues).getByText('nodes.1.size')).toBeInTheDocument();
    expect(screen.getByText('0.7.2')).toBeInTheDocument();
    expect(screen.queryByTestId('openwiki-explorer')).not.toBeInTheDocument();
  });

  it('shows an error panel on a backend failure', async () => {
    const { ui } = render({
      status: 500,
      body: 'boom',
      contentType: 'text/plain',
    });
    await ui;
    expect(
      await screen.findByText(/Could not load the OpenWiki export/),
    ).toBeInTheDocument();
  });
});
