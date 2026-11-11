// ==========================================
// ATHARVA WEBSOFT - CORE APPLICATION ENGINE
// ==========================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRJSTDoweZxgjpl5zUOfMPamuhokg7YDCb_D8O-GRvGrtPllG6gcG3yn4C99l395wb9w/exec";
const STORAGE_KEY = 'ATHARVA_WEBSOFT_STATE_V4';

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  currentUser: null,
  currentTab: 'dashboard',
  users: [
    { id: 'usr-1', username: 'admin', pass: 'admin123', name: 'Managing Director (MD)', role: 'admin', phone: '9425200001', route: 'All Routes', baseSalary: 35000 },
    { id: 'usr-2', username: 'operator', pass: 'desk123', name: 'Counter Desk Manager', role: 'operator', phone: '9425200002', route: 'Main Market', baseSalary: 18000 },
    { id: 'usr-3', username: 'ramesh', pass: 'tech123', name: 'Ramesh Kumar', role: 'technician', phone: '9826100003', route: 'Main Market', baseSalary: 15000 }
  ],
  inventory: [
    { id: 'itm-1', name: 'CP PLUS 2.4MP Astra Dome CCTV Camera', cat: 'CCTV Dome', stock: 12, minStock: 3, price: 1450 },
    { id: 'itm-2', name: 'Hikvision 2MP Turbo HD Bullet Camera', cat: 'CCTV Bullet', stock: 5, minStock: 3, price: 1650 },
    { id: 'itm-3', name: 'CP PLUS 4 Channel HD DVR (H.265+)', cat: 'DVR / NVR', stock: 6, minStock: 2, price: 2900 },
    { id: 'itm-4', name: 'WD Purple 1TB Surveillance HDD', cat: 'Storage', stock: 2, minStock: 3, price: 3800 }
  ],
  contacts: [],
  tickets: [],
  invoices: [],
  expenses: [],
  attendanceLogs: [],
  notifications: []
};

let prevCompletedCount = 0;

// Save state to localStorage and refresh active UI
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  renderAll();
}

// Global Cloud POST Helper
async function postToGoogleSheet(payload) {
  const syncInd = document.getElementById('syncIndicator');
  if (syncInd) syncInd.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber-400 mr-1"></i> Saving to Sheet...`;

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (syncInd) syncInd.innerHTML = `<i class="fa-solid fa-check text-emerald-400 mr-1"></i> Cloud Saved`;
    setTimeout(() => {
      if (syncInd) syncInd.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-cyan-400 mr-1"></i> Cloud Synced`;
    }, 3000);
    setTimeout(fetchFromGoogleSheet, 3500);
    return true;
  } catch (err) {
    console.error("Cloud post error:", err);
    if (syncInd) syncInd.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-400 mr-1"></i> Local Saved`;
    return false;
  }
}

