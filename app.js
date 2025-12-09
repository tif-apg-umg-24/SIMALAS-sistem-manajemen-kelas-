// =====================================================
// SIMALAS - JavaScript Frontend (MySQL Version)
// File: app.js - LENGKAP & SIAP PAKAI
// Database: db_simalas
// =====================================================

// KONSTANTA & VARIABEL GLOBAL
const loginOverlay = document.getElementById('loginOverlay');
const uploadOverlay = document.getElementById('uploadOverlay');
const btnLogin = document.getElementById('btnLogin');
const btnReset = document.getElementById('btnReset');
const loginError = document.getElementById('loginError');
const loginNIM = document.getElementById('loginNIM');
const loginPass = document.getElementById('loginPass');
const rememberMe = document.getElementById('rememberMe');
const appContainer = document.getElementById('app');

let materialsCache = {};
let tasksCache = {};
let kasCache = {};
let eventsCache = {};
let taskStatusCache = {};
let currentUser = null;
let currentFilterDashboard = 'all';
let currentFilterMateri = 'all';

const ROLE_KETUA = 'ketua';
const ROLE_BENDAHARA = 'bendahara';
const ROLE_MAHASISWA = 'mahasiswa';

const JADWAL_KULIAH = [
  {kode:"2406023221",matkul:"AIK - KEMUHAMMADIYAHAN",kelas:"A-PG",sks:2,ruang:"I6.06",hari:"Selasa",waktu:"07:50 - 09:30",dosen:"M. Islahuddin"},
  {kode:"2406023316",matkul:"REKAYASA PERANGKAT LUNAK",kelas:"A-PG",sks:3,ruang:"I6.06",hari:"Rabu",waktu:"08:45 - 11:10",dosen:"HARUNUR ROSYID, S.T., M.Kom., Ph.D."},
  {kode:"2406023317",matkul:"PEMROGRAMAN BEORIENTASI OBYEK",kelas:"A-PG",sks:3,ruang:"D2.11",hari:"Jumat",waktu:"08:40 - 11:10",dosen:"DENI SUTAJI, S.Kom., M.Kom"},
  {kode:"2406023318",matkul:"ALJABAR DAN MATRIKS",kelas:"A-PG",sks:3,ruang:"D2.11",hari:"Kamis",waktu:"07:50 - 10:20",dosen:"HENNY DWI BHAKTI, S.Si., M.Si."},
  {kode:"2406023319",matkul:"BASIS DATA",kelas:"A-PG",sks:4,ruang:"D2.11",hari:"Selasa",waktu:"10:20 - 12:50",dosen:"UMI CHOTIJAH, S.Kom., M.Kom"},
  {kode:"2406023320",matkul:"STATISTIK",kelas:"A-PG",sks:3,ruang:"F3.14",hari:"Senin",waktu:"08:40 - 11:10",dosen:"NADYA HUSENTI, S.Pd., M.Pd"},
  {kode:"2406023322",matkul:"KOMPLEKSITAS ALGORITMA",kelas:"A-PG",sks:3,ruang:"D2.11",hari:"Senin",waktu:"12:00 - 14:30",dosen:"HENNY DWI BHAKTI, S.SI., M.Si."},
  {kode:"2406025334",matkul:"HUMAN COMPUTER INTERACTION",kelas:"A-PG",sks:3,ruang:"F3.16",hari:"Kamis",waktu:"12:50 - 15:20",dosen:"PUTRI AISYIYAH RAKHMA DEVI, S.Pd., M.Kom"}
];

// =====================================================
// API CALL FUNCTION
// =====================================================
async function apiCall(action, method = 'GET', data = null, params = '') {
  const url = `${API_URL}?action=${action}${params}`;
  const options = {
    method: method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: error.message };
  }
}

// =====================================================
// COOKIE FUNCTIONS (Remember Me)
// =====================================================
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function loadSavedCredentials() {
  const savedNIM = getCookie('simalas_nim');
  const savedPass = getCookie('simalas_pass');
  const wasRemembered = getCookie('simalas_remember');
  
  if (savedNIM && savedPass && wasRemembered === 'true') {
    loginNIM.value = savedNIM;
    loginPass.value = savedPass;
    rememberMe.checked = true;
  }
}

// =====================================================
// LOGIN & AUTH
// =====================================================
async function doLogin() {
  loginError.style.display = 'none';
  const nim = loginNIM.value.trim();
  const password = loginPass.value.trim();
  
  if (!nim || !password) {
    loginError.innerText = 'Isi NIM & password';
    loginError.style.display = 'block';
    return;
  }
  
  btnLogin.disabled = true;
  btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  
  const result = await apiCall('login', 'POST', { nim, password });
  
  if (result.success) {
    currentUser = result.data;
    
    if (rememberMe.checked) {
      setCookie('simalas_nim', nim, 30);
      setCookie('simalas_pass', password, 30);
      setCookie('simalas_remember', 'true', 30);
    } else {
      deleteCookie('simalas_nim');
      deleteCookie('simalas_pass');
      deleteCookie('simalas_remember');
    }
    
    onLogin();
  } else {
    loginError.innerText = result.message;
    loginError.style.display = 'block';
    btnLogin.disabled = false;
    btnLogin.innerHTML = '<i class="fas fa-right-to-bracket"></i><span>Login</span>';
  }
}

