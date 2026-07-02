const SUPABASE_URL = 'https://lsievokkismxxaiezdlm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzaWV2b2traXNteHhhaWV6ZGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjY0NzgsImV4cCI6MjA5NzAwMjQ3OH0.TZ6_NlpDIrl6xDucsc8S4hqA23RQVWsVLrQRjtr6YmQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentLang = localStorage.getItem('lang') || 'vi';

// --- UTILS ---
const formatMoney = (amount) => amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
const showToast = (msg, type='success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};
const toggleLang = () => {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('lang', currentLang);
    applyLang();
};
const applyLang = () => {
    if(typeof LANG === 'undefined') return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(LANG[currentLang][key]) {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = LANG[currentLang][key];
            else el.innerText = LANG[currentLang][key];
        }
    });
};

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', async () => {
    applyLang();
    initParticles();
    
    // Check session
    const savedUser = localStorage.getItem('username');
    if(savedUser && savedUser !== 'admin') {
        const {data} = await supabase.from('users').select('*').eq('username', savedUser).maybeSingle();
        if(data) {
            if(data.is_locked) {
                showToast('Tài khoản bị khóa', 'error');
                localStorage.removeItem('username');
            } else {
                currentUser = data;
                renderUserPanel();
                startAutoRefresh();
            }
        } else {
            localStorage.removeItem('username');
            renderGuestPanel();
        }
    } else {
        renderGuestPanel();
    }

    if (window.location.pathname.includes('admin.html')) {
        if(localStorage.getItem('isAdmin')==='true' && typeof initAdmin === 'function') initAdmin();
    } else {
        loadHomeData();
        setTimeout(() => document.getElementById('chat-widget')?.classList.remove('hidden'), 2000);
    }
});

const initParticles = () => {
    const bg = document.getElementById('galaxy-bg');
    if(!bg) return;
    for(let i=0; i<10; i++){
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (10 + Math.random() * 10) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        bg.appendChild(p);
    }
};

// --- SCROLL ANIMATION ---
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if(entry.isIntersecting) entry.target.classList.add('visible');
    });
});
setTimeout(() => {
    document.querySelectorAll('.gravity-drop').forEach(el => observer.observe(el));
}, 500);

// --- MODALS ---
const openModal = (html) => {
    const container = document.getElementById('modals-container');
    if(!container) return;
    container.innerHTML = `
        <div class="modal-overlay" style="display:flex;">
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal()">×</button>
                ${html}
            </div>
        </div>
    `;
    document.body.style.overflow = 'hidden';
};
const closeModal = () => {
    const container = document.getElementById('modals-container');
    if(container) container.innerHTML = '';
    document.body.style.overflow = 'auto';
};

// --- AUTH ---
const showLogin = () => {
    openModal(`
        <h2 class="section-title" data-i18n="login">Đăng Nhập</h2>
        <div class="form-group"><input type="text" id="l-user" placeholder="Tên đăng nhập"></div>
        <div class="form-group"><input type="password" id="l-pass" placeholder="Mật khẩu"></div>
        <button class="btn-holo btn-full" onclick="handleLogin()">Đăng Nhập</button>
        <p class="text-center mt-20">Chưa có tài khoản? <a href="#" style="color:#00e5ff;" onclick="showRegister()">Đăng Ký</a></p>
    `);
    applyLang();
};
const showRegister = () => {
    openModal(`
        <h2 class="section-title" data-i18n="register">Đăng Ký</h2>
        <div class="form-group"><input type="text" id="r-user" placeholder="Tên đăng nhập (>=3 ký tự)"></div>
        <div class="form-group"><input type="password" id="r-pass" placeholder="Mật khẩu (>=6 ký tự)"></div>
        <div class="form-group"><input type="password" id="r-repass" placeholder="Nhập lại mật khẩu"></div>
        <div class="form-group"><input type="text" id="r-ref" placeholder="Mã giới thiệu (nếu có)"></div>
        <button class="btn-holo btn-full" onclick="handleRegister()">Đăng Ký</button>
    `);
    applyLang();
};

const handleLogin = async () => {
    const u = document.getElementById('l-user').value.trim();
    const p = document.getElementById('l-pass').value;
    if(!u || !p) return showToast('Vui lòng nhập đủ thông tin', 'error');

    if(u === 'admin') {
        if(p === 'nguyenmm2803') {
            localStorage.setItem('isAdmin', 'true');
            window.location.href = 'admin.html';
        } else {
            showToast('Mật khẩu Admin sai', 'error');
        }
        return;
    }

    const {data: user, error} = await supabase.from('users').select('*').eq('username', u).maybeSingle();
    if(!user) {
        logHistory(u, false);
        return showToast('Tên không tồn tại', 'error');
    }
    if(user.password !== p) {
        logHistory(u, false);
        return showToast('Mật khẩu sai', 'error');
    }
    if(user.is_locked) return showToast('Tài khoản bị khóa', 'error');

    logHistory(u, true);
    localStorage.setItem('username', u);
    currentUser = user;
    
    // Update last login
    await supabase.from('users').update({last_login: new Date().toISOString()}).eq('id', user.id);
    
    showToast('Đăng nhập thành công');
    closeModal();
    renderUserPanel();
    startAutoRefresh();
};

