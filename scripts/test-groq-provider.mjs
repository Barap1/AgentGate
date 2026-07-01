import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const moduleCache = new Map();

function loadTsModule(relativePath) {
  const filename = resolve(projectRoot, relativePath);

  if (moduleCache.has(filename)) {
    return moduleCache.get(filename).exports;
  }

  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  });
  const loadedModule = { exports: {} };
  moduleCache.set(filename, loadedModule);

  const localRequire = (specifier) => {
    if (specifier === "server-only") {
      return {};
    }

    if (specifier.startsWith("@/")) {
      return loadTsModule(`${specifier.slice(2)}.ts`);
    }

    if (specifier.startsWith(".")) {
      return loadTsModule(`${join(dirname(relativePath), specifier)}.ts`);
    }

    throw new Error(`Unsupported test import: ${specifier}`);
  };

  Function("require", "module", "exports", outputText)(
    localRequire,
    loadedModule,
    loadedModule.exports
  );

  return loadedModule.exports;
}

const envBackup = { ...process.env };
const fetchBackup = globalThis.fetch;
const warnBackup = console.warn;
const calls = [];

try {
  console.warn = () => {};
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_PRIMARY_MODEL = "qwen/qwen3-32b";
  process.env.GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";
  process.env.GROQ_BASE_URL = "https://api.groq.com/openai/v1";

  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    assert.equal(init.signal instanceof AbortSignal, true);

    if (body.model === "qwen/qwen3-32b") {
      return new Response(JSON.stringify({ error: { message: "rate limit" } }), {
        status: 429,
        headers: { "retry-after": "10" }
      });
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                containsInjection: false,
                injectedPrompt: null,
                confidence: 0.95,
                reason: "No injection.",
                categories: []
              })
            }
          }
        ]
      }),
      { status: 200 }
    );
  };

  const { createGroqProvider } = loadTsModule("lib/guardrail/providers/groq.ts");
  const response = await createGroqProvider().check({
    systemPrompt: "Return JSON.",
    userTask: "Summarize.",
    sourceType: "support_ticket",
    content: "Normal ticket.",
    maxOutputTokens: 128
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(calls[0].body.model, "qwen/qwen3-32b");
  assert.equal(calls[1].body.model, "llama-3.3-70b-versatile");
  assert.equal(response.provider, "groq");
  assert.equal(response.modelUsed, "llama-3.3-70b-versatile");
  assert.equal(response.result.containsInjection, false);
} finally {
  process.env = envBackup;
  globalThis.fetch = fetchBackup;
  console.warn = warnBackup;
}

console.log("groq provider fallback test passed");
