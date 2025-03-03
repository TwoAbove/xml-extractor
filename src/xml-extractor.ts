import { XMLParser } from "fast-xml-parser";
import type { X2jOptions } from "fast-xml-parser";

type ParsedXMLObject = any;

interface ExtractionError {
  message: string;
  xmlSnippet?: string;
  cause?: Error;
}

/**
 * Extracts and parses all XML blocks from a string.
 * Looks for ```xml ... ``` blocks first, then raw XML tags as a fallback.
 * Returns an array of parsed JavaScript objects.
 * @param input The input string (e.g., AI response) to extract XML from
 * @param options Optional parsing options to pass to fast-xml-parser
 * @returns Array of parsed XML objects
 * @throws Error if no valid XML is found or parsing fails
 */
export async function extractXMLObjects(
  input: string,
  options?: Partial<X2jOptions>
): Promise<ParsedXMLObject[]> {
  if (!input || typeof input !== "string") {
    throw new Error("Input must be a non-empty string");
  }

  const xmlStrings: string[] = [];

  // Step 1: Extract XML from Markdown code blocks (```xml ... ```)
  const codeBlockRegex = /```xml([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(input)) !== null) {
    const xmlContent = match[1]?.trim();
    if (xmlContent) {
      xmlStrings.push(xmlContent);
    }
  }

  // Step 2: If no code blocks found, look for raw XML tags
  if (xmlStrings.length === 0) {
    const rawXMLRegex = /<[^>]+>[\s\S]*?<\/[^>]+>/g;
    while ((match = rawXMLRegex.exec(input)) !== null) {
      const xmlContent = match[0]?.trim();
      if (xmlContent) {
        xmlStrings.push(xmlContent);
      }
    }
  }

  if (xmlStrings.length === 0) {
    throw new Error("No valid XML blocks found in the input");
  }

  // Step 3: Parse each XML string into a JavaScript object
  const parsedObjects: ParsedXMLObject[] = [];
  const errors: ExtractionError[] = [];

  for (const xml of xmlStrings) {
    try {
      const parsed = await parseXML(xml, options);
      parsedObjects.push(parsed);
    } catch (error) {
      errors.push({
        message: "Failed to parse XML block",
        xmlSnippet: xml.length > 50 ? `${xml.slice(0, 50)}...` : xml,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  if (parsedObjects.length === 0 && errors.length > 0) {
    const errorDetails = errors
      .map(
        (err, idx) =>
          `Error ${idx + 1}: ${err.message} (Snippet: ${err.xmlSnippet})`
      )
      .join("\n");
    throw new Error(`Failed to parse any XML blocks:\n${errorDetails}`);
  }

  return parsedObjects;
}

/**
 * Parses an XML string into a JavaScript object using fast-xml-parser.
 * @param xmlString The XML string to parse
 * @param options Optional parsing options to pass to fast-xml-parser
 * @returns Parsed JavaScript object
 * @throws Error if parsing fails
 */
async function parseXML(
  xmlString: string,
  options?: Partial<X2jOptions>
): Promise<ParsedXMLObject> {
  try {
    // Configure fast-xml-parser to merge attributes into the parent object
    const parser = new XMLParser({
      attributeNamePrefix: "@",
      allowBooleanAttributes: true,
      ignoreAttributes: false,
      parseAttributeValue: true,
      ...options,
    });

    const result = parser.parse(xmlString);
    return result;
  } catch (error) {
    throw new Error(
      `XML parsing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export type { ParsedXMLObject, ExtractionError };
