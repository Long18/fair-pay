#!/bin/bash

# Script to open Supabase Studio with proper error handling
# Works in both foreground and background execution

set -e

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo "❌ Error: Supabase is not running. Start it with: pnpm supabase:start" >&2
    exit 1
fi

# Open Studio in browser
open http://127.0.0.1:54323

# If running in background, give a moment for the browser to open
if [ -t 0 ]; then
    # Running in foreground - no delay needed
    :
else
    # Running in background - small delay to ensure browser opens
    sleep 0.5
fi