// Global Cloud GET Helper (Sheet to App)
async function fetchFromGoogleSheet() {
  const spinner = document.getElementById('syncSpinner');
  if (spinner) spinner.classList.add('fa-spin');

  try {
    const res = await fetch(`${SCRIPT_URL}?action=getAllData`);
    const json = await res.json();

    if (json.status === "success") {
      if (json.users && json.users.length > 0) {
        appState.users = json.users.map(u => ({
          id: 'usr-' + u.Username,
          username: String(u.Username),
          pass: String(u.Password),
          name: u.FullName,
          role: u.Role,
          phone: u.Phone,
          route: u.Route,
          baseSalary: u.Role === 'admin' ? 35000 : u.Role === 'operator' ? 18000 : 15000
        }));
      }

      if (json.tickets) {
        appState.tickets = json.tickets.map(t => ({
          id: t.TicketID,
          date: t.Date,
          custName: t.CustomerName,
          phone: t.Phone,
          route: t.Route,
          type: t.Type,
          desc: t.Desc,
          assignedTo: t.AssignedTo,
          status: t.Status,
          remarks: t.TechRemarks,
          completedAt: t.CompletedAt
        }));
      }

      if (json.inventory) {
        appState.inventory = json.inventory.map(i => ({
          id: i.ItemID,
          name: i.ItemName,
          cat: i.Category,
          stock: Number(i.Stock),
          minStock: Number(i.MinStock),
          price: Number(i.Price)
        }));
      }

      if (json.expenses) {
        appState.expenses = json.expenses.map(e => ({
          id: e.ExpenseID,
          date: e.Date,
          tech: e.Technician,
          type: e.Type,
          amount: Number(e.Amount),
          odometer: Number(e.Odometer),
          notes: e.Notes,
          status: e.Status
        }));
      }

      if (json.invoices) {
        const invMap = {};
        json.invoices.forEach(inv => {
          if (!invMap[inv.InvoiceNo]) {
            invMap[inv.InvoiceNo] = {
              invNo: inv.InvoiceNo,
              date: inv.Date,
              custName: inv.CustomerName,
              phone: inv.Phone,
              route: inv.Route,
              items: [],
              total: Number(inv.GrandTotal)
            };
          }
          invMap[inv.InvoiceNo].items.push({
            name: inv.ItemName,
            sn: inv.SerialNo,
            warrantyYears: Number(inv.WarrantyYears),
            expiry: inv.ExpiryDate,
            price: Number(inv.Price)
          });
        });
        appState.invoices = Object.values(invMap);
      }

      const curDone = appState.tickets.filter(t => t.status === 'Completed').length;
      if (prevCompletedCount > 0 && curDone > prevCompletedCount) {
        triggerNotificationAlert("Field ticket closed & updated!");
      }
      prevCompletedCount = curDone;

      saveState();
    }
  } catch (e) {
    console.warn("Sheet fetch skipped or offline:", e);
  } finally {
    if (spinner) spinner.classList.remove('fa-spin');
  }
}

// Navigation Tab Switcher
function changeTab(tabId) {
  appState.currentTab = tabId;
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-slate-900', 'text-slate-300');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');

  const activeTabBtn = document.getElementById(`tab-${tabId}`);
  if (activeTabBtn) {
    activeTabBtn.classList.remove('bg-slate-900', 'text-slate-300');
    activeTabBtn.classList.add('bg-blue-600', 'text-white');
  }
}

