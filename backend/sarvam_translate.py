import requests
import os

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "sk_y9798qpa_JJoiaSJY4GWdgVWW8Gs0LGN5")
SARVAM_URL = "https://api.sarvam.ai/translate"
MAX_CHARS = 1000

def sarvam_translate(text, target_language_code, source_language_code="auto"):
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    # Split text into chunks of <= 1000 characters
    chunks = [text[i:i+MAX_CHARS] for i in range(0, len(text), MAX_CHARS)]
    translated_chunks = []
    for chunk in chunks:
        payload = {
            "input": chunk,
            "source_language_code": source_language_code,
            "target_language_code": target_language_code
        }
        response = requests.post(SARVAM_URL, headers=headers, json=payload)
        if response.status_code == 200:
            translated_chunks.append(response.json().get("translated_text"))
        else:
            raise Exception(f"Sarvam API error: {response.status_code} - {response.text}")
    return "".join(translated_chunks) 