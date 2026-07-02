Đây là file `app.js` hoàn chỉnh 100% dành cho giao diện Antigravity Pro. Bạn chỉ cần copy toàn bộ nội dung dưới đây và đè (paste) vào file `app.js` của mình. 

Mình đã sửa lỗi khai báo Supabase (nguyên nhân gây trắng trang) và cập nhật đầy đủ logic slide-modal, tính toán VIP, NAP code cố định cho người dùng.

```javascript
// ================= CONFIG =================
const SUPABASE_URL = 'https://lsievokkismxxaiezdlm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzaWV2b2traXNteHhhaWV6ZGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjY0NzgsImV4cCI6MjA5NzAwMjQ3OH0.TZ6_NlpDIrl6xDucsc8S4hqA23RQVWsVLrQRjtr6YmQ';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('vi') ? 'vi' : 'en');

const PRODUCTS = [
    { id: 'mod_skill', name: 'Mod Skill (Câu Cá Vạn Cân)', price: 10000 },
    { id: 'mod_ca', name: 'Mod Cá (Câu Cá Vạn Cân)', price: 20000 },
    { id: 'mod_level', name: 'Mod Level (Câu Cá Vạn Cân)', price: 10000 },
    { id: 'mod_item', name: 'Mod Item (Câu Cá Vạn Cân)', price: 20000 },
    { id: 'mod_pet', name: 'Mod Pet (Câu Cá Vạn Cân)', price: 20000 },
    { id: 'mod_kimcuong', name: 'Mod Kim Cương (30k/1tr KC)', price: 30000 },
    { id: 'mod_full', name: 'Câu Cá Vạn Cân Full', price: 0 }, // 0 = Liên hệ
    { id: 'script_sniper', name: 'Script Sniper Arena (Roblox)', price: 15000 },
    { id: 'ban_mod', name: 'Bản Mod (Tự Mod)', price: 85000 },
    { id: 'cau_chung', name: 'Câu Chung (Theo Giờ)', price: 20000 }
];

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    applyLang();
    checkAuth();
    initEvents();
    initGravityDrop();
    initChat();
    initPWA();
}

// ================= AUTH =================
function checkAuth() {
    const userStr = localStorage.getItem('knox_user');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        updateUILoggedIn();
        refreshBalance();
        setInterval(refreshBalance, 1000);
    } else {
        updateUILoggedOut();
    }
}

async function refreshBalance() {
    if (!currentUser || currentUser.username === 'admin') return;
    try {
        const { data, error } = await db.from('users').select('balance, total_deposited, total_spent, vip_level, is_locked').eq('username', currentUser.username).single();
        if (error) throw error;
        if (data.is_locked) { logout(); return; }
        
        const oldBalance = currentUser.balance;
        currentUser.balance = data.balance;
        currentUser.total_deposited = data.total_deposited;
        currentUser.total_spent = data.total_spent;
        currentUser.vip_level = data.vip_level;
        localStorage.setItem('knox_user', JSON.stringify(currentUser));
        
        document.querySelectorAll('.balance-val').forEach(el => {
            el.innerText = formatCurrency(currentUser.balance);
        });
        
        if (data.balance > oldBalance) {
            showToast('💰 Cập nhật số dư: +' + formatCurrency(data.balance - oldBalance), 'success');
        }
    } catch (e) { console.error(e); }
}

async function handleLogin() {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    if(!u || !p) return showToast('Vui lòng nhập đủ thông tin', 'error');

    if (u.toLowerCase() === 'admin') {
        if (p === 'nguyenmm2803') {
            localStorage.setItem('knox_user', JSON.stringify({username: 'admin'}));
            window.location.href = 'admin.html';
        } else {
            showToast('Mật khẩu Admin sai!', 'error');
        }
        return;
    }

    try {
        const { data, error } = await db.from('users').select('*').eq('username', u).single();
        if (error || !data) return showToast('Tên không tồn tại', 'error');
        if (data.password !== p) return showToast('Mật khẩu sai', 'error');
        if (data.is_locked) return showToast('Tài khoản bị khóa', 'error');
        
        currentUser = data;
        localStorage.setItem('knox_user', JSON.stringify(currentUser));
        
        await db.from('login_history').insert([{ username: u, device: navigator.platform, browser: navigator.userAgent, success: true }]);
        await db.from('users').update({ last_login: new Date().toISOString(), last_device: navigator.platform }).eq('username', u);
        
        closeModal('login-modal');
        checkAuth();
        showToast('Đăng nhập thành công!', 'success');
    } catch(e) { showToast('Lỗi hệ thống', 'error'); }
}

async function handleRegister() {
    const u = document.getElementById('reg-user').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-pass').value;
    const cp = document.getElementById('reg-cpass').value;
    const ref = document.getElementById('reg-ref').value.trim();

    if (u.length < 3) return showToast('Username >= 3 ký tự', 'error');
    if (p.length < 6) return showToast('Password >= 6 ký tự', 'error');
    if (p !== cp) return showToast('Mật khẩu không khớp', 'error');
    if (u.toLowerCase() === 'admin') return showToast('Không thể đăng ký tên này', 'error');

    const refCode = 'REF' + Math.floor(100000 + Math.random() * 900000);
    const napCode = Math.floor(10000 + Math.random() * 20000); // 10000 - 30000

    try {
        const { data: exist } = await db.from('users').select('username').eq('username', u).single();
        if (exist) return showToast('Username đã tồn tại', 'error');

        const { error } = await db.from('users').insert([{
            username: u, password: p, email: e, referral_code: refCode, nap_code: napCode, referred_by: ref || null
        }]);

        if (error) throw error;
        showToast('Đăng ký thành công! Mã NAP của bạn: ' + napCode, 'success');
        closeModal('register-modal');
        openModal('login-modal');
    } catch(err) { showToast('Lỗi đăng ký', 'error'); }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('knox_user');
    updateUILoggedOut();
    window.location.href = 'index.html';
}

// ================= WIDGETS & EVENTS =================
function initEvents() {
    document.getElementById('hamburger-btn')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('close-mobile')?.addEventListener('click', closeMobileMenu);
    
    document.getElementById('btn-login')?.addEventListener('click', () => openModal('login-modal'));
    document.getElementById('btn-register')?.addEventListener('click', () => openModal('register-modal'));
    document.getElementById('submit-login')?.addEventListener('click', handleLogin);
    document.getElementById('submit-register')?.addEventListener('click', handleRegister);
    document.getElementById('btn-logout')?.addEventListener('click', logout);

    document.getElementById('btn-open-buy')?.addEventListener('click', openBuyModal);
    document.getElementById('service-select')?.addEventListener('change', updateBuyPrice);
    document.getElementById('apply-voucher')?.addEventListener('click', applyVoucher);
    document.getElementById('submit-order')?.addEventListener('click', handleOrder);

    document.getElementById('btn-deposit-bank')?.addEventListener('click', handleBankDeposit);
    document.getElementById('btn-deposit-card')?.addEventListener('click', handleCardDeposit);

    document.getElementById('btn-history')?.addEventListener('click', () => { closeMobileMenu(); openModal('history-modal'); loadHistory(); });
    document.getElementById('btn-profile')?.addEventListener('click', () => { closeMobileMenu(); openModal('profile-modal'); loadProfile(); });
    
    document.getElementById('notif-btn')?.addEventListener('click', toggleNotifPanel);
    loadNotifications();
}

function initChat() {
    setTimeout(() => { document.getElementById('chat-widget').style.display = 'block'; }, 2000);
}

function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
}

function initGravityDrop() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.gravity-drop').forEach(el => observer.observe(el));
}

// ================= SHOP & BUY =================
function openBuyModal() {
    if(!currentUser || currentUser.username === 'admin') return openModal('login-modal');
    const sel = document.getElementById('service-select');
    sel.innerHTML = PRODUCTS.map(p => `<option value="${p.id}">${p.name} - ${p.price === 0 ? 'Liên hệ' : formatCurrency(p.price)}</option>`).join('');
    updateBuyPrice();
    openModal('buy-modal');
}

function updateBuyPrice() {
    const id = document.getElementById('service-select').value;
    const p = PRODUCTS.find(x => x.id === id);
    document.getElementById('base-price').innerText = p.price === 0 ? '0' : formatCurrency(p.price);
    document.getElementById('final-price').innerText = document.getElementById('base-price').innerText;
}

async function applyVoucher() {
    const code = document.getElementById('voucher-input').value.trim().toUpperCase();
    if(!code) return;
    try {
        const { data } = await db.from('vouchers').select('*').eq('code', code).eq('active', true).single();
        if (!data || data.used_count >= data.max_uses) return showToast('Mã không hợp lệ hoặc hết lượt', 'error');
        
        const id = document.getElementById('service-select').value;
        const p = PRODUCTS.find(x => x.id === id);
        if(p.price === 0) return;
        
        const discount = Math.floor(p.price * data.discount_percent / 100);
        const finalP = p.price - discount;
        document.getElementById('final-price').innerText = formatCurrency(finalP);
        showToast(`Áp dụng thành công! Giảm ${data.discount_percent}%`, 'success');
    } catch(e) { showToast('Mã không tồn tại', 'error'); }
}

async function handleOrder() {
    const id = document.getElementById('service-select').value;
    const p = PRODUCTS.find(x => x.id === id);
    const gu = document.getElementById('game-user').value.trim();
    const gp = document.getElementById('game-pass').value.trim();
    const note = document.getElementById('order-note').value.trim();
    const vouch = document.getElementById('voucher-input').value.trim().toUpperCase();

    if (gu.length < 3 || gp.length < 3) return showToast('Phải nhập tài khoản/mật khẩu game (>=3 ký tự)', 'error');

    let finalPrice = p.price;
    let discountPercent = 0;
    
    // VIP discount logic
    const vipLevels = [0, 100000, 500000, 1000000, 5000000];
    const vipPercents = [0, 5, 10, 15, 20];
    let userVip = 0;
    if(currentUser) {
        for(let i=vipLevels.length-1; i>=0; i--) { if(currentUser.total_deposited >= vipLevels[i]) { userVip = i; break; } }
        discountPercent += vipPercents[userVip];
    }

    if (vouch) {
        try {
            const { data } = await db.from('vouchers').select('*').eq('code', vouch).eq('active', true).single();
            if (data && data.used_count < data.max_uses) {
                discountPercent += data.discount_percent;
                await db.from('vouchers').update({ used_count: data.used_count + 1 }).eq('id', data.id);
            }
        } catch(e) {}
    }

    finalPrice = Math.floor(p.price * (100 - discountPercent) / 100);
    if (finalPrice < 0) finalPrice = 0;

    if (p.price > 0 && currentUser.balance < finalPrice) {
        showToast('Số dư không đủ!', 'error');
        setTimeout(() => { closeModal('buy-modal'); openModal('deposit-modal'); }, 1500);
        return;
    }

    const orderCode = 'KNX' + Math.floor(100000 + Math.random() * 900000);

    try {
        if (finalPrice > 0) {
            await db.from('users').update({ balance: currentUser.balance - finalPrice, total_spent: currentUser.total_spent + finalPrice }).eq('username', currentUser.username);
        }
        await db.from('orders').insert([{
            order_code: orderCode, username: currentUser.username, service: p.name, payment: finalPrice, price: p.price,
            note: note, game_username: gu, game_password: gp, status: 'pending'
        }]);
        await db.from('notifications').insert([{ username: currentUser.username, title: 'Đặt hàng thành công', message: `Đơn ${orderCode} đã tạo`, type: 'order' }]);

        showToast('Đặt hàng thành công! Mã: ' + orderCode, 'success');
        closeModal('buy-modal');
        refreshBalance();
    } catch(e) { showToast('Lỗi đặt hàng', 'error'); }
}

// ================= DEPOSIT =================
async function handleBankDeposit() {
    const amt = parseInt(document.getElementById('dep-amount').value) || 0;
    if(amt < 10000) return showToast('Tối thiểu 10.000đ', 'error');
    const code = 'NAP' + Math.floor(100000 + Math.random() * 900000);
    
    try {
        await db.from('deposits').insert([{ deposit_code: code, username: currentUser.username, amount: amt, method: 'VCB', status: 'pending' }]);
        
        const instr = `THÔNG TIN CHUYỂN KHOẢN\n\nSTK: 1064291846\nChủ TK: NGUYEN TRUNG NGUYEN\nNội dung: NAP${currentUser.nap_code}\nSố tiền: ${formatCurrency(amt)}\n\n(Vui lòng chuyển khoản chính xác nội dung)`;
        alert(instr);
        
        closeModal('deposit-modal');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) { showToast('Lỗi tạo lệnh', 'error'); }
}

async function handleCardDeposit() {
    const telco = document.getElementById('card-telco').value;
    const val = parseInt(document.getElementById('card-value').value) || 0;
    const ser = document.getElementById('card-serial').value.trim();
    const cod = document.getElementById('card-code').value.trim();
    
    if(!ser || !cod) return showToast('Thiếu seri hoặc mã', 'error');
    const code = 'CARD' + Math.floor(100000 + Math.random() * 900000);
    const actualAmt = Math.floor(val * 0.85); // Chiết khấu 15%
    
    try {
        await db.from('card_deposits').insert([{ card_code: code, username: currentUser.username, telco, serial: ser, code: cod, amount: val, actual_amount: actualAmt, status: 'pending' }]);
        showToast('Gửi thẻ thành công! Chờ duyệt', 'success');
        closeModal('deposit-modal');
    } catch(e) { showToast('Lỗi gửi thẻ', 'error'); }
}

// ================= HISTORY & PROFILE =================
async function loadHistory() {
    if(!currentUser) return;
    const cont = document.getElementById('history-content');
    cont.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    
    const { data: orders } = await db.from('orders').select('*').eq('username', currentUser.username).order('created_at', { ascending: false });
    cont.innerHTML = orders.map(o => `
        <div class="card mb-1" style="padding:15px">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px">
                <b class="text-accent">${o.order_code}</b> 
                <span class="badge badge-${o.status}">${o.status.toUpperCase()}</span>
            </div>
            <p>${o.service}</p>
            <p style="font-size:14px; color:var(--text-dim)">Thanh toán: ${formatCurrency(o.payment)}</p>
            <div style="background:rgba(0,0,0,0.3); padding:8px; margin-top:8px; clip-path:var(--cut-sm); font-size:13px">
                Game: <span style="color:var(--accent)">${o.game_username}</span> | <span style="color:var(--accent2)">${o.game_password}</span> 
                <button onclick="copyText('${o.game_username}:${o.game_password}')" class="holo-btn" style="padding:2px 8px; font-size:10px; margin-left:5px">COPY</button>
            </div>
            ${o.reject_reason ? `<p class="text-danger mt-1" style="font-size:13px">Lý do hủy: ${o.reject_reason}</p>` : ''}
            ${o.status === 'pending' ? `<button onclick="cancelOrder('${o.id}')" class="holo-btn danger mt-1" style="width:100%; padding:8px">HỦY ĐƠN & HOÀN TIỀN</button>` : ''}
        </div>
    `).join('');
}

async function cancelOrder(id) {
    if(!confirm('Xác nhận hủy đơn và hoàn tiền?')) return;
    try {
        const { data: o } = await db.from('orders').select('*').eq('id', id).single();
        if(o.status !== 'pending') return showToast('Không thể hủy', 'error');
        
        await db.from('orders').update({ status: 'rejected', reject_reason: 'Người dùng tự hủy' }).eq('id', id);
        await db.from('users').update({ balance: currentUser.balance + o.payment, total_spent: currentUser.total_spent - o.payment }).eq('username', currentUser.username);
        await db.from('notifications').insert([{ username: currentUser.username, title: 'Đơn hủy', message: `Đơn ${o.order_code} đã hủy, hoàn ${formatCurrency(o.payment)}`, type: 'order' }]);
        
        showToast('Đã hủy và hoàn tiền', 'success');
        loadHistory();
        refreshBalance();
    } catch(e) { showToast('Lỗi hủy đơn', 'error'); }
}

async function loadProfile() {
    if(!currentUser) return;
    const c = document.getElementById('profile-content');
    const nextVip = [100000, 500000, 1000000, 5000000];
    let needMore = 0;
    for(let i of nextVip) { if(currentUser.total_deposited < i) { needMore = i - currentUser.total_deposited; break; } }
    
    c.innerHTML = `
        <div class="card mb-1" style="text-align:center; border-color:var(--accent2)">
            <h3 class="holo-text">${currentUser.username}</h3>
            <span class="badge badge-vip">VIP ${currentUser.vip_level}</span>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px">
            <div class="card" style="padding:10px; text-align:center"><span style="color:var(--text-dim); font-size:12px">SỐ DƯ</span><br><b class="text-success">${formatCurrency(currentUser.balance)}</b></div>
            <div class="card" style="padding:10px; text-align:center"><span style="color:var(--text-dim); font-size:12px">ĐÃ NẠP</span><br><b class="text-accent">${formatCurrency(currentUser.total_deposited)}</b></div>
        </div>
        <p style="font-size:14px; color:var(--text-dim)">Mã giới thiệu: <b class="text-accent2">${currentUser.referral_code}</b> (+10.000đ/người)</p>
        <p style="font-size:14px; color:var(--text-dim)">Mã NAP cố định: <b class="text-accent">${currentUser.nap_code}</b></p>
        <p style="font-size:14px; color:var(--text-dim)">Cần nạp thêm ${formatCurrency(needMore)} để lên VIP ${currentUser.vip_level + 1}</p>
        
        <hr style="border-color:var(--border); margin:20px 0">
        <h4 class="text-accent" style="margin-bottom:15px">ĐỔI MẬT KHẨU</h4>
        <div class="form-group"><input type="password" id="old-pass" class="form-input" placeholder="Mật khẩu cũ"></div>
        <div class="form-group"><input type="password" id="new-pass" class="form-input" placeholder="Mật khẩu mới (>=6 ký tự)"></div>
        <button onclick="handleChangePass()" class="holo-btn" style="width:100%">UPDATE PASSWORD</button>
    `;
}

async function handleChangePass() {
    const op = document.getElementById('old-pass')?.value;
    const np = document.getElementById('new-pass')?.value;
    if(!op || !np || np.length < 6) return showToast('Mật khẩu phải >= 6 ký tự', 'error');
    if(op !== currentUser.password) return showToast('Mật khẩu cũ sai', 'error');
    
    await db.from('users').update({ password: np }).eq('username', currentUser.username);
    currentUser.password = np;
    localStorage.setItem('knox_user', JSON.stringify(currentUser));
    showToast('Đổi mật khẩu thành công', 'success');
    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
}

// ================= NOTIFICATIONS =================
async function loadNotifications() {
    if(!currentUser) return;
    const { data } = await db.from('notifications').select('*').eq('username', currentUser.username).eq('read', false);
    const badge = document.getElementById('notif-badge');
    if(badge) {
        badge.innerText = data.length;
        badge.style.display = data.length > 0 ? 'inline-block' : 'none';
    }
}

async function toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    const isVis = panel.style.display === 'block';
    panel.style.display = isVis ? 'none' : 'block';
    
    if(!isVis && currentUser) {
        const { data } = await db.from('notifications').select('*').eq('username', currentUser.username).order('created_at', { ascending: false }).limit(10);
        panel.innerHTML = data.map(n => `<div style="padding:8px; border-bottom:1px solid var(--border)"><b style="color:var(--accent)">${n.title}</b><br><small>${n.message}</small></div>`).join('') || '<p style="color:var(--text-dim)">Trống</p>';
        await db.from('notifications').update({ read: true }).eq('username', currentUser.username).eq('read', false);
        setTimeout(loadNotifications, 1000);
    }
}

// ================= UTILS & UI =================
function formatCurrency(n) { return (n||0).toLocaleString('vi-VN') + 'đ'; }

function copyText(t) { 
    navigator.clipboard.writeText(t); 
    showToast('Đã copy!', 'success'); 
}

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.className = `toast-notification ${type}`;
    let borderColor = 'var(--accent)';
    let textColor = 'var(--accent)';
    if(type==='success') { borderColor = 'var(--success)'; textColor = 'var(--success)'; }
    if(type==='error') { borderColor = 'var(--danger)'; textColor = 'var(--danger)'; }
    
    t.style.cssText = `position:fixed; top:20px; right:20px; padding:15px 25px; background:rgba(5,5,10,0.9); border:1px solid ${borderColor}; z-index:9999; animation: slideIn 0.3s; max-width:300px; color:${textColor}; clip-path:var(--cut-sm); font-family:Rajdhani;`;
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function openModal(id) { 
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'flex'; 
        setTimeout(() => modal.classList.add('active'), 10); 
    }
    document.body.classList.add('body-lock'); 
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 400); 
    }
    document.body.classList.remove('body-lock'); 
}

function toggleMobileMenu() { 
    document.getElementById('mobile-menu').classList.toggle('open'); 
    document.body.classList.toggle('body-lock'); 
}

function closeMobileMenu() { 
    document.getElementById('mobile-menu').classList.remove('open'); 
    document.body.classList.remove('body-lock'); 
}

function updateUILoggedIn() {
    document.querySelectorAll('.auth-guest').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.auth-user').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.balance-val').forEach(el => el.innerText = formatCurrency(currentUser?.balance));
    if(currentUser?.username === 'admin') {
        document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.user-only-nav').forEach(el => el.style.display = 'none');
    }
}

function updateUILoggedOut() {
    document.querySelectorAll('.auth-guest').forEach(el => el.style.display = 'block');
    document.querySelectorAll('.auth-user').forEach(el => el.style.display = 'none');
}

function applyLang() {
    if(typeof LANG === 'undefined') return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(LANG[currentLang]?.[key]) el.innerText = LANG[currentLang][key];
    });
}
```
