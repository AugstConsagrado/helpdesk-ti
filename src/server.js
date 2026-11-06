import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TicketStore } from './store.js';

export function createServer(store) {
  const files = new Map([['/', ['index.html','text/html; charset=utf-8']], ['/app.js',['app.js','text/javascript; charset=utf-8']], ['/style.css',['style.css','text/css; charset=utf-8']]]);
  files.set('/projeto', ['case.html', 'text/html; charset=utf-8']);
  files.set('/case.css', ['case.css', 'text/css; charset=utf-8']);
  files.set('/preview.jpg', ['../docs/preview.jpg', 'image/jpeg']);
  return http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    try {
      // A demonstração é local. Recusa Host e Origin externos nas operações de escrita.
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return send(403, {error:'Host não permitido.'});
      const url = new URL(req.url, `http://${host}`);
      if (req.method === 'GET' && files.has(url.pathname)) {
        const [name, type] = files.get(url.pathname);
        const content = await readFile(new URL(`../public/${name}`, import.meta.url));
        res.writeHead(200, {'Content-Type':type}); return res.end(content);
      }
      if (req.method === 'GET' && url.pathname === '/api/stats') return send(200, store.stats());
      if (req.method === 'GET' && url.pathname === '/api/tickets') return send(200, store.list({status:url.searchParams.get('status') || '', q:(url.searchParams.get('q') || '').slice(0,100)}));
      const match = /^\/api\/tickets\/([1-9]\d*)$/.exec(url.pathname);
      const id = match ? Number(match[1]) : null;
      if (match && !Number.isSafeInteger(id)) return send(400, {error:'Identificador inválido.'});
      if (req.method === 'GET' && match) { const t = store.get(id); return send(t ? 200 : 404, t || {error:'Chamado não encontrado.'}); }
      if (['POST','PUT','DELETE'].includes(req.method)) {
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(403, {error:'Origem não permitida.'});
        if (req.method === 'DELETE' && match) return send(store.remove(id) ? 200 : 404, {message:'Operação concluída.'});
        if (!((req.method === 'POST' && url.pathname === '/api/tickets') || (req.method === 'PUT' && match))) return send(404, {error:'Rota não encontrada.'});
        if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415, {error:'Envie JSON.'});
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) return send(413, {error:'Conteúdo muito grande.'}); }
        let data;
        try { data = JSON.parse(raw); } catch { return send(400, {error:'JSON inválido.'}); }
        const ticket = req.method === 'POST' ? store.create(data) : store.update(id, data);
        return send(ticket ? (req.method === 'POST' ? 201 : 200) : 404, ticket || {error:'Chamado não encontrado.'});
      }
      send(404, {error:'Rota não encontrada.'});
    } catch (e) {
      if (e.code) { console.error(e); return send(500, {error:'Falha interna. Consulte o terminal.'}); }
      send(400, {error:e.message});
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL('../data/', import.meta.url), {recursive:true});
  const store = new TicketStore(fileURLToPath(new URL('../data/helpdesk.db', import.meta.url)));
  store.seed();
  const server = createServer(store), port = Number(process.env.PORT || 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Helpdesk TI: http://127.0.0.1:${port}`));
  const shutdown = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