const handleRegister = async () => {
    const u = document.getElementById('r-user').value.trim();
    const p = document.getElementById('r-pass').value;
    const rp = document.getElementById('r-repass').value;
    const ref = document.getElementById('r-ref').value.trim();

    if(u.length < 3) return showToast('Tên >= 3 ký tự', 'error');
    if(u.toLowerCase() === 'admin') return showToast('Không được dùng tên này', 'error');
    if(p.length < 6) return showToast('Mật khẩu >= 6 ký tự', 'error');
    if(p !== rp) return showToast('Mật khẩu không khớp', 'error');

    // Check exist
    const {data: exist} = await supabase.from('users').select('id').eq('username', u).maybeSingle();
    if(exist) return showToast('Tên đã tồn tại', 'error');

    const myRef = 'REF' + Math.floor(100000 + Math.random() * 900000);
    const napCode = Math.floor(10000 + Math.random() * 20000).toString(); // 10000-30000

    const {error} = await supabase.from('users').insert([{
        username: u, password: p, referral_code: myRef, referred_by: ref, nap_code: napCode
    }]);

    if(error) return showToast('Lỗi hệ thống', 'error');
    showToast('Đăng ký thành công!');
    setTimeout(showLogin, 1000);
};

const logout = () => {
    localStorage.removeItem('username');
    currentUser = null;
    renderGuestPanel();
    showToast('Đã đăng xuất');
};

const logHistory = async (u, success) => {
    await supabase.from('login_history').insert([{
        username: u, ip: 'Hidden', device: navigator.userAgent.substring(0,50), browser: 'Web', success
    }]);
};

// --- USER PANEL UI ---
const renderGuestPanel = () => {
    const html = `
        <button class="btn-holo" onclick="showLogin()" data-i18n="login">Đăng Nhập</button>
        <button class="btn-holo" style="border-color:#ff007f;" onclick="showRegister()" data-i18n="register">Đăng Ký</button>
    `;
    const d = document.getElementById('desktop-user-panel');
    const m = document.getElementById('mobile-user-panel');
    if(d) d.innerHTML = html;
    if(m) m.innerHTML = html;
    
    if(localStorage.getItem('isAdmin') === 'true') {
        const btnAdmin = `<a href="admin.html" class="btn-holo" style="background:#ff007f; text-decoration:none;">Admin Panel</a>`;
        if(d) d.innerHTML = btnAdmin;
        if(m) m.innerHTML = btnAdmin;
    }
};

const renderUserPanel = () => {
    if(!currentUser) return;
    const vipHtml = currentUser.vip_level !== 'NEW' ? `<span class="badge-vip ${currentUser.vip_level.toLowerCase()}">${currentUser.vip_level}</span>` : '';
    const html = `
        <div class="balance-badge" id="nav-balance">${formatMoney(currentUser.balance)}</div>
        <div style="color:#fff; font-weight:bold;">${currentUser.username} ${vipHtml}</div>
        <div class="notif-bell" onclick="showNotifications()">🔔<span class="notif-count" id="notif-cnt">0</span></div>
        <button class="btn-holo" onclick="showDashboard()">Dashboard</button>
        <button class="btn-holo" onclick="logout()">Đăng Xuất</button>
    `;
    const d = document.getElementById('desktop-user-panel');
    const m = document.getElementById('mobile-user-panel');
    if(d) d.innerHTML = html;
    if(m) m.innerHTML = `<div style="text-align:center;">
        <div class="balance-badge" style="margin:0 auto 10px; display:inline-block;" id="mob-balance">${formatMoney(currentUser.balance)}</div>
        <div style="color:#fff; font-weight:bold; margin-bottom:15px; font-size:20px;">${currentUser.username} ${vipHtml}</div>
        <button class="btn-holo btn-full" onclick="showDeposit()">Nạp Tiền</button>
        <button class="btn-holo btn-full" onclick="showDashboard()">Dashboard & Lịch Sử</button>
        <button class="btn-holo btn-full" onclick="logout()" style="border-color:#ff3333;">Đăng Xuất</button>
    </div>`;
    checkNotifs();
};

let refreshInterval;
const startAutoRefresh = () => {
    if(refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
        if(!currentUser) return clearInterval(refreshInterval);
        const {data} = await supabase.from('users').select('balance, is_locked').eq('id', currentUser.id).single();
        if(data) {
            if(data.is_locked) { logout(); return showToast('Tài khoản đã bị khóa', 'error'); }
            if(data.balance !== currentUser.balance) {
                if(data.balance > currentUser.balance) showToast(`+${formatMoney(data.balance - currentUser.balance)} vào ví`, 'success');
                currentUser.balance = data.balance;
                const nb = document.getElementById('nav-balance');
                const mb = document.getElementById('mob-balance');
                if(nb) { nb.innerText = formatMoney(currentUser.balance); nb.style.transform = 'scale(1.2)'; setTimeout(()=>nb.style.transform='scale(1)',300); }
                if(mb) mb.innerText = formatMoney(currentUser.balance);
            }
        }
    }, 5000); // 5s auto refresh
};

