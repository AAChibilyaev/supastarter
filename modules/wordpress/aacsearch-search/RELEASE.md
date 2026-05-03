# AACsearch WordPress Plugin — Release Guide

## Prerequisites

1. A WordPress.org plugin developer account
2. SVN access to `plugins.svn.wordpress.org/aacsearch-search/` (request via plugins@wordpress.org)
3. GitHub secrets configured in the repository:
    - `SVN_USERNAME` — WordPress.org SVN username
    - `SVN_PASSWORD` — WordPress.org SVN password (application password)

## Initial SVN Setup (one-time)

The first deploy must be done manually to create the SVN repository:

```bash
# Checkout empty plugin SVN
svn co https://plugins.svn.wordpress.org/aacsearch-search /tmp/aacsearch-svn

# Copy plugin files (excluding dev files)
rsync -av --exclude='node_modules' --exclude='.git' --exclude='blocks' \
  ./modules/wordpress/aacsearch-search/ /tmp/aacsearch-svn/trunk/

# Copy assets (banners, icons, screenshots)
mkdir -p /tmp/aacsearch-svn/assets
cp ./modules/wordpress/aacsearch-search/.wordpress-org/* /tmp/aacsearch-svn/assets/

# Commit
cd /tmp/aacsearch-svn
svn add trunk/* --force
svn add assets/* --force
svn commit -m "Initial release 1.0.0"
```

## Releasing a New Version

### Step 1: Update version numbers

Update the version in:

1. `modules/wordpress/aacsearch-search/aacsearch-search.php` — `Version: X.X.X` header and `AACSEARCH_SEARCH_VERSION` constant
2. `modules/wordpress/aacsearch-search/readme.txt` — `Stable tag: X.X.X`
3. `modules/wordpress/aacsearch-search/package.json` — `"version": "X.X.X"`

### Step 2: Update changelog

Add new version entry in `readme.txt` under `== Changelog ==`.

### Step 3: Commit and tag

```bash
git add modules/wordpress/aacsearch-search/
git commit -m "[wp] Release vX.X.X"
git tag wordpress-vX.X.X
git push origin main --tags
```

### Step 4: Automated deploy

Pushing a tag matching `wordpress-v*` triggers the GitHub Actions workflow at `.github/workflows/deploy-wordpress.yml`, which:

1. Checks out the repository
2. Installs npm dependencies and builds Gutenberg blocks
3. Deploys to WordPress.org SVN via `10up/action-wordpress-plugin-deploy`

Monitor the workflow run in GitHub Actions. The plugin is live on WordPress.org within ~2 minutes.

## Tag Format

| Tag Pattern        | Purpose               |
| ------------------ | --------------------- |
| `wordpress-v1.0.0` | Plugin release v1.0.0 |
| `wordpress-v1.1.0` | Plugin release v1.1.0 |

## Plugin Assets

WordPress.org assets (banners, icons, screenshots) live in `.wordpress-org/`:

- `icon-128x128.svg` — plugin icon (Square, 128×128)
- `icon-256x256.svg` — plugin icon (Square, 256×256)
- `banner-772x250.svg` — plugin banner (772×250)
- `banner-1544x500.svg` — plugin banner (high-DPI, 1544×500)
- `screenshot-1.png` through `screenshot-5.png` — feature screenshots

Update screenshots by replacing PNG files in `.wordpress-org/` and updating captions in `readme.txt`.
