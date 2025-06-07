import { Request, Response } from "express";
import axios from "axios";
import { generateReview } from "../review/generateReview.js";

export async function handleGitLabWebhook(req: Request, res: Response) {
  const body = req.body;

  if (body.object_kind !== "note") return res.sendStatus(200);
  if (body.object_attributes?.note !== "code-review") return res.sendStatus(200);

  const mr = body.merge_request;
  const diffUrl = `${mr.url}.diff`;
  const notesUrl = body.object_attributes.noteable_url + "/notes";

  const diffRes = await axios.get(diffUrl, {
    headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
  });

  const review = await generateReview(diffRes.data);

  await axios.post(notesUrl, { body: review }, {
    headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
  });

  res.sendStatus(200);
}
