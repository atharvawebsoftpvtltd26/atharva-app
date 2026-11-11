// ========================================================
// ATHARVA WEBSOFT - CONTACTS & EXCEL BULK IMPORT MODULE
// ========================================================

// 1. Manually Add Single Customer
function handleManualContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('cntName').value.trim();
  const phone = document.getElementById('cntPhone').value.trim();
  const route = document.getElementById('cntRoute').value.trim();
  const address = document.getElementById('cntAddress').value.trim();
  const category = document.getElementById('cntCategory').value;

  if (!name || !phone) {
    showToast('Name and Phone are mandatory!', 'alert');
    return;
  }

  const newContact = { name, phone, route: route || 'Main Market', address, category };
  appState.contacts.unshift(newContact);
  e.target.reset();
  saveState();
  showToast(`Contact saved: ${name}`, 'success');

  // Push to Google Sheet
  postToGoogleSheet({
    action: 'saveContact',
    contact: newContact
  });
}

// 2. Bulk Import from Excel (.xlsx, .xls, .csv)
function handleExcelUpload() {
  const fileInput = document.getElementById('excelFileInput');
  if (!fileInput.files.length) {
    showToast('Please choose an Excel or CSV file first', 'alert');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      let importedCount = 0;
      rows.forEach(r => {
        const name = r.Name || r.Customer || r.CustomerName || r.Firm || r['Party Name'];
        const phone = r.Phone || r.Mobile || r.Contact || r['Mobile No'];
        const route = r.City || r.Route || r.Area || r.Sector || 'Main Market';
        const address = r.Address || r.Landmark || '';
        const category = r.Category || 'Retail Client';

        if (name && phone) {
          appState.contacts.push({
            name: String(name).trim(),
            phone: String(phone).replace(/[^0-9]/g, ''),
            route: String(route).trim(),
            address: String(address).trim(),
            category: String(category).trim()
          });
          importedCount++;
        }
      });

      saveState();
      fileInput.value = '';
      playBeepSound('success');
      showToast(`Imported ${importedCount} contacts from Excel!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error parsing Excel file. Check format.', 'alert');
    }
  };

  reader.readAsArrayBuffer(file);
}

// 3. Aggregate all contacts (Manual contacts + Billed Customers + Ticket callers)
function getAggregatedContacts() {
  const map = {};

  // Contacts entered manually or imported
  appState.contacts.forEach(c => {
    if (!map[c.phone]) {
      map[c.phone] = { name: c.name, phone: c.phone, route: c.route, category: c.category || 'Directory', invoices: 0, totalBusiness: 0 };
    }
  });

  // Contacts created via Billing
  appState.invoices.forEach(inv => {
    if (!map[inv.phone]) {
      map[inv.phone] = { name: inv.custName, phone: inv.phone, route: inv.route, category: 'Billed Client', invoices: 0, totalBusiness: 0 };
    }
    map[inv.phone].invoices += 1;
    map[inv.phone].totalBusiness += inv.total;
  });

  // Contacts from Service Tickets
  appState.tickets.forEach(tick => {
    if (!map[tick.phone]) {
      map[tick.phone] = { name: tick.custName, phone: tick.phone, route: tick.route, category: 'Service Ticket', invoices: 0, totalBusiness: 0 };
    }
  });

  return Object.values(map);
}

// 4. Multi-parameter search filter
function filterContactsDirectory() {
  const q = (document.getElementById('contactSearchQuery')?.value || '').toLowerCase().trim();
  let contacts = getAggregatedContacts();

  if (q) {
    contacts = contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.route.toLowerCase().includes(q)
    );
  }

  renderContacts(contacts);
}

// 5. Render Contacts Table
function renderContacts(contactsList = null) {
  const contacts = contactsList || getAggregatedContacts();
  const tbody = document.getElementById('contactsTableBody');
  const countBadge = document.getElementById('contactsTotalCount');

  if (countBadge) countBadge.innerText = contacts.length;
  if (!tbody) return;

  if (contacts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No client records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-2.5 px-3 font-semibold text-white">${c.name}</td>
      <td class="py-2.5 px-3 text-cyan-400">${c.route}</td>
      <td class="py-2.5 px-3 text-slate-300 font-mono">${c.phone}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-semibold">${c.category}</span>
      </td>
      <td class="py-2.5 px-3 text-center space-x-1">
        <a href="https://api.whatsapp.com/send?phone=91${c.phone}&text=Hello%20${encodeURIComponent(c.name)},%20Greetings%20from%20ATHARVA%20WEBSOFT." target="_blank" class="px-2 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] inline-flex items-center space-x-1">
          <i class="fa-brands fa-whatsapp"></i>
          <span>Chat</span>
        </a>
        <a href="tel:${c.phone}" class="px-2 py-1 bg-slate-800 text-cyan-400 rounded-lg text-[10px] inline-flex items-center space-x-1">
          <i class="fa-solid fa-phone"></i>
        </a>
      </td>
    </tr>
  `).join('');
}