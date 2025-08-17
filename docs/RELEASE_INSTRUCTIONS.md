# Crystal Release Instructions

This document outlines the complete process for releasing Crystal with multi-platform builds, code signing, notarization, and automatic updates.

## Release System Overview

Crystal uses a comprehensive release system that includes:
- **Multi-platform builds**: macOS (universal), Linux (deb/AppImage)
- **Code signing & notarization**: Full Apple developer workflow
- **Auto-updates**: Using electron-updater with GitHub releases
- **Version checking**: Built-in update checker with 24-hour intervals
- **CI/CD automation**: GitHub Actions for build and release

## Prerequisites

### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

**For macOS Signing & Notarization:**
- `APPLE_CERTIFICATE`: Base64-encoded .p12 certificate (Developer ID Application)
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_ID`: Apple Developer account email
- `APPLE_APP_PASSWORD`: App-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer Team ID

**To encode your certificate for GitHub secrets:**
```bash
base64 -i certificate.p12 -o certificate_base64.txt
```
Copy the contents of the base64 file to the GitHub secret.

**Note:** The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### Environment Requirements

- **Node.js**: 20.x to <24.4.0 (specified in package.json engines)
- **pnpm**: >=8.0.0 (required package manager)
- **Python**: 3.11 (for native module compilation)

## Release Process

### 1. Prepare the Release

```bash
# Ensure you're on the main branch and up to date
git checkout main
git pull origin main

# Install dependencies and run quality checks
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

### 2. Update Version

Update the version in the root `package.json`:
```json
{
  "version": "0.2.1"
}
```

**Note:** All workspaces (`main/`, `frontend/`, `shared/`) inherit this version automatically.

### 3. Update Changelog

Create or update `CHANGELOG.md` with user-friendly release notes:
```markdown
## v0.2.1 - 2024-12-24

### New Features
- Added real-time Git status monitoring
- Improved session management with better error handling

### Bug Fixes
- Fixed terminal output rendering issues
- Resolved auto-update notification timing

### Improvements
- Enhanced performance for large codebases
- Better error messages for Git operations
```

