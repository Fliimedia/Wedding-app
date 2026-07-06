// Diagnose-endpoint: laat (zonder de sleutel te tonen) zien of de server
// de Anthropic-omgevingsvariabele ziet, en in welke Vercel-omgeving.
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV || "onbekend",
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyLength: (process.env.ANTHROPIC_API_KEY || "").length,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  });
}
