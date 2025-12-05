#!/bin/bash
# Run script for Python service with virtual environment

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Run ./setup.sh first to create it."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Run the service
python src/app.py
