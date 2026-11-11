// ========================================================
// ATHARVA WEBSOFT - STOCK & HARDWARE INVENTORY MODULE
// ========================================================

// 1. Stock Inward (Purchase Entry)
async function handleStockIn() {
  const name = document.getElementById('stockInName').value.trim();
  const cat = document.getElementById('stockInCat').value;
  const qty = parseInt(document.getElementById('stockInQty').value);
  const cost = parseFloat(document.getElementById('stockInCost').value) || 0;

  if (!name || isNaN(qty) || qty <= 0) {
    showToast('Enter valid Hardware model name & inward quantity', 'alert');
    return;
  }

  const ex = appState.inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (ex) {
    ex.stock += qty;
    if (cost > 0) ex.price = cost;
    showToast(`Added +${qty} to existing stock: ${ex.name}`, 'success');
  } else {
    const newItem = {
      id: 'itm-' + (appState.inventory.length + 1),
      name,
      cat,
      stock: qty,
      minStock: 3,
      price: cost > 0 ? cost : 1500
    };
    appState.inventory.push(newItem);
    showToast(`New item inwarded: ${name}`, 'success');
  }

  document.getElementById('stockInName').value = '';
  populateItemSelect();
  saveState();

  // Push to Google Sheet
  await postToGoogleSheet({
    action: 'stockIn',
    name,
    cat,
    qty,
    price: cost > 0 ? cost : 1500
  });
}

// 2. Render Live Inventory Table
function renderStock() {
  const q = (document.getElementById('stockSearchInput')?.value || '').toLowerCase().trim();
  let list = appState.inventory;
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;

  if (q) {
    list = list.filter(i => i.name.toLowerCase().includes(q) || i.cat.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No matching hardware inventory found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-2.5 px-3">
        <span class="font-semibold text-white">${item.name}</span>
      </td>
      <td class="py-2.5 px-3 text-cyan-400">${item.cat}</td>
      <td class="py-2.5 px-3 text-center">
        <span class="font-mono font-bold text-sm ${item.stock <= item.minStock ? 'text-rose-400' : 'text-emerald-400'}">
          ${item.stock} Units
        </span>
      </td>
      <td class="py-2.5 px-3 text-white font-bold">₹${item.price.toLocaleString('en-IN')}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${item.stock <= item.minStock ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}">
          ${item.stock <= item.minStock ? 'Low Stock' : 'In Stock'}
        </span>
      </td>
    </tr>
  `).join('');
}