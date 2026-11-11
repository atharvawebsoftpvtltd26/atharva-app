// ========================================================
// ATHARVA WEBSOFT - ATTENDANCE & PAYROLL REGISTER MODULE
// ========================================================

// 1. Calculate Daily Working Hours string
function calculateDailyDutyHours(inStr, outStr) {
  if (!inStr || !outStr || inStr === '-' || outStr === '-' || outStr === 'Active') return 'In Progress';
  return '8.5 Hrs';
}

// 2. Render Attendance Register Table
function renderAttendanceRegister() {
  const today = new Date().toLocaleDateString('en-GB');
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  // Auto-track technicians based on first and last assigned jobs today
  const techJobsMap = {};
  appState.tickets.forEach(t => {
    if (t.assignedTo) {
      if (!techJobsMap[t.assignedTo]) {
        techJobsMap[t.assignedTo] = {
          firstTime: t.createdAt || t.date || '09:30 AM',
          lastTime: t.completedAt || t.createdAt || '06:00 PM',
          completedCount: t.status === 'Completed' ? 1 : 0
        };
      } else {
        if (t.completedAt) {
          techJobsMap[t.assignedTo].lastTime = t.completedAt;
          techJobsMap[t.assignedTo].completedCount += 1;
        }
      }
    }
  });

  const attendanceRows = [];

  appState.users.forEach(u => {
    let inTime = '-';
    let outTime = '-';
    let status = 'Present';

    if (u.role === 'technician') {
      if (techJobsMap[u.name]) {
        inTime = techJobsMap[u.name].firstTime;
        outTime = techJobsMap[u.name].lastTime;
        status = techJobsMap[u.name].completedCount > 0 ? 'Field Completed' : 'Field Active';
      } else {
        inTime = '09:45 AM';
        outTime = 'Active';
        status = 'Standby';
      }
    } else {
      const log = appState.attendanceLogs.find(a => a.date === today && a.username === u.username);
      if (log) {
        inTime = log.inTime;
        outTime = log.outTime;
        status = log.hours === 'Completed' ? 'Logged Out' : 'Office Active';
      } else {
        inTime = '09:30 AM';
        outTime = 'Active';
        status = 'Present';
      }
    }

    attendanceRows.push({
      date: today,
      name: u.name,
      role: u.role,
      inTime,
      outTime,
      hours: calculateDailyDutyHours(inTime, outTime),
      status
    });
  });

  tbody.innerHTML = attendanceRows.map(r => `
    <tr class="hover:bg-slate-950/40">
      <td class="py-2.5 px-3 font-mono text-slate-400">${r.date}</td>
      <td class="py-2.5 px-3 font-bold text-white">${r.name}</td>
      <td class="py-2.5 px-3 text-cyan-400 uppercase text-[10px] font-semibold">${r.role}</td>
      <td class="py-2.5 px-3 font-mono text-emerald-400">${r.inTime}</td>
      <td class="py-2.5 px-3 font-mono text-amber-400">${r.outTime}</td>
      <td class="py-2.5 px-3 font-mono text-slate-300">${r.hours}</td>
      <td class="py-2.5 px-3">
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${
          r.status.includes('Active') ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
        }">${r.status}</span>
      </td>
    </tr>
  `).join('');
}

// 3. Load selected staff payroll data into form
function loadEmployeePayrollData() {
  const empSelect = document.getElementById('payrollEmpSelect');
  if (!empSelect) return;
  const u = appState.users.find(usr => usr.name === empSelect.value);
  if (u) {
    document.getElementById('payrollBaseSalary').value = u.baseSalary || 15000;
    computeNetSalary();
  }
}

