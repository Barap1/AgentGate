export function clientErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected sanitization failure.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("no usable guardrail provider")
  ) {
    return "No usable guardrail provider is configured. Set GROQ_API_KEY.";
  }

  if (
    lowerMessage.includes("quota") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("rate")
  ) {
    return "Groq request failed after trying qwen/qwen3-32b and llama-3.3-70b-versatile. The provider may be rate-limited or temporarily unavailable.";
  }

  if (
    lowerMessage.includes("unavailable") ||
    lowerMessage.includes("overloaded") ||
    lowerMessage.includes("capacity")
  ) {
    return "Groq request failed after trying qwen/qwen3-32b and llama-3.3-70b-versatile. The provider may be rate-limited or temporarily unavailable.";
  }

  return message;
}
