import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { handleGitHubWebhook } from "./github/webhookHandler";
// import { handleGitLabWebhook } from "./gitlab/webhookHandler.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.post("/github", handleGitHubWebhook);
// app.post("/gitlab", handleGitLabWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI PR Reviewer is running on port ${PORT}`);
});
