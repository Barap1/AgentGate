import "server-only";

import type { SourceType } from "@/lib/guardrail/types";
import { getMaxInputChars, ValidationError } from "@/lib/utils/validation";
import { getMaxUploadBytes } from "@/lib/ingest/limits";
import { optionalSourceType, optionalUserTask } from "@/lib/ingest/validation";

const allowedExtensions = new Set([
  ".txt",
  ".md",
  ".html",
  ".htm",
  ".json",
  ".csv",
  ".log"
]);

const allowedContentTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/html",
  "application/json",
  "text/csv",
  "application/csv",
  "application/octet-stream"
]);

export type ParsedTextFile = {
  content: string;
  filename: string;
  fileSize: number;
  contentType: string;
  userTask: string;
  sourceType: SourceType;
};

function extensionFor(filename: string) {
  const index = filename.lastIndexOf(".");

  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

function assertTextLike(content: string) {
  if (content.includes("\u0000")) {
    throw new ValidationError("Uploaded file appears to be binary.");
  }

  const controlCharacters = content.match(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g);
  const controlCount = controlCharacters?.length ?? 0;

  if (controlCount > Math.max(8, content.length * 0.02)) {
    throw new ValidationError("Uploaded file appears to be binary.");
  }
}

function assertAllowedFile(file: File) {
  const extension = extensionFor(file.name);

  if (!allowedExtensions.has(extension)) {
    throw new ValidationError(
      "Unsupported file type. Upload .txt, .md, .html, .htm, .json, .csv, or .log."
    );
  }

  if (
    file.type &&
    !allowedContentTypes.has(file.type.toLowerCase()) &&
    !file.type.toLowerCase().startsWith("text/")
  ) {
    throw new ValidationError("Uploaded file content type is not supported.");
  }

  const maxUploadBytes = getMaxUploadBytes();

  if (file.size > maxUploadBytes) {
    throw new ValidationError(
      `Uploaded file must be ${maxUploadBytes.toLocaleString()} bytes or smaller.`
    );
  }
}

export async function parseTextFileUpload(formData: FormData): Promise<ParsedTextFile> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ValidationError("file is required.");
  }

  assertAllowedFile(file);

  let content: string;

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    content = decoder.decode(await file.arrayBuffer());
  } catch {
    throw new ValidationError("Uploaded file must be valid UTF-8 text.");
  }

  assertTextLike(content);

  if (content.trim().length === 0) {
    throw new ValidationError("Uploaded file is empty.");
  }

  const maxInputChars = getMaxInputChars();

  if (content.length > maxInputChars) {
    throw new ValidationError(
      `Uploaded file text must be ${maxInputChars.toLocaleString()} characters or fewer.`
    );
  }

  return {
    content,
    filename: file.name || "upload",
    fileSize: file.size,
    contentType: file.type || "application/octet-stream",
    userTask: optionalUserTask(formData.get("userTask")),
    sourceType: optionalSourceType(formData.get("sourceType"), "document")
  };
}
