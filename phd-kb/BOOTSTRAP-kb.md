---
name: thesis-kb-bootstrap
description: "Bootstrap loader for the Knowledge Base skill. Clones the thesis repo and loads the real SKILL file. Use when the user types 'update', 'update claude', 'update perplexity', 'update academic', 'update news', 'nd', 'what did we find about [topic]', 'show archive', 'add scholar', or 'add topic'."
---

# KB Bootstrap — DO NOT EDIT

This file loads the real SKILL from the GitHub repo. It never needs updating.

## Step 1: Clone or update the repository

```bash
REPO_DIR="thesis-repo"
TOKEN="<INSERT_TOKEN_FROM_PROJECT_INSTRUCTIONS>"
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR" && git pull
else
  git clone "https://x-access-token:${TOKEN}@github.com/aauml/thesis.git" "$REPO_DIR"
  cd "$REPO_DIR"
  git config user.email "claude@thesis.local"
  git config user.name "Claude PM"
fi
```

The push token must be in the project's **Instructions** field (not in this file, not in the repo).

## Step 2: Read the real SKILL

```
Read file: thesis-repo/phd-kb/docs/SKILL-KB-current.md
```

This file contains the full operational instructions. Follow them completely — they include the Session Startup Protocol (reading logs), all evaluation rules, API reference, and Session Closing Protocol.

## Step 3: Follow the SKILL

After reading `SKILL-KB-current.md`, execute whatever it says. This bootstrap is done — do not refer back to it.
