const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const infoEl = document.getElementById('user-info');
const iconEl = document.getElementById('user-icon');
const monthsRu = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

if (tgUser) {
    infoEl.textContent = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    if (tgUser.photo_url) {
        iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;
    } else {
        const initials = (tgUser.first_name?.[0] ?? '') + (tgUser.last_name?.[0] ?? '');
        iconEl.innerHTML = `<div class="avatar-placeholder" style="font-size:28px;font-weight:700;color:#aaa;">${initials}</div>`;
    }
} else {
    infoEl.textContent = 'User + idUser';
}

let flagAnim = null;
function playFlagAnimation(lang) {
    const container = document.getElementById('flagLottie');
    const path = window.APP_DATA?.flagAnimations?.[lang];
    if (!container || !path || typeof lottie === 'undefined') return;
    if (flagAnim) {
        flagAnim.destroy();
        flagAnim = null;
    }
    container.innerHTML = '';
    flagAnim = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: path
    });
}

function toggleLanguageFirst(currentLang) {
    playFlagAnimation(currentLang);
    document.querySelectorAll('[data-ru]').forEach(el => {
        el.textContent = el.getAttribute('data-' + currentLang);
    });
    refreshStatsDate(currentLang);
    refreshSellAllCount(currentLang);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    document.getElementById('langBtn').appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());

    fetch('/api/change-lang/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 
        },
        body: JSON.stringify({ lang: currentLang })
    })
}

let currentLang = window.APP_DATA.lang;
toggleLanguageFirst(currentLang);

function toggleLanguage() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    playFlagAnimation(currentLang);
    document.querySelectorAll('[data-ru]').forEach(el => {
        el.textContent = el.getAttribute('data-' + currentLang);
    });
    refreshStatsDate(currentLang);
    refreshSellAllCount(currentLang);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    document.getElementById('langBtn').appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());

    fetch('/api/change-lang/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 
        },
        body: JSON.stringify({ lang: currentLang })
    })
}

const soundBtn = document.getElementById('soundBtn');

function updateSoundIcon() {
    const on = window.SoundManager ? window.SoundManager.isEnabled() : false;
    const icon = soundBtn.querySelector('i');
    if (icon) icon.className = 'ti ' + (on ? 'ti-volume' : 'ti-volume-off');
    soundBtn.setAttribute('aria-label', 'Звук ' + (on ? '100%' : '0%'));
}

updateSoundIcon();

soundBtn.addEventListener('click', () => {
    if (window.SoundManager) {
        const on = window.SoundManager.toggle();
        if (on) window.SoundManager.playTestTone();
    }
    updateSoundIcon();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    soundBtn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
});

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (i === 0 && tab === 'inventory') || (i === 1 && tab === 'stats'));
    });
    document.getElementById('tab-inventory').classList.toggle('active', tab === 'inventory');
    document.getElementById('tab-stats').classList.toggle('active', tab === 'stats');

    if (tab === 'stats') {
        refreshStatsDate(currentLang);
        animateStatsIfNeeded();
    }
}

