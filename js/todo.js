// Att göra
(function () {
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const list = document.getElementById('todo-list');
  const empty = document.getElementById('todo-empty');
  const clearBtn = document.getElementById('todo-clear');

  let todos = Store.get('todos');

  function save() { Store.set('todos', todos); render(); }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= todos.length) return;
    [todos[i], todos[j]] = [todos[j], todos[i]];
    save();
  }

  function render() {
    list.replaceChildren(...todos.map((t, i) => {
      const cb = Util.el('input', { type: 'checkbox', 'aria-label': 'Klar: ' + t.text });
      cb.checked = t.done;
      cb.addEventListener('change', () => { t.done = cb.checked; save(); });
      const up = Util.el('button', { type: 'button', class: 't-btn', title: 'Flytta upp', 'aria-label': 'Flytta upp', text: '↑', onclick: () => move(i, -1) });
      const down = Util.el('button', { type: 'button', class: 't-btn', title: 'Flytta ner', 'aria-label': 'Flytta ner', text: '↓', onclick: () => move(i, 1) });
      up.disabled = i === 0;
      down.disabled = i === todos.length - 1;
      return Util.el('li', { class: t.done ? 'done' : '' },
        cb,
        Util.el('span', { class: 't-text', text: t.text }),
        up, down,
        Util.el('button', {
          type: 'button', class: 't-btn', title: 'Ta bort', 'aria-label': 'Ta bort ' + t.text, text: '✕',
          onclick: () => { todos.splice(i, 1); save(); }
        })
      );
    }));
    empty.hidden = todos.length > 0;
    clearBtn.hidden = !todos.some(t => t.done);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ text, done: false });
    input.value = '';
    save();
  });

  clearBtn.addEventListener('click', () => { todos = todos.filter(t => !t.done); save(); });

  render();
})();