function onLogin() {
  if (!currentUser) return;
  
  loginOverlay.style.display = 'none';
  appContainer.style.display = 'block';
  
  const roleText = currentUser.role === ROLE_KETUA ? 'Ketua' : 
                   currentUser.role === ROLE_BENDAHARA ? 'Bendahara' : 'Mahasiswa';
  
  document.getElementById('displayRole').innerText = roleText + ' - ' + currentUser.name;
  document.getElementById('displayUser').innerText = 'NIM: ' + currentUser.nim;
  
  const initials = currentUser.name ? 
    currentUser.name.split(' ').map(x => x[0]).slice(0, 2).join('') : '';
  document.getElementById('displayAvatar').innerText = initials;
  
  const isAdmin = currentUser.role === ROLE_KETUA || currentUser.role === ROLE_BENDAHARA;
  document.getElementById('btnTopUpload').style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btnUploadPage').style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btnAddTugas').style.display = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btnAddKas').style.display = isAdmin ? 'inline-flex' : 'none';
  
  renderJadwal();
  loadAllData();
}

function doLogout() {
  if (!confirm('Logout sekarang?')) return;
  currentUser = null;
  location.reload();
}

// =====================================================
// LOAD DATA FROM API
// =====================================================
async function loadAllData() {
  await Promise.all([
    loadMaterials(),
    loadTasks(),
    loadTaskStatus(),
    loadEvents(),
    loadKas()
  ]);
}

async function loadMaterials() {
  const result = await apiCall('materials');
  if (result.success) {
    materialsCache = {};
    result.data.forEach(m => materialsCache[m.id] = m);
    updateCourseFilters();
    renderMaterials();
    renderStats();
  }
}

async function loadTasks() {
  const result = await apiCall('tasks');
  if (result.success) {
    tasksCache = {};
    result.data.forEach(t => tasksCache[t.id] = t);
    renderTasks();
    renderStats();
  }
}

async function loadTaskStatus() {
  const result = await apiCall('task_status', 'GET', null, '&nim=' + currentUser.nim);
  if (result.success) {
    taskStatusCache = result.data;
    renderTasks();
    renderStats();
  }
}

async function loadEvents() {
  const result = await apiCall('events', 'GET', null, '&nim=' + currentUser.nim);
  if (result.success) {
    eventsCache = {};
    result.data.forEach(e => eventsCache[e.id] = e);
    renderEvents();
    renderStats();
  }
}

async function loadKas() {
  const result = await apiCall('kas');
  if (result.success) {
    kasCache = {};
    result.data.forEach(k => kasCache[k.id] = k);
    renderKas();
    renderStats();
  }
}

// =====================================================
// RENDER JADWAL
// =====================================================
function renderJadwal() {
  const table = document.getElementById('jadwalTable');
  const totalSKS = JADWAL_KULIAH.reduce((sum, j) => sum + j.sks, 0);
  document.getElementById('totalSKS').innerText = totalSKS + ' SKS';
  
  const dayOrder = {Senin:1, Selasa:2, Rabu:3, Kamis:4, Jumat:5, Sabtu:6, Minggu:7};
  const sorted = [...JADWAL_KULIAH].sort((a,b) => dayOrder[a.hari] - dayOrder[b.hari]);
  
  let html = '<thead><tr><th>No</th><th>Kode</th><th>Mata Kuliah</th><th>Kelas</th><th>SKS</th><th>Ruang</th><th>Hari & Waktu</th><th>Dosen</th></tr></thead><tbody>';
  
  sorted.forEach((j, idx) => {
    html += `<tr>
      <td>${idx + 1}</td>
      <td style="font-size:0.75rem;color:#64748b">${j.kode}</td>
      <td><strong>${escapeHtml(j.matkul)}</strong></td>
      <td>${j.kelas}</td>
      <td><span class="jadwal-sks">${j.sks}</span></td>
      <td>${j.ruang}</td>
      <td>
        <div class="jadwal-day">${j.hari}</div>
        <div class="jadwal-time"><i class="fas fa-clock"></i> ${j.waktu}</div>
      </td>
      <td style="font-size:0.85rem">${escapeHtml(j.dosen)}</td>
    </tr>`;
  });
  
  html += '</tbody>';
  table.innerHTML = html;
}

// =====================================================
// COURSE FILTERS
// =====================================================
function updateCourseFilters() {
  const mats = Object.values(materialsCache || {});
  const courses = new Set();
  
  mats.forEach(m => {
    if (m.scope === 'specific' && m.course) {
      courses.add(m.course);
    }
  });
  
  const sortedCourses = Array.from(courses).sort();
  
  const filterDashboard = document.getElementById('filterDashboard');
  const filterMateri = document.getElementById('filterMateri');
  
  const optionsHTML = '<option value="all">Semua Mata Kuliah</option>' + 
    sortedCourses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  
  if (filterDashboard) {
    const currentVal = filterDashboard.value;
    filterDashboard.innerHTML = optionsHTML;
    if (sortedCourses.includes(currentVal)) {
      filterDashboard.value = currentVal;
    }
  }
  
  if (filterMateri) {
    const currentVal = filterMateri.value;
    filterMateri.innerHTML = optionsHTML;
    if (sortedCourses.includes(currentVal)) {
      filterMateri.value = currentVal;
    }
  }
}

