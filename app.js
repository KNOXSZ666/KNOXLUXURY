// =============================================
// KNOX SHOP - APP.JS
// Supabase + Tất cả chức năng
// =============================================

// ----- CONFIG -----
const SUPABASE_URL = 'https://lsievokkismxxaiezdlm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzaWV2b2traXNteHhhaWV6ZGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjY0NzgsImV4cCI6MjA5NzAwMjQ3OH0.TZ6_NlpDIrl6xDucsc8S4hqA23RQVWsVLrQRjtr6YmQ';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'nguyenmm2803';

// ----- Supabase Client -----
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- State -----
let currentUser = null;
let currentLang = 'vi';
let currentTab = 'home';
let currentHistoryTab = 'orders';
let balanceInterval = null;
let notifInterval = null;
let chartInstance = null;

// ----- DOM Refs -----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// =============================================
// 1. LANGUAGE SYSTEM
// =============================================
const LANG = {
  vi: {
    home: 'Trang chủ',
    services: 'Dịch vụ',
    history: 'Lịch sử',
    tickets: 'Hỗ trợ',
    dashboard: 'Dashboard',
    logout: 'Đăng xuất',
    welcome: '🔥 KNOX Shop - Mod Game & Script',
    subtitle: 'Uy tín - Chất lượng - Giá tốt',
    buy_now: 'Mua ngay',
    contact: 'Liên hệ',
    price: 'Giá',
    game_account: 'Tài khoản game',
    game_password: 'Mật khẩu game',
    voucher: 'Mã giảm giá',
    apply: 'Áp dụng',
    note: 'Ghi chú',
    no_account: 'Khách',
    deposit: 'Nạp tiền',
    card_deposit: 'Nạp thẻ',
    pending: 'Chờ duyệt',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    copy: 'Sao chép',
    copied: 'Đã sao chép!'
  },
  en: {
    home: 'Home',
    services: 'Services',
    history: 'History',
    tickets: 'Support',
    dashboard: 'Dashboard',
    logout: 'Logout',
    welcome: '🔥 KNOX Shop - Mod Game & Script',
    subtitle: 'Trusted - Quality - Best Price',
    buy_now: 'Buy Now',
    contact: 'Contact',
    price: 'Price',
    game_account: 'Game Account',
    game_password: 'Game Password',
    voucher: 'Voucher Code',
    apply: 'Apply',
    note: 'Note',
    no_account: 'Guest',
    deposit: 'Deposit',
    card_deposit: 'Card Deposit',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    copy: 'Copy',
    copied: 'Copied!'
  }
};

function t(key) {
  return LANG[currentLang]?.[key] || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('knox_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  translatePage();
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}

// =============================================
// 2. TOAST & MODAL
// =============================================
function showToast(msg, type = 'info') {
  const container = $('#toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showModal(title, bodyHTML, confirmText = 'OK', onConfirm = null) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modalOverlay').classList.add('open');
  $('#modalConfirm').textContent = confirmText;
  $('#modalConfirm').onclick = () => {
    $('#modalOverlay').classList.remove('open');
    if (onConfirm) onConfirm();
  };
  $('#modalClose').onclick = () => $('#modalOverlay').classList.remove('open');
}

function closeModal() {
  $('#modalOverlay').classList.remove('open');
}

// =============================================
// 3. AUTH SYSTEM
// =============================================
async function register() {
  const username = prompt('Nhập username (>=3 ký tự):');
  if (!username || username.length < 3) return showToast('Username phải >=3 ký tự', 'error');
  if (username.toLowerCase() === 'admin') return showToast('Không được đăng ký tên admin', 'error');
  
  const password = prompt('Nhập password (>=6 ký tự):');
  if (!password || password.length < 6) return showToast('Password phải >=6 ký tự', 'error');
  
  const email = prompt('Nhập email (tùy chọn):') || '';
  const ref = prompt('Nhập mã giới thiệu (nếu có):') || '';
  
  // Tạo mã referral unique
  const refCode = 'REF' + String(Math.floor(100000 + Math.random() * 900000));
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      username,
      password,
      email,
      referral_code: refCode,
      referred_by: ref || null,
      balance: 0,
      total_spent: 0,
      total_deposited: 0,
      vip_level: 'NEW',
      is_locked: false,
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) return showToast('Lỗi: ' + error.message, 'error');
  showToast('Đăng ký thành công! Mã giới thiệu: ' + refCode, 'success');
}

