"use server";

export async function getGeminiReply(bot: string, message: string) {
  const GEMINI_KEY = process.env.Gemini_Api;
  if (!GEMINI_KEY) return "⚠️ Gemini API key not found in .env file.";

  // ✅ Correct endpoint & model (free tier)
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const personas: Record<string, string> = {
    sora: "You are Sora — a cheerful, funny, and playful AI girl who speaks casually and happily.",
    ram: "You are Ram — calm, wise, and logical. Talk in a peaceful and respectful tone.",
    somya: "You are Somya — empathetic, emotional, and caring. Speak softly and kindly.",
  };

  const prompt = personas[bot.toLowerCase()] || "You are a helpful assistant.";

  try {
    const res = await fetch(`${url}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${prompt}\nUser: ${message}` }
            ]
          }
        ]
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error("Gemini Error:", data.error.message);
      return `⚠️ ${data.error.message}`;
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || "I didn't quite get that 💬";
  } catch (err) {
    console.error("Fetch Error:", err);
    return "⚠️ Network or API error occurred.";
  }
}