window.applyFilterDashboard = function() {
  currentFilterDashboard = document.getElementById('filterDashboard').value;
  renderMaterialsPreview();
};

window.applyFilterMateri = function() {
  currentFilterMateri = document.getElementById('filterMateri').value;
  renderMaterialsList();
};

function getFilteredMaterials(filterValue) {
  const mats = Object.values(materialsCache || {}).sort((a,b) => (b.id||0) - (a.id||0));
  if (filterValue === 'all') {
    return mats;
  }
  return mats.filter(m => {
    if (m.scope === 'all') return true;
    if (m.scope === 'specific' && m.course === filterValue) return true;
    return false;
  });
}

// =====================================================
// RENDER MATERIALS
// =====================================================
function renderMaterials() {
  renderMaterialsPreview();
  renderMaterialsList();
}

function renderMaterialsPreview() {
  const mats = getFilteredMaterials(currentFilterDashboard);
  const preview = document.getElementById('materiPreview');
  const isAdmin = currentUser && (currentUser.role === ROLE_KETUA || currentUser.role === ROLE_BENDAHARA);
  
  const html = mats.slice(0, 5).map(m => createMaterialHTML(m, isAdmin)).join('');
  preview.innerHTML = html || '<p style="color:#64748b;text-align:center;padding:20px">Belum ada materi</p>';
}

function renderMaterialsList() {
  const mats = getFilteredMaterials(currentFilterMateri);
  const pageList = document.getElementById('materiList');
  const isAdmin = currentUser && (currentUser.role === ROLE_KETUA || currentUser.role === ROLE_BENDAHARA);
  
  const html = mats.map(m => createMaterialHTML(m, isAdmin)).join('');
  pageList.innerHTML = html || '<p style="color:#64748b;text-align:center;padding:20px">Belum ada materi</p>';
}

