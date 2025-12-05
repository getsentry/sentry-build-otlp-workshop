#!/bin/bash
# Setup script for Python service with virtual environment

echo ""
echo "🐍 Setting up Python service with virtual environment..."
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment (venv/)..."
    python3 -m venv venv
    echo "   ✓ Virtual environment created"
else
    echo "📦 Virtual environment already exists (venv/)"
fi

# Activate virtual environment
echo ""
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "📥 Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure environment:"
echo "     cp .env.example .env"
echo "     # Edit .env and add your SENTRY_DSN"
echo ""
echo "  2. Run the service:"
echo "     ./run.sh"
echo "     # Or: npm run python (from project root)"
echo ""
echo "Note: Virtual environment is at python-service/venv/"
echo "      (automatically git-ignored)"
echo "═══════════════════════════════════════════════════════════"
echo ""
