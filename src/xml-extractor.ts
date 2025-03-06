import { XMLParser } from "fast-xml-parser";
import type { X2jOptions } from "fast-xml-parser";

type ParsedXMLObject = Record<string, any>;
type XMLValue = ParsedXMLObject | string | number | boolean | null;

interface ExtractionError {
  message: string;
  xmlSnippet?: string;
  cause?: Error;
}

/**
 * Extracts and parses all XML blocks from a string.
 * First looks for ```xml ... ``` code blocks, then checks for raw XML tags.
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

  // Step 1: Extract XML from ```xml ... ``` code blocks using line-by-line parsing
  const lines = input.split("\n");
  let inBlock = false;
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("```xml")) {
      // If we're already in a block, save it before starting new one
      if (inBlock && currentBlock.length > 0) {
        const blockContent = currentBlock.join("\n").trim();
        if (blockContent) {
          xmlStrings.push(blockContent);
        }
      }
      inBlock = true;
      currentBlock = [];
    } else if (line.trim() === "```" && inBlock) {
      inBlock = false;
      const blockContent = currentBlock.join("\n").trim();
      if (blockContent) {
        xmlStrings.push(blockContent);
      }
      currentBlock = [];
    } else if (inBlock) {
      currentBlock.push(line);
    }
  }

  // Handle unclosed blocks by including content
  if (inBlock && currentBlock.length > 0) {
    const blockContent = currentBlock.join("\n").trim();
    if (blockContent) {
      xmlStrings.push(blockContent);
    }
  }

  // Step 2: Always look for raw XML tags as well
  // Build a clean input by removing all content between ```xml markers (even unclosed ones)
  let cleanInBlock = false;
  const cleanInput = input.split("\n").reduce((acc, line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("```xml")) {
      cleanInBlock = true;
      return acc;
    } else if (trimmedLine === "```" && cleanInBlock) {
      cleanInBlock = false;
      return acc;
    }
    return cleanInBlock ? acc : acc + "\n" + line;
  }, "");

  // This regex matches both complete elements and self-closing tags
  const rawXMLRegex =
    /<([a-zA-Z][a-zA-Z0-9:-]*)[^>]*?(?:\/\s*>|>(?:(?!<\1[^>]*>)[\s\S])*?<\/\1>)/g;
  const matches = Array.from(cleanInput.matchAll(rawXMLRegex));

  if (matches.length > 0) {
    const rawXML = matches.map((match) => match[0].trim());
    xmlStrings.push(...rawXML);
  }

  // Return empty array if no XML found instead of throwing error
  if (xmlStrings.length === 0) {
    return [];
  }

  // Step 3: Parse each XML string into a JavaScript object
  const parsedObjects: ParsedXMLObject[] = [];
  const errors: ExtractionError[] = [];

  const defaultOptions: Partial<X2jOptions> = {
    attributeNamePrefix: "@_",
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: false, // Don't trim values to preserve spaces
    ignoreDeclaration: true,
    parseTagValue: true,
    stopNodes: ["#text"],
  };

  // Try to parse each XML string
  for (const xml of xmlStrings) {
    try {
      // Pre-process XML to remove comments and processing instructions
      const cleanXml = xml
        .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
        .replace(/<\?[\s\S]*?\?>/g, ""); // Remove processing instructions

      // Validate XML structure
      if (!isValidXML(cleanXml)) {
        throw new Error("Malformed XML structure");
      }

      const parsed = parseXML(cleanXml, {
        ...defaultOptions,
        ...options,
      });

      // Post-process the parsed object to simplify the structure
      const processed = simplifyXMLStructure(parsed);

      if (
        processed &&
        (typeof processed === "object"
          ? Object.keys(processed).length > 0
          : true)
      ) {
        // Ensure we always return an object at the top level
        parsedObjects.push(
          typeof processed === "object"
            ? processed
            : { "#text": processed as string }
        );
      } else {
        throw new Error("Invalid XML structure");
      }
    } catch (error) {
      errors.push({
        message: `Failed to parse XML block: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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
 * Validates XML structure by checking for matching tags and proper nesting
 */
function isValidXML(xml: string): boolean {
  const tagStack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g;
  let match;

  while ((match = tagRegex.exec(xml))) {
    const [fullTag, tagName] = match;
    if (!tagName) {
      return false; // Invalid tag format
    }

    if (fullTag.startsWith("</")) {
      // Closing tag
      if (tagStack.length === 0 || tagStack.pop() !== tagName) {
        return false; // Mismatched or unexpected closing tag
      }
    } else if (!fullTag.endsWith("/>")) {
      // Opening tag (not self-closing)
      tagStack.push(tagName);
    }
  }

  return tagStack.length === 0; // All tags should be matched
}

/**
 * Parses an XML string into a JavaScript object using fast-xml-parser.
 * @param xmlString The XML string to parse
 * @param options Optional parsing options to override defaults
 * @returns Parsed JavaScript object
 * @throws Error if parsing fails
 */
function parseXML(
  xmlString: string,
  options?: Partial<X2jOptions>
): ParsedXMLObject {
  try {
    const parser = new XMLParser(options);
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

/**
 * Simplifies the XML structure by handling text nodes and attributes
 */
function simplifyXMLStructure(obj: Record<string, any>): XMLValue {
  if (typeof obj !== "object" || obj === null) {
    // Convert undefined to null to match XMLValue type
    return obj ?? null;
  }

  if (Array.isArray(obj)) {
    // Handle nested arrays from the parser
    const processedArray = obj.map((item): XMLValue => {
      if (item === undefined || item === null) {
        return null;
      }
      if (typeof item === "object") {
        return simplifyXMLStructure(item);
      }
      // For primitives (string, number, boolean), return as-is
      return item as string | number | boolean;
    });
    const result =
      processedArray.length === 1 ? processedArray[0] : processedArray;
    return result ?? null; // Ensure we never return undefined
  }

  const result: ParsedXMLObject = {};

  // First, process non-attribute properties and collect text nodes
  const texts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === "#text") {
      // Keep text nodes as separate entries
      const stringValue = Array.isArray(value)
        ? value.map((v) => (v === undefined || v === null ? "" : String(v)))
        : value === undefined || value === null
        ? ""
        : String(value);

      if (Array.isArray(stringValue)) {
        texts.push(...stringValue);
      } else {
        texts.push(stringValue);
      }
    } else if (!key.startsWith("@_")) {
      const processed = simplifyXMLStructure(value);
      const validValue = processed ?? null; // Convert undefined to null
      result[key] = validValue;
    }
  }

  // Then, add attributes (keep @_ prefix)
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@_")) {
      const validValue = value ?? null;
      result[key] = validValue;
    }
  }

  // Handle text content
  if (texts.length > 0) {
    if (Object.keys(result).length === 0) {
      // If this is a leaf node with only text content, return the text
      const textResult = texts.length === 1 ? texts[0] : texts;
      return textResult as string;
    }
    // Otherwise, add text as an array property
    result["#text"] = texts as string[];
  }

  return result as ParsedXMLObject;
}

export type { ParsedXMLObject, XMLValue, ExtractionError };