function createMaterialHTML(m, isAdmin) {
  let iconType = 'file', iconClass = 'doc';
  
  if (m.upload_type === 'link') {
    iconType = 'link';
    iconClass = 'link';
  } else if (m.upload_type === 'file') {
    if (m.type === 'pdf') { iconType = 'file-pdf'; iconClass = 'pdf'; }
    else if (m.type === 'doc') { iconType = 'file-word'; iconClass = 'doc'; }
    else if (m.type === 'ppt') { iconType = 'file-powerpoint'; iconClass = 'ppt'; }
    else if (m.type === 'xls') { iconType = 'file-excel'; iconClass = 'xls'; }
    else if (m.type === 'zip') { iconType = 'file-zipper'; iconClass = 'zip'; }
    else { iconType = 'file'; iconClass = 'doc'; }
  }
  
  const courseText = m.scope === 'all' ? 'Semua Mata Kuliah' : escapeHtml(m.course || '-');
  const btnText = m.upload_type === 'link' ? '<i class="fas fa-external-link-alt"></i> Buka Link' : '<i class="fas fa-download"></i> Download';
  
  const dateStr = m.uploaded_at ? formatDate(m.uploaded_at) : 'Baru saja';
  
  return `
  <div class="material-item">
    <div class="material-icon ${iconClass}"><i class="fas fa-${iconType}"></i></div>
    <div class="material-info">
      <div class="material-title">${escapeHtml(m.title)}</div>
      <div class="material-meta">${dateStr} • ${courseText}</div>
      ${m.upload_type === 'file' && m.filename ? `<div class="material-meta" style="font-size:0.75rem;color:#94a3b8">📁 ${escapeHtml(m.filename)} • ${m.size || '-'}</div>` : ''}
    </div>
    <div class="material-actions">
      <button class="btn btn-primary btn-sm" onclick="accessMaterial(${m.id})">${btnText}</button>
      ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteMaterial(${m.id})"><i class="fas fa-trash"></i></button>` : ''}
    </div>
  </div>`;
}

window.accessMaterial = async function(id) {
  const mat = materialsCache[id];
  if (!mat) { alert('Materi tidak ditemukan'); return; }
  
  if (mat.upload_type === 'link' || mat.link) {
    window.open(mat.link, '_blank');
  } else if (mat.upload_type === 'file' || mat.download_url) {
    if (mat.download_url) {
      window.open(mat.download_url, '_blank');
    } else {
      alert('File tidak tersedia');
    }
  } else {
    alert('Materi tidak dapat diakses');
  }
};

window.confirmDeleteMaterial = async function(id) {
  if (!confirm('Hapus materi ini?')) return;
  
  const result = await apiCall('materials', 'DELETE', null, '&id=' + id);
  
  if (result.success) {
    alert('✅ ' + result.message);
    await loadMaterials();
  } else {
    alert('❌ ' + result.message);
  }
};

// =====================================================
// RENDER TASKS
// =====================================================
function renderTasks() {
  const tasks = Object.values(tasksCache || {}).sort((a,b) => (b.id||0) - (a.id||0));
  const status = taskStatusCache || {};
  const isAdmin = currentUser && (currentUser.role === ROLE_KETUA || currentUser.role === ROLE_BENDAHARA);
  const list = document.getElementById('tugasList');
  
  const html = tasks.map(t => {
    const d = new Date(t.deadline);
    const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    const urgent = daysLeft <= 2 && daysLeft >= 0;
    const done = !!(status && status[t.id] && status[t.id][currentUser?.nim]);
    
    return `
      <div class="task-item ${done ? 'completed' : ''}">
        <div class="task-header">
          <div style="flex:1">
            <div class="task-title">${escapeHtml(t.title)}</div>
            <div style="color:#64748b;font-size:.9rem;margin-top:6px"><i class="fas fa-book"></i> ${escapeHtml(t.course)}</div>
            ${t.description ? `<div style="color:#64748b;font-size:.85rem;margin-top:6px">${escapeHtml(t.description)}</div>` : ''}
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <input type="checkbox" class="task-checkbox" ${done ? 'checked' : ''} onchange="toggleTask(${t.id})">
          </div>
        </div>
        <div style="margin-top:12px">
          <div class="task-deadline ${urgent && !done ? 'urgent' : ''} ${done ? 'completed' : ''}">
            <i class="fas fa-clock"></i> ${done ? 'Selesai' : formatDeadlineDetailed(d)}
          </div>
          ${t.submission_link ? `<a href="${t.submission_link}" target="_blank" class="task-link"><i class="fas fa-link"></i> Buka Link</a>` : ''}
        </div>
        ${isAdmin ? `<div class="task-actions"><button class="btn btn-primary btn-sm" onclick="openEditTask(${t.id})"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-danger btn-sm" onclick="confirmDeleteTask(${t.id})"><i class="fas fa-trash"></i> Hapus</button></div>` : ''}
      </div>`;
  }).join('');
  
  list.innerHTML = html || '<p style="color:#64748b;text-align:center;padding:20px">Belum ada tugas</p>';
  
  renderUpcoming();
}

window.toggleTask = async function(taskId) {
  if (!currentUser) { alert('Silakan login'); return; }
  
  const currentStatus = !!(taskStatusCache[taskId] && taskStatusCache[taskId][currentUser.nim]);
  const newStatus = !currentStatus;
  
  const result = await apiCall('task_status', 'POST', {
    task_id: taskId,
    nim: currentUser.nim,
    completed: newStatus
  });
  
  if (result.success) {
    await loadTaskStatus();
  } else {
    alert('❌ ' + result.message);
  }
};

window.openEditTask = function(id) {
  const task = tasksCache[id];
  if (!task) return;
  
  document.getElementById('editTaskId').value = id;
  document.getElementById('editTugasCourse').value = task.course || '';
  document.getElementById('editTugasTitle').value = task.title || '';
  document.getElementById('editTugasDeadline').value = task.deadline ? task.deadline.slice(0, 16) : '';
  document.getElementById('editTugasLink').value = task.submission_link || '';
  document.getElementById('editTugasDesc').value = task.description || '';
  openModal('modalEditTugas');
};

window.confirmDeleteTask = async function(id) {
  if (!confirm('Hapus tugas ini?')) return;
  
  const result = await apiCall('tasks', 'DELETE', null, '&id=' + id);
  
  if (result.success) {
    alert('✅ ' + result.message);
    await loadTasks();
  } else {
    alert('❌ ' + result.message);
  }
};

// =====================================================
// RENDER EVENTS
// =====================================================
function renderEvents() {
  if (!currentUser) return;
  
  const allEvents = Object.values(eventsCache || {});
  const myEvents = allEvents.filter(e => e.created_by === currentUser.nim)
    .sort((a,b) => new Date(a.date) - new Date(b.date));
  const list = document.getElementById('eventsList');
  
  const html = myEvents.map(e => {
    const d = new Date(e.date);
    const isPast = d < new Date();
    
    return `
      <div class="event-item" style="${isPast ? 'opacity:0.6' : ''}">
        <div class="event-header">
          <div style="flex:1">
            <div class="event-title">${escapeHtml(e.title)}</div>
            ${e.location ? `<div style="color:#64748b;font-size:.85rem;margin-top:4px"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(e.location)}</div>` : ''}
            ${e.description ? `<div class="event-desc">${escapeHtml(e.description)}</div>` : ''}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div class="event-date">
            <i class="fas fa-calendar"></i> ${formatEventDate(d)}
          </div>
        </div>
        <div class="event-actions">
          <button class="btn btn-primary btn-sm" onclick="openEditEvent(${e.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteEvent(${e.id})"><i class="fas fa-trash"></i> Hapus</button>
        </div>
      </div>`;
  }).join('');
  
  list.innerHTML = html || '<p style="color:#64748b;text-align:center;padding:20px">Belum ada acara pribadi</p>';
}

window.openEditEvent = function(id) {
  const event = eventsCache[id];
  if (!event) return;
  
  document.getElementById('editEventId').value = id;
  document.getElementById('editEventTitle').value = event.title || '';
  document.getElementById('editEventDate').value = event.date ? event.date.slice(0, 16) : '';
  document.getElementById('editEventLocation').value = event.location || '';
  document.getElementById('editEventDesc').value = event.description || '';
  openModal('modalEditEvent');
};

window.confirmDeleteEvent = async function(id) {
  if (!confirm('Hapus acara pribadi ini?')) return;
  
  const result = await apiCall('events', 'DELETE', null, '&id=' + id);
  
  if (result.success) {
    alert('✅ ' + result.message);
    await loadEvents();
  } else {
    alert('❌ ' + result.message);
  }
};

// =====================================================
// RENDER KAS
// =====================================================
function renderKas() {
  const ks = Object.values(kasCache || {}).sort((a,b) => (a.name||'').localeCompare(b.name||''));
  const list = document.getElementById('kasList');
  const isAdmin = currentUser && (currentUser.role === ROLE_KETUA || currentUser.role === ROLE_BENDAHARA);
  
  const totalPaid = ks.filter(k => k.paid).reduce((sum, k) => sum + (k.amount || 0), 0);
  const totalUnpaid = ks.filter(k => !k.paid).reduce((sum, k) => sum + (k.amount || 0), 0);
  
  const html = `
    <div style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;padding:25px;border-radius:16px;margin-bottom:20px;box-shadow:0 10px 30px rgba(99,102,241,0.3)">
      <div style="font-size:1rem;margin-bottom:12px;opacity:0.95">Status Pembayaran Kas</div>
      <div style="font-size:2rem;font-weight:800;margin-bottom:8px">${ks.filter(k=>k.paid).length}/${ks.length} Anggota</div>
      <div style="font-size:1rem;margin-bottom:20px;opacity:0.95">sudah membayar kas</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.3)">
        <div><div style="font-size:0.85rem;opacity:0.9">Terkumpul</div><div style="font-size:1.5rem;font-weight:800">Rp ${formatRupiah(totalPaid)}</div></div>
        <div><div style="font-size:0.85rem;opacity:0.9">Belum Bayar</div><div style="font-size:1.5rem;font-weight:800">Rp ${formatRupiah(totalUnpaid)}</div></div>
      </div>
    </div>
    ${ks.map((k) => `
      <div class="kas-item">
        <div class="kas-name">
          <i class="fas fa-user"></i> ${escapeHtml(k.name || 'Anggota')}
          ${k.nim ? `<div style="font-size:0.75rem;color:#64748b;margin-top:3px">NIM: ${k.nim}</div>` : ''}
        </div>
        <div class="kas-amount">Rp ${formatRupiah(k.amount || 0)}</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          ${isAdmin ? `<span class="kas-status ${k.paid?'paid':'unpaid'}" onclick="toggleKas(${k.id})" style="cursor:pointer">${k.paid?'✓ Sudah':'✗ Belum'}</span>` : `<span class="kas-status ${k.paid?'paid':'unpaid'}">${k.paid?'✓ Sudah':'✗ Belum'}</span>`}
          ${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="openEditKas(${k.id})"><i class="fas fa-edit"></i></button>` : ''}
          ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteKas(${k.id})"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </div>
    `).join('')}
  `;
  list.innerHTML = html;
}

