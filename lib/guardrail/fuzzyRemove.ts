type TokenWithPosition = {
  token: string;
  start: number;
  end: number;
};

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

function normalizeMarkdownLinks(input: string) {
  return input.replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1 $2");
}

function normalizeForMatching(input: string) {
  return normalizeMarkdownLinks(input)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/mailto:/gi, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@']+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFrom(input: string) {
  return normalizeForMatching(input).split(" ").filter(Boolean);
}

function significantWordsFrom(input: string) {
  return wordsFrom(input).filter((word) => word.length >= 3);
}

function uniqueWordCount(words: string[]) {
  return new Set(words.map((word) => word.toLowerCase())).size;
}

function tokenOverlapScore(a: string[], b: string[]) {
  const aSet = new Set(a);
  const bSet = new Set(b);

  if (aSet.size === 0 || bSet.size === 0) {
    return 0;
  }

  let overlap = 0;

  for (const token of aSet) {
    if (bSet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(aSet.size, bSet.size);
}

function removeRange(original: string, start: number, end: number) {
  return normalizeBlankLines(`${original.slice(0, start)}${original.slice(end)}`);
}

function lineRanges(original: string) {
  const ranges: Array<{ text: string; start: number; end: number }> = [];
  let start = 0;

  for (const match of original.matchAll(/\r?\n/g)) {
    const lineBreakStart = match.index ?? 0;
    ranges.push({
      text: original.slice(start, lineBreakStart),
      start,
      end: lineBreakStart + match[0].length
    });
    start = lineBreakStart + match[0].length;
  }

  ranges.push({
    text: original.slice(start),
    start,
    end: original.length
  });

  return ranges;
}

function lineLevelRemoval(original: string, needleWords: string[]) {
  let bestMatch: { start: number; end: number; score: number } | null = null;

  for (const line of lineRanges(original)) {
    const lineWords = wordsFrom(line.text);

    if (lineWords.length < 3) {
      continue;
    }

    const score = tokenOverlapScore(needleWords, lineWords);
    const lineIsMostlyNeedle = lineWords.length <= Math.ceil(needleWords.length * 1.4);

    if (lineIsMostlyNeedle && score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        start: line.start,
        end: line.end,
        score
      };
    }
  }

  if (!bestMatch) {
    return null;
  }

  return removeRange(original, bestMatch.start, bestMatch.end);
}

function tokensWithPositions(input: string): TokenWithPosition[] {
  const tokens: TokenWithPosition[] = [];
  const regex = /[\p{L}\p{N}@']+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const token = normalizeForMatching(match[0]);

    if (!token) {
      continue;
    }

    tokens.push({
      token,
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return tokens;
}

function tokenWindowRemoval(original: string, needleWords: string[]) {
  const originalTokens = tokensWithPositions(original).filter(
    (token) => token.token !== "mailto"
  );

  if (originalTokens.length === 0 || needleWords.length === 0) {
    return null;
  }

  let bestMatch: {
    start: number;
    end: number;
    score: number;
    tokenCount: number;
  } | null = null;
  const minWindow = Math.max(3, Math.floor(needleWords.length * 0.65));
  const maxWindow = Math.min(originalTokens.length, Math.ceil(needleWords.length * 1.8));

  for (let startIndex = 0; startIndex < originalTokens.length; startIndex += 1) {
    for (
      let size = minWindow;
      size <= maxWindow && startIndex + size <= originalTokens.length;
      size += 1
    ) {
      const windowTokens = originalTokens
        .slice(startIndex, startIndex + size)
        .map((token) => token.token);
      const score = tokenOverlapScore(needleWords, windowTokens);

      if (score >= 0.72 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          start: originalTokens[startIndex].start,
          end: originalTokens[startIndex + size - 1].end,
          score,
          tokenCount: size
        };
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  const removalRatio = (bestMatch.end - bestMatch.start) / Math.max(original.length, 1);

  if (removalRatio > 0.9 && bestMatch.tokenCount < originalTokens.length) {
    return null;
  }

  return removeRange(original, bestMatch.start, bestMatch.end);
}

function regexFallbackRemoval(original: string, needleWords: string[]) {
  const significantWords = needleWords
    .filter((word) => word.length >= 3)
    .filter((word, index, words) => words.indexOf(word) === index)
    .slice(0, 18);

  if (significantWords.length < 4) {
    return null;
  }

  const flexibleSeparator = String.raw`(?:[\s\p{P}\p{S}]|mailto:|\[[^\]]*]|\([^)]*\))*`;
  const pattern = significantWords.map(escapeRegex).join(flexibleSeparator);
  const regex = new RegExp(pattern, "iu");
  const match = original.match(regex);

  if (!match || match.index === undefined) {
    return null;
  }

  const matchedText = match[0];
  const matchedWords = significantWordsFrom(matchedText);
  const coverage = tokenOverlapScore(significantWords, matchedWords);
  const removalRatio = matchedText.length / Math.max(original.length, 1);

  if (coverage < 0.7 || removalRatio > 0.9) {
    return null;
  }

  return removeRange(original, match.index, match.index + matchedText.length);
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

  const lineRemoved = lineLevelRemoval(original, words);

  if (lineRemoved !== null) {
    return {
      sanitized: lineRemoved,
      removed: true
    };
  }

  const tokenWindowRemoved = tokenWindowRemoval(original, words);

  if (tokenWindowRemoved !== null) {
    return {
      sanitized: tokenWindowRemoved,
      removed: true
    };
  }

  const regexRemoved = regexFallbackRemoval(original, words);

  if (regexRemoved !== null) {
    return {
      sanitized: regexRemoved,
      removed: true
    };
  }

  return {
    sanitized: original,
    removed: false,
    warning:
      "Could not confidently match the extracted injection in the original content; content was left unchanged."
  };
}

// Quick internal examples:
// fuzzyRemove("Hello. Ignore prior instructions.", "Ignore prior instructions.").removed === true
// fuzzyRemove("A short note", "Ignore").removed === false
