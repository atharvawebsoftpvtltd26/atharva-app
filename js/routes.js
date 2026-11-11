// ========================================================
// ATHARVA WEBSOFT - ROUTE DISPATCH, TICKETS & FIELD MOBILE
// ========================================================

let selectedTicketIds = new Set();

// 1. Render Route Tickets Table
function renderRoutes() {
  const filter = document.getElementById('routeFilterSelect')?.value || 'ALL';
  const searchQ = (document.getElementById('ticketSearchInput')?.value || '').toLowerCase().trim();
  const tbody = document.getElementById('routeTicketsTableBody');
  if (!tbody) return;

  let filtered = appState.tickets;
  if (filter !== 'ALL') filtered = filtered.filter(t => t.route === filter);
  if (searchQ) {
    filtered = filtered.filter(t => 
      t.custName.toLowerCase().includes(searchQ) || 
      t.desc.toLowerCase().includes(searchQ) ||
      t.phone.includes(searchQ)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-4 text-center text-slate-500">No tickets found for this sector.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-3 px-3">
        <input type="checkbox" value="${t.id}" onchange="toggleSelectTicket('${t.id}', this)" ${selectedTicketIds.has(t.id) ? 'checked' : ''}>
      </td>
      <td class="py-3 px-3 font-mono font-bold text-white">${t.id}</td>
      <td class="py-3 px-3">
        <div class="font-semibold text-white">${t.custName}</div>
        <div class="text-[10px] text-slate-400">${t.phone}</div>
      </td>
      <td class="py-3 px-3 text-cyan-400 font-medium">${t.route}</td>
      <td class="py-3 px-3 text-slate-300">
        <div class="font-medium text-white">${t.type}</div>
        <div class="text-[10px] text-slate-400">${t.desc}</div>
      </td>
      <td class="py-3 px-3">
        ${t.assignedTo ? `<span class="text-slate-200 font-medium">${t.assignedTo}</span>` : `<span class="text-amber-400 italic">Unassigned</span>`}
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
          t.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
          t.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'
        }">${t.status}</span>
      </td>
      <td class="py-3 px-3 text-center">
        ${t.status !== 'Completed' ? `
          <button onclick="quickCloseModal('${t.id}')" class="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-[10px] font-medium transition">
            Mark Done
          </button>
        ` : `<span class="text-slate-500 text-[10px]"><i class="fa-solid fa-check"></i> Closed</span>`}
      </td>
    </tr>
  `).join('');
}

function filterRouteTable() {
  renderRoutes();
}

function toggleSelectTicket(id, cb) {
  if (cb.checked) selectedTicketIds.add(id);
  else selectedTicketIds.delete(id);
}

function toggleSelectAllTickets(mcb) {
  document.querySelectorAll('#routeTicketsTableBody input[type="checkbox"]').forEach(cb => {
    cb.checked = mcb.checked;
    if (mcb.checked) selectedTicketIds.add(cb.value);
    else selectedTicketIds.delete(cb.value);
  });
}

// 2. Batch Dispatch Tickets to Technician
async function batchAssignRouteTickets() {
  if (selectedTicketIds.size === 0) {
    playBeepSound('alert');
    showToast('चेकबॉक्स से पहले टिकट चुनें', 'alert');
    return;
  }
  const techSelect = document.getElementById('routeTechSelect');
  const techName = techSelect ? techSelect.value : '';

  if (!techName) {
    playBeepSound('alert');
    showToast('कृपया टेक्नीशियन का चयन करें', 'alert');
    return;
  }

  const arr = Array.from(selectedTicketIds);

  appState.tickets.forEach(t => {
    if (selectedTicketIds.has(t.id)) {
      t.assignedTo = techName;
      t.status = 'In Progress';
    }
  });

  playBeepSound('success');
  showToast(`${arr.length} कॉल्स ${techName} को असाइन हुईं! Google Sheet में सिंक हो रहा है...`, 'success');
  selectedTicketIds.clear();
  saveState();

  await postToGoogleSheet({ action: 'batchAssign', ticketIds: arr, techName });
}

// 3. New Ticket Creation (Modal)
function openNewCallModal() {
  document.getElementById('newCallModal')?.classList.remove('hidden');
}

function closeNewCallModal() {
  document.getElementById('newCallModal')?.classList.add('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

async function saveNewCallTicket() {
  const custName = document.getElementById('modalCustName').value.trim();
  const phone = document.getElementById('modalCustPhone').value.trim();
  const route = document.getElementById('modalCustRoute').value;
  const type = document.getElementById('modalCallType').value;
  const desc = document.getElementById('modalCallDesc').value.trim();
  const assignedTech = document.getElementById('modalDirectTech').value;

  if (!custName || !phone) {
    playBeepSound('alert');
    showToast('Customer Name and Phone are mandatory', 'alert');
    return;
  }

  const newId = 'TICK-' + Math.floor(1000 + Math.random() * 9000);
  const nowStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const payload = {
    action: 'saveTicket',
    id: newId,
    date: nowStr,
    custName, phone, route, type,
    desc: desc || 'Service Request',
    assignedTo: assignedTech || "",
    status: assignedTech ? 'Assigned' : 'Unassigned'
  };

  appState.tickets.unshift({
    id: newId, custName, phone, route, type, desc,
    assignedTo: assignedTech,
    status: assignedTech ? 'Assigned' : 'Unassigned',
    createdAt: nowStr,
    completedAt: null,
    remarks: ''
  });

  closeNewCallModal();
  saveState();
  playBeepSound('success');
  showToast(`Ticket ${newId} logged!`, 'success');

  await postToGoogleSheet(payload);
}

// 4. Render Call Center Log
function renderCalls() {
  const tbody = document.getElementById('callLogTableBody');
  if (!tbody) return;

  tbody.innerHTML = appState.tickets.map(t => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400">${t.type}</span>
      </td>
      <td class="py-3 px-3">
        <div class="font-bold text-white">${t.custName}</div>
        <div class="text-[10px] text-slate-400">${t.phone} • ${t.route}</div>
      </td>
      <td class="py-3 px-3 text-slate-300">${t.desc}</td>
      <td class="py-3 px-3 text-slate-400 font-mono text-[11px]">${t.createdAt || t.date || ''}</td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${t.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
          ${t.status}
        </span>
      </td>
      <td class="py-3 px-3 text-center">
        <button onclick="changeTab('routes')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px]">
          View Route
        </button>
      </td>
    </tr>
  `).join('');
}