window.toggleKas = async function(id) {
  if (!currentUser) return;
  if (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA) {
    alert('Akses ditolak');
    return;
  }
  
  const kas = kasCache[id];
  if (!kas) return;
  
  const result = await apiCall('kas', 'PUT', {
    id: id,
    paid: !kas.paid
  });
  
  if (result.success) {
    await loadKas();
  } else {
    alert('❌ ' + result.message);
  }
};

window.openEditKas = function(id) {
  const kas = kasCache[id];
  if (!kas) return;
  
  document.getElementById('editKasId').value = id;
  document.getElementById('editKasName').value = kas.name || '';
  document.getElementById('editKasAmount').value = kas.amount || 10000;
  openModal('modalEditKas');
};

window.confirmDeleteKas = async function(id) {
  if (!confirm('Hapus anggota kas ini?')) return;
  
  const result = await apiCall('kas', 'DELETE', null, '&id=' + id);
  
  if (result.success) {
    alert('✅ ' + result.message);
    await loadKas();
  } else {
    alert('❌ ' + result.message);
  }
};

// =====================================================
// RENDER STATS & UPCOMING
// =====================================================
function renderStats() {
  if (!currentUser) return;
  
  const mats = Object.values(materialsCache || {});
  const tasks = Object.values(tasksCache || {});
  const allEvents = Object.values(eventsCache || {});
  const myEvents = allEvents.filter(e => e.created_by === currentUser.nim);
  const statuses = taskStatusCache || {};
  
  document.getElementById('statMateri').innerText = mats.length;
  
  const doneCount = Object.keys(statuses).filter(k => statuses[k] && statuses[k][currentUser.nim]).length;
  document.getElementById('statTugas').innerText = `${doneCount}/${tasks.length}`;
  
  const near = tasks.filter(t => {
    const d = new Date(t.deadline);
    const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7;
  }).length;
  document.getElementById('statDead').innerText = near;
  
  const upcomingEvents = myEvents.filter(e => new Date(e.date) >= new Date()).length;
  document.getElementById('statEvents').innerText = upcomingEvents;
  
  const ks = Object.values(kasCache || {});
  document.getElementById('statKas').innerText = (ks.length && ks.filter(k => k.paid).length === ks.length) ? 'Lunas' : 'Belum Lunas';
}