async function login() {
  const username = prompt('Tên đăng nhập:');
  if (!username) return;
  const password = prompt('Mật khẩu:');
  if (!password) return;

  // Kiểm tra admin
  if (username === ADMIN_USERNAME) {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('knox_admin', 'true');
      window.location.href = './admin.html';
      return;
    } else {
      return showToast('Mật khẩu Admin sai!', 'error');
    }
  }

  // Kiểm tra user trong DB
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return showToast('Tên không tồn tại', 'error');
  if (data.password !== password) return showToast('Mật khẩu sai', 'error');
  if (data.is_locked) return showToast('Tài khoản bị khóa! Liên hệ admin.', 'error');

  // Lưu session
  currentUser = data;
  localStorage.setItem('knox_user', JSON.stringify(data));
  
  // Ghi login history
  await supabase.from('login_history').insert([{
    username: data.username,
    ip: 'client',
    device: navigator.userAgent,
    browser: navigator.userAgent,
    success: true,
    created_at: new Date().toISOString()
  }]);

  // Update last_login
  await supabase.from('users')
    .update({ last_login: new Date().toISOString(), last_ip: 'client', last_device: navigator.userAgent })
    .eq('username', data.username);

  showToast('Đăng nhập thành công!', 'success');
  updateUI();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('knox_user');
  localStorage.removeItem('knox_admin');
  updateUI();
  showToast('Đã đăng xuất', 'info');
}

function checkAuth() {
  const stored = localStorage.getItem('knox_user');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      updateUI();
    } catch(e) { localStorage.removeItem('knox_user'); }
  }
  if (localStorage.getItem('knox_admin') === 'true') {
    // Nếu đang ở trang chính, hiển thị nút admin
    if (!window.location.pathname.includes('admin.html')) {
      // Thêm nút admin vào UI
    }
  }
}

function updateUI() {
  const isLoggedIn = currentUser !== null;
  const usernameEl = $('#displayUsername');
  const vipEl = $('#displayVip');
  const balanceEl = $('#displayBalance');
  const hUsername = $('#hamburgerUsername');
  const hVip = $('#hamburgerVip');
  const hBalance = $('#hamburgerBalance');

  if (isLoggedIn) {
    usernameEl.textContent = currentUser.username;
    vipEl.textContent = currentUser.vip_level || 'NEW';
    vipEl.className = 'vip-badge' + (currentUser.vip_level === 'VIP4' ? ' vip4' : '');
    balanceEl.textContent = formatPrice(currentUser.balance || 0);
    hUsername.textContent = currentUser.username;
    hVip.textContent = currentUser.vip_level || 'NEW';
    hBalance.textContent = formatPrice(currentUser.balance || 0);
  } else {
    usernameEl.textContent = 'Khách';
    vipEl.textContent = 'NEW';
    vipEl.className = 'vip-badge';
    balanceEl.textContent = '0đ';
    hUsername.textContent = 'Khách';
    hVip.textContent = 'NEW';
    hBalance.textContent = '0đ';
  }
}

