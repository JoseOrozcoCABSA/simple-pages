const KEY = 'cabsa-licencias-simple-v3';
const STATES = [
  ['son', 'Sonora', '64 registros · 63 con membresía · 64 activos', [64, 63, 64, 1, 1, 0]],
  ['qro', 'Querétaro', '306 registros · 158 con membresía · 306 activos', [306, 158, 306, 0, 4, 0]],
  ['slp', 'San Luis Potosí', 'Sin registros en el CSV', [0, 0, 0, 0, 0, 0]],
  ['mex', 'Estado de México', 'Sin registros en el CSV', [0, 0, 0, 0, 0, 0]],
  ['bc', 'Baja California', 'Sin registros en el CSV', [0, 0, 0, 0, 0, 0]],
  ['nd', 'Sin estado', '319 registros · 274 con membresía · 311 activos', [319, 274, 311, 2, 3, 0]]
];
const DEFAULT_DATA = Object.fromEntries(STATES.map(([id, , , values]) => [id, values.slice()]));
const normalize = value => { const v = Array.isArray(value) ? value : []; return v.length >= 6 ? v.slice(0, 6).map(Number) : [v[0] || 0, v[1] || 0, v[2] || 0, 0, v[3] || 0, v[4] || 0]; };
const clone = value => JSON.parse(JSON.stringify(value));
const fmt = value => new Intl.NumberFormat('es-MX').format(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
let saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('cabsa-licencias-simple-v2') || localStorage.getItem('cabsa-licencias-simple-v1') || '{}');
let data = Object.fromEntries(STATES.map(([id]) => [id, normalize(saved.data?.[id] || DEFAULT_DATA[id])]));
let history = Array.isArray(saved.history) ? saved.history : [];
let scope = 'nac';

function totals(source = data) {
  return [0, 1, 2].map(i => STATES.reduce((sum, [id]) => sum + Number(source[id]?.[i] || 0), 0))
    .concat(STATES.reduce((sum, [id]) => sum + Number(source[id]?.[3] || 0) + Number(source[id]?.[4] || 0), 0), STATES.reduce((sum, [id]) => sum + Number(source[id]?.[5] || 0), 0));
}
function saveState() { saved = { data, history, updated: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify(saved)); render(); }
function pct(value, base) { return base > 0 ? `${Math.round(value / base * 100)}%` : '—'; }
function width(value, base) { return `${base > 0 ? Math.min(100, Math.max(0, value / base * 100)) : 0}%`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function renderFunnel() {
  const t = totals();
  const rows = [
    ['Población meta', t[4], null, 'target'], ['Creadas', t[0], t[4] || null, 'created'],
    ['Entregadas', t[1], t[0], 'delivered'], ['Activadas', t[2], t[1], 'active'], ['En uso', t[3], t[2], 'new']
  ];
  const max = Math.max(...t, 1);
  document.querySelector('#national-funnel').innerHTML = rows.map(([label, value, base, color], index) => {
    const usedNew = index === 4 ? STATES.reduce((s, [id]) => s + data[id][3], 0) : 0;
    const usedMember = index === 4 ? STATES.reduce((s, [id]) => s + data[id][4], 0) : 0;
    const split = index === 4 ? `<div class="split-values"><span><i class="new"></i><strong>${fmt(usedNew)}</strong> Clientes nuevos</span><span><i class="member"></i><strong>${fmt(usedMember)}</strong> Agregan a membresía</span></div>` : '';
    return `<div class="funnel-row"><div class="funnel-label"><span>${label.toUpperCase()}</span><strong>${fmt(value)}</strong><small>${base ? `${fmt(value)} de ${fmt(base)}` : label === 'Población meta' ? 'Clientes potenciales' : ''}</small></div><div><div class="funnel-bar" style="width:${width(value, max)}"><i class="${color}" style="flex:1"></i></div>${split}</div><strong class="funnel-pct">${pct(value, base)}</strong></div>`;
  }).join('');
  const warning = t[1] > t[0] || t[3] > t[2];
  const warningEl = document.querySelector('#warning'); warningEl.hidden = !warning; warningEl.textContent = warning ? 'Los datos del CSV combinan usuarios y licencias; revisa las etapas antes de usarlos como embudo.' : '';
}

function renderComparison() {
  const max = Math.max(...STATES.map(([id]) => Math.max(data[id][0], data[id][5])), 1);
  document.querySelector('#comparison-list').innerHTML = STATES.map(([id, name]) => {
    const v = data[id], used = v[3] + v[4], active = v[2];
    return `<div class="comparison-row"><div class="comparison-label"><strong>${name}</strong><small>Pobl. meta ${v[5] ? fmt(v[5]) : '—'}</small></div><div class="comparison-bar"><i class="bar-pob" style="width:${width(v[5], max)}"></i><i class="bar-created" style="width:${width(v[0], max)}"></i><i class="bar-delivered" style="width:${width(v[1], max)}"></i><span class="bar-active" style="width:${width(active, max)}"><i class="new" style="flex:${v[3] || 0}"></i><i class="member" style="flex:${v[4] || 0}"></i><i class="free" style="flex:${Math.max(0, active - used) || 0}"></i></span></div><strong class="comparison-pct">${pct(used, active)}</strong></div>`;
  }).join('');
}

function historyValues(cut) {
  if (scope === 'nac') return cut.values || totals(cut.data || {});
  const v = cut.data?.[scope] || [0, 0, 0, 0, 0, 0];
  return [v[0], v[1], v[2], v[3] + v[4], v[5]];
}
function renderChart() {
  const svg = document.querySelector('#history-chart');
  if (!history.length) { svg.innerHTML = ''; return; }
  const colors = ['#202020', '#e8792b', '#2b8a4b', '#7a5a22'];
  const points = history.map((cut, i) => { const v = historyValues(cut); return [i, v[0], v[1], v[2], v[3]]; });
  const max = Math.max(...points.flatMap(p => p.slice(1)), 1), w = 660, h = 180, left = 20;
  const x = i => left + (points.length === 1 ? w / 2 : i * w / (points.length - 1));
  const y = value => 205 - value / max * h;
  const grid = [0, .25, .5, .75, 1].map(n => `<line class="chart-grid" x1="20" x2="680" y1="${y(max * n)}" y2="${y(max * n)}"/><text class="chart-label" x="0" y="${y(max * n) + 4}">${fmt(Math.round(max * n))}</text>`).join('');
  const paths = [1, 2, 3, 4].map((column, index) => `<polyline class="chart-path" stroke="${colors[index]}" points="${points.map(p => `${x(p[0])},${y(p[column])}`).join(' ')}"/>`).join('');
  const labels = points.map(p => `<text class="chart-label" x="${x(p[0]) - 24}" y="225">${escapeHtml(history[p[0]].date)}</text>`).join('');
  svg.innerHTML = `<rect class="chart-bg" x="0" y="0" width="700" height="230"/>${grid}${paths}${labels}`;
}

function renderHistory() {
  document.querySelector('#scopes').innerHTML = [['nac', 'Nacional'], ...STATES.map(([id, name]) => [id, name])].map(([id, name]) => `<button class="scope ${scope === id ? 'selected' : ''}" data-scope="${id}">${name}</button>`).join('');
  document.querySelectorAll('[data-scope]').forEach(button => button.addEventListener('click', () => { scope = button.dataset.scope; renderHistory(); }));
  const table = document.querySelector('#history-table'), empty = document.querySelector('#history-empty'), body = table.querySelector('tbody');
  body.replaceChildren(); empty.hidden = history.length > 0; table.hidden = history.length === 0;
  history.slice().reverse().forEach((cut, reverse) => { const index = history.length - 1 - reverse, previous = index ? historyValues(history[index - 1])[3] : null, current = historyValues(cut)[3], delta = previous === null ? '—' : current - previous; const row = document.createElement('tr'); row.innerHTML = `<td>${escapeHtml(cut.date)}</td><td>${fmt(historyValues(cut)[0])}</td><td>${fmt(historyValues(cut)[1])}</td><td>${fmt(historyValues(cut)[2])}</td><td><strong>${fmt(current)}</strong></td><td>${delta}</td><td>${cut.data ? `<button data-restore="${index}">Restaurar</button>` : ''} <button data-remove="${index}">Eliminar</button></td>`; body.append(row); });
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { history.splice(Number(b.dataset.remove), 1); saveState(); }));
  body.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', () => { const cut = history[Number(b.dataset.restore)]; if (!cut?.data || !confirm(`¿Restaurar el corte del ${cut.date}?`)) return; data = Object.fromEntries(STATES.map(([id]) => [id, normalize(cut.data[id])])); saveState(); }));
  renderChart();
}