### 4. Commit Version Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to v0.2.1"
git push origin main
```

### 5. Create and Push Git Tag

```bash
git tag v0.2.1
git push origin v0.2.1
```

### 6. Automated Release Workflow

The `release.yml` workflow triggers on version tags and performs:

**For macOS:**
- Builds universal binary (x64 + ARM64)
- Code signs with Developer ID Application certificate
- Notarizes with Apple's service
- Creates .dmg installer and .zip update package
- Generates `latest-mac.yml` metadata

**For Linux:**
- Builds .deb package and AppImage
- Generates `latest-linux.yml` metadata

**Release artifacts:**
- `Crystal-{version}-macOS-universal.dmg` - macOS installer
- `Crystal-{version}-macOS-universal.zip` - macOS update package
- `Crystal-{version}-linux-x64.deb` - Linux Debian package
- `Crystal-{version}-linux-x64.AppImage` - Linux portable app
- `latest-mac.yml` and `latest-linux.yml` - Update metadata

### 7. Verify Release

1. Go to https://github.com/stravu/crystal/releases
2. Verify the new release is created with:
   - Proper version tag (e.g., v0.2.1)
   - Release notes (from changelog)
   - macOS artifacts: .dmg, .zip, latest-mac.yml
   - Linux artifacts: .deb, .AppImage, latest-linux.yml
3. Download and install the macOS .dmg and verify the app launches without security prompts beyond Gatekeeper
4. From a previous installed version, verify auto-update flow (Settings → Check for updates)

## Build Configuration (electron-builder)

The release configuration lives in the root `package.json` under `build` and is adjusted dynamically by `scripts/configure-build.js` during CI:

- `appId`: com.stravu.crystal
- `productName`: Crystal
- `mac`:
  - `hardenedRuntime`: toggled based on signing availability
  - `gatekeeperAssess`: false
  - `notarize`: enabled when Apple credentials are present
  - `entitlements`: build/entitlements.mac.plist (when signing)
  - `artifactName`: Crystal-${version}-macOS-universal.${ext}
- `linux`:
  - Targets: deb (x64), AppImage (x64)
  - `artifactName` patterns set for deb/AppImage
- `publish`: GitHub provider (owner: stravu, repo: crystal)

Key scripts in package.json:
- `release:mac`: Build and publish macOS release
- `release:linux`: Build and publish Linux release
- `canary:mac` / `canary:linux`: Publish canary builds from main with suffixed versions

## Continuous Integration

Two workflows manage builds and releases:

- `.github/workflows/build.yml` (Canary):
  - Triggers on pushes and PRs to main
  - Publishes canary builds using `canary:*` scripts
  - Caches Electron, native modules, and build outputs for speed

- `.github/workflows/release.yml` (Release):
  - Triggers on tags `v*`
  - Runs `release:mac` on macOS and `release:linux` on Ubuntu
  - Publishes artifacts to GitHub Releases using GH_TOKEN
  - Auto-detects signing/notarization via secrets and sets CSC variables

## Local Build and Release (for maintainers)

- Build unsigned macOS app locally:
  ```bash
  pnpm run build:mac
  open dist-electron/mac-*/Crystal.app
  ```
- Build signed + notarized macOS release (requires local signing setup):
  ```bash
  export CSC_LINK=... # path or base64 to .p12
  export CSC_KEY_PASSWORD=...
  export APPLE_ID=...
  export APPLE_APP_SPECIFIC_PASSWORD=...
  export APPLE_TEAM_ID=...
  pnpm run release:mac
  ```
- Build Linux artifacts:
  ```bash
  pnpm run release:linux
  ```

## Auto-Update Behavior

- Crystal configures `electron-updater` with manual download and install-on-quit
- The application checks for updates on startup and then every 24 hours
- Update metadata (`latest-*.yml`) is fetched from GitHub Releases
- UI shows update availability and download progress; install occurs on app quit

## Testing Updates

Two recommended paths:

1) Production-like test:
- Install an older released version
- Launch, then use Settings → Check for updates, or wait for the periodic check
- Confirm update available → Download → Quit to install

2) Local test server:
- Start a generic update server hosting latest-*.yml and artifacts
- Launch Crystal with environment flag:
  ```bash
  TEST_UPDATES=true UPDATE_SERVER_URL=http://localhost:8080 pnpm run electron-dev
  ```
  The app uses a local feed URL for testing (`main/src/test-updater.ts`).

## Troubleshooting

### Auto-update not working
- Missing update files: Verify CI release succeeded and assets exist
- Certificate issues: Ensure Apple secrets are configured and valid
- Notarization fails: Check Apple credentials and app-specific password
- Version mismatch: Ensure `package.json` version matches the tag (vX.Y.Z)

### Build fails
- Native dependencies: Run `pnpm run electron:rebuild`
- Certificate not found: Ensure base64 and password are correct (CSC_LINK/CSC_KEY_PASSWORD)
- Environment mismatch: Use Node.js per engines field and pnpm

### Security prompts on macOS
- Ensure the app is signed and notarized
- Avoid modifying the app bundle post-signing (breaks signatures)

## Best Practices

- Follow SemVer (MAJOR.MINOR.PATCH)
- Keep CHANGELOG.md user-focused
- Test on both macOS archs (Intel/Apple Silicon)
- Prefer incremental releases; avoid large version jumps

## Emergency Rollback

If a release has critical issues:

1. Unpublish or edit the GitHub Release and delete the tag
2. Revert or fix the code
3. Bump patch version (e.g., 0.2.2)
4. Tag and push again to trigger release workflow

## Additional Notes

- Auto-updates require signed and notarized macOS builds
- Development builds do not auto-update
- Users can always manually download from GitHub Releases
- User data is preserved during updates
- Update checks happen on startup and every 24 hours