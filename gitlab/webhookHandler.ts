import { Request, Response } from "express";
import axios from "axios";
import { generateReview } from "../review/generateReview";

export async function handleGitLabWebhook(req: Request, res: Response) {
  const body = req.body;

  if (body.object_kind !== "note") return res.sendStatus(200);
  if (body.object_attributes?.note !== "code-review") return res.sendStatus(200);

  const mr = body.merge_request;
  const diffUrl = `${mr.url}.diff`;

  const projectId = body.project_id;
  const mrIid = mr.iid;

  const notesUrl = `https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`;

  const diffRes = await axios.get(diffUrl, {
    headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
  });

  const review = await generateReview(diffRes.data);

  await axios.post(notesUrl, { body: review }, {
    headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
  });

  res.sendStatus(200);
}
