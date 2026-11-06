const $ = s => document.querySelector(s);
const labels = {aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido',baixa:'Baixa',media:'Média',alta:'Alta'};
const form = $('#ticket-form'), dialog = $('#ticket-dialog');
let tickets = [], requestNumber = 0;
async function api(url, options) {
  const response = await fetch(url, options), data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
function badge(value) { const span = document.createElement('span'); span.className = `badge ${value}`; span.textContent = labels[value]; return span; }
async function load() {
  const current = ++requestNumber;
  try {
    const query = new URLSearchParams({q:$('#search').value, status:$('#status-filter').value});
    const [rows, stats] = await Promise.all([api(`/api/tickets?${query}`), api('/api/stats')]);
    if (current !== requestNumber) return;
    tickets = rows;
    $('#stats').replaceChildren();
    for (const [key, title] of [['total','Total de chamados'],['aberto','Abertos'],['em_andamento','Em andamento'],['resolvido','Resolvidos']]) {
      const card = document.createElement('article'); card.className = 'stat';
      const label = document.createElement('span'); label.textContent = title;
      const value = document.createElement('strong'); value.textContent = stats[key];
      const hint = document.createElement('small'); hint.textContent = 'Visão geral';
      card.append(label, value, hint); $('#stats').append(card);
    }
    $('#count').textContent = `${rows.length} chamado(s) nesta visualização`;
    $('#tickets').replaceChildren();
    for (const ticket of rows) {
      const row = document.createElement('tr'), title = document.createElement('td');
      const strong = document.createElement('strong'); strong.textContent = ticket.title;
      const meta = document.createElement('small'); meta.textContent = `#${String(ticket.id).padStart(3,'0')} · ${ticket.category}`;
      title.dataset.label = 'Chamado'; title.append(strong,meta); row.append(title);
      const requester = document.createElement('td'); requester.dataset.label = 'Solicitante'; requester.textContent = ticket.requester; row.append(requester);
      for (const key of ['priority','status']) { const td = document.createElement('td'); td.dataset.label = key === 'priority' ? 'Prioridade' : 'Status'; td.append(badge(ticket[key])); row.append(td); }
      const action = document.createElement('td'), button = document.createElement('button');
      action.dataset.label = 'Ação'; button.className = 'ghost'; button.textContent = 'Detalhes'; button.setAttribute('aria-label', `Editar chamado ${ticket.id}`);
      button.onclick = () => open(ticket); action.append(button); row.append(action); $('#tickets').append(row);
    }
    if (!rows.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 5; td.className = 'empty'; td.textContent = 'Nenhum chamado encontrado. Experimente outra busca ou crie um novo.'; tr.append(td); $('#tickets').append(tr); }
  } catch (e) { if (current === requestNumber) $('#message').textContent = e.message; }
}
function open(ticket) {
  form.reset(); $('#form-error').textContent = ''; form.elements.id.value = '';
  $('#dialog-title').textContent = ticket ? `Chamado #${ticket.id}` : 'Novo chamado';
  $('#delete-ticket').hidden = !ticket;
  if (ticket) for (const key of ['id','title','requester','category','priority','status','description']) form.elements[key].value = ticket[key];
  dialog.showModal();
}
$('#new-ticket').onclick = () => open();
$('#close-dialog').onclick = () => dialog.close();
$('#status-filter').onchange = load;
let timer;
$('#search').oninput = () => { clearTimeout(timer); timer = setTimeout(load,200); };
form.onsubmit = async event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(form)), id = data.id; delete data.id;
  $('#save-ticket').disabled = true; $('#delete-ticket').disabled = true;
  try {
    await api(id ? `/api/tickets/${id}` : '/api/tickets', {method:id ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    dialog.close(); $('#message').textContent = 'Chamado salvo com sucesso.'; await load();
  } catch(e) { $('#form-error').textContent = e.message; }
  finally { $('#save-ticket').disabled = false; $('#delete-ticket').disabled = false; }
};
$('#delete-ticket').onclick = async () => {
  if (!confirm('Excluir este chamado definitivamente?')) return;
  $('#delete-ticket').disabled = true;
  try { await api(`/api/tickets/${form.elements.id.value}`, {method:'DELETE'}); dialog.close(); $('#message').textContent = 'Chamado excluído.'; await load(); }
  catch(e) { $('#form-error').textContent = e.message; }
  finally { $('#delete-ticket').disabled = false; }
};
load();