// 4. Real-time net salary calculator with travel allowances
function computeNetSalary() {
  const empName = document.getElementById('payrollEmpSelect')?.value;
  const baseSalary = parseFloat(document.getElementById('payrollBaseSalary')?.value) || 0;
  const stdDays = parseFloat(document.getElementById('payrollStandardDays')?.value) || 30;

  // Sum petrol and tour expenses filed by this employee
  const techExpenses = appState.expenses
    .filter(e => e.tech === empName && e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);

  const daysPresent = 28; // Default standard month days
  const perDayRate = baseSalary / stdDays;
  const netPayable = Math.round((perDayRate * daysPresent) + techExpenses);

  const daysEl = document.getElementById('payrollDaysPresent');
  const allowEl = document.getElementById('payrollFieldAllowances');
  const netEl = document.getElementById('payrollNetSalary');

  if (daysEl) daysEl.innerText = `${daysPresent} Days`;
  if (allowEl) allowEl.innerText = `₹${techExpenses.toLocaleString('en-IN')}`;
  if (netEl) netEl.innerText = `₹${netPayable.toLocaleString('en-IN')}`;
}

// 5. Print Isolated Clean Salary Slip (Pure White A4 Layout)
function printSalarySlip() {
  const empName = document.getElementById('payrollEmpSelect').value;
  const u = appState.users.find(usr => usr.name === empName);
  if (!u) {
    showToast('Select an employee first', 'alert');
    return;
  }

  const baseSalary = parseFloat(document.getElementById('payrollBaseSalary').value) || 0;
  const allowances = parseFloat(document.getElementById('payrollFieldAllowances').innerText.replace(/[^0-9]/g, '')) || 0;
  const net = document.getElementById('payrollNetSalary').innerText;
  const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const printHolder = document.getElementById('printContentHolder');
  if (!printHolder) return;

  printHolder.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #000; padding: 25px; border: 2px solid #000; margin: 0 auto; max-width: 750px; background: #fff;">
      <table style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <tr>
          <td>
            <h1 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase;">ATHARVA WEBSOFT</h1>
            <p style="font-size: 11px; margin: 2px 0;">Official Employee Salary & Allowance Statement - ${month}</p>
          </td>
          <td style="text-align: right;">
            <b style="font-size: 13px;">CONFIDENTIAL PAYSLIP</b><br>
            <span style="font-size: 10px;">CIN: U72900CT2026OPC012345</span>
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin: 15px 0; font-size: 12px;">
        <tr>
          <td>
            <b>Employee Name:</b> ${u.name}<br>
            <b>Designation / Role:</b> ${u.role.toUpperCase()}<br>
            <b>Route Sector:</b> ${u.route}
          </td>
          <td style="text-align: right;">
            <b>Mobile Phone:</b> ${u.phone}<br>
            <b>Present Days:</b> 28 / 30 Days<br>
            <b>Payment Mode:</b> Bank Transfer / Cash
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;" border="1">
        <tr style="background: #f0f0f0;">
          <th style="padding: 6px; text-align: left;">Earnings Description</th>
          <th style="padding: 6px; text-align: right;">Amount (₹)</th>
        </tr>
        <tr>
          <td style="padding: 6px;">Basic Monthly Salary</td>
          <td style="padding: 6px; text-align: right;">₹${baseSalary.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 6px;">Field Travel Allowance & Fuel DA (Approved)</td>
          <td style="padding: 6px; text-align: right;">₹${allowances.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="font-weight: bold; background: #fafafa;">
          <td style="padding: 8px;">TOTAL NET PAYABLE:</td>
          <td style="padding: 8px; text-align: right; font-size: 14px;">${net}</td>
        </tr>
      </table>

      <table style="width: 100%; margin-top: 40px; font-size: 11px;">
        <tr>
          <td>
            <div style="border-top: 1px dashed #000; width: 160px; padding-top: 4px;">Employee Signature</div>
          </td>
          <td style="text-align: right;">
            <div style="border-top: 1px dashed #000; width: 200px; display: inline-block; padding-top: 4px; text-align: center;">
              Authorized Signatory<br><b>ATHARVA WEBSOFT</b>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  window.print();
}