import { openwikiEntityContent, openwikiPlugin } from './plugin';

describe('openwiki plugin', () => {
  it('exports the plugin and its entity content extension', () => {
    expect(openwikiPlugin).toBeDefined();
    expect(openwikiPlugin.pluginId).toBe('openwiki');
    expect(openwikiEntityContent).toBeDefined();
  });
});