// --- DATA FETCHING ---
const loadHomeData = async () => {
    // Scripts
    const {data: scripts} = await supabase.from('scripts').select('*').eq('active', true).order('created_at');
    const grid = document.getElementById('products-grid');
    if(grid && scripts) {
        grid.innerHTML = scripts.map(s => `
            <div class="cyber-card">
                <div class="product-name">${s.name}</div>
                <div class="product-game">${s.game}</div>
                <div class="product-price">${s.price === 0 ? 'Liên hệ' : formatMoney(s.price)}</div>
                <button class="btn-holo btn-full" onclick="buyProduct('${s.id}', '${s.name}', ${s.price})">Mua Ngay</button>
            </div>
        `).join('');
    }

    // Deals
    const {data: deals} = await supabase.from('hot_deals').select('*').eq('active', true);
    const dGrid = document.getElementById('hot-deals-grid');
    if(dGrid && deals) {
        dGrid.innerHTML = deals.length ? deals.map(d => {
            const finalP = d.original_price * (100 - d.discount_percent) / 100;
            return `
            <div class="cyber-card" style="border-color:#ff007f;">
                <span class="badge-discount">-${d.discount_percent}%</span>
                <div class="product-name">${d.product_name}</div>
                <p style="color:#888; text-decoration:line-through; font-size:14px;">${formatMoney(d.original_price)}</p>
                <div class="product-price" style="color:#ff007f;">${formatMoney(finalP)}</div>
                <p style="font-size:14px; margin-bottom:15px;">${d.description}</p>
                <button class="btn-holo btn-full" style="border-color:#ff007f;" onclick="buyProduct('deal_${d.id}', '${d.product_name}', ${finalP})">Mua Deal</button>
            </div>
        `}).join('') : '<p>Chưa có deal nào.</p>';
    }

    // Top Deposit
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const {data: deps} = await supabase.from('deposits').select('username, amount').eq('status', 'completed').gte('created_at', startOfMonth.toISOString());
    const tbody = document.getElementById('top-deposit-body');
    if(tbody && deps) {
        const sums = {};
        deps.forEach(d => sums[d.username] = (sums[d.username]||0) + d.amount);
        const top = Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,10);
        tbody.innerHTML = top.length ? top.map((t,i) => {
            const hiddenName = t[0].substring(0,3) + '***';
            const icon = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
            return `<tr><td>${icon}</td><td>${hiddenName}</td><td style="color:#00e5ff; font-family:'Orbitron'">${formatMoney(t[1])}</td></tr>`;
        }).join('') : '<tr><td colspan="3" class="text-center">Chưa có dữ liệu tháng này</td></tr>';
    }
};

// --- PURCHASE ---
const buyProduct = (id, name, price) => {
    if(!currentUser) return showToast('Vui lòng đăng nhập', 'error');
    let discount = 0;
    if(currentUser.vip_level === 'VIP1') discount=5;
    if(currentUser.vip_level === 'VIP2') discount=10;
    if(currentUser.vip_level === 'VIP3') discount=15;
    if(currentUser.vip_level === 'VIP4') discount=20;
    
    let finalPrice = price > 0 ? price * (100 - discount) / 100 : 0;

    openModal(`
        <h2 class="section-title">Thanh Toán</h2>
        <div style="background:#1a1a2e; padding:15px; border-radius:8px; margin-bottom:20px;">
            <p><strong>Sản phẩm:</strong> <span style="color:#00e5ff;">${name}</span></p>
            ${price>0 ? `<p><strong>Giá gốc:</strong> ${formatMoney(price)}</p>
                         <p><strong>VIP Giảm:</strong> -${discount}%</p>
                         <p><strong>Thanh toán:</strong> <span style="color:#ff007f; font-size:20px; font-weight:bold;" id="p-final">${formatMoney(finalPrice)}</span></p>` 
                      : `<p><strong>Giá:</strong> Liên hệ</p>`}
        </div>
        <div class="form-group"><input type="text" id="p-guser" placeholder="Tài khoản Game (Bắt buộc)"></div>
        <div class="form-group"><input type="password" id="p-gpass" placeholder="Mật khẩu Game (Bắt buộc)"></div>
        <div class="form-group" style="display:flex; gap:10px;">
            <input type="text" id="p-voucher" placeholder="Mã giảm giá">
            <button class="btn-holo" onclick="applyVoucher(${price}, ${discount})">Áp Dụng</button>
        </div>
        <div class="form-group"><textarea id="p-note" placeholder="Ghi chú thêm..."></textarea></div>
        <button class="btn-holo btn-full" onclick="confirmBuy('${name}', ${price}, ${discount})" style="background:#00e5ff; color:#000; font-weight:bold;">XÁC NHẬN MUA</button>
    `);
};
let appliedVoucher = null;
const applyVoucher = async (price, vipDisc) => {
    if(price===0) return;
    const v = document.getElementById('p-voucher').value.toUpperCase().trim();
    if(!v) return;
    const {data} = await supabase.from('vouchers').select('*').eq('code', v).eq('active', true).maybeSingle();
    if(data && data.used_count < data.max_uses) {
        appliedVoucher = data;
        const finalP = price * (100 - vipDisc - data.discount_percent) / 100;
        document.getElementById('p-final').innerText = formatMoney(Math.max(0, finalP));
        showToast('Áp dụng mã thành công!');
    } else {
        showToast('Mã không hợp lệ hoặc hết hạn', 'error');
    }
};
const confirmBuy = async (name, price, vipDisc) => {
    const gu = document.getElementById('p-guser').value.trim();
    const gp = document.getElementById('p-gpass').value;
    const note = document.getElementById('p-note').value;
    if(gu.length < 3 || gp.length < 3) return showToast('Nhập TK/MK game >= 3 ký tự', 'error');

    let finalPrice = price;
    if(price > 0) {
        let totalDisc = vipDisc + (appliedVoucher ? appliedVoucher.discount_percent : 0);
        finalPrice = price * (100 - totalDisc) / 100;
        finalPrice = Math.max(0, finalPrice);
        if(currentUser.balance < finalPrice) {
            showToast('Số dư không đủ!', 'error');
            setTimeout(showDeposit, 1500);
            return;
        }
    }

    const orderCode = 'KNX-' + Math.floor(100000 + Math.random()*900000);
    
    if(finalPrice > 0) {
        const {error: upErr} = await supabase.from('users').update({
            balance: currentUser.balance - finalPrice,
            total_spent: currentUser.total_spent + finalPrice
        }).eq('id', currentUser.id);
        if(upErr) return showToast('Lỗi trừ tiền', 'error');
    }

    await supabase.from('orders').insert([{
        order_code: orderCode, username: currentUser.username, service: name,
        payment: finalPrice > 0 ? 'Ví' : 'Liên hệ', price: finalPrice,
        game_username: gu, game_password: gp, note: note
    }]);

    if(appliedVoucher) {
        await supabase.from('vouchers').update({used_count: appliedVoucher.used_count + 1}).eq('id', appliedVoucher.id);
    }
    createNotif(currentUser.username, 'Đơn hàng mới', `Đã tạo đơn ${orderCode} thành công.`, 'info');

    showToast('Mua hàng thành công!');
    appliedVoucher = null;
    closeModal();
};

