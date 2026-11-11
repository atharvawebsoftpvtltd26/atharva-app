// ==========================================
// ATHARVA WEBSOFT - BILLING, WARRANTY & PRINT
// ==========================================

let currentBillItems = [];

// Populate items dropdown in billing desk
function populateItemSelect() {
  const select = document.getElementById('billItemSelect');
  if (!select) return;
  select.innerHTML = `<option value="">-- Select Hardware Item --</option>` + 
    appState.inventory.map(item => `<option value="${item.id}">${item.name} (Stock: ${item.stock}) - ₹${item.price}</option>`).join('');
}

// Auto-fill price and generate clean serial number
function autoFillItemPrice() {
  const itemId = document.getElementById('billItemSelect').value;
  const item = appState.inventory.find(i => i.id === itemId);
  if (item) {
    document.getElementById('billItemPrice').value = item.price;
    if (!document.getElementById('billSerialNo').value) {
      const prefix = item.cat.includes('CCTV') ? 'CAM-' : item.cat.includes('DVR') ? 'DVR-' : 'SN-';
      document.getElementById('billSerialNo').value = prefix + Math.floor(100000 + Math.random() * 900000);
    }
  }
}

// Add row to current invoice draft
function addItemToCurrentBill() {
  const itemId = document.getElementById('billItemSelect').value;
  const serial = document.getElementById('billSerialNo').value.trim();
  const warrantyYears = parseInt(document.getElementById('billWarrantyPeriod').value);
  const price = parseFloat(document.getElementById('billItemPrice').value);

  if (!itemId || !serial || isNaN(price)) {
    showToast('Select item, Serial No. and valid price', 'alert');
    return;
  }
  const item = appState.inventory.find(i => i.id === itemId);
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + warrantyYears);

  currentBillItems.push({
    itemId: item.id,
    name: item.name,
    sn: serial,
    warrantyYears: warrantyYears,
    expiry: warrantyYears === 0 ? 'No Warranty' : expiryDate.toLocaleDateString('en-GB'),
    price: price
  });

  document.getElementById('billItemSelect').value = '';
  document.getElementById('billSerialNo').value = '';
  document.getElementById('billItemPrice').value = '';
  renderCurrentBillTable();
}

function removeBillItem(idx) {
  currentBillItems.splice(idx, 1);
  renderCurrentBillTable();
}

function renderCurrentBillTable() {
  const tbody = document.getElementById('billItemsTableBody');
  if (!tbody) return;

  tbody.innerHTML = currentBillItems.map((item, idx) => `
    <tr>
      <td class="py-2 text-white font-medium">${item.name}</td>
      <td class="py-2 text-cyan-400 font-mono">${item.sn}</td>
      <td class="py-2 text-emerald-400 font-semibold">${item.expiry}</td>
      <td class="py-2 text-right text-white font-bold">₹${item.price}</td>
      <td class="py-2 text-center">
        <button onclick="removeBillItem(${idx})" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  document.getElementById('billTotalItemsCount').innerText = currentBillItems.length;
  document.getElementById('billGrandTotal').innerText = '₹' + currentBillItems.reduce((s, i) => s + i.price, 0);
}

function resetBillForm() {
  currentBillItems = [];
  document.getElementById('billCustName').value = '';
  document.getElementById('billCustPhone').value = '';
  renderCurrentBillTable();
}

// Save to Sheet & trigger clean print
async function finalizeBillAndPrint() {
  const custName = document.getElementById('billCustName').value.trim();
  const phone = document.getElementById('billCustPhone').value.trim();
  const route = document.getElementById('billCustRoute').value;

  if (!custName || !phone || currentBillItems.length === 0) {
    showToast('Fill customer name, phone & add products', 'alert');
    return;
  }

  // Deduct local stock
  currentBillItems.forEach(bi => {
    const invItm = appState.inventory.find(i => i.id === bi.itemId);
    if (invItm && invItm.stock > 0) invItm.stock -= 1;
  });

  const nextInvNum = 'AW-' + (1042 + appState.invoices.length);
  const total = currentBillItems.reduce((sum, i) => sum + i.price, 0);

  const invoiceObj = {
    invNo: nextInvNum,
    date: new Date().toLocaleDateString('en-GB'),
    custName, phone, route,
    items: [...currentBillItems],
    total
  };

  appState.invoices.unshift(invoiceObj);
  saveState();
  resetBillForm();
  playBeepSound('success');
  showToast(`Invoice ${nextInvNum} generated!`, 'success');

  // Push to Google Sheet
  postToGoogleSheet({ action: 'saveInvoice', invoice: invoiceObj });

  // Immediate Clean Print Call
  setTimeout(() => { printCurrentInvoice(nextInvNum); }, 400);
}

// Render sales history with WhatsApp and Print Anytime buttons
function renderRecentInvoices() {
  const q = (document.getElementById('invoiceSearchInput')?.value || '').toLowerCase().trim();
  let list = appState.invoices;

  if (q) {
    list = list.filter(inv => 
      inv.invNo.toLowerCase().includes(q) || 
      inv.custName.toLowerCase().includes(q) || 
      inv.phone.includes(q)
    );
  }

  const container = document.getElementById('recentInvoicesList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p class="text-slate-500 py-4 text-center">No matching invoices.</p>`;
    return;
  }

  container.innerHTML = list.map(inv => `
    <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
      <div class="flex justify-between items-center">
        <div>
          <span class="font-bold text-white">${inv.custName}</span>
          <span class="text-[10px] text-cyan-400 font-mono ml-1">(${inv.invNo})</span>
        </div>
        <span class="text-xs font-bold text-emerald-400">₹${inv.total.toLocaleString('en-IN')}</span>
      </div>
      <div class="text-[10px] text-slate-400 flex justify-between">
        <span>${inv.phone} • ${inv.route}</span>
        <span>${inv.date}</span>
      </div>
      <div class="flex space-x-2 pt-1 border-t border-slate-900">
        <button onclick="printCurrentInvoice('${inv.invNo}')" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1">
          <i class="fa-solid fa-print"></i>
          <span>Print Anytime</span>
        </button>
        <button onclick="shareInvoiceOnWhatsApp('${inv.invNo}')" class="flex-1 py-1.5 bg-emerald-700/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[10px] font-semibold flex items-center justify-center space-x-1">
          <i class="fa-brands fa-whatsapp text-sm"></i>
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  `).join('');

  const nextInvEl = document.getElementById('invNextNumber');
  if (nextInvEl) nextInvEl.innerText = 1042 + appState.invoices.length;
}

