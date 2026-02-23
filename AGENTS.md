# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the official website for 云原生社区（中国）/ Cloud Native Community (China), a Hugo-based static site built with the Wowchemy CMS framework. The site serves as a hub for cloud native technology content, community events, and resources in China.

**Note:** This repository is archived. The site has migrated to [cloudnative.jimmysong.io](https://cloudnative.jimmysong.io).

## Technology Stack

- **Hugo v0.153.2** (extended version required for SCSS compilation)
- **Wowchemy v5** (Hugo theme/modules)
- **Netlify** (deployment via `netlify.toml`)
- **Giscus** (comments system)
- **Multi-language** support (primary: Chinese/zh, hasCJKLanguage: true)

## Development Commands

### Local Development

```bash
# Install Hugo extended version (required for SCSS)
# macOS: brew install hugo
# Or download from https://github.com/gohugo/hugo/releases

# Start development server with live reload
hugo server

# Build for production
hugo --gc
```

### Content Creation

```bash
# Create new blog post using archetype
hugo new blog/my-post-name/index.md

# Create new author page
hugo new authors/my-author-name/_index.md

# Create new event
hugo new event/my-event/index.md
```

## Architecture

### Content Structure

The site uses Wowchemy's widget-based architecture with Hugo page bundles:

- **`content/blog/`** - Blog posts (each is a directory with `index.md`)
  - Uses `archetypes/blog.md` for frontmatter template
  - Supports featured images, authors, translators, tags, categories
  - Example frontmatter: title, date, authors, translators, summary, tags, categories, keywords

- **`content/authors/`** - Author profiles (directory per author with `_index.md`)
  - Uses `archetypes/authors/` templates
  - Each author directory contains `_index.md` with author bio and info

- **`content/community/`** - Community pages (join, contribute, events, SIGs, cities)
  - Configured with editable mode and breadcrumbs in `config/_default/config.yaml`

- **`content/home/`** - Homepage widgets (hero, slider, features, etc.)
  - Each file is a headless section with `widget:` parameter
  - Widgets include: slider, hero, featurette, tag cloud, etc.

- **`content/translators/`** - Translator profiles (similar structure to authors)

### Configuration Files

- **`config.yaml`** - Root Hugo config (module mounts, security, markup settings)
- **`config/_default/config.yaml`** - Main site config (URL, language, modules, taxonomies)
  - Uses Wowchemy v5 modules as Git dependencies
  - Default language: `zh` (Chinese)
  - Custom taxonomies: tags, categories, authors, **translators** (custom)
  - Permalinks configured for authors, tags, categories

- **`config/_default/params.yaml`** - Wowchemy theme parameters
  - Theme: `my_theme` (custom theme in `assets/scss/`)
  - SEO: Google Analytics, Baidu Tongji
  - Comments: Giscus integration
  - Search: Wowchemy built-in
  - Repository URL for "Edit this page" links

- **`config/_default/languages.yaml`** - Language settings
  - Only Chinese (`zh`) configured
  - Features: code copy, back to top button, anchored headings

- **`config/_default/menus.yaml`** - Site navigation menu structure

### Layout Customization

- **`layouts/`** - Custom layout overrides for Wowchemy theme
  - **`layouts/shortcodes/`** - Custom Hugo shortcodes (cite, callout, toc, figure, etc.)
  - **`layouts/partials/`** - Reusable partial templates
    - `comments/giscus.html` - Giscus comment system
    - `book_layout.html`, `book_menu.html`, `book_sidebar.html` - Book/documentation layout
    - `code-copy.html` - Copy button for code blocks
    - `back-to-top.html` - Back to top button
  - **`layouts/partials/functions/`** - Custom Hugo template functions
  - **`layouts/section/`** - Section-specific layouts

### Theme Customization

- **`assets/scss/`** - Custom SCSS styling
  - `custom.scss` - Main custom styles (overrides Wowchemy defaults)
    - Custom TOC styling, code copy buttons
    - Responsive design tweaks
    - Dark mode adjustments
    - Sponsor image styling
  - `main.scss` - Imports custom styles
  - `bootstrap_variables.scss` - Bootstrap variable overrides
  - `wowchemy/` - Wowchemy SCSS overrides

- **`assets/css/`**, **`assets/js/`** - Additional static assets

### Data Files

- **`data/`** - TOML/YAML data files for Wowchemy
  - `i18n/` - Internationalization strings
  - `fonts/` - Font configuration
  - `themes/` - Theme presets
  - `assets.toml` - Asset bundles configuration
  - `page_sharer.toml` - Social sharing buttons

### Static Assets

- **`static/`** - Static files served at root
  - `img/` - Images
  - `webfonts/` - Custom web fonts
  - `plugins/` - Third-party libraries
  - Verification files for search engines

## Content Frontmatter Pattern

Blog posts use this frontmatter structure:

```yaml
---
title: "Post Title"
date: YYYY-MM-DDTHH:MM:SS+08:00
draft: false
authors: ["Author Name"]
translators: ["Translator Name"]  # Optional, for translated posts
summary: "Post summary/excerpt"
tags: ["tag1", "tag2"]
categories: ["category"]
keywords: ["keyword1", "keyword2"]
---
```

## Key Features Implementation

### Comments System

- **Giscus** (GitHub Discussions-based) configured in `params.yaml`
- Repository: `cloudnativeto/cloudnative.to`
- Lazy loading enabled
- Partial: `layouts/partials/comments/giscus.html`

### Custom Taxonomies

- **translators** - Custom taxonomy for crediting translators (in addition to authors)
- Configured in both `config/_default/config.yaml` (taxonomies) and root `config.yaml` (implied via content structure)

### Book/Documentation Layout

- Custom book layout with sidebar navigation
- Files in `layouts/book/`, `layouts/partials/book_*.html`
- Used for structured content organization

### Multi-language Setup

- Primary language: Chinese (`zh`)
- `hasCJKLanguage: true` for proper Chinese word counting
- `defaultContentLanguageInSubdir: false` - Chinese content at root, not `/zh/`

## Deployment

- **Netlify** via `netlify.toml`
- Build command: `hugo --gc` (includes garbage collection)
- Publish directory: `public`
- Hugo version: 0.101.0 (Netlify environment)
- Local development requires Hugo v0.153.2 extended

## Important Notes

- Site is archived and migrated to cloudnative.jimmysong.io
- Content is licensed under CC BY-NC-SA 4.0
- All blog posts should use the PR template declaration from `.github/PULL_REQUEST_TEMPLATE.md`
- Images should be optimized (recent commit shows media asset optimization)
- Baidu verification code present in `static/`
