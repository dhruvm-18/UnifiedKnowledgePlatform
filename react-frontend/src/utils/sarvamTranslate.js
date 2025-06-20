const SARVAM_API_KEY = "sk_y9798qpa_JJoiaSJY4GWdgVWW8Gs0LGN5";
const SARVAM_URL = "https://api.sarvam.ai/translate";
const MAX_CHARS = 2000;

export async function sarvamTranslate(input, targetLang, sourceLang = "auto") {
  const normalizeCode = code => (code && code.includes('-') ? code.split('-')[0] : code);

  // Split input into chunks of <= MAX_CHARS
  const chunks = [];
  for (let i = 0; i < input.length; i += MAX_CHARS) {
    chunks.push(input.slice(i, i + MAX_CHARS));
  }

  let translated = "";
  for (const chunk of chunks) {
    // Try BCP-47 code first
    console.log(`[Sarvam Translate] Translating chunk: source=${sourceLang}, target=${targetLang}, length=${chunk.length}`);
    let response = await fetch(SARVAM_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: chunk,
        source_language_code: sourceLang,
        target_language_code: targetLang
      })
    });

    // If 400, try fallback with normalized codes
    if (!response.ok && response.status === 400 && (targetLang.includes('-') || sourceLang.includes('-'))) {
      const normSource = normalizeCode(sourceLang);
      const normTarget = normalizeCode(targetLang);
      console.log(`[Sarvam Translate] Fallback translation: source=${normSource}, target=${normTarget}`);
      response = await fetch(SARVAM_URL, {
        method: "POST",
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: chunk,
          source_language_code: normSource,
          target_language_code: normTarget
        })
      });
    }

    if (!response.ok) throw new Error("Sarvam Translate failed");
    const data = await response.json();
    translated += data.translated_text || "";
  }
  return { translated_text: translated };
} 