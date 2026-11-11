// ========================================================
// ATHARVA WEBSOFT - TOUR EXPENSE & VEHICLE MAINTENANCE
// ========================================================

// 1. Submit New Tour / Fuel Expense
async function logNewExpense() {
  const tech = document.getElementById('expTechName').value;
  const type = document.getElementById('expType').value;
  const amount = parseFloat(document.getElementById('expAmount').value);
  const odo = parseInt(document.getElementById('expOdo').value) || 0;
  const note = document.getElementById('expNote').value.trim();

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid expense amount', 'alert');
    return;
  }

  const expId = 'EXP-' + Math.floor(100 + Math.random() * 900);
  const dateStr = new Date().toLocaleDateString('en-GB');

  const newExp = {
    id: expId,
    tech,
    type,
    amount,
    odometer: odo,
    notes: note || 'Field travel logged',
    status: 'Approved',
    date: dateStr
  };

  appState.expenses.unshift(newExp);
  document.getElementById('expAmount').value = '';
  document.getElementById('expOdo').value = '';
  document.getElementById('expNote').value = '';

  saveState();
  showToast(`Expense of ₹${amount} logged for ${tech}`, 'success');

  // Push to Google Sheet
  await postToGoogleSheet({
    action: 'saveExpense',
    id: expId,
    date: dateStr,
    tech,
    type,
    amount,
    odometer: odo,
    notes: newExp.notes,
    status: 'Approved'
  });
}

// 2. Render Expense Log Table
function renderExpenses() {
  const tbody = document.getElementById('expenseTableBody');
  const totalExp = appState.expenses.reduce((sum, e) => sum + e.amount, 0);
  const sumEl = document.getElementById('expTotalSum');

  if (sumEl) sumEl.innerText = '₹' + totalExp.toLocaleString('en-IN');
  if (!tbody) return;

  if (appState.expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-500">No field expenses recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = appState.expenses.map(e => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${e.date}</td>
      <td class="py-2.5 px-3 font-semibold text-white">${e.tech}</td>
      <td class="py-2.5 px-3 text-cyan-400">${e.type}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300">${e.odometer ? e.odometer + ' KM' : '-'}</td>
      <td class="py-2.5 px-3 font-bold text-white">₹${e.amount.toLocaleString('en-IN')}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${e.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
          ${e.status}
        </span>
      </td>
      <td class="py-2.5 px-3 text-slate-400 text-[11px]">
        ${e.notes}
      </td>
    </tr>
  `).join('');
}