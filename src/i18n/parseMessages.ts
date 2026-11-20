/**
 * Parses locale markdown files where each `## key` heading starts a message
 * and the body until the next heading is the value.
 */
export function parseMarkdownMessages(source: string): Record<string, string> {
  const messages: Record<string, string> = {};
  const lines = source.split("\n");
  let currentKey: string | null = null;
  let bodyLines: string[] = [];

  function flush() {
    if (currentKey === null) return;
    messages[currentKey] = bodyLines.join("\n").trimEnd();
    bodyLines = [];
  }

  for (const line of lines) {
    const headingMatch = /^## (.+)$/.exec(line);
    if (headingMatch) {
      flush();
      currentKey = headingMatch[1].trim();
      continue;
    }
    if (currentKey !== null) {
      bodyLines.push(line);
    }
  }
  flush();
  return messages;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