function formatNumber(num) {
    return Number(num).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function formatTon(num) {
    return formatNumber(num) + ' GRAM';
}

function formatJoinedDate(lang) {
    const iso = window.APP_DATA?.stats?.joinedAt;
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return lang === 'ru'
        ? `${d.getDate()} ${monthsRu[d.getMonth()]} ${d.getFullYear()}`
        : `${monthsEn[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function refreshStatsDate(lang) {
    const el = document.getElementById('statJoined');
    if (el) el.textContent = formatJoinedDate(lang);
}

function animateValue(el, from, to, duration, formatter) {
    if (!el) return;
    const start = performance.now();
    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;
        el.textContent = formatter(current);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

let statsAnimated = false;
function animateStatsIfNeeded() {
    if (statsAnimated) return;
    statsAnimated = true;
    const stats = window.APP_DATA?.stats || {};
    animateValue(document.getElementById('statCases'), 0, Number(stats.casesOpened) || 0, 700, v => formatNumber(Math.round(v)));
    animateValue(document.getElementById('statTurnover'), 0, Number(stats.turnover) || 0, 700, v => formatTon(v.toFixed(2)));
    animateValue(document.getElementById('statDeposit'), 0, Number(stats.totalDeposited) || 0, 700, v => formatTon(v.toFixed(2)));
    animateValue(document.getElementById('statReferrals'), 0, Number(stats.referrals) || 0, 700, v => formatNumber(Math.round(v)));
}

document.addEventListener('touchstart', function(){}, {passive:true});

/* ── ПРОДАТЬ ВСЁ: подтверждение ── */
const sellAllOverlay = document.getElementById('sellAllOverlay');
const sellAllSheet = document.getElementById('sellAllSheet');

function pluralizeRu(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

function getInventoryTotals() {
    const cards = document.querySelectorAll('.inventory-item');
    let total = 0;
    cards.forEach(card => {
        const priceEl = card.querySelector('.inventory-item-price span');
        const val = priceEl ? parseFloat(priceEl.textContent.replace(',', '.')) : 0;
        if (!isNaN(val)) total += val;
    });
    return { count: cards.length, total };
}

function refreshSellAllCount(lang) {
    const el = document.getElementById('sellAllCount');
    if (!el) return;
    const { count } = getInventoryTotals();
    if (lang === 'ru') {
        el.textContent = `${count} ${pluralizeRu(count, 'предмет', 'предмета', 'предметов')}`;
    } else {
        el.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    }
}

function openSellAllConfirm() {
    const { count, total } = getInventoryTotals();
    document.getElementById('sellAllPrice').textContent = total.toFixed(2);
    refreshSellAllCount(currentLang);
    sellAllOverlay.classList.add('active');
    sellAllSheet.classList.add('open');
}

function closeSellAllConfirm() {
    sellAllOverlay.classList.remove('active');
    sellAllSheet.classList.remove('open');
}

function confirmSellAll() {
    fetch('/api/gift/sale/all/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(r => r.json())
    .catch(() => {})
    .finally(() => {
        closeSellAllConfirm();
        window.location.reload();
    });
}

/* ── ДЕТАЛИ ПРЕДМЕТА ── */
const itemOverlay = document.getElementById('itemOverlay');
const itemSheet = document.getElementById('itemSheet');
let currentItemId = null;

function openItemSheet(id, name, price, img) {
    currentItemId = id;
    document.getElementById('itemSheetImg').src = img;
    document.getElementById('itemSheetImg').alt = name;
    document.getElementById('itemSheetName').textContent = name;
    document.getElementById('itemSheetPrice').textContent = price;
    itemOverlay.classList.add('active');
    itemSheet.classList.add('open');
}

function closeItemSheet() {
    itemOverlay.classList.remove('active');
    itemSheet.classList.remove('open');
    currentItemId = null;
}

/* ── ПОДТВЕРЖДЕНИЕ ВЫВОДА ПРЕДМЕТА ── */
const withdrawOverlay = document.getElementById('withdrawOverlay');
const withdrawSheet = document.getElementById('withdrawSheet');

function openWithdrawConfirm() {
    if (!currentItemId) return;
    withdrawOverlay.classList.add('active');
    withdrawSheet.classList.add('open');
}

function closeWithdrawConfirm() {
    withdrawOverlay.classList.remove('active');
    withdrawSheet.classList.remove('open');
}

function confirmWithdraw() {
    if (!currentItemId) return;
    
    fetch('/api/gift/withdraw/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: currentItemId })
    })
    .then(r => r.json())
    .catch(() => {})
    .finally(() => {
        closeWithdrawConfirm();
        closeItemSheet();
        window.location.reload();
    });
}

function sellItem() {
    if (!currentItemId) return;
    fetch('/api/gift/sale/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: currentItemId })
    })
    .then(r => r.json())
    .catch(() => {})
    .finally(() => {
        closeItemSheet();
        window.location.reload();
    });
}