# Team Blue

## Overview
Team Blue is a multi-product design system built for team collaboration and developer tooling. Its structured, systematic approach uses a deliberate palette of blues, teals, and purples to differentiate product areas while maintaining a unified feel. The design language emphasizes clarity, density, and efficient navigation across interconnected tools.

## Colors
- **Primary** (#0052CC): Primary CTAs, links, selected states, primary navigation — Atlassian Blue
- **Primary Hover** (#0747A6): Hover/pressed state for primary actions — Dark Blue
- **Secondary** (#00B8D9): Secondary highlights, informational badges, teal accents — Teal
- **Neutral** (#F4F5F7): Page backgrounds, sidebar, panel backgrounds — Light Gray
- **Background** (#FFFFFF): Main content area, card backgrounds — White
- **Surface** (#EBECF0): Table headers, secondary surfaces, disabled backgrounds — Medium Gray
- **Text Primary** (#172B4D): Headings, body text, primary labels — Dark Navy Ink
- **Text Secondary** (#6B778C): Secondary text, help text, placeholders — Medium Gray Text
- **Border** (#DFE1E6): Dividers, card borders, input borders — Light Border
- **Success** (#00875A): Completed tasks, success badges, done columns — Green
- **Warning** (#FF991F): In-progress indicators, attention flags — Amber
- **Error** (#DE350B): Error messages, blocked states, bug priority — Red
- **Purple** (#6554C0): Epic labels, team indicators, tertiary accent — Purple

## Typography
- **Display Font**: Inter — loaded from Google Fonts
- **Body Font**: Inter — loaded from Google Fonts
- **Code Font**: Fira Code — loaded from Google Fonts

Inter provides exceptional legibility at small sizes, critical for dense project management interfaces. Display headings use 600 weight with -0.02em letter-spacing. Body text uses 400 weight at 1.43 line-height (optimized for 14px base). Labels and navigation use 500 weight. Code snippets and branch names use Fira Code at 400 weight with ligatures enabled. Breadcrumbs and overlines use 11px/700 uppercase with 0.08em tracking. The system avoids bold (700) for body text, reserving it for h1-h2 headings only.

Type scale: 11px (overline/breadcrumb), 12px (caption/badge), 14px (body/default), 16px (h5/card title), 20px (h4/section), 24px (h3/page subtitle), 29px (h2/page title), 35px (h1/hero).

## Elevation
Team Blue uses subtle, layered shadows to organize complex multi-panel layouts. Level 0 is flat on the surface. Level 1 uses `0 1px 1px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)` for cards and raised elements. Level 2 uses `0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)` for dropdowns and inline dialogs. Level 3 uses `0 8px 16px -4px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)` for modals and large overlays. The characteristic double-shadow approach (ambient + direct) creates a natural, layered depth. Drag-and-drop items in motion use Level 3 with a slight rotation.

## Components
- **Buttons**: Primary — #0052CC background, white text, 500 weight, 32px height (compact) / 36px (default) / 40px (tall), 12px horizontal padding, 3px border-radius. Hover #0747A6. Secondary — #F4F5F7 background, #172B4D text. Subtle — transparent, #6B778C text, hover #F4F5F7 bg. Danger — #DE350B background, white text. Link-style — no background, #0052CC text, underline on hover. All buttons 14px Inter 500.
- **Cards**: White background, 1px #DFE1E6 border, 2px border-radius. No shadow by default (flat card style). Hover reveals `0 1px 1px rgba(9,30,66,0.25)` shadow and pointer cursor for clickable cards. Card padding 12px 16px. Kanban cards use compact 8px 12px padding. Cards in board views support drag-and-drop with a blue left-border accent (#0052CC) when selected.
- **Inputs**: 36px height, white background, 2px #DFE1E6 border (note: 2px for accessibility), 3px border-radius, 14px Inter 400, #172B4D text, #6B778C placeholder. Focus shows 2px #0052CC border with #0052CC at 20% opacity ring. Error state 2px #DE350B border. Compact inputs at 32px height for inline editing.
- **Chips**: Called "lozenges." 20px height, 3px border-radius, 11px font, 700 weight, uppercase. Color-coded by status: Blue (#0052CC/15%), Teal (#00B8D9/15%), Green (#00875A/15%), Yellow (#FF991F/15%), Red (#DE350B/15%), Purple (#6554C0/15%). Text uses the full-saturation color.
- **Lists**: Issue lists use 40px row height, 12px horizontal padding, 1px #DFE1E6 bottom border. Row includes type icon (16px), key (12px/500 #6B778C), title (14px/400 #172B4D), status lozenge, priority icon, and assignee avatar. Hover #F4F5F7 background. Selected row #E2E8F5 (blue tinted).
- **Checkboxes**: 14px square, 2px border-radius, 2px #DFE1E6 border, white background. Checked fills #0052CC with white checkmark. Indeterminate shows dash. Disabled at 50% opacity with #F4F5F7 fill.
- **Tooltips**: #172B4D background, white text, 12px/400, 3px border-radius, 4px 8px padding. No shadow (solid dark tooltip). 100ms delay, 150ms fade-in. Positioned 4px from trigger.
- **Navigation**: Left sidebar, 240px width (collapsible to 20px icon strip), #FAFBFC background with right 1px #DFE1E6 border. Product logo 24px top-left. Nav items 14px/500 #6B778C, 36px height, 8px horizontal padding, hover #EBECF0 background. Active item shows #E2E8F5 background with #0052CC text and 2px left border.
- **Search**: Compact search in sidebar header, 32px height, #FAFBFC background, 1px #DFE1E6 border, 3px border-radius. Command palette (Cmd+K) overlay: 480px width, white background, Level 3 shadow, 8px border-radius, search input at top, results list below.

## Spacing
- Base unit: 4px
- Scale: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
- Component padding: Buttons 6px 12px, cards 12px 16px, inputs 6px 8px, lozenges 2px 4px
- Section spacing: 24px between board columns, 32px between page sections
- Container max width: 1200px for content pages (boards/backlogs stretch full width)
- Card grid gap: 8px between kanban cards (vertical), 12px between board columns

## Border Radius
- 2px: Cards (kanban), inline lozenges, compact elements
- 3px: Buttons, inputs, chips, tooltips, dropdowns
- 4px: Navigation items, selected regions
- 8px: Modals, large dialogs, command palette
- 9999px: Avatars, dot indicators, notification badges

## Do's and Don'ts
- Do use color-coded lozenges consistently across products for status communication
- Do support compact density modes for power users who manage many items
- Don't use more than 2 accent colors on a single view — blue as primary, one contextual accent
- Do provide keyboard shortcuts for common actions (navigation, search, quick actions)
- Don't use the purple (#6554C0) for CTAs; reserve it for categorization and grouping
- Do use inline editing where possible — reduce modal usage for simple field updates
- Don't rely on drag-and-drop as the only interaction; always provide menu alternatives
- Do design for multi-panel layouts where sidebar + main + detail panel coexist
- Don't use rounded corners larger than 8px — the system prefers a structured, sharp aesthetic
- Do use the 2px border width on inputs for better visibility and accessibility compliance