// Cloudflare Worker — COGNICOO Notion Proxy
// Deploy via Cloudflare Dashboard: Workers & Pages → Create → paste this code
// Set environment variable: NOTION_TOKEN = your integration token

const DB_ID = '33611b82-7abc-8089-86ce-cfef409470bb';
const NOTION_VER = '2025-09-03';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      const token = env.NOTION_TOKEN;
      if (!token) return new Response(JSON.stringify({ error: 'NOTION_TOKEN not set' }), { status: 500, headers: CORS });

      const allPages = [];
      let cursor = undefined;
      let safety = 0;

      // Paginate through all pages via search endpoint
      while (safety < 10) {
        const body = {
          filter: { value: 'page', property: 'object' },
          page_size: 100
        };
        if (cursor) body.start_cursor = cursor;

        const res = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': NOTION_VER,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.text();
          return new Response(JSON.stringify({ error: 'Notion API error', detail: err }), { status: res.status, headers: CORS });
        }

        const data = await res.json();
        // Filter only pages from our database
        const pages = (data.results || []).filter(
          p => p.parent && p.parent.database_id &&
               p.parent.database_id.replace(/-/g, '') === DB_ID.replace(/-/g, '')
        );
        allPages.push(...pages);

        if (!data.has_more) break;
        cursor = data.next_cursor;
        safety++;
      }

      // Transform pages to simplified task objects
      const NAMES = {
        'Алена Макайда': 'Альона',
        'Andrii Suslenko': 'Андрій',
        'Tanya Telegina': 'Таня'
      };

      const tasks = allPages.map(p => {
        const pr = p.properties || {};

        // Task name
        const titleArr = (pr['Task name'] || {}).title || [];
        const name = titleArr.map(t => t.plain_text).join('') || '—';

        // Assignee
        const people = (pr['Assignee'] || {}).people || [];
        const team = people.map(pe => NAMES[pe.name] || pe.name);

        // Status
        const st = ((pr['Status'] || {}).status || {}).name || '';

        // Due date
        const dateObj = (pr['Due date'] || {}).date || null;
        const start = dateObj ? dateObj.start : null;
        const end = dateObj ? dateObj.end : null;

        // Client
        const clients = ((pr['Client'] || {}).multi_select || []).map(c => c.name);

        // Priority
        const priority = ((pr['Priority'] || {}).select || {}).name || '';

        // Tags
        const tags = ((pr['Tags'] || {}).multi_select || []).map(t => t.name);

        return { id: p.id, name, team, status: st, start, end, clients, priority, tags };
      });

      return new Response(JSON.stringify({ tasks, count: tasks.length, fetched: new Date().toISOString() }), { headers: CORS });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }
};
