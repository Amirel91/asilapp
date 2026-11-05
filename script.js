/* Mini-app Note — pattern di riferimento per le applicazioni Shenron:
   stato unico in localStorage, render() che ridisegna dallo stato,
   azioni piccole con validazione. Nessun backend: i dati restano nel browser. */
const STORE_KEY = 'app-note-v1';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && Array.isArray(d.notes)) return d;
  } catch (e) { /* dato corrotto: si riparte puliti */ }
  return { version: 1, notes: [] };
}
function save(state) { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = load();

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  document.getElementById('noteList').innerHTML = state.notes.map(n =>
    '<li class="note' + (n.done ? ' done' : '') + '" data-id="' + n.id + '">' +
      '<input type="checkbox" class="note-check" aria-label="Segna completata"' + (n.done ? ' checked' : '') + '>' +
      '<span class="note-text">' + esc(n.text) + '</span>' +
      '<span class="note-date">' + esc(n.date) + '</span>' +
      '<button type="button" class="note-del" aria-label="Elimina">✕</button>' +
    '</li>'
  ).join('');
  document.getElementById('noteCount').textContent = state.notes.length;
  document.getElementById('emptyMsg').hidden = state.notes.length > 0;
}

document.getElementById('noteForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('noteText');
  const text = input.value.trim();
  const err = document.getElementById('formError');
  if (!text) { err.hidden = false; input.focus(); return; }
  err.hidden = true;
  state.notes.unshift({ id: Date.now(), text, date: new Date().toLocaleDateString('it-IT'), done: false });
  save(state);
  input.value = '';
  render();
});

document.getElementById('noteList').addEventListener('click', e => {
  const li = e.target.closest('.note');
  if (!li) return;
  const id = Number(li.dataset.id);
  if (e.target.classList.contains('note-del')) {
    const note = state.notes.find(n => n.id === id);
    if (note && confirm('Eliminare la nota «' + note.text + '»?')) {
      state.notes = state.notes.filter(n => n.id !== id);
      save(state); render();
    }
    return;
  }
  if (e.target.classList.contains('note-check')) {
    const note = state.notes.find(n => n.id === id);
    if (note) { note.done = !note.done; save(state); render(); }
  }
});

render();