function renderUpcoming() {
  if (!currentUser) return;
  
  const tasks = Object.values(tasksCache || {});
  const allEvents = Object.values(eventsCache || {});
  const myEvents = allEvents.filter(e => e.created_by === currentUser.nim);
  const upcoming = document.getElementById('upcoming');
  
  const allItems = [
    ...tasks.map(t => ({ type: 'task', title: t.title, date: new Date(t.deadline) })),
    ...myEvents.map(e => ({ type: 'event', title: e.title, date: new Date(e.date) }))
  ].sort((a, b) => a.date - b.date).filter(item => item.date >= new Date()).slice(0, 5);
  
  const upHtml = allItems.map(item => {
    const icon = item.type === 'task' ? 'tasks' : 'calendar-check';
    const color = item.type === 'task' ? 'var(--warning)' : 'var(--purple)';
    return `<div class="upcoming-task" style="border-left-color:${color}"><div class="upcoming-task-title"><i class="fas fa-${icon}"></i> ${escapeHtml(item.title)}</div><div class="upcoming-task-time"><i class="fas fa-clock"></i> ${formatDeadlineDetailed(item.date)}</div></div>`;
  }).join('');
  
  upcoming.innerHTML = upHtml || '<p style="color:#64748b;text-align:center;padding:20px">Tidak ada deadline & acara</p>';
}

