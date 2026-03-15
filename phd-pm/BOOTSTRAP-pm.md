---
name: phd-pm-bootstrap
description: "Bootstrap loader for the PhD Project Manager skill. Clones the thesis repo and loads the real SKILL file. Activar en TODA sesión del proyecto phd-pm."
---

# PM Bootstrap — DO NOT EDIT

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
Read file: thesis-repo/phd-pm/docs/SKILL-PM-current.md
```

This file contains the full operational instructions. Follow them completely — they include the Session Startup Protocol, Dashboard management, Obsidian Digest, KB Intelligence Report, and Session Closing Protocol.

## Step 3: Follow the SKILL

After reading `SKILL-PM-current.md`, execute whatever it says. This bootstrap is done — do not refer back to it.