// --- DEPOSIT ---
const showDeposit = () => {
    if(!currentUser) return showToast('Vui lòng đăng nhập', 'error');
    openModal(`
        <h2 class="section-title">Nạp Tiền</h2>
        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="btn-holo" style="flex:1;" onclick="renderDepBank()">Ngân Hàng (0% phí)</button>
            <button class="btn-holo" style="flex:1;" onclick="renderDepCard()">Thẻ Cào (-15%)</button>
        </div>
        <div id="dep-content"></div>
    `);
    renderDepBank();
};
const renderDepBank = () => {
    document.getElementById('dep-content').innerHTML = `
        <div class="form-group"><label>Chọn mệnh giá nhanh:</label>
            <div style="display:flex; gap:5px; flex-wrap:wrap;">
                ${[10, 20, 50, 100, 200, 500].map(n => `<button class="action-btn btn-blue" onclick="document.getElementById('d-amt').value=${n*1000}">${n}K</button>`).join('')}
            </div>
        </div>
        <div class="form-group"><input type="number" id="d-amt" placeholder="Số tiền cần nạp"></div>
        <button class="btn-holo btn-full" style="background:#28a745;" onclick="submitDepBank()">TẠO LỆNH NẠP</button>
    `;
};
const submitDepBank = async () => {
    const amt = parseInt(document.getElementById('d-amt').value);
    if(!amt || amt < 10000) return showToast('Tối thiểu 10.000đ', 'error');
    const code = 'NAP' + currentUser.nap_code;
    
    await supabase.from('deposits').insert([{
        deposit_code: code + '-' + Date.now(), username: currentUser.username, amount: amt, method: 'VCB'
    }]);

    document.getElementById('dep-content').innerHTML = `
        <div class="cyber-card" style="text-align:center; border-color:#28a745;">
            <h3 style="color:#28a745; margin-bottom:15px;">Tạo lệnh thành công</h3>
            <p>Vui lòng chuyển khoản đúng thông tin sau:</p>
            <p>Ngân hàng: <strong>Vietcombank</strong></p>
            <p>STK: <strong>1064291846</strong></p>
            <p>Chủ TK: <strong>NGUYEN TRUNG NGUYEN</strong></p>
            <p>Số tiền: <strong style="color:#00e5ff; font-size:20px;">${formatMoney(amt)}</strong></p>
            <p style="margin-top:15px; font-size:18px;">Nội dung CK bắt buộc:</p>
            <div style="background:#111; padding:10px; font-family:'Orbitron'; color:#ff007f; font-size:24px; border-radius:5px; margin-bottom:10px;">${code}</div>
            <p style="font-size:12px; color:#888;">(Admin sẽ duyệt sau 1-5 phút nhận được tiền)</p>
        </div>
    `;
    setTimeout(() => { closeModal(); window.scrollTo(0,0); }, 15000);
};

