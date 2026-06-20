function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\""
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const lowerToken = token.toLowerCase();

    if (lowerToken.startsWith("#x")) {
      const codePoint = Number.parseInt(lowerToken.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (lowerToken.startsWith("#")) {
      const codePoint = Number.parseInt(lowerToken.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return namedEntities[lowerToken] ?? entity;
  });
}

function collapseWhitespace(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "));
}

export function extractHtmlText(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? collapseWhitespace(stripTags(titleMatch[1])) : null;
  const comments = Array.from(html.matchAll(/<!--([\s\S]*?)-->/g))
    .map((match) => collapseWhitespace(decodeHtmlEntities(match[1])))
    .filter(Boolean);
  const visibleHtml = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const visibleText = collapseWhitespace(stripTags(visibleHtml));
  const parts = [
    title ? `Title: ${title}` : null,
    visibleText,
    comments.length > 0 ? `HTML comments:\n${comments.join("\n")}` : null
  ].filter(Boolean);

  return {
    title,
    text: parts.join("\n\n")
  };
}
