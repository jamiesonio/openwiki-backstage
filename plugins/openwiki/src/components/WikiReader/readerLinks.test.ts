import { nodeIdFromHash, stripLeadingTitle } from './readerLinks';

describe('nodeIdFromHash', () => {
  it('decodes our hash scheme and ignores other hashes', () => {
    expect(nodeIdFromHash('#openwiki:architecture%2Foverview')).toBe(
      'architecture/overview',
    );
    expect(
      nodeIdFromHash('#openwiki:%E4%BA%BA%E7%89%A9%2F%E6%9C%B1%E6%A3%A3'),
    ).toBe('人物/朱棣');
    expect(nodeIdFromHash('#openwiki:bad%ZZ')).toBe('bad%ZZ');
    expect(nodeIdFromHash('#section')).toBeUndefined();
    expect(nodeIdFromHash('')).toBeUndefined();
    expect(nodeIdFromHash(null)).toBeUndefined();
  });
});

describe('stripLeadingTitle', () => {
  it('removes a leading H1 equal to the title', () => {
    expect(stripLeadingTitle('# Overview\n\nBody\n', 'Overview')).toBe(
      'Body\n',
    );
    expect(stripLeadingTitle('#  Overview  \nBody', ' overview')).toBe('Body');
  });

  it('keeps headings that differ and bodies without a heading', () => {
    expect(stripLeadingTitle('# Files\n\n- a\n', 'Home')).toBe(
      '# Files\n\n- a\n',
    );
    expect(stripLeadingTitle('plain text', 'plain text')).toBe('plain text');
    expect(stripLeadingTitle('intro\n# Title\n', 'Title')).toBe(
      'intro\n# Title\n',
    );
  });
});
