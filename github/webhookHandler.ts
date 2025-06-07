import { Request, Response } from "express";
import axios from "axios";
import { generateReview } from "../review/generateReview";
import dotenv from "dotenv";
dotenv.config()

export async function handleGitHubWebhook(req: Request, res: Response) {
  const event = req.headers["x-github-event"];
  if (event !== "issue_comment") return res.sendStatus(200);

  const { comment, issue } = req.body;
  if (!comment?.body?.includes("code-review") || !issue?.pull_request?.diff_url)
    return res.sendStatus(200);

  const diffUrl = issue.pull_request.diff_url;
  const diffRes = await axios.get(diffUrl, {
    headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
  });

  const review = await generateReview(diffRes.data);

  await axios.post(
    comment.url,
    { body: review },
    {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    }
  );

  res.sendStatus(200);
}
