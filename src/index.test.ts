import { describe, it, expect } from 'vitest';
import { extractXMLObjects } from './index.js';
import type { ParsedXMLObject } from './index.js';

describe('XML Extractor', () => {
  // Basic functionality tests
  it('should extract and parse multiple ```xml ... ``` blocks', async () => {
    const input = `
      Here's some XML:
      \`\`\`xml
      <person><name>John</name></person>
      \`\`\`
      And another:
      \`\`\`xml
      <book><title>1984</title></book>
      \`\`\`
    `;
    const expected = [{ person: { name: 'John' } }, { book: { title: 1984 } }];
    const result = await extractXMLObjects(input);
    expect(result).toEqual(expected);
  });

  it('should extract and parse raw XML tags when no code blocks are present', async () => {
    const input = `
      <person><name>John</name></person>
      <book><title>1984</title></book>
    `;
    const expected = [{ person: { name: 'John' } }, { book: { title: 1984 } }];
    const result = await extractXMLObjects(input);
    expect(result).toEqual(expected);
  });

  it('should extract and parse mixed content', async () => {
    const input = `
      Some text.
      \`\`\`xml
      <person><name>John</name></person>
      \`\`\`
      More text.
      <book><title>1984</title></book>
    `;
    const expected = [{ person: { name: 'John' } }, { book: { title: 1984 } }];
    const result = await extractXMLObjects(input);
    expect(result).toEqual(expected);
  });

  it('should throw an error for empty input', async () => {
    await expect(extractXMLObjects('')).rejects.toThrow(
      'Input must be a non-empty string',
    );
  });

  // Edge case tests
  it('should handle XML with comments', async () => {
    const input = `
      \`\`\`xml
      <!-- User info -->
      <person><!-- Name --><name>John</name></person>
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([{ person: { name: 'John' } }]);
  });

  it('should handle XML processing instructions', async () => {
    const input = `
      \`\`\`xml
      <?xml version="1.0" encoding="UTF-8"?>
      <?xml-stylesheet type="text/xsl" href="style.xsl"?>
      <person><name>John</name></person>
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([{ person: { name: 'John' } }]);
  });

  it('should handle self-closing tags', async () => {
    const input = `
      \`\`\`xml
      <person><name>John</name><img src="photo.jpg"/></person>
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([
      { person: { name: 'John', img: { '@_src': 'photo.jpg' } } },
    ]);
  });

  it('should handle mixed content with text and elements', async () => {
    const input = `
      \`\`\`xml
      <paragraph>This is <b>bold</b> text.</paragraph>
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([
      { paragraph: { '#text': ['This is  text.'], b: 'bold' } },
    ]);
  });

  it('should handle attributes and child elements with the same name', async () => {
    const input = `
      \`\`\`xml
      <person name="John"><name>Johnny</name></person>
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([{ person: { '@_name': 'John', name: 'Johnny' } }]);
  });

  it('should throw error for unclosed tags', async () => {
    const input = `
      \`\`\`xml
      <person><name>John
      \`\`\`
    `;
    await expect(extractXMLObjects(input)).rejects.toThrow(
      'Failed to parse any XML blocks',
    );
  });

  it('should handle standalone self-closing tags in raw XML', async () => {
    const input = "Some text <img src='photo.jpg'/> more text";
    const result = await extractXMLObjects(input);
    expect(result).toEqual([{ img: { '@_src': 'photo.jpg' } }]);
  });

  it('should handle very large XML structures', async () => {
    const generateNestedXML = (depth: number): string => {
      let xml = '<root>';
      for (let i = 0; i < depth; i++) {
        xml += `<level${i}><item>value${i}</item>`;
      }
      for (let i = depth - 1; i >= 0; i--) {
        xml += `</level${i}>`;
      }
      xml += '</root>';
      return xml;
    };

    const input = `
      \`\`\`xml
      ${generateNestedXML(100)}
      \`\`\`
    `;
    const result = await extractXMLObjects(input);
    expect(result.length).toBeGreaterThan(0);
    const root = (result[0] as ParsedXMLObject).root;
    expect(root).toBeDefined();
    expect(typeof root).toBe('object');
    expect('level0' in root).toBe(true);
  });

  it('should handle unclosed code blocks by including their content', async () => {
    const input = `
      \`\`\`xml
      <person><name>John</name></person>
      More text in the block
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([{ person: { name: 'John' } }]);
  });

  it('should return empty array when no XML is found', async () => {
    const input = 'Just some text without any XML content';
    const result = await extractXMLObjects(input);
    expect(result).toEqual([]);
  });

  it('should handle multiple unclosed code blocks', async () => {
    const input = `
      \`\`\`xml
      <person><name>John</name></person>
      Some text
      \`\`\`
      Normal text
      \`\`\`xml
      <book><title>1984</title></book>
      More text
    `;
    const result = await extractXMLObjects(input);
    expect(result).toEqual([
      { person: { name: 'John' } },
      { book: { title: 1984 } },
    ]);
  });
});
