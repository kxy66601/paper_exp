---
name: mobbin-reference
description: >-
  Provides workflows and guidelines for referencing, importing, and translating
  Mobbin (mobbin.com) UI/UX design patterns, mobile/web flows, and component layouts
  into Antigravity frontend designs.
---

# Mobbin Reference & Design Integration Workflow

Use this skill whenever the user wants to reference, import, or adapt designs from **Mobbin** (`https://mobbin.com`) into code.

## How Antigravity Connects with Mobbin

Mobbin is a curated reference library of mobile and web design patterns. While Mobbin does not provide a public REST API, Antigravity integrates with Mobbin through three primary workflows:

### Workflow 1: Direct Link Inspection (Browser Subagent / Web Fetch)
1. When the user provides a Mobbin link (e.g., `https://mobbin.com/apps/...` or specific screens/flows):
2. Antigravity can use `browser_subagent` or `read_url_content` to view the page, inspect the layout hierarchy, typography, colors, and responsive flow patterns.
3. Extract design tokens (color codes, border radii, card padding, elevation) and implement matching Vanilla CSS or JSX components.

### Workflow 2: "Copy to Figma" Bridge
1. On Mobbin, click the **"Copy to Figma"** button on any screen or component.
2. Paste the component into Figma or into **Paper** (`paper.design`).
3. Antigravity's native `figma` or `paper` MCP tools can immediately read the exact JSX, bounding boxes, text nodes, and styling rules (`get_jsx`, `get_node_info`, `get_tokens`).

### Workflow 3: Local Inspiration Drops (`mobbin_refs/`)
1. Users can save screenshots from Mobbin into the workspace under `mobbin_refs/`.
2. Antigravity analyzes the images using multi-modal perception (`view_file` on PNG/JPG) to extract:
   - Visual rhythm and spacing scale (4px, 8px, 12px, 16px, 24px)
   - Component composition (headers, pills, list rows, bottom sheets, card stacks)
   - Micro-interactions (hover states, pill filters, active drag states)

## Design Translation Rules
- Always translate iOS/Android native conventions into clean, semantic HTML5 and Vanilla CSS.
- Maintain responsive fluid scaling.
- Preserve micro-animations and tactile feedback (smooth bezier curves, hover elevations).
