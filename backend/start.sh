#!/bin/bash
# Startup script for Render deployment
# This script figures out where it is and runs the app correctly

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if we're already in the backend directory
if [ -f "$SCRIPT_DIR/dist/index.js" ]; then
    # We're in the backend directory
    echo "Starting from backend directory..."
    node "$SCRIPT_DIR/dist/index.js"
elif [ -f "$SCRIPT_DIR/../backend/dist/index.js" ]; then
    # We're in the project root
    echo "Starting from project root..."
    cd "$SCRIPT_DIR/../backend" || exit 1
    node dist/index.js
else
    echo "Error: Cannot find dist/index.js"
    echo "Script directory: $SCRIPT_DIR"
    echo "Current directory: $(pwd)"
    echo "Listing files:"
    ls -la "$SCRIPT_DIR"
    exit 1
fi
