// Anteckningar – sparas medan du skriver.
(function () {
  const area = document.getElementById('notes');
  const status = document.getElementById('notes-status');
  let timer = null;

  area.value = Store.get('notes');

  area.addEventListener('input', () => {
    status.textContent = 'Sparar…';
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = Store.set('notes', area.value) ? 'Sparat' : 'Kunde inte spara';
    }, 400);
  });

  // Save straight away if the page is closed mid-typing.
  window.addEventListener('beforeunload', () => {
    if (timer) Store.set('notes', area.value);
  });
})();
