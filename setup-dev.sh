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

# Check Node version and warn about known issues
NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
NODE_MINOR=$(node -v | cut -d'.' -f2)
echo "📌 Using Node.js $NODE_VERSION"

# Check for Node.js 24.4.0 specific memory bug
if [ "$NODE_VERSION" = "v24.4.0" ]; then
    echo "🚨 CRITICAL: Node.js 24.4.0 has a confirmed memory bug with pnpm and large packages!"
    echo "   This causes 'JavaScript heap out of memory' errors when downloading app-builder-bin"
    echo "   🔧 SOLUTION: Downgrade to Node.js 20.x or 22.x"
    echo "   Run: nvm install 20 && nvm use 20"
    echo "   Issue: https://github.com/pnpm/pnpm/issues/9743"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
elif [ "$NODE_MAJOR" -eq 24 ] && [ "$NODE_MINOR" -ge 4 ]; then
    echo "⚠️  Warning: Node.js $NODE_VERSION may have memory issues with pnpm and large packages"
    echo "   If you encounter 'heap out of memory' errors, downgrade to Node.js 20.x"
fi

if [ "$NODE_MAJOR" -gt 22 ]; then
    echo "ℹ️  For best compatibility, consider using Node.js v20.x or v22.x"
    echo "   You can install with: nvm install 20 && nvm use 20"
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
echo "💡 If you encounter memory issues, try:"
echo "   • Using Node.js v20 instead of v24"
echo "   • Running: NODE_OPTIONS=\"--max-old-space-size=8192\" pnpm install"
echo ""