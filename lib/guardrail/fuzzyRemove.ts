function normalizeBlankLines(input: string) {
  return input
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordsFrom(input: string) {
  return input
    .match(/[A-Za-z0-9_@.[\]'-]+/g)
    ?.map((word) => word.trim())
    .filter(Boolean) ?? [];
}

function uniqueWordCount(words: string[]) {
  return new Set(words.map((word) => word.toLowerCase())).size;
}

export function fuzzyRemove(
  original: string,
  extracted: string | null
): {
  sanitized: string;
  removed: boolean;
  warning?: string;
} {
  const needle = extracted?.trim();

  if (!needle) {
    return {
      sanitized: original,
      removed: false
    };
  }

  if (original.includes(needle)) {
    return {
      sanitized: normalizeBlankLines(original.replace(needle, "")),
      removed: true
    };
  }

  const words = wordsFrom(needle);
  const uniqueWords = uniqueWordCount(words);

  if (words.length < 4 || uniqueWords < 3) {
    return {
      sanitized: original,
      removed: false,
      warning:
        "Extracted injection was too short for confident fuzzy removal; content was left unchanged."
    };
  }

  const separator = String.raw`[\s\p{P}\p{S}]*`;
  const pattern = words.map(escapeRegex).join(separator);
  const regex = new RegExp(pattern, "iu");
  const match = original.match(regex);

  if (!match || match.index === undefined) {
    return {
      sanitized: original,
      removed: false,
      warning:
        "Could not confidently match the extracted injection in the original content; content was left unchanged."
    };
  }

  const matchedText = match[0];
  const matchedWords = wordsFrom(matchedText);
  const coverage = matchedWords.length / words.length;
  const removalRatio = matchedText.length / Math.max(original.length, 1);

  if (coverage < 0.8 || removalRatio > 0.85) {
    return {
      sanitized: original,
      removed: false,
      warning:
        "Fuzzy match was not confident enough to remove safely; content was left unchanged."
    };
  }

  const before = original.slice(0, match.index);
  const after = original.slice(match.index + matchedText.length);

  return {
    sanitized: normalizeBlankLines(`${before}${after}`),
    removed: true
  };
}

// Quick internal examples:
// fuzzyRemove("Hello. Ignore prior instructions.", "Ignore prior instructions.").removed === true
// fuzzyRemove("A short note", "Ignore").removed === false