const renderDepCard = () => {
    document.getElementById('dep-content').innerHTML = `
        <div class="form-group">
            <select id="c-telco">
                <option value="VIETTEL">Viettel</option><option value="VINAPHONE">Vinaphone</option>
                <option value="MOBIFONE">Mobifone</option><option value="VIETNAMOBILE">Vietnamobile</option>
            </select>
        </div>
        <div class="form-group">
            <select id="c-amt" onchange="updateCardRecv()">
                <option value="10000">10.000đ</option><option value="20000">20.000đ</option>
                <option value="50000">50.000đ</option><option value="100000">100.000đ</option>
                <option value="200000">200.000đ</option><option value="500000">500.000đ</option>
            </select>
        </div>
        <p style="color:#00e5ff; margin-bottom:10px;">Thực nhận (-15%): <span id="c-recv">8.500đ</span></p>
        <div class="form-group"><input type="text" id="c-seri" placeholder="Số Seri"></div>
        <div class="form-group"><input type="text" id="c-code" placeholder="Mã Thẻ"></div>
        <button class="btn-holo btn-full" style="background:#ff007f;" onclick="submitCard()">NẠP THẺ</button>
    `;
};
const updateCardRecv = () => {
    const a = parseInt(document.getElementById('c-amt').value);
    document.getElementById('c-recv').innerText = formatMoney(a * 0.85);
};
const submitCard = async () => {
    const tel = document.getElementById('c-telco').value;
    const amt = parseInt(document.getElementById('c-amt').value);
    const seri = document.getElementById('c-seri').value.trim();
    const code = document.getElementById('c-code').value.trim();
    if(!seri || !code) return showToast('Nhập đủ seri & mã thẻ', 'error');

    await supabase.from('card_deposits').insert([{
        card_code: 'CARD-'+Date.now(), username: currentUser.username, telco: tel, amount: amt,
        actual_amount: amt * 0.85, serial: seri, code: code
    }]);
    showToast('Gửi thẻ thành công. Vui lòng chờ duyệt!');
    closeModal();
};

// --- DASHBOARD / HISTORY ---
const showDashboard = async () => {
    if(!currentUser) return;
    
    const {data: orders} = await supabase.from('orders').select('*').eq('username', currentUser.username).order('created_at', {ascending:false});
    
    let vipNext = currentUser.vip_level === 'NEW' ? 100000 : currentUser.vip_level === 'VIP1' ? 500000 : currentUser.vip_level === 'VIP2' ? 1000000 : currentUser.vip_level === 'VIP3' ? 5000000 : 0;
    let progress = vipNext > 0 ? (currentUser.total_deposited / vipNext)*100 : 100;
    
    openModal(`
        <h2 class="section-title">Dashboard</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
            <div class="stat-card" style="padding:10px;"><h3>Số Dư</h3><p style="font-size:18px;">${formatMoney(currentUser.balance)}</p></div>
            <div class="stat-card" style="padding:10px;"><h3>Đã Nạp</h3><p style="font-size:18px;">${formatMoney(currentUser.total_deposited)}</p></div>
            <div class="stat-card" style="padding:10px;"><h3>Đã Tiêu</h3><p style="font-size:18px;">${formatMoney(currentUser.total_spent)}</p></div>
            <div class="stat-card" style="padding:10px;"><h3>VIP</h3><p style="font-size:18px;">${currentUser.vip_level}</p></div>
        </div>
        ${vipNext > 0 ? `<div style="background:#222; border-radius:4px; height:8px; width:100%; margin-bottom:5px; overflow:hidden;"><div style="background:var(--teal-glow); height:100%; width:${Math.min(progress,100)}%;"></div></div><p style="font-size:12px; color:#888; margin-bottom:20px; text-align:right;">Nạp thêm ${formatMoney(Math.max(0, vipNext - currentUser.total_deposited))} để lên VIP kế tiếp</p>` : ''}
        
        <h3 style="color:var(--teal-glow); margin-bottom:10px;">Lịch Sử Đơn Hàng</h3>
        <div style="max-height:300px; overflow-y:auto;">
            ${orders.map(o => `
                <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:5px; margin-bottom:10px; border-left:3px solid ${o.status==='completed'?'#00ff00':o.status==='rejected'?'#ff3333':'#ffcc00'};">
                    <div style="display:flex; justify-content:space-between;"><strong>${o.service}</strong> <span>${formatMoney(o.price)}</span></div>
                    <p style="font-size:12px; color:#aaa;">Mã: ${o.order_code} - TT: ${o.status}</p>
                    <p style="font-size:12px; color:#aaa;">TK: ${o.game_username} <button onclick="navigator.clipboard.writeText('${o.game_username}');showToast('Copy OK')" style="background:none;border:none;color:#00e5ff;cursor:pointer;">[Copy]</button></p>
                    ${o.status === 'pending' ? `<button class="action-btn btn-red mt-20" onclick="cancelOrder('${o.id}')">Hủy Đơn</button>` : ''}
                    ${o.status === 'rejected' ? `<p style="color:#ff3333; font-size:12px;">Lý do: ${o.reject_reason}</p>` : ''}
                    ${o.download_link ? `<a href="${o.download_link}" target="_blank" class="action-btn btn-blue" style="text-decoration:none; display:inline-block; margin-top:5px;">Tải File</a>` : ''}
                </div>
            `).join('')}
        </div>
        <button class="btn-holo btn-full mt-20" onclick="showTickets()">Hỗ Trợ (Tickets)</button>
    `);
};

const cancelOrder = async (id) => {
    const {data: order} = await supabase.from('orders').select('*').eq('id', id).single();
    if(order.status !== 'pending') return showToast('Không thể hủy', 'error');
    
    await supabase.from('orders').update({status: 'rejected', reject_reason: 'Người dùng tự hủy'}).eq('id', id);
    if(order.price > 0) {
        await supabase.from('users').update({
            balance: currentUser.balance + order.price,
            total_spent: currentUser.total_spent - order.price
        }).eq('id', currentUser.id);
    }
    showToast('Hủy & Hoàn tiền thành công');
    showDashboard();
};

