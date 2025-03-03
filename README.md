# XML Extractor

A lightweight, single-file library to extract and parse all XML blocks from a string (e.g., AI responses). Works with any input containing XML, enclosed in ```xml ... ``` blocks or raw XML tags. Uses `fast-xml-parser` for fast and flexible XML parsing.

## Mention AI Responses?

Modern LLMs are very good at attending to, reading, and returning XML. That's why it can be useful to be able to easily extract it from their responses. Structured XML provides a reliable format for AI-generated content that needs to be programmatically processed, making interactions with AI models more deterministic and easier to integrate into applications. Not fool-proof like "structured outputs", but this approach is useable for many other models.

## Installation

```sh
npm install xml-extractor
```

## Usage

### Basic Example

Extract and parse multiple XML blocks from a string:

```typescript
import { extractXMLObjects } from 'xml-extractor';

// Example input with multiple XML blocks
const aiResponse = `
Here's some XML:
\`\`\`xml
<person><name>John</name><age>30</age></person>
\`\`\`
And another:
\`\`\`xml
<book><title>1984</title></book>
\`\`\`
`;

try {
  const xmlObjects = await extractXMLObjects(aiResponse);
  console.log(xmlObjects);
} catch (error) {
  console.error(error.message);
}
```

Output:

```json
[
  { "person": { "name": "John", "age": 30 } },
  { "book": { "title": "1984" } }
]
```

### Example with Attributes

XML with attributes is supported and merged directly into the parent object:

```typescript
import { extractXMLObjects } from 'xml-extractor';

const aiResponse = `
Here's an XML with attributes:
\`\`\`xml
<person id="123" status="active">
    <name>John</name>
    <age>30</age>
</person>
\`\`\`
`;

try {
  const xmlObjects = await extractXMLObjects(aiResponse);
  console.log(xmlObjects);
} catch (error) {
  console.error(error.message);
}
```

Output:

```json
[
  {
    "person": {
      "id": "123",
      "status": "active",
      "name": "John",
      "age": 30
    }
  }
]
```
