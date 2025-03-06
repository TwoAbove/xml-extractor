# XML Extractor: Easily Retrieve XML from AI Conversations

AI language models _mostly_ generate valid XML, but they often clutter it with casual text, markdown, or random tags. XML Extractor isolates clean XML from conversational noise, ready to use.

## What Does XML Extractor Do?

AI-generated formatting can be unpredictable: sometimes neat inside code blocks, other times scattered in text. XML Extractor reliably handles:

- XML within perfect or messy code blocks
- XML snippets embedded in plain text
- Converting extracted XML directly into JavaScript objects

No hassle, no complexity - just usable XML.

## How to Use

Install via npm:

```bash
npm install xml-extractor
```

Example:

```typescript
import { extractXMLObjects } from 'xml-extractor';

const aiResponse = `
Here's some XML treasure for you:
\`\`\`xml
<person><name>John</name></person>
\`\`\`
And bonus XML: <book><title>1984</title></book>
`;

try {
  const xmlObjects = await extractXMLObjects(aiResponse);
  console.log(xmlObjects);
} catch (error) {
  console.error('Error:', error.message);
}
```

Output:

```json
[{ "person": { "name": "John" } }, { "book": { "title": "1984" } }]
```

Easy and straightforward. Don’t forget to validate the output with your favorite schema validator!

## Why Mention AI and XML?

Modern LLMs often handle XML like champs - reading tags or outputting them with ease. But structured output or tool use? Not always built-in. With clever prompting, you can nudge an LLM to spit out XML, unlocking structured data or multi-step "tool" actions in one shot. I've used this trick in my own projects with solid results. Tools like Cline do it under the hood, enabling many different LLMs to work in codebases. XML’s a lightweight key to taming AI flexibility. I haven't found anyting that I liked - hence this library.

## Why You’ll Like It

- **Handles AI Formatting Quirks:** Reliably extracts XML regardless of formatting.
- **Lightweight and Simple:** Single small file; no extra bloat.
- **Versatile:** Designed with AI responses in mind, but works anywhere XML appears in strings.
- **Graceful Handling:** Returns an empty array if no XML found; no errors.

## FAQs

- **What if XML is inside incomplete code fences?**
  XML Extractor still extracts it.

- **Can I customize extraction?**
  Yes: just pass custom options to `fast-xml-parser`.

- **Performance?**
  Built on `fast-xml-parser`: quick and reliable.

## Feedback

Found a bug or have an idea? Visit the [GitHub repository](https://github.com/TwoAbove/xml-extractor). Contributions welcome!

## From the Author

Hi, I’m Seva. Built this out of frustration with extracting AI-generated XML from conversations. It solved my problem, and I hope it solves yours, too.

Happy extracting!