// =============================================
// 4. FORMAT HELPERS
// =============================================
function formatPrice(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function parsePrice(str) {
  return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

function genCode(prefix) {
  return prefix + '-' + String(Math.floor(100000 + Math.random() * 900000));
}

// =============================================
// 5. BALANCE REAL-TIME
// =============================================
async function refreshBalance() {
  if (!currentUser) return;
  const { data, error } = await supabase
    .from('users')
    .select('balance, total_spent, total_deposited, vip_level')
    .eq('username', currentUser.username)
    .single();
  if (error) return;
  if (data) {
    currentUser.balance = data.balance;
    currentUser.total_spent = data.total_spent;
    currentUser.total_deposited = data.total_deposited;
    currentUser.vip_level = data.vip_level;
    localStorage.setItem('knox_user', JSON.stringify(currentUser));
    updateUI();
  }
}

function startBalanceRefresh() {
  if (balanceInterval) clearInterval(balanceInterval);
  balanceInterval = setInterval(refreshBalance, 1000);
}

// =============================================
// 6. LOAD PRODUCTS & HOT DEALS
// =============================================
const PRODUCTS = [
  { name: 'Mod Skill', price: 10000, category: 'mod' },
  { name: 'Mod Cá', price: 20000, category: 'mod' },
  { name: 'Mod Level', price: 10000, category: 'mod' },
  { name: 'Mod Item', price: 20000, category: 'mod' },
  { name: 'Mod Pet', price: 30000, category: 'mod' },
  { name: 'Mod Kim Cương', price: 30000, category: 'mod' },
  { name: 'Mod Điếu Hồn', price: 30000, category: 'mod' },
  { name: 'Câu Cá Vạn Cân Full', price: 0, category: 'mod' },
  { name: 'Sniper Arena', price: 15000, category: 'script' },
  { name: 'Bản Mod (Tự Mod)', price: 85000, category: 'other' },
  { name: 'Câu Chung (Theo Giờ)', price: 20000, category: 'other' }
];

async function loadProducts() {
  const grid = $('#productsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  // Load hot deals từ DB
  const { data: deals } = await supabase.from('hot_deals').select('*').eq('active', true);
  
  PRODUCTS.forEach(p => {
    const deal = deals?.find(d => d.product_name === p.name);
    const card = document.createElement('div');
    card.className = 'product-card';
    const isContact = p.price === 0;
    const priceDisplay = isContact ? 'Liên hệ' : formatPrice(p.price);
    const priceOld = deal ? formatPrice(deal.original_price) : '';
    const priceNew = deal ? formatPrice(deal.original_price * (1 - deal.discount_percent / 100)) : '';
    
    card.innerHTML = `
      ${deal ? `<div class="badge-hot">-${deal.discount_percent}%</div>` : ''}
      <div class="name">${p.name}</div>
      ${deal ? `<div class="price-old">${priceOld}</div>` : ''}
      <div class="price-new">${deal ? priceNew : priceDisplay}</div>
      <button class="btn-buy ${isContact ? 'btn-contact' : ''}" data-product='${JSON.stringify(p)}'>
        ${isContact ? '📞 Liên hệ' : '🛒 Mua ngay'}
      </button>
    `;
    grid.appendChild(card);
  });

  // Gán sự kiện mua
  grid.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', function() {
      const p = JSON.parse(this.dataset.product);
      if (p.price === 0) {
        showModal('Liên hệ', `Vui lòng liên hệ Zalo: 0564 721 862 hoặc Telegram: @ngonthe666 để đặt mua <b>${p.name}</b>`);
      } else {
        openBuyModal(p);
      }
    });
  });

  // Load hot deals
  loadHotDeals();
}

