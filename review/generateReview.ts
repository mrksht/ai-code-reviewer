import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReview(diff: string): Promise<string> {
  const prompt = `You are a senior TypeScript engineer. Analyze the following code diff for issues in code quality.

Look for:
- Loose or unsafe types
- Opportunities for better data flow and structure
- Redundant or overloaded functions
- Type safety improvements
- General refactoring suggestions

Here is the code diff:
${diff}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return res.choices[0].message?.content ?? "No feedback generated.";
}
