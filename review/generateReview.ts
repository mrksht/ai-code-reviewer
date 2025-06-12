import OpenAI from "openai";
import dotenv from "dotenv"
dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export interface FileReview {
  filePath: string;
  hasIssues: boolean;
  review: string;
  lineComments?: LineComment[];
}

export interface LineComment {
  line: number;
  comment: string;
  severity: 'info' | 'warning' | 'error';
}

export async function generateReview(diff: any): Promise<FileReview> {
  const filePath = diff.new_path || diff.old_path;
  const diffContent = diff.diff;

  const prompt = `You are a senior software engineer reviewing code changes. 

Analyze this diff for file: ${filePath}

${diffContent}

Please review for:
1. Potential bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Code quality and best practices
5. Missing error handling

Respond in JSON format with this structure:
{
  "hasIssues": boolean,
  "summary": "Brief summary of the review",
  "issues": [
    {
      "line": number (approximate line number if identifiable),
      "severity": "info|warning|error",
      "message": "Description of the issue"
    }
  ]
}

If no issues are found, set hasIssues to false and provide an empty issues array.`;

  console.log(`Reviewing file: ${filePath}`);

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = res.choices[0].message?.content;
    if (!content) {
      return {
        filePath,
        hasIssues: false,
        review: "No feedback generated."
      };
    }

    try {
      const cleanedContent = content.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanedContent);
      const lineComments: LineComment[] = parsed.issues?.map((issue: any) => ({
        line: issue.line || 0,
        comment: issue.message,
        severity: issue.severity || 'info'
      })) || [];

      return {
        filePath,
        hasIssues: parsed.hasIssues || false,
        review: parsed.summary || "Code looks good!",
        lineComments
      };
    } catch (parseError) {
      return {
        filePath,
        hasIssues: content.toLowerCase().includes('issue') || content.toLowerCase().includes('bug') || content.toLowerCase().includes('problem'),
        review: content
      };
    }
  } catch (error) {
    console.error(`Error reviewing ${filePath}:`, error);
    return {
      filePath,
      hasIssues: false,
      review: `Error generating review for ${filePath}: ${error}`
    };
  }
}