async function loadHotDeals() {
  const grid = $('#hotDealsGrid');
  if (!grid) return;
  const { data: deals } = await supabase.from('hot_deals').select('*').eq('active', true);
  if (!deals || deals.length === 0) {
    grid.innerHTML = '<p style="color:#666;text-align:center;grid-column:1/-1;">Hiện chưa có hot deal</p>';
    return;
  }
  grid.innerHTML = '';
  deals.forEach(d => {
    const newPrice = d.original_price * (1 - d.discount_percent / 100);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="badge-hot">-${d.discount_percent}%</div>
      <div class="name">${d.product_name}</div>
      <div class="price-old">${formatPrice(d.original_price)}</div>
      <div class="price-new">${formatPrice(newPrice)}</div>
      <div style="font-size:0.75rem;color:#888;">${d.description || ''}</div>
      <button class="btn-buy" onclick="showToast('Vui lòng đăng nhập để mua','info')">🛒 Mua ngay</button>
    `;
    grid.appendChild(card);
  });
}

// =============================================
// 7. BUY MODAL
// =============================================
function openBuyModal(product) {
  if (!currentUser) {
    return showModal('Cần đăng nhập', 'Vui lòng đăng nhập để mua hàng. <br><button class="btn-primary" onclick="login()">Đăng nhập</button>');
  }
  showModal('Mua: ' + product.name, `
    <div class="form-group">
      <label>Tài khoản game</label>
      <input id="buyGameUser" placeholder="Nhập tài khoản game" />
    </div>
    <div class="form-group">
      <label>Mật khẩu game</label>
      <input id="buyGamePass" type="password" placeholder="Nhập mật khẩu game" />
    </div>
    <div class="form-group">
      <label>Mã giảm giá (tùy chọn)</label>
      <input id="buyVoucher" placeholder="Nhập mã" />
      <button class="btn-small" onclick="applyVoucherBuy()">Áp dụng</button>
      <span id="buyVoucherResult"></span>
    </div>
    <div class="form-group">
      <label>Ghi chú</label>
      <textarea id="buyNote" placeholder="Ghi chú thêm..."></textarea>
    </div>
    <div style="margin-top:12px;font-size:1.2rem;font-weight:700;color:#00d4ff;">
      Giá: ${formatPrice(product.price)}
      <span id="buyDiscountDisplay"></span>
    </div>
  `, 'Xác nhận mua', async () => {
    await processBuy(product);
  });
}

let buyVoucherDiscount = 0;

async function applyVoucherBuy() {
  const code = document.getElementById('buyVoucher')?.value?.toUpperCase();
  if (!code) return showToast('Nhập mã giảm giá', 'error');
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code)
    .eq('active', true)
    .single();
  if (error || !data) return showToast('Mã không hợp lệ', 'error');
  if (data.used_count >= data.max_uses) return showToast('Mã đã hết lượt', 'error');
  buyVoucherDiscount = data.discount_percent;
  const el = document.getElementById('buyVoucherResult');
  if (el) el.textContent = `✅ Giảm ${buyVoucherDiscount}%`;
  showToast(`Áp dụng thành công! Giảm ${buyVoucherDiscount}%`, 'success');
}

async function processBuy(product) {
  const gameUser = document.getElementById('buyGameUser')?.value?.trim();
  const gamePass = document.getElementById('buyGamePass')?.value?.trim();
  if (!gameUser || gameUser.length < 3) return showToast('Tài khoản game phải >=3 ký tự', 'error');
  if (!gamePass || gamePass.length < 3) return showToast('Mật khẩu game phải >=3 ký tự', 'error');
  
  const note = document.getElementById('buyNote')?.value || '';
  let finalPrice = product.price;
  if (buyVoucherDiscount > 0) {
    finalPrice = Math.round(finalPrice * (1 - buyVoucherDiscount / 100));
  }

  if (currentUser.balance < finalPrice && finalPrice > 0) {
    showToast('Không đủ tiền! Đang mở modal nạp tiền...', 'error');
    setTimeout(() => openDepositModal(), 1500);
    return;
  }

  const orderCode = genCode('KNX');
  const { error } = await supabase.from('orders').insert([{
    order_code: orderCode,
    username: currentUser.username,
    service: product.name,
    payment: 'ví',
    note: note,
    price: finalPrice,
    status: 'pending',
    progress: 0,
    game_username: gameUser,
    game_password: gamePass,
    created_at: new Date().toISOString()
  }]);

  if (error) return showToast('Lỗi tạo đơn: ' + error.message, 'error');

  // Trừ tiền
  if (finalPrice > 0) {
    const newBalance = currentUser.balance - finalPrice;
    await supabase.from('users')
      .update({ balance: newBalance, total_spent: (currentUser.total_spent || 0) + finalPrice })
      .eq('username', currentUser.username);
    currentUser.balance = newBalance;
    currentUser.total_spent = (currentUser.total_spent || 0) + finalPrice;
    localStorage.setItem('knox_user', JSON.stringify(currentUser));
  }

  // Notification
  await supabase.from('notifications').insert([{
    username: currentUser.username,
    title: 'Đơn hàng mới',
    message: `Đơn hàng ${orderCode} - ${product.name} đã được tạo. Chờ admin duyệt.`,
    type: 'info',
    created_at: new Date().toISOString()
  }]);

  showToast('Đặt hàng thành công! Mã: ' + orderCode, 'success');
  buyVoucherDiscount = 0;
  updateUI();
  loadHistory();
}

// =============================================
// 8. DEPOSIT
// =============================================
function openDepositModal() {
  showModal('💳 Nạp tiền', `
    <div class="form-group">
      <label>Số tiền</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
        <button class="btn-small" onclick="setDepositAmount(10000)">10K</button>
        <button class="btn-small" onclick="setDepositAmount(20000)">20K</button>
        <button class="btn-small" onclick="setDepositAmount(50000)">50K</button>
        <button class="btn-small" onclick="setDepositAmount(100000)">100K</button>
        <button class="btn-small" onclick="setDepositAmount(200000)">200K</button>
        <button class="btn-small" onclick="setDepositAmount(500000)">500K</button>
      </div>
      <input id="depositAmount" type="number" placeholder="Nhập số tiền" />
    </div>
    <div class="form-group">
      <label>Phương thức</label>
      <select id="depositMethod">
        <option value="VCB">Vietcombank</option>
        <option value="GCoin">GCoin</option>
      </select>
    </div>
    <div class="form-group">
      <label>Ghi chú</label>
      <input id="depositNote" placeholder="Ghi chú" />
    </div>
  `, 'Tạo lệnh nạp', async () => {
    await processDeposit();
  });
}

function setDepositAmount(amount) {
  const el = document.getElementById('depositAmount');
  if (el) el.value = amount;
}

async function processDeposit() {
  const amount = parseInt(document.getElementById('depositAmount')?.value);
  if (!amount || amount < 10000) return showToast('Số tiền tối thiểu 10.000đ', 'error');
  const method = document.getElementById('depositMethod')?.value || 'VCB';
  const note = document.getElementById('depositNote')?.value || '';

  // Tạo 5 số cố định cho user (lưu trong localStorage)
  let depositCode = localStorage.getItem('knox_deposit_code_' + currentUser.username);
  if (!depositCode) {
    depositCode = String(Math.floor(10000 + Math.random() * 20000));
    localStorage.setItem('knox_deposit_code_' + currentUser.username, depositCode);
  }

  const fullCode = 'NAP' + depositCode;
  const depositRef = genCode('DEP');

  const { error } = await supabase.from('deposits').insert([{
    deposit_code: depositRef,
    username: currentUser.username,
    amount: amount,
    method: method,
    note: note + ' | Mã CK: ' + fullCode,
    status: 'pending',
    created_at: new Date().toISOString()
  }]);

  if (error) return showToast('Lỗi: ' + error.message, 'error');

  showModal('✅ Hướng dẫn chuyển khoản', `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:1.2rem;font-weight:700;color:#00d4ff;">VIETCOMBANK</div>
      <div style="font-size:1.4rem;font-weight:700;color:#fff;">1064291846</div>
      <div style="color:#888;">NGUYEN TRUNG NGUYEN</div>
      <hr style="border-color:#1a1a2e;margin:12px 0;" />
      <div style="font-size:0.9rem;">Nội dung chuyển khoản:</div>
      <div style="font-size:1.6rem;font-weight:900;color:#ffd700;background:#12121f;padding:8px;border-radius:8px;margin:8px 0;">
        ${fullCode}
      </div>
      <div style="font-size:0.8rem;color:#888;">Số tiền: <b style="color:#fff;">${formatPrice(amount)}</b></div>
      <div style="font-size:0.8rem;color:#888;">Sau khi chuyển, admin sẽ duyệt và cộng tiền tự động.</div>
      <button class="btn-primary" onclick="closeModal();window.scrollTo(0,0);">Đã hiểu, quay về trang chủ</button>
    </div>
  `, 'Đóng', () => {
    window.scrollTo(0, 0);
    loadHistory();
  });

  showToast('Đã tạo lệnh nạp, vui lòng chuyển khoản!', 'success');
}

// =============================================
// 9. HISTORY
// =============================================
async function loadHistory(type = 'orders') {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  let html = '';
  if (type === 'orders') {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('username', currentUser?.username || '')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="color:#666;">Chưa có đơn hàng nào</p>';
      return;
    }
    data.forEach(o => {
      const statusClass = o.status === 'completed' ? 'status-completed' : 
                          o.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
      html += `
        <div class="history-item">
          <div class="row"><span class="label">Mã:</span><span class="value">${o.order_code}</span></div>
          <div class="row"><span class="label">Dịch vụ:</span><span class="value">${o.service}</span></div>
          <div class="row"><span class="label">Giá:</span><span class="value">${formatPrice(o.price)}</span></div>
          <div class="row"><span class="label">Game:</span><span class="value">${o.game_username || ''} / ${o.game_password ? '••••' : ''}</span></div>
          <div class="row"><span class="label">Trạng thái:</span><span class="value ${statusClass}">${o.status}</span></div>
          ${o.progress > 0 ? `<div class="row"><span class="label">Tiến độ:</span><span class="value">${o.progress}%</span></div>` : ''}
          ${o.reject_reason ? `<div class="row"><span class="label">Lý do:</span><span class="value" style="color:#ff4444;">${o.reject_reason}</span></div>` : ''}
          ${o.download_link ? `<div class="row"><span class="label">Link:</span><a href="${o.download_link}" target="_blank" style="color:#00d4ff;">Tải về</a></div>` : ''}
          ${o.status === 'pending' ? `<button class="btn-small" onclick="cancelOrder('${o.order_code}')">Hủy đơn</button>` : ''}
          ${o.status === 'completed' ? `<button class="btn-small" onclick="rateOrder('${o.order_code}')">⭐ Đánh giá</button>` : ''}
        </div>
      `;
    });
  } else if (type === 'deposits') {
    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('username', currentUser?.username || '')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="color:#666;">Chưa có lịch sử nạp</p>';
      return;
    }
    data.forEach(d => {
      html += `
        <div class="history-item">
          <div class="row"><span class="label">Mã:</span><span class="value">${d.deposit_code}</span></div>
          <div class="row"><span class="label">Số tiền:</span><span class="value">${formatPrice(d.amount)}</span></div>
          <div class="row"><span class="label">PT:</span><span class="value">${d.method || 'CK'}</span></div>
          <div class="row"><span class="label">Trạng thái:</span><span class="value ${d.status === 'completed' ? 'status-completed' : 'status-pending'}">${d.status}</span></div>
        </div>
      `;
    });
  } else if (type === 'cards') {
    const { data } = await supabase
      .from('card_deposits')
      .select('*')
      .eq('username', currentUser?.username || '')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="color:#666;">Chưa có lịch sử nạp thẻ</p>';
      return;
    }
    data.forEach(d => {
      html += `
        <div class="history-item">
          <div class="row"><span class="label">Mã:</span><span class="value">${d.card_code}</span></div>
          <div class="row"><span class="label">Nhà mạng:</span><span class="value">${d.telco}</span></div>
          <div class="row"><span class="label">Mệnh giá:</span><span class="value">${formatPrice(d.amount)}</span></div>
          <div class="row"><span class="label">Nhận:</span><span class="value">${formatPrice(d.actual_amount || 0)}</span></div>
          <div class="row"><span class="label">Trạng thái:</span><span class="value ${d.status === 'completed' ? 'status-completed' : 'status-pending'}">${d.status}</span></div>
        </div>
      `;
    });
  }
  
  container.innerHTML = html;
}

// =============================================
// 10. CANCEL ORDER
// =============================================
async function cancelOrder(orderCode) {
  if (!confirm('Bạn chắc chắn muốn hủy đơn này?')) return;
  
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('order_code', orderCode)
    .single();
  
  if (!order || order.status !== 'pending') {
    return showToast('Đơn không thể hủy', 'error');
  }

  // Hoàn tiền
  if (order.price > 0) {
    const newBalance = currentUser.balance + order.price;
    await supabase.from('users')
      .update({ balance: newBalance })
      .eq('username', currentUser.username);
    currentUser.balance = newBalance;
    localStorage.setItem('knox_user', JSON.stringify(currentUser));
  }

  await supabase.from('orders')
    .update({ status: 'cancelled', reject_reason: 'Người dùng tự hủy' })
    .eq('order_code', orderCode);

  showToast('Đã hủy đơn! Tiền đã hoàn về ví.', 'success');
  updateUI();
  loadHistory();
}

// =============================================
// 11. RATE ORDER
// =============================================
async function rateOrder(orderCode) {
  const rating = prompt('Đánh giá 1-5 sao:');
  if (!rating || rating < 1 || rating > 5) return showToast('Vui lòng nhập 1-5', 'error');
  const comment = prompt('Nhận xét:') || '';
  
  const { data: order } = await supabase
    .from('orders')
    .select('service')
    .eq('order_code', orderCode)
    .single();
  
  await supabase.from('reviews').insert([{
    username: currentUser.username,
    service: order?.service || 'unknown',
    rating: parseInt(rating),
    comment: comment,
    created_at: new Date().toISOString()
  }]);

  await supabase.from('orders')
    .update({ rating: parseInt(rating) })
    .eq('order_code', orderCode);

  showToast('Cảm ơn bạn đã đánh giá!', 'success');
}

// =============================================
// 12. TICKETS
// =============================================
async function loadTickets() {
  const container = document.getElementById('ticketList');
  if (!container) return;
  
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('username', currentUser?.username || '')
    .order('created_at', { ascending: false });
  
  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:#666;">Chưa có ticket nào</p>';
    return;
  }
  
  container.innerHTML = data.map(t => `
    <div class="ticket-item">
      <div class="row"><span class="label">Mã:</span><span class="value">${t.ticket_code}</span></div>
      <div class="row"><span class="label">Tiêu đề:</span><span class="value">${t.subject}</span></div>
      <div class="row"><span class="label">Nội dung:</span><span class="value">${t.message}</span></div>
      ${t.admin_reply ? `<div class="row"><span class="label">Admin trả lời:</span><span class="value" style="color:#00d4ff;">${t.admin_reply}</span></div>` : ''}
      <div class="row"><span class="label">Trạng thái:</span><span class="value ${t.status === 'closed' ? 'status-completed' : 'status-pending'}">${t.status}</span></div>
    </div>
  `).join('');
}

function newTicket() {
  const subject = prompt('Tiêu đề:');
  if (!subject) return;
  const message = prompt('Nội dung:');
  if (!message) return;
  
  const code = genCode('TKT');
  supabase.from('tickets').insert([{
    ticket_code: code,
    username: currentUser.username,
    subject: subject,
    message: message,
    status: 'open',
    created_at: new Date().toISOString()
  }]).then(() => {
    showToast('Ticket đã tạo! Mã: ' + code, 'success');
    loadTickets();
  });
}

// =============================================
// 13. NOTIFICATIONS
// =============================================
async function loadNotifications() {
  if (!currentUser) return;
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('username', currentUser.username)
    .order('created_at', { ascending: false })
    .limit(20);
  
  const badge = document.getElementById('notifBadge');
  if (badge && data) {
    const unread = data.filter(n => !n.read).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'inline' : 'none';
  }
}

function toggleNotifications() {
  // Hiển thị danh sách thông báo trong modal
  supabase.from('notifications')
    .select('*')
    .eq('username', currentUser.username)
    .order('created_at', { ascending: false })
    .limit(20)
    .then(({ data }) => {
      if (!data || data.length === 0) {
        showModal('📢 Thông báo', 'Không có thông báo mới');
        return;
      }
      let html = data.map(n => `
        <div style="border-bottom:1px solid #1a1a2e;padding:8px 0;">
          <div style="font-weight:700;color:${n.type === 'success' ? '#00aa55' : n.type === 'error' ? '#ff4444' : '#00d4ff'};">${n.title}</div>
          <div style="color:#888;font-size:0.85rem;">${n.message}</div>
          <div style="font-size:0.65rem;color:#444;">${new Date(n.created_at).toLocaleString()}</div>
        </div>
      `).join('');
      showModal('📢 Thông báo', html);
      // Đánh dấu đã đọc
      supabase.from('notifications')
        .update({ read: true })
        .eq('username', currentUser.username)
        .eq('read', false);
      loadNotifications();
    });
}

// =============================================
// 14. DASHBOARD
// =============================================
async function loadDashboard() {
  const container = document.getElementById('dashboardStats');
  if (!container || !currentUser) return;
  
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('username', currentUser.username);
  
  const totalOrders = orders?.length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
  
  const vipLevels = [
    { level: 'NEW', min: 0, discount: 0 },
    { level: 'VIP1', min: 100000, discount: 5 },
    { level: 'VIP2', min: 500000, discount: 10 },
    { level: 'VIP3', min: 1000000, discount: 15 },
    { level: 'VIP4', min: 5000000, discount: 20 }
  ];
  
  const nextVip = vipLevels.find(v => currentUser.total_deposited < v.min);
  const needMore = nextVip ? formatPrice(nextVip.min - currentUser.total_deposited) : 'Đã đạt VIP4';
  
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
      <div class="admin-stat-card"><div class="num">${formatPrice(currentUser.balance)}</div><div class="label">Số dư</div></div>
      <div class="admin-stat-card"><div class="num">${formatPrice(currentUser.total_deposited)}</div><div class="label">Tổng nạp</div></div>
      <div class="admin-stat-card"><div class="num">${formatPrice(currentUser.total_spent)}</div><div class="label">Tổng chi</div></div>
      <div class="admin-stat-card"><div class="num">${totalOrders}</div><div class="label">Đơn hàng</div></div>
      <div class="admin-stat-card"><div class="num">${completedOrders}</div><div class="label">Hoàn thành</div></div>
      <div class="admin-stat-card"><div class="num">${currentUser.vip_level}</div><div class="label">VIP</div></div>
    </div>
    <div style="margin-top:16px;padding:12px;background:#12121f;border-radius:10px;border:1px solid #1a1a2e;">
      <div style="color:#888;">Tiến trình VIP tiếp theo: <b style="color:#fff;">${nextVip ? nextVip.level : 'MAX'}</b></div>
      <div style="color:#888;">Cần thêm: <b style="color:#00d4ff;">${needMore}</b></div>
      <div style="color:#888;">Ưu đãi hiện tại: <b style="color:#ffd700;">${vipLevels.find(v => v.level === currentUser.vip_level)?.discount || 0}%</b></div>
    </div>
  `;
}

// =============================================
// 15. CHAT WIDGET
// =============================================
function initChat() {
  const bubble = document.getElementById('chatBubble');
  const box = document.getElementById('chatBox');
  const close = document.getElementById('chatClose');
  
  if (bubble) {
    setTimeout(() => { bubble.style.display = 'flex'; }, 2000);
    bubble.addEventListener('click', () => {
      box.classList.toggle('open');
    });
  }
  if (close) {
    close.addEventListener('click', () => box.classList.remove('open'));
  }
}

// =============================================
// 16. HAMBURGER MENU
// =============================================
function initHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  const menu = document.getElementById('hamburgerMenu');
  const close = document.getElementById('hamburgerClose');
  
  if (btn) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
  }
  if (close) {
    close.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
  // Đóng khi click link
  menu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// =============================================
// 17. TAB SWITCHING
// =============================================
function initTabs() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Hamburger menu items
  document.querySelectorAll('.hamburger-menu-items a[data-tab]').forEach(a => {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      const tab = this.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  
  const target = document.getElementById('tab-' + tab);
  if (target) target.classList.add('active');
  const navLink = document.querySelector(`.nav-link[data-tab="${tab}"]`);
  if (navLink) navLink.classList.add('active');
  
  // Load dữ liệu theo tab
  if (tab === 'history') loadHistory(currentHistoryTab);
  if (tab === 'tickets') loadTickets();
  if (tab === 'dashboard') loadDashboard();
  
  window.scrollTo(0, 0);
}

// =============================================
// 18. HISTORY TAB SWITCH
// =============================================
function initHistoryTabs() {
  document.querySelectorAll('.history-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.history-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentHistoryTab = this.dataset.history;
      loadHistory(currentHistoryTab);
    });
  });
}

