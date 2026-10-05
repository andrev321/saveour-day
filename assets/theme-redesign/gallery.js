const picked = {};
try { Object.assign(picked, JSON.parse(localStorage.getItem('saveour-redesign-picks-v1') || '{}')); } catch {}
const labels = Object.fromEntries([...document.querySelectorAll('[data-pick]')].map(button => [button.dataset.pick, button.closest('.proposal').querySelector('h3').textContent]));
function renderSelection() {
  document.querySelectorAll('[data-pick]').forEach(button => {
    const id = button.dataset.pick;
    const active = picked[id.split('-')[0]] === id;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Wybrano ✓ — kliknij, aby cofnąć' : 'Wybierz ten kierunek';
  });
  const values = Object.values(picked).filter(id => labels[id]);
  const area = document.getElementById('selection-list');
  area.replaceChildren();
  if (!values.length) area.textContent = 'Nie wybrano jeszcze propozycji.';
  for (const id of values) {
    const span = document.createElement('span');
    span.className = 'selection-item';
    span.textContent = `${id} — ${labels[id]}`;
    area.append(span);
  }
  try { localStorage.setItem('saveour-redesign-picks-v1', JSON.stringify(picked)); } catch {}
}
document.querySelectorAll('[data-pick]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.pick;
  const family = id.split('-')[0];
  if (picked[family] === id) delete picked[family]; else picked[family] = id;
  renderSelection();
}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  const mobile = button.dataset.view === 'mobile';
  document.body.classList.toggle('mobile-mode', mobile);
  document.querySelectorAll('.desktop-image').forEach(img => img.hidden = mobile);
  document.querySelectorAll('.mobile-image').forEach(img => img.hidden = !mobile);
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
document.getElementById('copy-selection').addEventListener('click', async () => {
  const text = Object.values(picked).filter(id => labels[id]).map(id => `${id} — ${labels[id]}`).join('\n');
  const status = document.getElementById('copy-status');
  if (!text) { status.textContent = 'Najpierw wybierz przynajmniej jedną propozycję.'; return; }
  try { await navigator.clipboard.writeText(`Wybrane kierunki redesignu:\n${text}`); status.textContent = 'Skopiowano — możesz wkleić listę do rozmowy.'; }
  catch { status.textContent = 'Przeglądarka nie udostępnia schowka. Zaznacz i skopiuj listę powyżej.'; }
});
renderSelection();
