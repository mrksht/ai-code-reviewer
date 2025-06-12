import { FileReview } from "../review/generateReview";

function formatReviewComment(review: FileReview): string {
  let comment = `🤖 **Code Review for \`${review.filePath}\`**\n\n`;
  
  comment += `**Summary:** ${review.review}\n\n`;
  
  if (review.lineComments && review.lineComments.length > 0) {
    comment += "**Issues Found:**\n\n";
    
    review.lineComments.forEach((lineComment, index) => {
      const severityEmoji = {
        'error': '🚨',
        'warning': '⚠️',
        'info': 'ℹ️'
      }[lineComment.severity] || 'ℹ️';
      
      comment += `${index + 1}. ${severityEmoji} **${lineComment.severity.toUpperCase()}**`;
      if (lineComment.line > 0) {
        comment += ` (Line ~${lineComment.line})`;
      }
      comment += `\n   ${lineComment.comment}\n\n`;
    });
  }
  
  return comment;
}

function createSummaryComment(reviewsWithIssues: FileReview[], totalFiles: number): string {
  const totalIssues = reviewsWithIssues.reduce((sum, review) => 
    sum + (review.lineComments?.length || 1), 0
  );
  
  let comment = `🤖 **Code Review Summary**\n\n`;
  comment += `📊 **Stats:**\n`;
  comment += `- Files reviewed: ${totalFiles}\n`;
  comment += `- Files with issues: ${reviewsWithIssues.length}\n`;
  comment += `- Total issues found: ${totalIssues}\n\n`;
  
  if (reviewsWithIssues.length > 0) {
    comment += `📝 **Files requiring attention:**\n`;
    reviewsWithIssues.forEach(review => {
      const issueCount = review.lineComments?.length || 1;
      comment += `- \`${review.filePath}\` (${issueCount} issue${issueCount > 1 ? 's' : ''})\n`;
    });
  }
  
  return comment;
}

export { formatReviewComment, createSummaryComment };