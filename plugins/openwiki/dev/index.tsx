import { createDevApp } from '@backstage/frontend-dev-utils';
import {
  createFrontendModule,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import openwikiPlugin from '../src';
import { DevPage } from './DevPage';

const devPage = PageBlueprint.make({
  name: 'openwiki-dev',
  params: {
    path: '/',
    loader: async () => <DevPage />,
  },
});

/**
 * The real plugin is loaded too (so its extension definitions are exercised),
 * but the dev page bypasses the catalog and TechDocs entirely.
 */
createDevApp({
  features: [
    openwikiPlugin,
    createFrontendModule({ pluginId: 'app', extensions: [devPage] }),
  ],
});
