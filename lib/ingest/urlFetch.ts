import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getMaxInputChars, ValidationError } from "@/lib/utils/validation";
import { getFetchTimeoutMs, getMaxFetchBytes } from "@/lib/ingest/limits";
import { extractHtmlText } from "@/lib/ingest/html";

const userAgent = "AgentGate-Demo/1.0";
const maxRedirects = 5;

type FetchedUrlContent = {
  finalUrl: string;
  content: string;
  title: string | null;
  contentType: string | null;
  bytesRead: number;
};

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function ipv4ToNumber(address: string) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  );
}

function isInIpv4Range(address: string, base: string, maskBits: number) {
  const addressNumber = ipv4ToNumber(address);
  const baseNumber = ipv4ToNumber(base);

  if (addressNumber === null || baseNumber === null) {
    return false;
  }

  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;

  return (addressNumber & mask) === (baseNumber & mask);
}

function isBlockedIpv4(address: string) {
  return (
    isInIpv4Range(address, "0.0.0.0", 8) ||
    isInIpv4Range(address, "10.0.0.0", 8) ||
    isInIpv4Range(address, "127.0.0.0", 8) ||
    isInIpv4Range(address, "169.254.0.0", 16) ||
    isInIpv4Range(address, "172.16.0.0", 12) ||
    isInIpv4Range(address, "192.168.0.0", 16)
  );
}

function isBlockedIpv6(address: string) {
  const lowerAddress = address.toLowerCase();

  if (lowerAddress === "::" || lowerAddress === "::1") {
    return true;
  }

  if (lowerAddress.startsWith("::ffff:")) {
    return isBlockedIpv4(lowerAddress.slice(7));
  }

  return (
    lowerAddress.startsWith("fc") ||
    lowerAddress.startsWith("fd") ||
    lowerAddress.startsWith("fe8") ||
    lowerAddress.startsWith("fe9") ||
    lowerAddress.startsWith("fea") ||
    lowerAddress.startsWith("feb")
  );
}

function isBlockedIpAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    return isBlockedIpv4(address);
  }

  if (version === 6) {
    return isBlockedIpv6(address);
  }

  return false;
}

function assertAllowedUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError("url must be a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError("Only http and https URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new ValidationError("URLs with embedded credentials are not allowed.");
  }

  const hostname = normalizeHostname(url.hostname);

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isBlockedIpAddress(hostname)
  ) {
    throw new ValidationError("Localhost and private-network URLs are blocked.");
  }

  return url;
}

async function assertResolvedHostIsPublic(url: URL) {
  const hostname = normalizeHostname(url.hostname);

  if (isIP(hostname)) {
    return;
  }

  let addresses: Array<{ address: string }>;

  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new ValidationError("Could not resolve the URL hostname.");
  }

  if (addresses.some((entry) => isBlockedIpAddress(entry.address))) {
    throw new ValidationError("The URL resolves to a private-network address.");
  }
}

function isTextLikeContentType(contentType: string | null) {
  if (!contentType) {
    return true;
  }

  const lowerType = contentType.toLowerCase();

  return (
    lowerType.startsWith("text/") ||
    lowerType.includes("html") ||
    lowerType.includes("json") ||
    lowerType.includes("xml")
  );
}

async function readLimitedBody(response: Response) {
  if (!response.body) {
    return { body: "", bytesRead: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  const maxBytes = getMaxFetchBytes();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bytesRead += value.byteLength;

    if (bytesRead > maxBytes) {
      reader.cancel();
      throw new ValidationError(
        `Fetched response is larger than ${maxBytes.toLocaleString()} bytes.`
      );
    }

    chunks.push(value);
  }

  return {
    body: Buffer.concat(chunks).toString("utf8"),
    bytesRead
  };
}

export async function fetchPublicUrlText(rawUrl: string): Promise<FetchedUrlContent> {
  let url = assertAllowedUrl(rawUrl);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getFetchTimeoutMs());

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      await assertResolvedHostIsPublic(url);

      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,text/plain,application/json;q=0.8,*/*;q=0.5"
        },
        redirect: "manual",
        signal: abortController.signal
      });

      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.has("location")
      ) {
        const location = response.headers.get("location") ?? "";
        url = assertAllowedUrl(new URL(location, url).toString());
        continue;
      }

      if (response.status >= 300 && response.status < 400) {
        throw new ValidationError("The URL redirected without a Location header.");
      }

      if (!response.ok) {
        throw new ValidationError(`URL fetch failed with HTTP ${response.status}.`);
      }

      const contentType = response.headers.get("content-type");

      if (!isTextLikeContentType(contentType)) {
        throw new ValidationError("URL response is not a text-like document.");
      }

      const { body, bytesRead } = await readLimitedBody(response);
      const isHtml =
        contentType?.toLowerCase().includes("html") || /<\/?[a-z][\s\S]*>/i.test(body);
      const extracted = isHtml
        ? extractHtmlText(body)
        : {
            title: null,
            text: body
          };
      const content = extracted.text.trim().slice(0, getMaxInputChars());

      if (!content) {
        throw new ValidationError("URL response did not contain readable text.");
      }

      return {
        finalUrl: url.toString(),
        content,
        title: extracted.title,
        contentType,
        bytesRead
      };
    }

    throw new ValidationError("The URL redirected too many times.");
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ValidationError("URL fetch timed out.");
    }

    throw new ValidationError("URL fetch failed. Check that the page is reachable.");
  } finally {
    clearTimeout(timeout);
  }
}
