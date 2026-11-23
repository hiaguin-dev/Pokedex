const TYPE_COLORS = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC'
};

const STAT_COLORS = {
  hp:'#FF5959', attack:'#F5AC78', defense:'#FAE078',
  'special-attack':'#9DB7F5', 'special-defense':'#A7DB8D', speed:'#FA92B2'
};

const STAT_LABELS = {
  hp:'HP', attack:'ATQ', defense:'DEF',
  'special-attack':'Sp.A', 'special-defense':'Sp.D', speed:'VEL'
};

const KANTO_RANGE = [1, 151];

let allPokemon = [];
let currentIndex = 0;
const cache = {};

async function fetchPokemon(id) {
  if (cache[id]) return cache[id];
  const [poke, species] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json()),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.json())
  ]);
  const desc = species.flavor_text_entries.find(e => e.language.name === 'pt') ||
               species.flavor_text_entries.find(e => e.language.name === 'en');
  const data = { poke, species, desc: desc ? desc.flavor_text.replace(/\f|\n/g,' ') : '' };
  cache[id] = data;
  return data;
}

async function loadKanto() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('grid').style.display = 'none';

  const ids = Array.from({length: KANTO_RANGE[1] - KANTO_RANGE[0] + 1}, (_,i) => i + KANTO_RANGE[0]);
  const CHUNK = 20;
  allPokemon = [];

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const results = await Promise.all(chunk.map(id =>
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json())
    ));
    allPokemon.push(...results);
    renderGrid(allPokemon);
  }

  document.getElementById('loading').style.display = 'none';
  document.getElementById('grid').style.display = 'grid';
  renderGrid(allPokemon);
}

function getSprite(p) {
  return p.sprites.other['official-artwork']?.front_default ||
         p.sprites.front_default || '';
}

function typeColor(t) { return TYPE_COLORS[t] || '#aaa'; }

function typeBg(primaryType) {
  const validTypes = ['fire','water','grass','electric','psychic','poison','ghost','dragon','ice','normal','fighting','ground','flying','bug','rock'];
  return validTypes.includes(primaryType) ? `card-bg-${primaryType}` : '';
}

function renderGrid(list) {
  const search = document.getElementById('search').value.toLowerCase();
  const typeF = document.getElementById('type-filter').value;
  const grid = document.getElementById('grid');

  const filtered = list.filter(p => {
    const name = p.name.toLowerCase();
    const types = p.types.map(t => t.type.name);
    const matchSearch = name.includes(search) || String(p.id).includes(search);
    const matchType = !typeF || types.includes(typeF);
    return matchSearch && matchType;
  });

  document.getElementById('pokemon-count').textContent = filtered.length;

  grid.innerHTML = filtered.map((p, i) => {
    const types = p.types.map(t => t.type.name);
    const primary = types[0];
    const sprite = getSprite(p);
    const bg = typeBg(primary);
    const delay = (i % 20) * 0.03;

    return `<div class="card ${bg}" style="animation-delay:${delay}s" onclick="openModal(${p.id - 1})">
      <div class="card-number">#${String(p.id).padStart(3,'0')}</div>
      <div class="card-img-wrap">
        <img src="${sprite}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="types">
          ${types.map(t => `<span class="type-badge" style="background:${typeColor(t)}">${t}</span>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="no-results"><p>Nenhum Pokémon encontrado.</p></div>`;
}

async function openModal(index) {
  currentIndex = index;
  const p = allPokemon[index];
  if (!p) return;

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const types = p.types.map(t => t.type.name);
  const primary = types[0];
  const color = typeColor(primary);

  document.getElementById('modal-header').style.background =
    `linear-gradient(160deg, ${color} 0%, ${adjustColor(color, -30)} 100%)`;
  document.getElementById('modal-number').textContent = `#${String(p.id).padStart(3,'0')}`;
  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-types').innerHTML = types.map(t =>
    `<span class="type-badge" style="background:rgba(255,255,255,0.25);border:2px solid rgba(255,255,255,0.5)">${t}</span>`
  ).join('');
  document.getElementById('modal-img').src = getSprite(p);
  document.getElementById('modal-img').alt = p.name;
  document.getElementById('m-height').textContent = `${(p.height / 10).toFixed(1)} m`;
  document.getElementById('m-weight').textContent = `${(p.weight / 10).toFixed(1)} kg`;
  document.getElementById('m-exp').textContent = p.base_experience || '—';
  document.getElementById('m-gen').textContent = 'I (Kanto)';

  document.getElementById('m-abilities').innerHTML = p.abilities.map(a =>
    `<span class="ability-tag">${a.ability.name}${a.is_hidden ? ' ✦' : ''}</span>`
  ).join('');

  const statsMap = {};
  p.stats.forEach(s => statsMap[s.stat.name] = s.base_stat);
  const statOrder = ['hp','attack','defense','special-attack','special-defense','speed'];
  document.getElementById('m-stats').innerHTML = statOrder.map(sn => {
    const val = statsMap[sn] || 0;
    const pct = Math.min(100, Math.round(val / 255 * 100));
    const col = STAT_COLORS[sn] || '#aaa';
    return `<div class="stat-row">
      <div class="stat-name">${STAT_LABELS[sn]}</div>
      <div class="stat-val">${val}</div>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:${pct}%;background:${col}"></div>
      </div>
    </div>`;
  }).join('');

  const prev = allPokemon[index - 1];
  const next = allPokemon[index + 1];
  document.getElementById('prev-btn').disabled = !prev;
  document.getElementById('next-btn').disabled = !next;
  document.getElementById('prev-name').textContent = prev ? prev.name : 'Anterior';
  document.getElementById('next-name').textContent = next ? next.name : 'Próximo';

  document.getElementById('modal-desc').textContent = '...';
  try {
    const { desc } = await fetchPokemon(p.id);
    document.getElementById('modal-desc').textContent = desc || 'Sem descrição disponível.';
  } catch {
    document.getElementById('modal-desc').textContent = 'Sem descrição disponível.';
  }
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Event listeners
document.getElementById('close-btn').onclick = closeModal;
document.getElementById('modal-overlay').onclick = e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
};
document.getElementById('prev-btn').onclick = () => openModal(currentIndex - 1);
document.getElementById('next-btn').onclick = () => openModal(currentIndex + 1);

document.addEventListener('keydown', e => {
  if (!document.getElementById('modal-overlay').classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft' && currentIndex > 0) openModal(currentIndex - 1);
  if (e.key === 'ArrowRight' && currentIndex < allPokemon.length - 1) openModal(currentIndex + 1);
});

document.getElementById('search').addEventListener('input', () => renderGrid(allPokemon));
document.getElementById('type-filter').addEventListener('change', () => renderGrid(allPokemon));

document.querySelectorAll('.region-tab').forEach(tab => {
  tab.onclick = () => {
    if (tab.classList.contains('disabled')) return;
  };
});

loadKanto();
