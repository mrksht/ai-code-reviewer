import { Request, Response } from "express";
import axios from "axios";
import { generateReview, FileReview } from "../review/generateReview";
import { createSummaryComment, formatReviewComment } from "../utils/commentUtils";

export async function handleGitLabWebhook(req: Request, res: Response) {
  const body = req.body;

  if (body.object_kind !== "note") return res.sendStatus(200);
  if (body.object_attributes?.note !== "code-review") return res.sendStatus(200);

  const mr = body.merge_request;
  const projectId = body.project_id;
  const mrIid = mr.iid;

  const diffUrl = `https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/diffs`;
  const notesUrl = `https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`;

  try {
    const diffRes = await axios.get(diffUrl, {
      headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
    });

    const diffs = Array.isArray(diffRes.data) ? diffRes.data : [diffRes.data];
    const reviews: FileReview[] = [];

    for (const diff of diffs) {
      if (diff.diff && diff.diff.trim()) {
        const review = await generateReview(diff);
        reviews.push(review);
      }
    }

    const reviewsWithIssues = reviews.filter(review => review.hasIssues);
    
    if (reviewsWithIssues.length === 0) {
      await axios.post(notesUrl, { 
        body: "🤖 **Automated Code Review**\n\n✅ All files look good! No issues detected." 
      }, {
        headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
      });
    } else {
      for (const review of reviewsWithIssues) {
        const commentBody = formatReviewComment(review);
        
        try {
          await axios.post(notesUrl, { body: commentBody }, {
            headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to post comment for ${review.filePath}:`, error);
        }
      }

      const summaryComment = createSummaryComment(reviewsWithIssues, reviews.length);
      await axios.post(notesUrl, { body: summaryComment }, {
        headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    try {
      await axios.post(notesUrl, { 
        body: "🤖 **Automated Code Review**\n\n❌ Error occurred during code review. Please check the logs." 
      }, {
        headers: { "PRIVATE-TOKEN": process.env.GITLAB_TOKEN }
      });
    } catch (commentError) {
      console.error('Failed to post error comment:', commentError);
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
