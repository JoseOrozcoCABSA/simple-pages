const KEY = 'cabsa-licencias-simple-v2';
const STATES = [
  ['son', 'Sonora', 'Secciones 28 y 54', [80, 52, 30, 6, 9, 1800]],
  ['qro', 'Querétaro', 'Sección 24 · piloto', [120, 96, 71, 14, 22, 1200]],
  ['slp', 'San Luis Potosí', 'Sección 26', [40, 22, 11, 2, 3, 700]],
  ['mex', 'Estado de México', 'Sección 17', [55, 30, 14, 3, 2, 900]],
  ['bc', 'Baja California', 'Secciones 2 y 37', [12, 4, 1, 0, 0, 400]],
  ['nd', 'Sin estado', 'Estado por identificar', [18, 6, 2, 0, 1, 0]]
];

// Modelo: creadas, entregadas, activadas, en uso nuevos, en uso membresía, población meta.
const normalize = values => {
  const v = Array.isArray(values) ? values : [];
  // Migra el modelo anterior: [creadas, entregadas, activadas, en uso, meta].
  return v.length >= 6
    ? v.slice(0, 6).map(Number)
    : [v[0] || 0, v[1] || 0, v[2] || 0, 0, v[3] || 0, v[4] || 0];
};
const DEFAULT_DATA = Object.fromEntries(STATES.map(([id, , , values]) => [id, values.slice()]));

let saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('cabsa-licencias-simple-v1') || '{}');
let data = Object.fromEntries(STATES.map(([id]) => [id, normalize(saved.data?.[id] || DEFAULT_DATA[id])]));
let history = saved.history || [];

const fmt = value => new Intl.NumberFormat('es-MX').format(value || 0);
const totals = () => [
  STATES.reduce((sum, [id]) => sum + Number(data[id]?.[0] || 0), 0),
  STATES.reduce((sum, [id]) => sum + Number(data[id]?.[1] || 0), 0),
  STATES.reduce((sum, [id]) => sum + Number(data[id]?.[2] || 0), 0),
  STATES.reduce((sum, [id]) => sum + Number(data[id]?.[3] || 0) + Number(data[id]?.[4] || 0), 0),
  STATES.reduce((sum, [id]) => sum + Number(data[id]?.[5] || 0), 0)
];
const persist = () => {
  saved = { data, history, updated: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(saved));
  render();
};

function render() {
  const total = totals();
  ['created', 'delivered', 'active', 'used'].forEach((name, i) => {
    document.querySelector(`#total-${name}`).textContent = fmt(total[i]);
  });
  document.querySelector('#total-target').textContent = fmt(total[4]);
  document.querySelector('#updated').textContent = saved.updated
    ? `Actualizado ${new Date(saved.updated).toLocaleString('es-MX')}`
    : 'Sin cambios guardados';

  const states = document.querySelector('#states');
  states.replaceChildren();
  let warning = '';
  for (const [id, name, subtitle] of STATES) {
    const values = normalize(data[id]);
    const [created, delivered, active, usedNew, usedMembership, target] = values;
    const used = usedNew + usedMembership;
    if (delivered > created || active > delivered || used > active) {
      warning = 'Revisa cifras: una etapa supera a la anterior.';
    }
    const card = document.createElement('article');
    card.className = 'state';
    const fields = [
      ['Creadas', 0], ['Entregadas', 1], ['Activadas', 2],
      ['En uso nuevos', 3], ['En uso membresía', 4], ['Población meta', 5]
    ];
    card.innerHTML = `<h3>${name}</h3><p class="muted">${subtitle}</p><div class="fields">${fields.map(([label, index]) => `<label class="field">${label}<input min="0" type="number" value="${values[index] || 0}" data-state="${id}" data-index="${index}"></label>`).join('')}</div><div class="bar"><i style="width:${Math.min(100, target ? created / target * 100 : 0)}%"></i></div><div class="metrics"><span>${fmt(created)} creadas · ${fmt(used)} en uso</span><span>${target ? Math.round(created / target * 100) : 0}% de meta</span></div>`;
    states.append(card);
  }

  document.querySelector('#warning').hidden = !warning;
  document.querySelector('#warning').textContent = warning;
  states.querySelectorAll('input').forEach(input => input.addEventListener('change', event => {
    const { state, index } = event.target.dataset;
    data[state][index] = Math.max(0, Number(event.target.value) || 0);
    persist();
  }));

  const table = document.querySelector('#history-table');
  const empty = document.querySelector('#history-empty');
  const body = table.querySelector('tbody');
  body.replaceChildren();
  empty.hidden = history.length > 0;
  table.hidden = history.length === 0;
  history.slice().reverse().forEach((cut, reverseIndex) => {
    const row = document.createElement('tr');
    const index = history.length - 1 - reverseIndex;
    const restore = cut.data ? `<button data-restore="${index}">Restaurar</button>` : '<span>Antiguo</span>';
    row.innerHTML = `<td>${new Date(cut.date).toLocaleString('es-MX')}</td><td>${fmt(cut.values[0])}</td><td>${fmt(cut.values[1])}</td><td>${fmt(cut.values[2])}</td><td>${fmt(cut.values[3])}</td><td>${restore} <button data-remove="${index}">Eliminar</button></td>`;
    body.append(row);
  });
  body.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
    history.splice(Number(button.dataset.remove), 1);
    persist();
  }));
  body.querySelectorAll('[data-restore]').forEach(button => button.addEventListener('click', () => {
    const cut = history[Number(button.dataset.restore)];
    if (!cut?.data || !confirm(`¿Restaurar el corte del ${new Date(cut.date).toLocaleString('es-MX')}?`)) return;
    data = Object.fromEntries(STATES.map(([id]) => [id, normalize(cut.data[id])]));
    saved.updated = new Date().toISOString();
    persist();
  }));
}

document.querySelector('#save-cut').addEventListener('click', () => {
  history.push({
    date: new Date().toISOString(),
    values: totals(),
    data: JSON.parse(JSON.stringify(data))
  });
  persist();
});
document.querySelector('#reset').addEventListener('click', () => {
  if (confirm('¿Borrar todas las cifras locales?')) {
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    history = [];
    persist();
  }
});
render();
