#!/bin/bash
# Database migration script for multi-CA support

DB_PATH="data/certs.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH, will be created on first run"
  exit 0
fi

# Check if acme_provider column exists
HAS_COLUMN=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM pragma_table_info('certificates') WHERE name='acme_provider';")

if [ "$HAS_COLUMN" -eq 0 ]; then
  echo "Adding acme_provider column..."
  sqlite3 "$DB_PATH" "ALTER TABLE certificates ADD COLUMN acme_provider TEXT DEFAULT 'letsencrypt';"
  echo "Migration complete!"
else
  echo "Column acme_provider already exists, skipping migration"
fi