// 5. Field Technician Mobile Simulator & Job Closure
function renderTechnicianView() {
  const activeTech = appState.currentUser ? appState.currentUser.name : 'Ramesh Kumar';
  const nameEl = document.getElementById('mobileTechName');
  if (nameEl) nameEl.innerText = activeTech;

  const myJobs = appState.tickets.filter(t => t.assignedTo === activeTech || (appState.currentUser && appState.currentUser.role === 'admin'));
  const myAssignedEl = document.getElementById('mobileAssignedCount');
  const myDoneEl = document.getElementById('mobileCompletedCount');

  if (myAssignedEl) myAssignedEl.innerText = `${myJobs.length} Calls`;
  if (myDoneEl) myDoneEl.innerText = `${myJobs.filter(j => j.status === 'Completed').length} Done`;

  const listContainer = document.getElementById('techMobileJobsList');
  if (!listContainer) return;

  if (myJobs.length === 0) {
    listContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl">No calls assigned to your route today.</div>`;
    return;
  }

  listContainer.innerHTML = myJobs.map(job => `
    <div class="bg-slate-950 p-3.5 rounded-2xl border ${job.status === 'Completed' ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-slate-800'} space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${job.id} • ${job.route}</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${job.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}">
          ${job.status}
        </span>
      </div>

      <div>
        <h4 class="text-xs font-bold text-white">${job.custName}</h4>
        <p class="text-[11px] text-slate-400">${job.desc}</p>
      </div>

      <div class="flex justify-between items-center pt-1 border-t border-slate-900 text-xs">
        <a href="tel:${job.phone}" class="px-2.5 py-1 bg-slate-800 text-cyan-400 rounded-lg text-[11px] font-semibold flex items-center space-x-1">
          <i class="fa-solid fa-phone"></i>
          <span>Call: ${job.phone}</span>
        </a>

        ${job.status !== 'Completed' ? `
          <button onclick="openCloseModal('${job.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1">
            <i class="fa-solid fa-check"></i>
            <span>Complete Job</span>
          </button>
        ` : `
          <span class="text-emerald-400 text-[11px] font-semibold flex items-center">
            <i class="fa-solid fa-circle-check mr-1"></i> Closed: ${job.remarks || 'Done'}
          </span>
        `}
      </div>
    </div>
  `).join('');
}

function openCloseModal(ticketId) {
  const ticket = appState.tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  document.getElementById('closingTicketId').value = ticket.id;
  document.getElementById('closingCustName').innerText = `${ticket.custName} (${ticket.route})`;
  document.getElementById('closingRemarks').value = '';
  document.getElementById('closingPartsUsed').value = '';
  document.getElementById('closeJobModal')?.classList.remove('hidden');
}

function quickCloseModal(id) {
  openCloseModal(id);
}

async function submitJobClosure() {
  const ticketId = document.getElementById('closingTicketId').value;
  const remarks = document.getElementById('closingRemarks').value.trim();
  const parts = document.getElementById('closingPartsUsed').value.trim();

  if (!remarks) {
    playBeepSound('alert');
    showToast('Please enter action remarks', 'alert');
    return;
  }

  const ticket = appState.tickets.find(t => t.id === ticketId);
  if (ticket) {
    ticket.status = 'Completed';
    ticket.remarks = remarks + (parts ? ` | Parts: ${parts}` : '');
    ticket.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    triggerNotificationAlert(`CLOSED: ${ticket.assignedTo} completed "${ticket.custName}". Action: ${remarks}`);
    saveState();
    closeModal('closeJobModal');
    showToast('Job marked Completed & Synced!', 'success');

    await postToGoogleSheet({
      action: 'closeJob',
      ticketId,
      remarks: ticket.remarks,
      completedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
  }
}