// =====================================================
// FORM HANDLERS
// =====================================================
window.handleUpload = async function(e) {
  e.preventDefault();
  
  if (!currentUser || (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA)) {
    alert('Akses ditolak');
    return;
  }
  
  const scope = document.getElementById('uploadScope').value;
  const course = document.getElementById('uploadCourse').value.trim();
  const title = document.getElementById('uploadTitle').value.trim();
  const uploadType = document.getElementById('uploadType').value;
  
  if (!title) { alert('Isi judul materi'); return; }
  if (scope === 'specific' && !course) { alert('Isi nama mata kuliah'); return; }
  
  const btnSubmit = document.getElementById('btnUploadSubmit');
  btnSubmit.disabled = true;
  uploadOverlay.classList.add('active');
  closeModal('modalUpload');
  
  try {
    let data = {
      title: title,
      scope: scope,
      course: scope === 'specific' ? course : null,
      upload_type: uploadType,
      uploaded_by: currentUser.nim
    };
    
    if (uploadType === 'file') {
      const fileInput = document.getElementById('uploadFile');
      const file = fileInput.files[0];
      
      if (!file) {
        alert('Pilih file');
        btnSubmit.disabled = false;
        uploadOverlay.classList.remove('active');
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        alert('File max 50MB');
        btnSubmit.disabled = false;
        uploadOverlay.classList.remove('active');
        return;
      }
      
      const ext = file.name.split('.').pop().toLowerCase();
      let type = 'doc';
      if (ext === 'pdf') type = 'pdf';
      else if (ext.includes('ppt')) type = 'ppt';
      else if (ext.includes('xls')) type = 'xls';
      else if (ext === 'zip' || ext === 'rar') type = 'zip';
      
      const size = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      
      // Upload file using FormData
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResult = await fetch(`${API_URL}?action=upload_file`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResult.json();
      
      if (!uploadData.success) {
        alert('❌ Gagal upload file: ' + uploadData.message);
        btnSubmit.disabled = false;
        uploadOverlay.classList.remove('active');
        return;
      }
      
      data.type = type;
      data.size = size;
      data.filename = uploadData.filename;
      data.download_url = uploadData.url;
      data.storage_path = uploadData.filepath;
      data.link = null;
      
    } else {
      // Link upload
      const link = document.getElementById('uploadLink').value.trim();
      if (!link) {
        alert('Isi link materi');
        btnSubmit.disabled = false;
        uploadOverlay.classList.remove('active');
        return;
      }
      
      try {
        new URL(link);
      } catch (e) {
        alert('Link tidak valid. Gunakan format: https://...');
        btnSubmit.disabled = false;
        uploadOverlay.classList.remove('active');
        return;
      }
      
      data.link = link;
      data.type = 'link';
      data.filename = null;
      data.size = null;
      data.download_url = null;
      data.storage_path = null;
    }
    
    const result = await apiCall('materials', 'POST', data);
    
    if (result.success) {
      document.getElementById('formUpload').reset();
      toggleCourseField();
      toggleUploadType();
      alert('✅ Materi berhasil ditambahkan!');
      await loadMaterials();
    } else {
      alert('❌ Gagal: ' + result.message);
    }
    
  } catch (err) {
    console.error('Upload error:', err);
    alert('❌ Gagal upload: ' + err.message);
  } finally {
    btnSubmit.disabled = false;
    uploadOverlay.classList.remove('active');
  }
};

window.handleAddTugas = async function(e) {
  e.preventDefault();
  
  if (!currentUser || (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA)) {
    alert('Akses ditolak');
    return;
  }
  
  const course = document.getElementById('tugasCourse').value.trim();
  const title = document.getElementById('tugasTitle').value.trim();
  const deadline = document.getElementById('tugasDeadline').value;
  const link = document.getElementById('tugasLink').value.trim();
  const desc = document.getElementById('tugasDesc').value.trim();
  
  if (!course || !title || !deadline) {
    alert('Lengkapi data tugas');
    return;
  }
  
  const data = {
    title: title,
    course: course,
    deadline: deadline,
    submission_link: link || null,
    description: desc || null,
    created_by: currentUser.nim
  };
  
  const result = await apiCall('tasks', 'POST', data);
  
  if (result.success) {
    closeModal('modalAddTugas');
    document.getElementById('formAddTugas').reset();
    alert('✅ Tugas berhasil ditambahkan');
    await loadTasks();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleEditTugas = async function(e) {
  e.preventDefault();
  
  if (!currentUser || (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA)) {
    alert('Akses ditolak');
    return;
  }
  
  const taskId = document.getElementById('editTaskId').value;
  const course = document.getElementById('editTugasCourse').value.trim();
  const title = document.getElementById('editTugasTitle').value.trim();
  const deadline = document.getElementById('editTugasDeadline').value;
  const link = document.getElementById('editTugasLink').value.trim();
  const desc = document.getElementById('editTugasDesc').value.trim();
  
  if (!taskId || !course || !title || !deadline) {
    alert('Lengkapi semua field');
    return;
  }
  
  const data = {
    id: taskId,
    title: title,
    course: course,
    deadline: deadline,
    submission_link: link || null,
    description: desc || null
  };
  
  const result = await apiCall('tasks', 'PUT', data);
  
  if (result.success) {
    closeModal('modalEditTugas');
    alert('✅ Tugas berhasil diupdate');
    await loadTasks();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleAddEvent = async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Silakan login');
    return;
  }
  
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const location = document.getElementById('eventLocation').value.trim();
  const desc = document.getElementById('eventDesc').value.trim();
  
  if (!title || !date) {
    alert('Lengkapi data acara');
    return;
  }
  
  const data = {
    title: title,
    date: date,
    location: location || null,
    description: desc || null,
    created_by: currentUser.nim
  };
  
  const result = await apiCall('events', 'POST', data);
  
  if (result.success) {
    closeModal('modalAddEvent');
    document.getElementById('formAddEvent').reset();
    alert('✅ Acara pribadi berhasil ditambahkan');
    await loadEvents();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleEditEvent = async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Silakan login');
    return;
  }
  
  const eventId = document.getElementById('editEventId').value;
  const title = document.getElementById('editEventTitle').value.trim();
  const date = document.getElementById('editEventDate').value;
  const location = document.getElementById('editEventLocation').value.trim();
  const desc = document.getElementById('editEventDesc').value.trim();
  
  if (!eventId || !title || !date) {
    alert('Lengkapi semua field');
    return;
  }
  
  const data = {
    id: eventId,
    title: title,
    date: date,
    location: location || null,
    description: desc || null
  };
  
  const result = await apiCall('events', 'PUT', data);
  
  if (result.success) {
    closeModal('modalEditEvent');
    alert('✅ Acara berhasil diupdate');
    await loadEvents();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleAddKas = async function(e) {
  e.preventDefault();
  
  if (!currentUser || (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA)) {
    alert('Akses ditolak');
    return;
  }
  
  const nim = document.getElementById('addKasNIM').value.trim();
  const name = document.getElementById('addKasName').value.trim();
  const amount = parseInt(document.getElementById('addKasAmount').value);
  
  if (!name || !amount || amount < 1000) {
    alert('Lengkapi data kas dengan benar');
    return;
  }
  
  const data = {
    nim: nim || null,
    name: name,
    amount: amount,
    paid: false
  };
  
  const result = await apiCall('kas', 'POST', data);
  
  if (result.success) {
    closeModal('modalAddKas');
    document.getElementById('formAddKas').reset();
    document.getElementById('addKasAmount').value = '10000';
    alert('✅ Anggota kas berhasil ditambahkan');
    await loadKas();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleEditKas = async function(e) {
  e.preventDefault();
  
  if (!currentUser || (currentUser.role !== ROLE_KETUA && currentUser.role !== ROLE_BENDAHARA)) {
    alert('Akses ditolak');
    return;
  }
  
  const kasId = document.getElementById('editKasId').value;
  const name = document.getElementById('editKasName').value.trim();
  const amount = parseInt(document.getElementById('editKasAmount').value);
  
  if (!kasId || !name || !amount || amount < 1000) {
    alert('Lengkapi data dengan benar');
    return;
  }
  
  const data = {
    id: kasId,
    name: name,
    amount: amount
  };
  
  const result = await apiCall('kas', 'PUT', data);
  
  if (result.success) {
    closeModal('modalEditKas');
    alert('✅ Kas berhasil diupdate');
    await loadKas();
  } else {
    alert('❌ Gagal: ' + result.message);
  }
};

window.handleChangePass = async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Silakan login');
    return;
  }
  
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const confPass = document.getElementById('confPass').value;
  
  if (newPass !== confPass) {
    alert('Konfirmasi password tidak sama');
    return;
  }
  
  if (newPass.length < 6) {
    alert('Password minimal 6 karakter');
    return;
  }
  
  const result = await apiCall('change_password', 'POST', {
    nim: currentUser.nim,
    old_password: oldPass,
    new_password: newPass
  });
  
  if (result.success) {
    // Update saved password if Remember Me is active
    const wasRemembered = getCookie('simalas_remember');
    if (wasRemembered === 'true') {
      setCookie('simalas_pass', newPass, 30);
    }
    
    closeModal('modalChangePass');
    alert('✅ Password berhasil diubah');
    document.getElementById('formChangePass').reset();
  } else {
    alert('❌ ' + result.message);
  }
};

window.exportKas = function() {
  const ks = Object.values(kasCache || {});
  let csv = 'No,NIM,Nama,Nominal,Status\n';
  ks.forEach((k, idx) => {
    csv += `"${idx + 1}","${k.nim || '-'}","${k.name || 'Anggota'}","Rp ${formatRupiah(k.amount || 0)}","${k.paid ? 'Sudah Bayar' : 'Belum Bayar'}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kas_kelas.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// =====================================================
// MODAL & UI HELPERS
// =====================================================
window.toggleCourseField = function() {
  const scope = document.getElementById('uploadScope').value;
  const courseGroup = document.getElementById('courseGroup');
  const courseInput = document.getElementById('uploadCourse');
  
  if (scope === 'specific') {
    courseGroup.style.display = 'block';
    courseInput.required = true;
  } else {
    courseGroup.style.display = 'none';
    courseInput.required = false;
    courseInput.value = '';
  }
};

window.toggleUploadType = function() {
  const type = document.getElementById('uploadType').value;
  const fileGroup = document.getElementById('fileGroup');
  const linkGroup = document.getElementById('linkGroup');
  const fileInput = document.getElementById('uploadFile');
  const linkInput = document.getElementById('uploadLink');
  
  if (type === 'file') {
    fileGroup.style.display = 'block';
    linkGroup.style.display = 'none';
    fileInput.required = true;
    linkInput.required = false;
  } else {
    fileGroup.style.display = 'none';
    linkGroup.style.display = 'block';
    fileInput.required = false;
    linkInput.required = true;
  }
};

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  const section = document.getElementById(id);
  if (section) section.classList.add('active');
  
  const navs = Array.from(document.querySelectorAll('.nav-tab'));
  const target = navs.find(n => n.textContent.trim().toLowerCase().includes(id));
  if (target) target.classList.add('active');
  else navs[0].classList.add('active');
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"'`]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;', '`': '&#96;'
  })[c]);
}

function formatRupiah(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7) return days + ' hari yang lalu';
  if (days < 30) return Math.floor(days / 7) + ' minggu yang lalu';
  
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
}

function formatDeadlineDetailed(d) {
  const now = new Date();
  const diff = d - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const dateStr = d.toLocaleDateString('id-ID', options);
  
  if (days < 0) return `Terlambat (${dateStr})`;
  if (days === 0) return `Hari ini - ${dateStr}`;
  if (days === 1) return `Besok - ${dateStr}`;
  return `${days} hari lagi (${dateStr})`;
}

function formatEventDate(d) {
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString('id-ID', options);
}

// =====================================================
// EVENT LISTENERS
// =====================================================
btnLogin.addEventListener('click', doLogin);

document.addEventListener('DOMContentLoaded', () => {
  loadSavedCredentials();
  loginOverlay.style.display = 'flex';
  appContainer.style.display = 'none';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && loginOverlay.style.display === 'flex') {
    const focusedElement = document.activeElement;
    if (focusedElement && (focusedElement.id === 'loginNIM' || focusedElement.id === 'loginPass')) {
      doLogin();
    }
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
});

window.onclick = function(e) {
  if (e.target.classList && e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
};

// Expose functions to window
window.showSection = showSection;
window.doLogout = doLogout;
window.openModal = openModal;
window.closeModal = closeModal;

console.log('%c🎓 SIMALAS MySQL Version v1.0', 'color: #6366f1; font-size: 22px; font-weight: bold;');
console.log('%c✅ Database: db_simalas', 'color: #10b981; font-size: 15px;');
console.log('%c🔐 Remember Me Feature Active!', 'color: #a855f7; font-size: 14px;');
console.log('%c📦 All Features Loaded!', 'color: #f59e0b; font-size: 14px;');