// --- TICKETS ---
const showTickets = async () => {
    const {data: tickets} = await supabase.from('tickets').select('*').eq('username', currentUser.username).order('created_at', {ascending:false});
    openModal(`
        <h2 class="section-title">Hỗ Trợ (Tickets)</h2>
        <button class="btn-holo mb-20" onclick="createTicketForm()">+ Tạo Yêu Cầu</button>
        <div style="max-height:300px; overflow-y:auto;">
            ${tickets.map(t => `
                <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:5px; margin-bottom:10px;">
                    <strong>${t.subject}</strong> <span style="font-size:12px; color:${t.status==='open'?'#ffcc00':'#00ff00'}">(${t.status})</span>
                    <p style="font-size:12px; color:#aaa;">${t.message}</p>
                    ${t.admin_reply ? `<div style="background:rgba(0,229,255,0.1); padding:5px; margin-top:5px; border-left:2px solid #00e5ff; font-size:12px;"><strong style="color:#00e5ff">Admin:</strong> ${t.admin_reply}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `);
};
const createTicketForm = () => {
    openModal(`
        <h2 class="section-title">Tạo Ticket</h2>
        <div class="form-group"><input type="text" id="tk-sub" placeholder="Tiêu đề"></div>
        <div class="form-group"><textarea id="tk-msg" rows="4" placeholder="Nội dung cần hỗ trợ..."></textarea></div>
        <button class="btn-holo btn-full" onclick="submitTicket()">Gửi Yêu Cầu</button>
    `);
};
const submitTicket = async () => {
    const sub = document.getElementById('tk-sub').value;
    const msg = document.getElementById('tk-msg').value;
    if(!sub || !msg) return showToast('Nhập đủ thông tin', 'error');
    
    await supabase.from('tickets').insert([{
        ticket_code: 'TKT-'+Date.now(), username: currentUser.username, subject: sub, message: msg
    }]);
    showToast('Đã gửi yêu cầu hỗ trợ');
    showTickets();
};

// --- NOTIFICATIONS ---
const showNotifications = async () => {
    const {data: notifs} = await supabase.from('notifications').select('*').eq('username', currentUser.username).order('created_at', {ascending:false}).limit(20);
    openModal(`
        <h2 class="section-title">Thông Báo</h2>
        <div style="max-height:400px; overflow-y:auto;">
            ${notifs.length ? notifs.map(n => `
                <div style="padding:10px; border-bottom:1px solid #333; background:${n.read?'transparent':'rgba(32,135,255,0.1)'}">
                    <strong style="color:var(--teal-glow)">${n.title}</strong>
                    <p style="font-size:14px; margin-top:5px;">${n.message}</p>
                    <small style="color:#888;">${new Date(n.created_at).toLocaleString('vi-VN')}</small>
                </div>
            `).join('') : '<p>Chưa có thông báo.</p>'}
        </div>
    `);
    await supabase.from('notifications').update({read: true}).eq('username', currentUser.username).eq('read', false);
    checkNotifs();
};
const checkNotifs = async () => {
    if(!currentUser) return;
    const {count} = await supabase.from('notifications').select('*', {count: 'exact', head:true}).eq('username', currentUser.username).eq('read', false);
    const badge = document.getElementById('notif-cnt');
    if(badge) {
        badge.innerText = count || 0;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
};
const createNotif = async (user, title, msg, type) => {
    await supabase.from('notifications').insert([{username: user, title, message: msg, type}]);
};

// --- MOBILE MENU ---
document.getElementById('menu-toggle')?.addEventListener('click', () => { document.getElementById('mobile-menu').classList.add('open'); document.body.style.overflow='hidden'; });
document.getElementById('close-menu')?.addEventListener('click', () => { document.getElementById('mobile-menu').classList.remove('open'); document.body.style.overflow='auto'; });
document.querySelectorAll('.mobile-link').forEach(l => l.addEventListener('click', () => { document.getElementById('mobile-menu').classList.remove('open'); document.body.style.overflow='auto'; }));
document.getElementById('chat-bubble')?.addEventListener('click', () => {
    const m = document.getElementById('chat-menu');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
});

// ==========================================
// ADMIN LOGIC (Only active if isAdmin = true)
// ==========================================
async function initAdmin() {
    refreshAdminData();
    setInterval(refreshAdminData, 2000); // Admin refresh
}

async function refreshAdminData() {
    // Stats
    const [[{count: tOrd}], [{count: pOrd}], [{count: cOrd}], [{data: rev}], [{count: pDep}], [{count: pCard}], [{count: oTk}], [{count: uCnt}]] = await Promise.all([
        supabase.from('orders').select('*', {count:'exact', head:true}),
        supabase.from('orders').select('*', {count:'exact', head:true}).eq('status','pending'),
        supabase.from('orders').select('*', {count:'exact', head:true}).eq('status','completed'),
        supabase.from('deposits').select('amount').eq('status','completed'),
        supabase.from('deposits').select('*', {count:'exact', head:true}).eq('status','pending'),
        supabase.from('card_deposits').select('*', {count:'exact', head:true}).eq('status','pending'),
        supabase.from('tickets').select('*', {count:'exact', head:true}).eq('status','open'),
        supabase.from('users').select('*', {count:'exact', head:true})
    ]);
    
    document.getElementById('st-total-orders').innerText = tOrd||0;
    document.getElementById('st-pending-orders').innerText = pOrd||0;
    document.getElementById('st-completed-orders').innerText = cOrd||0;
    document.getElementById('st-pending-deps').innerText = pDep||0;
    document.getElementById('st-pending-cards').innerText = pCard||0;
    document.getElementById('st-open-tickets').innerText = oTk||0;
    document.getElementById('st-users').innerText = uCnt||0;
    
    const totalRev = rev ? rev.reduce((s,d)=>s+d.amount,0) : 0;
    document.getElementById('st-revenue').innerText = formatMoney(totalRev);

    // Badges
    document.getElementById('badge-orders').innerText = pOrd>0 ? `(${pOrd})` : '';
    document.getElementById('badge-deps').innerText = pDep>0 ? `(${pDep})` : '';
    document.getElementById('badge-cards').innerText = pCard>0 ? `(${pCard})` : '';
    document.getElementById('badge-tks').innerText = oTk>0 ? `(${oTk})` : '';

    // Load active tab data
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if(activeTab==='orders') loadAdminOrders();
    if(activeTab==='deposits') loadAdminDeposits();
    if(activeTab==='cards') loadAdminCards();
    if(activeTab==='users') loadAdminUsers();
    if(activeTab==='scripts') loadAdminScripts();
}

async function loadAdminOrders() {
    const {data} = await supabase.from('orders').select('*').order('created_at', {ascending:false}).limit(50);
    document.getElementById('tb-orders').innerHTML = data.map(o => `
        <tr>
            <td>${o.order_code}</td><td>${o.username}</td><td>${o.service}</td>
            <td>U: ${o.game_username} <button class="action-btn" onclick="navigator.clipboard.writeText('${o.game_username}')">C</button><br>P: ${o.game_password} <button class="action-btn" onclick="navigator.clipboard.writeText('${o.game_password}')">C</button></td>
            <td>${formatMoney(o.price)}</td><td>${o.status}</td>
            <td><input type="text" value="${o.download_link||''}" onchange="updateOrderLink('${o.id}', this.value)" style="width:80px; background:#222; color:#fff; border:1px solid #444;"></td>
            <td>
                ${o.status==='pending' ? `
                    <button class="action-btn btn-green" onclick="completeOrder('${o.id}', '${o.username}', ${o.price})">Xong</button>
                    <button class="action-btn btn-red" onclick="rejectOrder('${o.id}', '${o.username}', ${o.price})">Hủy</button>
                ` : o.status}
            </td>
        </tr>
    `).join('');
}
async function completeOrder(id, user, price) {
    await supabase.from('orders').update({status: 'completed', progress: 100}).eq('id', id);
    createNotif(user, 'Đơn hàng hoàn thành', `Đơn hàng của bạn đã được xử lý xong.`, 'success');
    showToast('Đã hoàn thành đơn');
    refreshAdminData();
}
async function rejectOrder(id, user, price) {
    const reason = prompt("Lý do từ chối (bắt buộc):");
    if(!reason) return;
    await supabase.from('orders').update({status: 'rejected', reject_reason: reason}).eq('id', id);
    if(price > 0) {
        const {data: u} = await supabase.from('users').select('balance, total_spent').eq('username', user).single();
        await supabase.from('users').update({balance: u.balance + price, total_spent: u.total_spent - price}).eq('username', user);
    }
    createNotif(user, 'Đơn hàng bị từ chối', `Lý do: ${reason}. Đã hoàn lại ${formatMoney(price)} vào ví.`, 'error');
    showToast('Đã từ chối và hoàn tiền');
    refreshAdminData();
}

async function loadAdminDeposits() {
    const {data} = await supabase.from('deposits').select('*').order('created_at', {ascending:false}).limit(50);
    document.getElementById('tb-deposits').innerHTML = data.map(d => `
        <tr>
            <td>${d.deposit_code}</td><td>${d.username}</td><td>${formatMoney(d.amount)}</td>
            <td>${d.method}</td><td>${new Date(d.created_at).toLocaleString()}</td><td>${d.status}</td>
            <td>
                ${d.status==='pending' ? `
                    <button class="action-btn btn-green" onclick="approveDep('${d.id}', '${d.username}', ${d.amount})">Duyệt</button>
                    <button class="action-btn btn-red" onclick="rejectDep('${d.id}')">Từ chối</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}
async function approveDep(id, user, amt) {
    await supabase.from('deposits').update({status: 'completed'}).eq('id', id);
    const {data: u} = await supabase.from('users').select('balance, total_deposited').eq('username', user).single();
    const newDep = u.total_deposited + amt;
    let newVip = 'NEW';
    if(newDep>=100000) newVip='VIP1'; if(newDep>=500000) newVip='VIP2'; if(newDep>=1000000) newVip='VIP3'; if(newDep>=5000000) newVip='VIP4';
    
    await supabase.from('users').update({balance: u.balance + amt, total_deposited: newDep, vip_level: newVip}).eq('username', user);
    createNotif(user, 'Nạp tiền thành công', `Đã cộng ${formatMoney(amt)} vào ví.`, 'success');
    showToast('Duyệt thành công');
    refreshAdminData();
}
async function rejectDep(id) {
    await supabase.from('deposits').update({status: 'rejected'}).eq('id', id);
    showToast('Đã từ chối');
    refreshAdminData();
}

async function loadAdminCards() {
    const {data} = await supabase.from('card_deposits').select('*').order('created_at', {ascending:false}).limit(50);
    document.getElementById('tb-cards').innerHTML = data.map(c => `
        <tr>
            <td>${c.card_code}</td><td>${c.username}</td><td>${c.telco} / ${formatMoney(c.amount)}</td>
            <td>S: ${c.serial} <button class="action-btn" onclick="navigator.clipboard.writeText('${c.serial}')">C</button><br>C: ${c.code} <button class="action-btn" onclick="navigator.clipboard.writeText('${c.code}')">C</button></td>
            <td>${formatMoney(c.actual_amount)}</td><td>${c.status}</td>
            <td>
                ${c.status==='pending' ? `
                    <button class="action-btn btn-green" onclick="approveCard('${c.id}', '${c.username}', ${c.actual_amount}, ${c.amount})">Duyệt</button>
                    <button class="action-btn btn-red" onclick="rejectCard('${c.id}', '${c.username}')">Sai</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}
async function approveCard(id, user, actual_amt, amt) {
    await supabase.from('card_deposits').update({status: 'completed'}).eq('id', id);
    const {data: u} = await supabase.from('users').select('balance, total_deposited').eq('username', user).single();
    const newDep = u.total_deposited + amt;
    let newVip = 'NEW';
    if(newDep>=100000) newVip='VIP1'; if(newDep>=500000) newVip='VIP2'; if(newDep>=1000000) newVip='VIP3'; if(newDep>=5000000) newVip='VIP4';
    
    await supabase.from('users').update({balance: u.balance + actual_amt, total_deposited: newDep, vip_level: newVip}).eq('username', user);
    createNotif(user, 'Nạp thẻ thành công', `Thẻ ${formatMoney(amt)} đúng. Đã cộng ${formatMoney(actual_amt)} vào ví.`, 'success');
    showToast('Duyệt thẻ thành công');
    refreshAdminData();
}
async function rejectCard(id, user) {
    const reason = prompt("Lý do thẻ sai:");
    if(!reason) return;
    await supabase.from('card_deposits').update({status: 'rejected', admin_note: reason}).eq('id', id);
    createNotif(user, 'Nạp thẻ thất bại', `Lý do: ${reason}`, 'error');
    showToast('Đã từ chối thẻ');
    refreshAdminData();
}

async function loadAdminUsers() {
    const {data} = await supabase.from('users').select('*').order('created_at', {ascending:false});
    document.getElementById('tb-users').innerHTML = data.map(u => `
        <tr>
            <td>${u.username}</td><td>${formatMoney(u.balance)}</td><td>${formatMoney(u.total_deposited)}</td>
            <td>${u.vip_level}</td><td style="color:${u.is_locked?'#ff3333':'#00ff00'}">${u.is_locked?'Khóa':'Hoạt động'}</td>
            <td>
                <button class="action-btn btn-blue" onclick="addBalance('${u.username}', ${u.balance})">Cộng Tiền</button>
                <button class="action-btn btn-red" onclick="toggleLock('${u.id}', ${u.is_locked})">${u.is_locked?'Mở':'Khóa'}</button>
            </td>
        </tr>
    `).join('');
}
async function addBalance(user, cur) {
    const amt = prompt("Nhập số tiền (+ để cộng, - để trừ):", "0");
    if(!amt) return;
    const v = parseInt(amt);
    await supabase.from('users').update({balance: cur + v}).eq('username', user);
    showToast('Cập nhật số dư thành công');
    refreshAdminData();
}
async function toggleLock(id, locked) {
    await supabase.from('users').update({is_locked: !locked}).eq('id', id);
    showToast('Cập nhật trạng thái thành công');
    refreshAdminData();
}

async function loadAdminScripts() {
    const {data} = await supabase.from('scripts').select('*').order('created_at');
    document.getElementById('tb-scripts').innerHTML = data.map(s => `
        <tr>
            <td>${s.name}</td><td>${s.game}</td><td>${formatMoney(s.price)}</td>
            <td style="color:${s.active?'#00ff00':'#ff3333'}">${s.active?'Bật':'Tắt'}</td>
            <td>
                <button class="action-btn" onclick="toggleScript('${s.id}', ${s.active})">${s.active?'Tắt':'Bật'}</button>
                <button class="action-btn btn-red" onclick="delScript('${s.id}')">Xóa</button>
            </td>
        </tr>
    `).join('');
}

async function sendBroadcast() {
    const t = document.getElementById('bc-title').value;
    const m = document.getElementById('bc-msg').value;
    if(!t||!m) return;
    const {data: users} = await supabase.from('users').select('username');
    const notifs = users.map(u => ({username: u.username, title: t, message: m, type: 'broadcast'}));
    await supabase.from('notifications').insert(notifs);
    showToast('Đã gửi thông báo cho tất cả users');
}