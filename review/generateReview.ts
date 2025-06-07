import OpenAI from "openai";
import dotenv from "dotenv"
dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReview(diff: string): Promise<string> {
  const prompt = `You are a senior software engineer. Review this diff for potential bugs, security issues, or improvements:\n\n${diff}`;
  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return res.choices[0].message?.content ?? "No feedback generated.";
}
