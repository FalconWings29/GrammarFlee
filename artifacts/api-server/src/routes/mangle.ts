import { Router, type IRouter } from "express";
import { MangleTextBody, MangleTextResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const HF_BASE = "https://api-inference.huggingface.co/models";
const HF_TOKEN = process.env.HF_TOKEN ?? "";
const HF_MODEL = process.env.HF_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.3";

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
  if (!HF_TOKEN) {
    res.status(503).json({
      error: "not_configured",
      message: "HuggingFace token is not configured on the server. Set the HF_TOKEN secret.",
    });
    return;
  }

  const parseResult = MangleTextBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: parseResult.error.message });
    return;
  }

  const { text, spellingChaos, punctuationChaos, grammarChaos, wordOrderChaos } = parseResult.data;

  if (!text.trim()) {
    res.status(400).json({ error: "empty_text", message: "Text cannot be empty" });
    return;
  }

  const userPrompt = `Please mangle the following text with these chaos levels:
- Spelling chaos: ${spellingChaos}/100
- Punctuation chaos: ${punctuationChaos}/100
- Grammar chaos: ${grammarChaos}/100
- Word order chaos: ${wordOrderChaos}/100

Text to mangle:
"""
${text}
"""

Return ONLY a JSON object with "destroyedText", "errors" array, and "chaosScore". No markdown, no code blocks, no explanation outside the JSON.`;

  const url = `${HF_BASE}/${HF_MODEL}/v1/chat/completions`;

  try {
    const hfRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.8,
        stream: false,
      }),
    });

    if (hfRes.status === 401) {
      res.status(401).json({ error: "invalid_token", message: "Invalid HuggingFace token." });
      return;
    }
    if (hfRes.status === 404) {
      res.status(404).json({ error: "model_not_found", message: `Model "${HF_MODEL}" not found or doesn't support chat completions.` });
      return;
    }
    if (hfRes.status === 429) {
      res.status(429).json({ error: "rate_limit", message: "HuggingFace rate limit reached. Wait a moment and try again." });
      return;
    }
    if (!hfRes.ok) {
      const errText = await hfRes.text();
      res.status(502).json({ error: "hf_error", message: `HuggingFace returned ${hfRes.status}: ${errText.slice(0, 200)}` });
      return;
    }

    const hfData = (await hfRes.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: string;
    };

    if (hfData.error) {
      res.status(502).json({ error: "hf_model_error", message: hfData.error });
      return;
    }

    const rawText = hfData.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        res.status(500).json({ error: "parse_error", message: "Model response was not valid JSON. Try again." });
        return;
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        res.status(500).json({ error: "parse_error", message: "Could not parse JSON from model response." });
        return;
      }
    }

    const validated = MangleTextResponse.safeParse(parsed);
    if (!validated.success) {
      res.status(500).json({ error: "schema_error", message: "Model response didn't match schema: " + validated.error.message });
      return;
    }

    res.json(validated.data);
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      res.status(503).json({ error: "network_error", message: "Could not reach HuggingFace API." });
    } else if (err instanceof Error) {
      res.status(500).json({ error: "api_error", message: err.message });
    } else {
      res.status(500).json({ error: "unknown_error", message: "An unknown error occurred" });
    }
  }
});

export default router;