// =============================================
// 19. INIT
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  // Check auth
  checkAuth();
  
  // Language
  const savedLang = localStorage.getItem('knox_lang') || 'vi';
  setLang(savedLang);
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  
  // Tabs
  initTabs();
  initHistoryTabs();
  
  // Hamburger
  initHamburger();
  
  // Chat
  initChat();
  
  // Notifications
  loadNotifications();
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = setInterval(loadNotifications, 5000);
  
  // Notification icon click
  document.getElementById('notifIcon')?.addEventListener('click', toggleNotifications);
  
  // Buy button
  document.getElementById('buyBtn')?.addEventListener('click', () => {
    const select = document.getElementById('serviceSelect');
    const selected = select?.value;
    if (!selected) return showToast('Chọn dịch vụ', 'error');
    const product = PRODUCTS.find(p => p.name === selected);
    if (product) openBuyModal(product);
  });
  
  // Service select hiển thị giá
  document.getElementById('serviceSelect')?.addEventListener('change', function() {
    const p = PRODUCTS.find(pr => pr.name === this.value);
    const priceEl = document.getElementById('servicePrice');
    if (p) {
      priceEl.value = p.price === 0 ? 'Liên hệ' : formatPrice(p.price);
    } else {
      priceEl.value = '0đ';
    }
  });
  
  // New ticket
  document.getElementById('newTicketBtn')?.addEventListener('click', newTicket);
  
  // Voucher apply on buy form
  document.getElementById('applyVoucherBtn')?.addEventListener('click', applyVoucherBuy);
  
  // Logout
  document.getElementById('hamburgerLogout')?.addEventListener('click', logout);
  
  // Start balance refresh
  startBalanceRefresh();
  
  // Load products
  loadProducts();
  loadHotDeals();
  
  // Load initial history if logged in
  if (currentUser) {
    loadHistory('orders');
    loadTickets();
    loadDashboard();
  }
  
  console.log('🔥 KNOX Shop loaded successfully!');
});
