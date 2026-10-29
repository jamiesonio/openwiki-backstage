import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import openwikiPlugin from '@internal/plugin-openwiki';
import { navModule } from './modules/nav';
import { homeModule } from './modules/home';

export default createApp({
  // openwikiPlugin contributes the "OpenWiki" tab to Component entity pages
  // (entity-content:openwiki/graph), gated on the entity's annotations.
  features: [catalogPlugin, openwikiPlugin, navModule, homeModule],
});
