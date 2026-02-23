#!/bin/bash
set -e

# 1. Configuration (Fail-safe)
TARGET_GROUP="-5069347550"
TASK_NAME="$1"
PROMPT="$2"

# 2. Write Metadata for Hook
META_DIR="$HOME/.openclaw/data/claude-code-results"
mkdir -p "$META_DIR"
echo "{\"target_group\": \"$TARGET_GROUP\", \"task_name\": \"$TASK_NAME\"}" > "$META_DIR/task-meta.json"

# 3. Execute Claude Code (Sub-agent)
echo "🚀 Starting Task: $TASK_NAME"
# Use direct claude call, assuming it handles the prompt
# Note: Sub-agent environment might need PATH adjustment for claude
export PATH="/opt/homebrew/bin:$PATH"

claude -p "$PROMPT"

# 4. Force Hook Execution (Even if Claude internal hook fails)
# Check if hook script exists and is executable
HOOK_SCRIPT="$HOME/.claude/hooks/notify-agi.sh"
if [ -x "$HOOK_SCRIPT" ]; then
    echo "🔔 Triggering Notification Hook..."
    "$HOOK_SCRIPT"
else
    echo "⚠️ Hook script not found or not executable: $HOOK_SCRIPT"
fi

