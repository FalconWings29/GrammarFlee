import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { MangleTextBody, MangleTextResponse } from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are GrammarFlee, the world's most enthusiastic language destroyer. Your mission is to take clean, well-written text and gleefully corrupt it according to the chaos levels specified by the user.

You MUST return ONLY a valid JSON object with no markdown, no code blocks, no extra text. The JSON must have exactly these fields:
- "destroyedText": the full mangled string
- "errors": an array of error annotation objects
- "chaosScore": an integer from 0-100 representing overall destruction intensity

Each error object in "errors" must have:
- "type": one of "spelling", "punctuation", "grammar", "wordOrder"
- "original": the original word or phrase
- "destroyed": what you changed it to
- "explanation": a sarcastic, witty explanation of why this change is "better" (e.g., "Who needs vowels anyway? So passé.", "Periods are just dots for boring people.", "Shakespeare invented sentences that make no sense, and look how famous he got.")
- "startIndex": the character index in destroyedText where this error starts (must be accurate!)
- "length": the number of characters of the destroyed span in destroyedText

CHAOS LEVEL GUIDE:
- 0-20: Barely noticeable changes, just minor weirdness
- 21-40: Light corruption, a few errors per sentence
- 41-60: Moderate chaos, errors throughout
- 61-80: Heavy destruction, hard to read but still parseable
- 81-100: Maximum chaos, barely comprehensible

Apply each type of chaos proportional to its specified level:
- spellingChaos: misspell words, swap letters, add/remove letters, phonetic spelling
- punctuationChaos: misplace commas, remove periods, add random exclamation marks and ellipses, swap punctuation
- grammarChaos: wrong tense, subject-verb disagreement, dangling modifiers, mixed up pronouns
- wordOrderChaos: rearrange words within sentences, move clauses around

For the startIndex values, count carefully from the very beginning of destroyedText (index 0). The span at startIndex with given length must exactly match the "destroyed" value in destroyedText.

Be creative and sarcastic with explanations. Have fun with it!`;

router.post("/mangle", async (req, res) => {
  const parseResult = MangleTextBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "validation_error",
      message: parseResult.error.message,
    });
    return;
  }

  const { text, spellingChaos, punctuationChaos, grammarChaos, wordOrderChaos, apiKey } =
    parseResult.data;

  if (!text.trim()) {
    res.status(400).json({
      error: "empty_text",
      message: "Text cannot be empty",
    });
    return;
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = `Please mangle the following text with these chaos levels:
- Spelling chaos: ${spellingChaos}/100
- Punctuation chaos: ${punctuationChaos}/100
- Grammar chaos: ${grammarChaos}/100
- Word order chaos: ${wordOrderChaos}/100

Text to mangle:
"""
${text}
"""

Remember: return ONLY a JSON object with "destroyedText", "errors" array, and "chaosScore". No markdown, no code blocks.`;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawContent = message.content[0];
    if (rawContent.type !== "text") {
      res.status(500).json({
        error: "unexpected_response",
        message: "AI returned unexpected content type",
      });
      return;
    }

    let parsed: unknown;
    try {
      const jsonText = rawContent.text.trim();
      parsed = JSON.parse(jsonText);
    } catch {
      const jsonMatch = rawContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({
          error: "parse_error",
          message: "AI response was not valid JSON",
        });
        return;
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const validatedResult = MangleTextResponse.safeParse(parsed);
    if (!validatedResult.success) {
      res.status(500).json({
        error: "schema_error",
        message: "AI response did not match expected schema: " + validatedResult.error.message,
      });
      return;
    }

    res.json(validatedResult.data);
  } catch (err: unknown) {
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(400).json({
        error: "invalid_api_key",
        message: "Invalid Anthropic API key. Please check your key and try again.",
      });
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({
        error: "rate_limit",
        message: "Rate limit exceeded. Please wait a moment before trying again.",
      });
    } else if (err instanceof Error) {
      res.status(500).json({
        error: "api_error",
        message: err.message,
      });
    } else {
      res.status(500).json({
        error: "unknown_error",
        message: "An unknown error occurred",
      });
    }
  }
});

export default router;
