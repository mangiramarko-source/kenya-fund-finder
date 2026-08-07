// test-prompt.ts
// Run this script using: npx tsx test-prompt.ts

// 1. Put your API Key here
const GEMINI_API_KEY = process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY_HERE";

const AI_GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama-3.3-70b-versatile";

async function testPrompt() {
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    console.error("❌ Please insert your GEMINI_API_KEY in the script first!");
    return;
  }

  // 2. Adjust your system prompt (instructions)
  const systemPrompt = `You are an expert financial journalist for "Kenya Fund Finder".
Your job is to read raw social media updates and write a completely original, neutral, and professional financial news update based on it.
Return plain text only.`;
  
  // 3. Adjust your user prompt (the data/input)
  const userPrompt = `Source text:
"Safaricom just announced a huge dividend payout for Q3 2026!"

Rewrite this into a professional news update. Make it easy for a 10th grader to understand.`;

  console.log("Sending prompt to Gemini...");

  try {
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`❌ Error: ${res.status} - ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }

    const data = await res.json();
    console.log("\n--- ✨ AI RESPONSE ✨ ---\n");
    console.log(data.choices?.[0]?.message?.content);
    console.log("\n------------------------\n");

  } catch (err) {
    console.error("Failed to execute prompt:", err);
  }
}

testPrompt();
