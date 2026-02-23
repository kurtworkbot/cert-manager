#!/bin/bash
# Claude Code Stop Hook: Notify AGI on Task Completion (macOS Version)

set -uo pipefail

# --- Configuration (Paths for macOS) ---
USER_HOME="/Users/kurtclaw"
RESULT_DIR="$USER_HOME/.openclaw/data/claude-code-results"
LOG_FILE="$RESULT_DIR/hook.log"
META_FILE="$RESULT_DIR/task-meta.json"
OPENCLAW_BIN="/opt/homebrew/bin/openclaw"
JQ_BIN="/usr/bin/jq"

# Ensure directories exist
mkdir -p "$RESULT_DIR"

# Logging function
log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" >> "$LOG_FILE"; }

log "=== Hook Fired ==="

# --- Read Input (stdin from Claude Code) ---
INPUT=""
if [ ! -t 0 ]; then
    INPUT=$(timeout 2 cat /dev/stdin 2>/dev/null || true)
fi

# Extract Metadata using jq
SESSION_ID=$($JQ_BIN -r '.session_id // "unknown"' <<< "$INPUT" 2>/dev/null || echo "unknown")
CWD=$($JQ_BIN -r '.cwd // ""' <<< "$INPUT" 2>/dev/null || echo "")
EVENT=$($JQ_BIN -r '.hook_event_name // "unknown"' <<< "$INPUT" 2>/dev/null || echo "unknown")

log "Session: $SESSION_ID | CWD: $CWD | Event: $EVENT"

# --- Debounce (Prevent Duplicate Triggers) ---
LOCK_FILE="$RESULT_DIR/.hook-lock"
LOCK_AGE_LIMIT=30
NOW=$(date +%s)

if [ -f "$LOCK_FILE" ]; then
    LOCK_TIME=$(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0) # macOS stat syntax
    AGE=$(( NOW - LOCK_TIME ))
    if [ "$AGE" -lt "$LOCK_AGE_LIMIT" ]; then
        log "Skipping duplicate trigger within ${AGE}s"
        exit 0
    fi
fi
touch "$LOCK_FILE"

# --- Capture Output (Simple Summary) ---
# Since we don't have the wrapper script yet, just log the event
SUMMARY="Claude Code task completed in $CWD"

# --- Notify via OpenClaw CLI ---
# If we have a target group in meta file, send message
if [ -f "$META_FILE" ]; then
    TARGET_GROUP=$($JQ_BIN -r '.target_group // empty' "$META_FILE" 2>/dev/null)
    TASK_NAME=$($JQ_BIN -r '.task_name // "Unknown Task"' "$META_FILE" 2>/dev/null)
    
    if [ -n "$TARGET_GROUP" ]; then
        MSG="🤖 *Claude Code Task Completed*
📝 Task: $TASK_NAME
📂 Dir: $CWD
✅ Status: Done (Event: $EVENT)"
        
        log "Sending notification to $TARGET_GROUP..."
        "$OPENCLAW_BIN" message send --channel telegram --target "$TARGET_GROUP" --message "$MSG" >> "$LOG_FILE" 2>&1
    else
        log "No target group found in meta file."
    fi
else
    log "Meta file not found: $META_FILE"
fi

log "=== Hook Completed ==="
exit 0
