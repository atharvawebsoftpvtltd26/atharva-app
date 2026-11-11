// ========================================================
// ATHARVA WEBSOFT - USER ROLES & CREDENTIALS MANAGEMENT
// ========================================================

// 1. One-Click Credential Generator
function autoGenerateCredentials() {
  const name = document.getElementById('newStaffName').value.trim();
  const prefix = name ? name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') : 'staff';
  document.getElementById('newStaffUsername').value = `${prefix}${Math.floor(100 + Math.random() * 900)}`;
  document.getElementById('newStaffPassword').value = `Aw@${Math.floor(1000 + Math.random() * 9000)}`;
  showToast('Generated secure random username and password!', 'info');
}

// 2. Create and Register New Staff User
async function handleCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('newStaffName').value.trim();
  const role = document.getElementById('newStaffRole').value;
  const route = document.getElementById('newStaffRoute').value;
  const username = document.getElementById('newStaffUsername').value.trim();
  const pass = document.getElementById('newStaffPassword').value.trim();
  const phone = document.getElementById('newStaffPhone').value.trim();

  const exists = appState.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    showToast('Username already taken! Choose another.', 'alert');
    return;
  }

  const newUser = {
    id: 'usr-' + (appState.users.length + 1),
    name,
    role,
    route,
    username,
    pass,
    phone,
    baseSalary: role === 'admin' ? 35000 : role === 'operator' ? 18000 : 15000
  };

  appState.users.push(newUser);
  document.getElementById('newStaffName').value = '';
  document.getElementById('newStaffUsername').value = '';
  document.getElementById('newStaffPassword').value = '';
  document.getElementById('newStaffPhone').value = '';

  saveState();
  playBeepSound('success');
  showToast(`Staff user ${name} created!`, 'success');

  // Push to Google Sheet
  await postToGoogleSheet({
    action: 'createUser',
    username,
    password: pass,
    fullName: name,
    role,
    phone,
    route
  });
}

// 3. Render Staff Directory Table & Dropdowns
function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  const badge = document.getElementById('totalUsersBadge');

  if (badge) badge.innerText = `${appState.users.length} Staff Active`;
  if (!tbody) return;

  tbody.innerHTML = appState.users.map(u => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-2.5 px-3">
        <div class="font-bold text-white">${u.name}</div>
        <div class="text-[10px] text-slate-400">${u.phone}</div>
      </td>
      <td class="py-2.5 px-3 font-semibold text-cyan-300">${u.role.toUpperCase()}</td>
      <td class="py-2.5 px-3 font-mono text-amber-400 font-bold">${u.username}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300">${u.pass}</td>
      <td class="py-2.5 px-3 text-slate-300">${u.route}</td>
    </tr>
  `).join('');

  // Sync staff dropdowns across views
  const techSelects = [
    document.getElementById('routeTechSelect'),
    document.getElementById('modalDirectTech'),
    document.getElementById('expTechName'),
    document.getElementById('payrollEmpSelect')
  ];

  techSelects.forEach(sel => {
    if (sel) {
      sel.innerHTML = appState.users.map(u => `<option value="${u.name}">${u.name} (${u.role})</option>`).join('');
    }
  });
}

// 4. Role Authorization & View-gating
function applyRolePermissions(user) {
  const uNameEl = document.getElementById('sessionUserName');
  const uRoleEl = document.getElementById('sessionUserRole');
  if (uNameEl) uNameEl.innerText = user.name;
  if (uRoleEl) uRoleEl.innerText = user.role === 'admin' ? 'Managing Director' : user.role === 'operator' ? 'Desk Operator' : 'Field Technician';

  const notice = document.getElementById('roleNotice');
  const desktopNav = document.getElementById('desktopNav');
  const userTabBtn = document.getElementById('tab-users');
  const payrollTabBtn = document.getElementById('tab-payroll');

  if (user.role === 'admin') {
    if (notice) notice.innerHTML = `Role: <b>Managing Director (Admin)</b> — Full enterprise privileges.`;
    desktopNav?.classList.remove('hidden');
    userTabBtn?.classList.remove('hidden');
    payrollTabBtn?.classList.remove('hidden');
    changeTab('dashboard');
  } else if (user.role === 'operator') {
    if (notice) notice.innerHTML = `Role: <b>Desk Operator</b> — Billing, Route Dispatch, Contacts & Calls active.`;
    desktopNav?.classList.remove('hidden');
    userTabBtn?.classList.add('hidden');
    payrollTabBtn?.classList.add('hidden');
    changeTab('billing');
  } else if (user.role === 'technician') {
    if (notice) notice.innerHTML = `Role: <b>Field Technician</b> — Route Sector: <b>${user.route || 'All Sectors'}</b>.`;
    desktopNav?.classList.add('hidden');
    changeTab('technician');
  }
}

// Authentication Helpers
function fillLoginCreds(u, p) {
  document.getElementById('loginUsername').value = u;
  document.getElementById('loginPassword').value = p;
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();

  const user = appState.users.find(usr => usr.username.toLowerCase() === u.toLowerCase() && usr.pass === p);
  if (!user) {
    showToast('Invalid Username or Password!', 'alert');
    return;
  }

  appState.currentUser = user;
  document.getElementById('loginScreen')?.classList.add('hidden');
  applyRolePermissions(user);

  // Auto-record Operator / Admin Attendance (Login In-Time)
  const today = new Date().toLocaleDateString('en-GB');
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let log = appState.attendanceLogs.find(a => a.date === today && a.username === user.username);
  if (!log) {
    appState.attendanceLogs.unshift({
      date: today,
      username: user.username,
      name: user.name,
      role: user.role,
      inTime: nowTime,
      outTime: nowTime,
      hours: 'Active',
      status: 'Present'
    });
  }

  saveState();
  playBeepSound('success');
  showToast(`Welcome, ${user.name}`, 'success');
}

function logoutCurrentUser() {
  if (appState.currentUser) {
    const today = new Date().toLocaleDateString('en-GB');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let log = appState.attendanceLogs.find(a => a.date === today && a.username === appState.currentUser.username);
    if (log) {
      log.outTime = nowTime;
      log.hours = 'Completed';
    }
  }
  appState.currentUser = null;
  document.getElementById('loginScreen')?.classList.remove('hidden');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  saveState();
}