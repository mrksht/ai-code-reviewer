import { Request, Response } from "express";
import axios from "axios";
import { generateReview } from "../review/generateReview";
import dotenv from "dotenv";
import { validateMrTitle } from "../utils/commentUtils";
dotenv.config()

export async function handleGitHubWebhook(req: Request, res: Response) {
  const event = req.headers["x-github-event"];
  if (event !== "issue_comment") return res.sendStatus(200);

  const { comment, issue } = req.body;
  if (!comment?.body?.includes("code-review") || !issue?.pull_request?.diff_url)
    return res.sendStatus(200);

  const diffUrl = issue.pull_request.diff_url;
  const prTitle = issue.title;
  const diffRes = await axios.get(diffUrl, {
    headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
  });

  const titleValidation = validateMrTitle(prTitle);
  let review
  if (titleValidation) {
    review = titleValidation;
  } else {
    review = await generateReview(diffRes.data, prTitle);
  }

  await axios.post(
    comment.url,
    { body: review },
    {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    }
  );

  res.sendStatus(200);
}
