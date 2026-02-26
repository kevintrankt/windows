/* ── Clock ───────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('clock').textContent = `${h}:${m}`;
}
updateClock();
setInterval(updateClock, 10000);

/* ── Start Menu ──────────────────────────────────────────── */
let startMenuOpen = false;

function toggleStartMenu() {
  startMenuOpen = !startMenuOpen;
  const menu = document.getElementById('start-menu');
  const btn  = document.getElementById('start-btn');
  if (startMenuOpen) {
    menu.classList.remove('hidden');
    btn.classList.add('active');
  } else {
    menu.classList.add('hidden');
    btn.classList.remove('active');
  }
}

function closeStartMenu() {
  startMenuOpen = false;
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-btn').classList.remove('active');
}

/* Close start menu when clicking elsewhere */
document.addEventListener('click', (e) => {
  const menu = document.getElementById('start-menu');
  const btn  = document.getElementById('start-btn');
  if (startMenuOpen && !menu.contains(e.target) && !btn.contains(e.target)) {
    closeStartMenu();
  }
});

/* ── Window Management ───────────────────────────────────── */
let zCounter = 100;
const minimizedWindows = {}; // id -> { label, icon }

function focusWindow(id) {
  document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
  const win = document.getElementById(id);
  if (win) {
    win.classList.add('focused');
    win.style.zIndex = ++zCounter;
  }
  // highlight matching taskbar button
  document.querySelectorAll('.taskbar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.winId === id);
  });
}

function openWindow(name) {
  closeStartMenu();
  const id = `win-${name}`;
  const win = document.getElementById(id);
  if (!win) return;

  if (minimizedWindows[id]) {
    restoreWindow(id);
    return;
  }

  win.style.display = 'flex';
  focusWindow(id);
  addTaskbarButton(id);
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (win) win.style.display = 'none';
  removeTaskbarButton(id);
  delete minimizedWindows[id];
}

function minimizeWindow(id, label, icon) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'none';
  minimizedWindows[id] = { label, icon };
  // Update taskbar button to look inactive
  const btn = document.querySelector(`.taskbar-btn[data-win-id="${id}"]`);
  if (btn) btn.classList.remove('active');
}

function restoreWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  win.style.display = 'flex';
  delete minimizedWindows[id];
  focusWindow(id);
}

let prevSize = {};
function maximizeWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  if (win.classList.contains('maximized')) {
    // Restore
    win.classList.remove('maximized');
    if (prevSize[id]) {
      win.style.left   = prevSize[id].left;
      win.style.top    = prevSize[id].top;
      win.style.width  = prevSize[id].width;
      win.style.height = prevSize[id].height;
    }
  } else {
    prevSize[id] = {
      left:   win.style.left,
      top:    win.style.top,
      width:  win.style.width,
      height: win.style.height,
    };
    win.classList.add('maximized');
  }
  focusWindow(id);
}

/* ── Taskbar Buttons ─────────────────────────────────────── */
function addTaskbarButton(id) {
  if (document.querySelector(`.taskbar-btn[data-win-id="${id}"]`)) {
    focusWindow(id);
    return;
  }
  const win   = document.getElementById(id);
  const title = win.querySelector('.title-bar-left span:last-child').textContent;
  const icon  = win.querySelector('.title-icon').textContent;

  const btn = document.createElement('button');
  btn.className = 'taskbar-btn';
  btn.dataset.winId = id;
  btn.innerHTML = `<span>${icon}</span><span style="overflow:hidden;text-overflow:ellipsis;">${title}</span>`;
  btn.onclick = () => {
    if (minimizedWindows[id]) {
      restoreWindow(id);
    } else if (win.style.display === 'none') {
      openWindow(id.replace('win-', ''));
    } else if (document.getElementById(id).classList.contains('focused')) {
      minimizeWindow(id, title, icon);
    } else {
      focusWindow(id);
    }
  };
  document.getElementById('open-windows').appendChild(btn);
  focusWindow(id);
}

function removeTaskbarButton(id) {
  const btn = document.querySelector(`.taskbar-btn[data-win-id="${id}"]`);
  if (btn) btn.remove();
}

/* Focus window when clicking on it */
document.addEventListener('mousedown', (e) => {
  const win = e.target.closest('.window');
  if (win) focusWindow(win.id);
});

/* ── Drag Windows ────────────────────────────────────────── */
let dragging = null;
let dragOffX = 0, dragOffY = 0;

function startDrag(e, id) {
  const win = document.getElementById(id);
  if (!win || win.classList.contains('maximized')) return;
  focusWindow(id);
  dragging = win;
  dragOffX = e.clientX - win.offsetLeft;
  dragOffY = e.clientY - win.offsetTop;
  e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  dragging.style.left = `${e.clientX - dragOffX}px`;
  dragging.style.top  = `${Math.max(0, e.clientY - dragOffY)}px`;
});

document.addEventListener('mouseup', () => { dragging = null; });

/* ── Dialogs ─────────────────────────────────────────────── */
function shutDown() {
  closeStartMenu();
  document.getElementById('shutdown-overlay').classList.remove('hidden');
}

function closeShutdown() {
  document.getElementById('shutdown-overlay').classList.add('hidden');
}

function confirmShutdown() {
  const val = document.querySelector('input[name="shutdown"]:checked').value;
  if (val === 'shutdown') {
    document.getElementById('shutdown-overlay').classList.add('hidden');
    showBSOD();
  } else if (val === 'restart') {
    document.getElementById('shutdown-overlay').classList.add('hidden');
    setTimeout(() => location.reload(), 500);
  } else {
    closeShutdown();
  }
}

function openRunDialog() {
  closeStartMenu();
  document.getElementById('run-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('run-input').focus(), 50);
}

function handleRun() {
  const val = document.getElementById('run-input').value.toLowerCase().trim();
  document.getElementById('run-overlay').classList.add('hidden');
  if (val === 'notepad' || val === 'notepad.exe') openWindow('notepad');
  else if (val === 'explorer' || val === 'explorer.exe') openWindow('explorer');
  else if (val === 'cmd' || val === 'command' || val === 'command.com') showBSOD();
  else openWindow('mycomputer');
}

/* ── BSOD ────────────────────────────────────────────────── */
function showBSOD() {
  document.getElementById('bsod').classList.remove('hidden');
}
document.getElementById('bsod').addEventListener('keydown', dismissBSOD);
document.getElementById('bsod').addEventListener('click', dismissBSOD);

function dismissBSOD() {
  document.getElementById('bsod').classList.add('hidden');
}

/* ── Find Dialog (stub) ──────────────────────────────────── */
function openFindDialog() {
  closeStartMenu();
  openWindow('notepad'); // reuse notepad as a placeholder
}

/* ── Keyboard shortcuts ──────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  // Ctrl+Alt+Del → BSOD Easter egg
  if (e.ctrlKey && e.altKey && e.key === 'Delete') {
    e.preventDefault();
    showBSOD();
  }
  // Escape closes start menu
  if (e.key === 'Escape') closeStartMenu();
});