// Dashboard Metrics
function renderDashboard() {
  const totalSales = appState.invoices.reduce((sum, inv) => sum + inv.total, 0);
  const salesEl = document.getElementById('dashTotalSales');
  if (salesEl) salesEl.innerText = '₹' + totalSales.toLocaleString('en-IN');

  const pendingEl = document.getElementById('dashPendingCalls');
  if (pendingEl) pendingEl.innerText = appState.tickets.filter(t => t.status !== 'Completed').length;

  const staffEl = document.getElementById('dashStaffCount');
  if (staffEl) staffEl.innerText = `${appState.users.length} Active`;

  const stockEl = document.getElementById('dashLowStock');
  if (stockEl) stockEl.innerText = appState.inventory.filter(i => i.stock <= i.minStock).length + ' Items';

  const routeCounts = {};
  appState.tickets.forEach(t => {
    const route = t.route || 'General';
    if (!routeCounts[route]) routeCounts[route] = { total: 0, done: 0, tech: t.assignedTo || 'Unassigned' };
    routeCounts[route].total++;
    if (t.status === 'Completed') routeCounts[route].done++;
  });

  const dashRouteTbody = document.getElementById('dashRouteTableBody');
  if (dashRouteTbody) {
    const routeKeys = Object.keys(routeCounts);
    if (routeKeys.length === 0) {
      dashRouteTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No active routes today</td></tr>`;
    } else {
      dashRouteTbody.innerHTML = routeKeys.map(r => {
        const item = routeCounts[r];
        const pct = Math.round((item.done / item.total) * 100);
        return `
          <tr>
            <td class="py-3 px-3 font-semibold text-white">${item.tech}</td>
            <td class="py-3 px-3 text-cyan-400">${r}</td>
            <td class="py-3 px-3 text-slate-300">${item.done} / ${item.total} calls closed</td>
            <td class="py-3 px-3">
              <div class="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${pct}%"></div>
              </div>
            </td>
            <td class="py-3 px-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${pct === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                ${pct === 100 ? 'Completed' : 'In Progress'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  const lowItems = appState.inventory.filter(i => i.stock <= i.minStock);
  const lowListEl = document.getElementById('lowStockItemsList');
  if (lowListEl) {
    lowListEl.innerHTML = lowItems.length === 0 ? `<li class="text-slate-500">Stock sufficient.</li>` :
      lowItems.map(item => `<li class="flex justify-between p-2 rounded bg-slate-950 border border-slate-800"><span class="text-slate-300 truncate">${item.name}</span><span class="text-rose-400 font-bold">Only ${item.stock} left</span></li>`).join('');
  }
}

// ================= AUDIO & NOTIFICATIONS ENGINE =================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// User interaction listeners to unlock browser audio autoplay
window.addEventListener('click', () => { getAudioContext(); }, { once: true });
window.addEventListener('keydown', () => { getAudioContext(); }, { once: true });

function playBeepSound(type = 'success') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'alert') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.setValueAtTime(450, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("Audio play blocked or unavailable:", e);
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `p-3 rounded-xl shadow-lg border text-xs font-semibold text-white pointer-events-auto flex items-center space-x-2 transition transform duration-300 ${
    type === 'success' ? 'bg-emerald-800 border-emerald-500' :
    type === 'alert' ? 'bg-rose-800 border-rose-500' : 'bg-slate-800 border-slate-600'
  }`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check text-emerald-300' : type === 'alert' ? 'fa-bell text-rose-300' : 'fa-info-circle text-blue-300'}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function triggerNotificationAlert(text) {
  appState.notifications.unshift({ id: Date.now(), text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false });
  playBeepSound('alert');
  showToast(text, 'alert');
  saveState();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) {
    panel.classList.toggle('hidden');
    appState.notifications.forEach(n => n.read = true);
    updateNotifBadge();
  }
}

function updateNotifBadge() {
  const unread = appState.notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    if (unread > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  }

  const list = document.getElementById('notifList');
  if (list) {
    list.innerHTML = appState.notifications.length === 0 ? `<p class="text-slate-500 text-center py-4">No recent activity.</p>` :
      appState.notifications.map(n => `
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-2">
          <i class="fa-solid fa-bell text-cyan-400 mt-0.5"></i>
          <div class="flex-1"><p class="text-white">${n.text}</p><span class="text-[10px] text-slate-500">${n.time}</span></div>
        </div>
      `).join('');
  }
}

function clearNotifs() {
  appState.notifications = [];
  saveState();
}

// Master Render (Called whenever data changes)
function renderAll() {
  renderDashboard();
  if (typeof renderRecentInvoices === 'function') renderRecentInvoices();
  if (typeof populateItemSelect === 'function') populateItemSelect();
  if (typeof renderRoutes === 'function') renderRoutes();
  if (typeof renderStock === 'function') renderStock();
  if (typeof renderCalls === 'function') renderCalls();
  if (typeof renderExpenses === 'function') renderExpenses();
  if (typeof renderContacts === 'function') renderContacts();
  if (typeof renderAttendanceRegister === 'function') renderAttendanceRegister();
  if (typeof renderTechnicianView === 'function') renderTechnicianView();
  if (typeof renderUsers === 'function') renderUsers();
  updateNotifBadge();
}

// Application Startup
window.onload = function() {
  renderAll();

  if (appState.currentUser) {
    document.getElementById('loginScreen')?.classList.add('hidden');
    if (typeof applyRolePermissions === 'function') applyRolePermissions(appState.currentUser);
  } else {
    document.getElementById('loginScreen')?.classList.remove('hidden');
  }

  fetchFromGoogleSheet();
  setInterval(fetchFromGoogleSheet, 15000);
};