function renderCapture() {
  document.querySelector('#capture').innerHTML = STATES.map(([id, name, subtitle]) => { const v = data[id], used = v[3] + v[4], free = Math.max(0, v[2] - used); const fields = [['Población meta', 5], ['Creadas', 0], ['Entregadas', 1], ['Activadas', 2]]; const usage = [['Nuevos', 3], ['Membresía', 4]]; const bars = [[5, 'target'], [0, 'created'], [1, 'delivered'], [2, 'active'], [3, 'new']]; return `<article class="state-card"><div><h3>${name}</h3><span class="subtitle">${subtitle}</span></div><div class="capture-bars">${bars.map(([i, color]) => `<div class="capture-bar"><i class="${color}" style="width:${width(v[i], Math.max(v[5], v[0], 1))}"></i><strong>${fmt(v[i])}</strong></div>`).join('')}</div><div class="capture-fields"><span class="field-title">Licencias</span><div class="field-grid">${fields.map(([label, i]) => `<label>${label}<input type="number" min="0" value="${v[i]}" data-state="${id}" data-index="${i}"></label>`).join('')}</div></div><div class="usage"><span class="field-title">De las activadas, en uso</span><div class="usage-grid">${usage.map(([label, i]) => `<label>${label}<input type="number" min="0" value="${v[i]}" data-state="${id}" data-index="${i}"></label>`).join('')}<div><span class="field-title">Gratuitas</span><div class="free-value">${fmt(free)}</div></div></div></div><div class="state-metrics"><span>Cobertura ${pct(v[0], v[5])}</span><span>Entrega ${pct(v[1], v[0])}</span><span>Activación ${pct(v[2], v[1])}</span><span>En uso ${pct(used, v[2])}</span></div></article>`; }).join('');
  document.querySelectorAll('#capture input').forEach(input => input.addEventListener('change', event => { const { state, index } = event.target.dataset; data[state][index] = Math.max(0, Number(event.target.value) || 0); saveState(); }));
}

function render() { document.querySelector('#updated').textContent = saved.updated ? `Actualizado ${new Date(saved.updated).toLocaleString('es-MX')}` : 'Actualizado — datos del CSV'; renderFunnel(); renderComparison(); renderHistory(); renderCapture(); }
document.querySelector('#cut-date').value = today();
document.querySelector('#save-cut').addEventListener('click', () => { history.push({ date: document.querySelector('#cut-date').value || today(), values: totals(), data: clone(data) }); saveState(); });
document.querySelector('#reset').addEventListener('click', () => { if (!confirm('¿Restaurar los datos iniciales del CSV?')) return; data = clone(DEFAULT_DATA); saveState(); });
render();
