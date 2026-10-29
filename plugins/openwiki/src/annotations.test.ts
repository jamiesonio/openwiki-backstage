import { Entity } from '@backstage/catalog-model';
import { getWikiDocsPath, isOpenWikiAvailable } from './annotations';

const entity = (annotations: Record<string, string>): Entity => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'svc', annotations },
});

describe('isOpenWikiAvailable', () => {
  it('requires both annotations', () => {
    expect(
      isOpenWikiAvailable(
        entity({
          'backstage.io/techdocs-ref': 'dir:.',
          'wikigraph/openwiki': 'enabled',
        }),
      ),
    ).toBe(true);
  });

  it('is false without the techdocs ref', () => {
    expect(
      isOpenWikiAvailable(entity({ 'wikigraph/openwiki': 'enabled' })),
    ).toBe(false);
  });

  it('is false without the opt-in or with another value', () => {
    expect(
      isOpenWikiAvailable(entity({ 'backstage.io/techdocs-ref': 'dir:.' })),
    ).toBe(false);
    expect(
      isOpenWikiAvailable(
        entity({
          'backstage.io/techdocs-ref': 'dir:.',
          'wikigraph/openwiki': 'disabled',
        }),
      ),
    ).toBe(false);
  });

  it('tolerates case and whitespace in the opt-in value', () => {
    expect(
      isOpenWikiAvailable(
        entity({
          'backstage.io/techdocs-ref': 'dir:.',
          'wikigraph/openwiki': ' Enabled ',
        }),
      ),
    ).toBe(true);
  });

  it('handles entities without annotations', () => {
    expect(
      isOpenWikiAvailable({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: { name: 'bare' },
      }),
    ).toBe(false);
  });
});

describe('getWikiDocsPath', () => {
  it('defaults to openwiki and strips slashes from overrides', () => {
    expect(getWikiDocsPath(entity({}))).toBe('openwiki');
    expect(
      getWikiDocsPath(entity({ 'wikigraph/openwiki-docs-path': '/wiki/' })),
    ).toBe('wiki');
    expect(
      getWikiDocsPath(entity({ 'wikigraph/openwiki-docs-path': '' })),
    ).toBe('');
  });
});
