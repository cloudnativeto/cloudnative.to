---
# A section created with the Portfolio widget.
# This section displays content from `content/project/`.
# See https://wowchemy.com/docs/widget/portfolio/
widget: tag_cloud

# This file represents a page section.
headless: true

# Order that this section appears on the page.
weight: 65

title: '标签云'
subtitle: '云原生社区资料分类'

content:
  # Page type to display. E.g. project.
  page_type: publication
  filters:
    folders:
      - book
  # Default filter index (e.g. 0 corresponds to the first `filter_button` instance below).
  filter_default: 0
design:
  columns: '1'
  view: masonry
  flip_alt_rows: false
---
