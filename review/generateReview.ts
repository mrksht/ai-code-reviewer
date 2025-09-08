import dotenv from "dotenv";
dotenv.config();

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

function validateMrTitle(title: string): FileReview | null {
  const pattern = /^(feature|fix|chore)\[[A-Z]+-\d+\]: .+/;

  if (!pattern.test(title)) {
    return {
      filePath: "MR Title",
      hasIssues: true,
      review: `Merge request title must follow this format: feature[JIRA-TICKET]: message.\nExample: feature[PROJ-123]: Add new authentication method.`,
      lineComments: []
    };
  }

  return null;
}

export async function generateReview(diff: any, mrTitle: string): Promise<FileReview> {
  // First, validate the MR title
  const titleValidation = validateMrTitle(mrTitle);
  if (titleValidation) {
    return titleValidation;
  }

  const filePath = diff.new_path || diff.old_path;
  const diffContent = diff.diff;

  const systemPrompt = `
You are a senior software engineer reviewing code changes.

Analyze this diff for file: ${filePath}

${diffContent}

Please review for:
1. Potential bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Code quality and best practices
5. Missing error handling
`;

  console.log(`Reviewing file: ${filePath}`);

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const responseSchema = {
    type: "OBJECT",
    properties: {
      "hasIssues": { "type": "BOOLEAN" },
      "summary": { "type": "STRING" },
      "issues": {
        "type": "ARRAY",
        "items": {
          "type": "OBJECT",
          "properties": {
            "line": { "type": "NUMBER" },
            "severity": { "type": "STRING", "enum": ["info", "warning", "error"] },
            "message": { "type": "STRING" }
          }
        }
      }
    },
    "propertyOrdering": ["hasIssues", "summary", "issues"]
  };

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    },
    systemInstruction: {
      parts: [{ text: "You are a world-class code reviewer. Provide concise, actionable feedback." }]
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return {
        filePath,
        hasIssues: false,
        review: "No feedback generated."
      };
    }

    const parsed = JSON.parse(content);

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
  } catch (error: any) {
    console.error(`Error reviewing ${filePath}:`, error);
    return {
      filePath,
      hasIssues: false,
      review: `Error generating review for ${filePath}: ${error.message || error}`
    };
  }
}
