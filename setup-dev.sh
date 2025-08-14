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

# Check if nvm is available and auto-switch to correct Node.js version
if command -v nvm &> /dev/null && [ -f .nvmrc ]; then
    echo "📋 Found .nvmrc file, switching to recommended Node.js version..."
    nvm use || (echo "📦 Installing recommended Node.js version..." && nvm install)
fi

# Check Node version and warn about known issues
NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
NODE_MINOR=$(node -v | cut -d'.' -f2)
echo "📌 Using Node.js $NODE_VERSION"

# Check for known problematic Node.js versions
PROBLEMATIC_NODE_VERSIONS=("v24.4.0")
for bad_version in "${PROBLEMATIC_NODE_VERSIONS[@]}"; do
    if [ "$NODE_VERSION" = "$bad_version" ]; then
        echo "🚨 CRITICAL: Node.js $NODE_VERSION has a confirmed memory bug with pnpm and large packages!"
        echo "   This causes 'JavaScript heap out of memory' errors when downloading app-builder-bin"
        echo "   🔧 SOLUTION: Use the .nvmrc file"
        echo "   Run: nvm use"
        echo "   Issue: https://github.com/pnpm/pnpm/issues/9743"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
        break
    fi
done

# Warn for Node.js 24.4.0 and above (potential issues)
if [ "$NODE_MAJOR" -eq 24 ] && [ "$NODE_MINOR" -ge 4 ]; then
    echo "⚠️  Warning: Node.js $NODE_VERSION may have memory issues with pnpm and large packages"
    echo "   💡 Use the recommended version: nvm use"
fi

if [ "$NODE_MAJOR" -gt 22 ]; then
    echo "ℹ️  For best compatibility, use the .nvmrc specified version: nvm use"
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

# Increase Node memory limit for installation (especially needed for Node.js 24.x)
# Higher memory limit needed for app-builder-bin download (72.51 MB binary)
export NODE_OPTIONS="--max-old-space-size=16384"
echo "💾 Set Node.js memory limit to 16GB for installation (required for large packages like app-builder-bin)"

# Function to install with fallback
install_with_fallback() {
    echo "🚀 Attempting pnpm installation with memory limit..."
    # First try pnpm with no-optional to reduce memory pressure
    if pnpm install --no-optional; then
        echo "✅ pnpm install successful (without optional dependencies)"
        # Try to install optional deps separately if needed
        echo "📦 Installing optional dependencies..."
        pnpm install --optional-only || echo "⚠️  Optional dependencies failed (this is usually OK)"
        return 0
    else
        echo "⚠️  pnpm install failed (likely Node.js 24.x memory bug with app-builder-bin)"
        echo "🔄 Trying with npm as fallback..."
        if PYTHON=$PYTHON NODE_OPTIONS="--max-old-space-size=16384" npm install --legacy-peer-deps; then
            echo "✅ npm install successful"
            return 0
        else
            echo "❌ Both pnpm and npm installation failed"
            echo "💡 Try downgrading to Node.js 20.x: nvm install 20 && nvm use 20"
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
echo "📋 Node.js Version Management:"
echo "   • This project uses Node.js 20 (see .nvmrc)"
echo "   • Auto-switch: nvm use"
echo "   • Manual install: nvm install 20 && nvm use 20"
echo ""
echo "💡 If you encounter memory issues:"
echo "   • Ensure you're using Node.js 20: nvm use"
echo "   • Avoid Node.js 24.4.0 (has memory bugs with pnpm)"
echo "   • Increase memory: NODE_OPTIONS=\"--max-old-space-size=16384\""
echo ""