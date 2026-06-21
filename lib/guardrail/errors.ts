export function clientErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected sanitization failure.";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("no usable guardrail provider")
  ) {
    return "No LLM provider API key configured. Add one to `.env.local`.";
  }

  if (
    lowerMessage.includes("quota") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("rate")
  ) {
    return "Provider rate limit exceeded. Wait and retry, reduce input size, or switch models.";
  }

  if (
    lowerMessage.includes("unavailable") ||
    lowerMessage.includes("overloaded") ||
    lowerMessage.includes("capacity")
  ) {
    return "Provider is temporarily unavailable. Wait and retry, reduce input size, or switch models.";
  }

  return message;
}
