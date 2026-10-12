const KEY = 'cabsa-licencias-simple-v1';
const STATES = [
  ['son', 'Sonora'], ['qro', 'Querétaro'], ['slp', 'San Luis Potosí'],
  ['mex', 'Estado de México'], ['bc', 'Baja California'], ['nd', 'Sin estado']
];
const SAMPLE = Object.fromEntries(STATES.map(([id]) => [id, [0, 0, 0, 0, 0]]));
let saved = JSON.parse(localStorage.getItem(KEY) || '{}');
let data = saved.data || structuredClone(SAMPLE);
let history = saved.history || [];

const fmt = value => new Intl.NumberFormat('es-MX').format(value || 0);
const totals = () => [0, 1, 2, 3].map(i => STATES.reduce((sum, [id]) => sum + Number(data[id]?.[i] || 0), 0));
const persist = () => { saved = { data, history, updated: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify(saved)); render(); };

function render() {
  const total = totals();
  ['created', 'delivered', 'active', 'used'].forEach((name, i) => document.querySelector(`#total-${name}`).textContent = fmt(total[i]));
  document.querySelector('#updated').textContent = saved.updated ? `Actualizado ${new Date(saved.updated).toLocaleString('es-MX')}` : 'Sin cambios guardados';
  const states = document.querySelector('#states'); states.replaceChildren();
  let warning = '';
  for (const [id, name] of STATES) {
    const values = data[id] || [0, 0, 0, 0, 0];
    const [created, delivered, active, used, target] = values;
    if (delivered > created || active > delivered || used > active) warning = 'Revisa cifras: una etapa supera a la anterior.';
    const card = document.createElement('article'); card.className = 'state';
    card.innerHTML = `<h3>${name}</h3><div class="fields">${[['Creadas',0],['Entregadas',1],['Activadas',2],['En uso',3],['Población meta',4]].map(([label, index]) => `<label class="field">${label}<input min="0" type="number" value="${values[index] || 0}" data-state="${id}" data-index="${index}"></label>`).join('')}</div><div class="bar"><i style="width:${Math.min(100, target ? created / target * 100 : 0)}%"></i></div><div class="metrics"><span>${fmt(created)} creadas</span><span>${target ? Math.round(created / target * 100) : 0}% de meta</span></div>`;
    states.append(card);
  }
  document.querySelector('#warning').hidden = !warning; document.querySelector('#warning').textContent = warning;
  states.querySelectorAll('input').forEach(input => input.addEventListener('change', event => { const { state, index } = event.target.dataset; data[state][index] = Math.max(0, Number(event.target.value) || 0); persist(); }));
  const table = document.querySelector('#history-table'), empty = document.querySelector('#history-empty'), body = table.querySelector('tbody'); body.replaceChildren(); empty.hidden = history.length > 0; table.hidden = history.length === 0;
  history.slice().reverse().forEach((cut, reverseIndex) => { const row = document.createElement('tr'); row.innerHTML = `<td>${new Date(cut.date).toLocaleString('es-MX')}</td><td>${fmt(cut.values[0])}</td><td>${fmt(cut.values[1])}</td><td>${fmt(cut.values[2])}</td><td>${fmt(cut.values[3])}</td><td><button data-remove="${history.length - 1 - reverseIndex}">Eliminar</button></td>`; body.append(row); });
  body.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { history.splice(Number(button.dataset.remove), 1); persist(); }));
}

document.querySelector('#save-cut').addEventListener('click', () => { history.push({ date: new Date().toISOString(), values: totals() }); persist(); });
document.querySelector('#reset').addEventListener('click', () => { if (confirm('¿Borrar todas las cifras locales?')) { data = structuredClone(SAMPLE); history = []; persist(); } });
render();

