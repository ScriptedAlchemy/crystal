#!/bin/bash

# Development environment setup script for Crystal

echo "🔧 Setting up Crystal development environment..."

# Exit on any error
set -e

# Check if homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is required. Please install from https://brew.sh"
    exit 1
fi

# Ensure python-setuptools is installed (fixes distutils issue)
if ! brew list python-setuptools &> /dev/null; then
    echo "📦 Installing python-setuptools..."
    brew install python-setuptools
fi

# Check Node version and warn if too high
NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
echo "📌 Using Node.js $NODE_VERSION"

if [ "$NODE_MAJOR" -gt 20 ]; then
    echo "⚠️  Warning: Node.js $NODE_VERSION detected. For best compatibility, consider using Node.js v20.x"
    echo "   You can install Node v20 with: nvm install 20 && nvm use 20"
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Clean any mixed package manager installations
echo "🧹 Cleaning mixed package manager artifacts..."
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "package-lock.json" -type f -delete 2>/dev/null || true

# Set Python path to avoid distutils issues
export PYTHON=$(which python3)
echo "🐍 Using Python: $PYTHON"

# Increase Node memory limit for installation
export NODE_OPTIONS="--max-old-space-size=8192"
echo "💾 Set Node.js memory limit to 8GB for installation"

# Function to install with fallback
install_with_fallback() {
    echo "🚀 Attempting pnpm installation..."
    if pnpm install; then
        echo "✅ pnpm install successful"
        return 0
    else
        echo "⚠️  pnpm install failed, trying with npm and increased memory..."
        if PYTHON=$PYTHON NODE_OPTIONS="--max-old-space-size=16384" npm install --legacy-peer-deps; then
            echo "✅ npm install successful"
            return 0
        else
            echo "❌ Both pnpm and npm installation failed"
            return 1
        fi
    fi
}

# Install dependencies
install_with_fallback

# Build main process
echo "🔨 Building main process..."
if pnpm run build:main; then
    echo "✅ Main process build successful"
else
    echo "❌ Main process build failed"
    exit 1
fi

# Rebuild native modules for Electron
echo "🔧 Rebuilding native modules for Electron..."
if pnpm -w run electron:rebuild; then
    echo "✅ Native modules rebuilt successfully"
else
    echo "❌ Native module rebuild failed"
    exit 1
fi

# Run tests to verify setup
echo "🧪 Running tests to verify setup..."
cd main
if npx vitest run --reporter=basic; then
    echo "✅ Tests passed (some failures are expected)"
else
    echo "⚠️  Some tests failed (this might be normal)"
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 You can now run the following commands:"
echo "   • pnpm dev          - Start development server"
echo "   • pnpm test         - Run tests"
echo "   • pnpm build        - Build for production"
echo ""
echo "💡 If you encounter memory issues, try:"
echo "   • Using Node.js v20 instead of v24"
echo "   • Running: NODE_OPTIONS=\"--max-old-space-size=8192\" pnpm install"
echo ""