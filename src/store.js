import { DatabaseSync } from 'node:sqlite';

export const statuses = ['aberto', 'em_andamento', 'resolvido'];
export const priorities = ['baixa', 'media', 'alta'];
export const categories = ['Hardware', 'Software', 'Rede', 'Acesso'];
export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dados inválidos.');
  const result = {};
  for (const [key, min, max] of [['title', 5, 100], ['requester', 2, 80], ['description', 10, 1200]]) {
    if (typeof input[key] !== 'string') throw new Error(`Campo ${key} obrigatório.`);
    result[key] = input[key].trim();
    if (result[key].length < min || result[key].length > max) throw new Error(`Campo ${key}: use de ${min} a ${max} caracteres.`);
  }
  for (const [key, options] of [['status', statuses], ['priority', priorities], ['category', categories]]) {
    if (!options.includes(input[key])) throw new Error(`Campo ${key} inválido.`);
    result[key] = input[key];
  }
  return result;
}

export class TicketStore {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY, title TEXT NOT NULL, requester TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('Hardware','Software','Rede','Acesso')),
        priority TEXT NOT NULL CHECK(priority IN ('baixa','media','alta')),
        status TEXT NOT NULL CHECK(status IN ('aberto','em_andamento','resolvido')),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
  }
  list({ status = '', q = '' } = {}) {
    if (status && !statuses.includes(status)) throw new Error('Status inválido.');
    // Parâmetros impedem que o texto pesquisado seja executado como SQL.
    return this.db.prepare(`SELECT * FROM tickets WHERE (? = '' OR status = ?)
      AND (instr(lower(title), lower(?)) > 0 OR instr(lower(requester), lower(?)) > 0)
      ORDER BY CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, id DESC`)
      .all(status, status, q, q);
  }
  get(id) { return this.db.prepare('SELECT * FROM tickets WHERE id = ?').get(id); }
  create(input) {
    const t = validate(input), now = new Date().toISOString();
    const result = this.db.prepare(`INSERT INTO tickets
      (title,requester,description,category,priority,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(t.title, t.requester, t.description, t.category, t.priority, t.status, now, now);
    return this.get(Number(result.lastInsertRowid));
  }
  update(id, input) {
    const t = validate(input);
    if (!this.get(id)) return null;
    this.db.prepare(`UPDATE tickets SET title=?,requester=?,description=?,category=?,priority=?,status=?,updated_at=? WHERE id=?`)
      .run(t.title, t.requester, t.description, t.category, t.priority, t.status, new Date().toISOString(), id);
    return this.get(id);
  }
  remove(id) { return this.db.prepare('DELETE FROM tickets WHERE id=?').run(id).changes > 0; }
  stats() {
    return this.db.prepare(`SELECT COUNT(*) AS total,
      COALESCE(SUM(status='aberto'),0) AS aberto,
      COALESCE(SUM(status='em_andamento'),0) AS em_andamento,
      COALESCE(SUM(status='resolvido'),0) AS resolvido FROM tickets`).get();
  }
  seed() {
    // A tabela de controle evita recriar exemplos depois que todos forem excluídos.
    this.db.exec('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY)');
    if (this.db.prepare("SELECT key FROM metadata WHERE key='seed'").get()) return;
    this.db.exec('BEGIN');
    try {
      for (const row of [
        ['VPN não conecta no notebook', 'Pessoa Demo A', 'A conexão VPN apresenta erro ao iniciar o trabalho remoto.', 'Rede', 'alta', 'aberto'],
        ['Atualização do editor de código', 'Pessoa Demo B', 'Solicitação de atualização do ambiente de desenvolvimento.', 'Software', 'media', 'em_andamento'],
        ['Teclado com falha intermitente', 'Pessoa Demo C', 'Algumas teclas deixaram de responder durante a digitação.', 'Hardware', 'baixa', 'aberto'],
        ['Acesso ao sistema de relatórios', 'Pessoa Demo D', 'Permissão de leitura concedida após revisão do perfil.', 'Acesso', 'media', 'resolvido']
      ]) this.create(Object.fromEntries(['title','requester','description','category','priority','status'].map((k,i) => [k,row[i]])));
      this.db.prepare('INSERT INTO metadata VALUES (?)').run('seed');
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  close() { this.db.close(); }
}