// ================= CLEAN A4 PRINT (ZERO BLACK OVERLAY) =================
function printCurrentInvoice(invNo) {
  const inv = appState.invoices.find(i => i.invNo === invNo);
  if (!inv) return;

  const printHolder = document.getElementById('printContentHolder');
  if (!printHolder) return;

  printHolder.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; border: 2px solid #000; margin: 0 auto; max-width: 800px; background: #fff;">
      <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <tr>
          <td>
            <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase;">ATHARVA WEBSOFT</h1>
            <p style="font-size: 11px; margin: 2px 0;">CCTV Surveillance Systems • Networking • Hardware & IT Solutions</p>
            <p style="font-size: 10px; margin: 2px 0;">Head Office: Shop #4, Main Market Road • Phone: +91 94252-XXXXX</p>
            <p style="font-size: 10px; margin: 2px 0;"><b>CIN:</b> U72900CT2026OPC012345 | <b>GSTIN:</b> 22AAAAA0000A1Z5</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <div style="display: inline-block; background: #000; color: #fff; padding: 4px 8px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Tax & Warranty Invoice</div>
            <p style="font-size: 12px; font-weight: bold; margin: 5px 0 0 0;">INV #: ${inv.invNo}</p>
            <p style="font-size: 11px; margin: 2px 0;">Date: ${inv.date}</p>
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin: 15px 0; font-size: 12px;">
        <tr>
          <td style="width: 50%;">
            <b>Customer / Firm Name:</b> ${inv.custName}<br>
            <b>Contact Phone:</b> ${inv.phone}<br>
            <b>Route / Sector:</b> ${inv.route}
          </td>
          <td style="width: 50%; text-align: right;">
            <b>Payment Mode:</b> Cash / UPI Cleared<br>
            <b>Supply Type:</b> Retail & Field Service
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px;" border="1">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="padding: 6px; text-align: left;">#</th>
            <th style="padding: 6px; text-align: left;">Product / Hardware Description</th>
            <th style="padding: 6px; text-align: left;">Serial / MAC Number</th>
            <th style="padding: 6px; text-align: left;">Warranty Period</th>
            <th style="padding: 6px; text-align: left;">Warranty Expiry</th>
            <th style="padding: 6px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map((it, idx) => `
            <tr>
              <td style="padding: 6px;">${idx + 1}</td>
              <td style="padding: 6px; font-weight: bold;">${it.name}</td>
              <td style="padding: 6px; font-family: monospace;">${it.sn}</td>
              <td style="padding: 6px;">${it.warrantyYears > 0 ? it.warrantyYears + ' Year(s)' : 'No Warranty'}</td>
              <td style="padding: 6px; font-weight: bold;">${it.expiry}</td>
              <td style="padding: 6px; text-align: right;">₹${it.price.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="padding: 6px; text-align: right; font-weight: bold;">Grand Total (₹):</td>
            <td style="padding: 6px; text-align: right; font-weight: bold; font-size: 13px;">₹${inv.total.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 15px; font-size: 9px; border: 1px solid #999; padding: 8px;">
        <b>WARRANTY POLICY & TERMS:</b>
        <ol style="margin: 3px 0; padding-left: 15px;">
          <li>Warranty claims strictly require this certificate or verified physical serial number matching our database.</li>
          <li>Burnt hardware, lightning surge, water ingress, and unauthorized casing break will void warranty.</li>
        </ol>
      </div>

      <table style="width: 100%; margin-top: 35px; font-size: 11px;">
        <tr>
          <td style="width: 50%;">
            <div style="border-top: 1px dashed #000; width: 180px; padding-top: 5px;">Customer Signature</div>
          </td>
          <td style="width: 50%; text-align: right;">
            <div style="border-top: 1px dashed #000; width: 220px; display: inline-block; padding-top: 5px; text-align: center;">
              For ATHARVA WEBSOFT<br><b>Authorized Signatory</b>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  window.print();
}

// 1-Click WhatsApp Share
function shareInvoiceOnWhatsApp(invNo) {
  const inv = appState.invoices.find(i => i.invNo === invNo);
  if (!inv) return;

  const itemsSummary = inv.items.map(it => `• ${it.name} (SN: ${it.sn}) - Warranty till: ${it.expiry}`).join('%0A');
  const message = `*ATHARVA WEBSOFT*%0A*Invoice No:* ${inv.invNo}%0A*Date:* ${inv.date}%0A*Customer:* ${inv.custName}%0A----------------------------%0A*Items & Warranty:*%0A${itemsSummary}%0A----------------------------%0A*Grand Total:* ₹${inv.total}%0A%0A_Thank you for choosing Atharva Websoft! Save this message for warranty claims._`;

  const cleanPhone = inv.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${message}`;
  window.open(waUrl, '_blank');
}