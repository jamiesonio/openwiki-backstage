import { techdocsPagePath } from './techdocs';

describe('techdocsPagePath', () => {
  it('maps node ids to mkdocs directory urls under the docs prefix', () => {
    expect(techdocsPagePath('openwiki', 'architecture/overview')).toBe(
      'openwiki/architecture/overview/',
    );
    expect(techdocsPagePath('openwiki', 'architecture/index')).toBe(
      'openwiki/architecture/',
    );
    expect(techdocsPagePath('openwiki', 'index')).toBe('openwiki/');
    expect(techdocsPagePath('', 'index')).toBe('');
    expect(techdocsPagePath('/wiki/', 'quickstart')).toBe('wiki/quickstart/');
  });

  it('percent-encodes unusual ids', () => {
    expect(techdocsPagePath('openwiki', 'events/靖难之役 #1%')).toBe(
      'openwiki/events/%E9%9D%96%E9%9A%BE%E4%B9%8B%E5%BD%B9%20%231%25/',
    );
  });
});
