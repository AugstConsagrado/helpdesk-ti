import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TicketStore } from '../src/store.js';
import { createServer } from '../src/server.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const input = {title:'Falha na rede local', requester:'Pessoa Teste', description:'Sem conexão após reiniciar o computador.', category:'Rede',priority:'alta',status:'aberto'};
test('CRUD, filtros e indicadores acompanham o ciclo do chamado', () => {
  const s = new TicketStore();
  try { const t = s.create(input); assert.equal(s.stats().aberto,1); assert.equal(s.list({q:'rede'}).length,1);
    s.update(t.id,{...input,status:'resolvido'}); assert.equal(s.list({status:'aberto'}).length,0); assert.equal(s.stats().resolvido,1);
    assert.equal(s.update(999,input),null); assert.equal(s.remove(t.id),true); assert.equal(s.remove(t.id),false); assert.equal(s.stats().total,0);
  } finally { s.close(); }
});
test('validação impede campos inválidos e pesquisa não executa SQL', () => {
  const s = new TicketStore();
  try { assert.throws(() => s.create({...input,title:' '})); assert.throws(() => s.create({...input,priority:'urgente'}));
    assert.throws(() => s.create(null)); s.create(input); assert.equal(s.list({q:"' OR 1=1 --"}).length,0); assert.equal(s.stats().total,1);
  } finally { s.close(); }
});
test('persistência e carga inicial não duplicam nem recriam chamados apagados', () => {
  const dir = mkdtempSync(join(tmpdir(),'helpdesk-')); const path = join(dir,'test.db'); let s = new TicketStore(path);
  try { s.seed(); assert.equal(s.stats().total,4); s.seed(); assert.equal(s.stats().total,4); s.close(); s = new TicketStore(path);
    assert.equal(s.stats().total,4); for(const t of s.list()) s.remove(t.id); s.seed(); assert.equal(s.stats().total,0);
  } finally { s.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('API aceita operações válidas e rejeita JSON malformado, origem externa e tamanho excessivo', async () => {
  const s = new TicketStore(), server = createServer(s); await new Promise(r => server.listen(0,'127.0.0.1',r));
  const root = `http://127.0.0.1:${server.address().port}`;
  try {
    let res = await fetch(root+'/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}); assert.equal(res.status,201);
    const ticket = await res.json(); res = await fetch(root+`/api/tickets/${ticket.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,status:'resolvido'})}); assert.equal(res.status,200);
    res = await fetch(root+'/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}); assert.equal(res.status,400);
    res = await fetch(root+`/api/tickets/${ticket.id}`,{method:'DELETE',headers:{Origin:'https://example.com'}}); assert.equal(res.status,403);
    res = await fetch(root+'/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:'x'.repeat(20000)})}); assert.equal(res.status,413);
    res = await fetch(root+`/api/tickets/${ticket.id}`,{method:'DELETE'}); assert.equal(res.status,200);
    res = await fetch(root+`/api/tickets/${ticket.id}`); assert.equal(res.status,404);
    res = await fetch(root+'/'); assert.equal(res.status,200); assert.match(await res.text(),/Central de chamados/);
  } finally { await new Promise(r => server.close(r)); s.close(); }
});
