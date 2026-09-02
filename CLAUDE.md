# COGNICOO Dashboard - Claude Code Rules

## Project overview

Interactive team workload dashboard for Cognicoo. Single-page app (`index.html`) with inline HTML/CSS/JS, deployed on GitHub Pages.

**Architecture:**
```
Notion (Tasks - Наші справи) → Cloudflare Worker (proxy) → Dashboard (GitHub Pages)
```

- **Repo:** `alionamakaida-cloud/cognicoo-dashboard`
- **Live:** `https://alionamakaida-cloud.github.io/cognicoo-dashboard/`
- **Worker URL:** `cognicoo-notion-proxy.alionamakaida.workers.dev`
- **Worker deploy:** Cloudflare account `alionamakaida@gmail.com` (NOT `am@cognicoo.com`)
- **Notion DB_ID:** `33611b82-7abc-8089-86ce-cfef409470bb`
- **Auto-refresh:** every 5 minutes

## User context

Aliona (founder of Cognicoo) is non-technical - does not code, needs step-by-step instructions. Communicates in Ukrainian. Tests only on the live site, never locally.

## Critical rules

### Deploy immediately
After any code change, commit and push to `origin/main` right away. Aliona only tests on the live site - unpushed work is invisible to her. For Cloudflare Worker changes, copy code to clipboard and instruct to paste in Cloudflare Dashboard.

### No Cyrillic in worker.js
NEVER put Cyrillic characters in `worker.js`. When Aliona pastes worker code to Cloudflare Dashboard via clipboard, Cyrillic gets corrupted. All Cyrillic strings (team names, status labels) live in `index.html` which deploys via git (encoding preserved). Worker must contain ASCII only.

### Date fallback pattern
Never assume `t.start` exists - many Notion tasks only have an end date (or only a start). Every date reference must use:
- Start: `new Date(t.start || t.end)`
- End: `new Date(t.end || t.start)`
- Guard: `if (!t.start && !t.end) return;` before any date processing
- Applies across ALL sections: Gantt, heatmap, client detail, month detail, sorting, bar positioning

### Design - warm light palette
Always use warm light design: cream, ivory, white cards, warm accents. NEVER dark themes or dark backgrounds.

### Typography - Ukrainian dashes
In Ukrainian text, use spaced hyphen-minus ` - ` (U+002D) for sentence dashes - NOT em-dash `—` (U+2014). Hyphen without spaces only for compound words (e.g. "top-5").

### Documents - mobile friendly
All HTML documents must be mobile-friendly (responsive). Footer always single-line, never wrapping.

### Client data privacy
Client names and profiles stay local. The repo is public - never commit personal data.

## Dashboard architecture

### Key files
- `index.html` - entire dashboard (~1200 lines, all inline)
- `worker.js` - Cloudflare Worker proxy (ASCII only)
- `favicon.svg` - SVG favicon (3 bars in team colors)
- `INSTRUCTION.md` - team instructions for Notion usage

### Team config (in index.html)
```js
const TEAM = ['Андрій', 'Альона', 'Таня'];
const TEAM_LABEL = {'Андрій':'Андрій', 'Альона':'Альона', 'Таня':'Таня (проєктна робота)'};
const NAMES = {'Алена Макайда':'Альона','Alena Makaida':'Альона','Andrii Suslenko':'Андрій','Tanya Telegina':'Таня'};
```
Name mapping is in dashboard, NOT worker (prevents Cyrillic corruption).

### Status flow
```js
const STATUS_ORDER = ['Backlog', 'in process', 'Перевірка', 'Відправлено', 'Approval', 'Підтверджено', 'Done all'];
const STATUS_MAP = {'in process (internal)':'in process', 'В роботі (external)':'in process', ...};
const ACTIVE_STATUSES = ['in process', 'Перевірка', 'Відправлено', 'Approval'];
```
Notion uses suffixed statuses that must be normalized via STATUS_MAP.

### Approval auto-assign
Tasks with status "Approval" automatically include Андрій in the team.

### Progress bars
Two-tone Gantt bars: solid = done portion, transparent = remaining. Worker reads `pr['Progress'].formula.string` (NOT `.number`) and parses "50%" to 0.5.

### Team colors
- Андрій: #6366f1 (indigo)
- Таня: #10b981 (green)
- Альона: #ec4899 (pink)

### Features
1. Team cards - per-member active/total tasks, completion %
2. Indicators - totals, in-progress, review, done, clients count
3. Pipeline bar - status distribution
4. Heatmap - tasks/month per person, ALL categories (not filtered), tooltips via JS object (hmTips, not inline HTML)
5. Category filters - Клієнт, Стратегія, Операційка, Освіта, Подія, Відпустка
6. Client filter - dropdown + drill-down
7. Gantt timeline - bars per client per member, gap detection
8. Ops panel - background load separately
9. Month detail - click month header, shows day numbers, done task markers, active/done separation

### Notion database properties
Task name, Start date, End Date, Status, Client, Assignee, Tags, Priority, Progress (formula type returning "50%" or "-")

## Known bugs fixed (reference)

1. **Cyrillic corruption** - NAMES mapping moved from worker to dashboard
2. **308/311 tasks "без дат"** - all date code fixed to use fallback pattern
3. **Heatmap tooltip injection** - switched from inline HTML to JS object lookup
4. **Progress field null** - worker read `.number` but it's `.formula.string`
5. **Heatmap wrong counts** - removed category filter from heatmap, shows ALL tasks
6. **GitHub Pages deploy stuck** - #43 zombie run; fix: unpublish/republish site in Settings > Pages
