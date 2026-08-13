const LANG = window.APP_DATA?.lang || 'ru';
document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + LANG);
});

const T = {
    ru: {
        giftsCount: n => `Количество подарков: ${n}`,
        freeOpen: 'Бесплатное открытие',
        openFor: price => `Открыть за ${price}`,
        demoAndLucky: 'Нельзя использовать <b>Демо</b> и <b>Lucky Buy</b> одновременно',
        luckyOneOnly: 'Lucky Buy доступен только при открытии <b>1 кейса</b>',
        openError: 'Ошибка открытия кейса',
        serverError: 'Ошибка соединения с сервером',
        winPhrases: ['ВЫ ВЫИГРАЛИ!', 'ВАМ ВЫПАЛ', 'ПОЗДРАВЛЯЕМ!', 'ДЖЕКПОТ!']
    },
    en: {
        giftsCount: n => `Number of gifts: ${n}`,
        freeOpen: 'Free opening',
        openFor: price => `Open for ${price}`,
        demoAndLucky: "You can't use <b>Demo</b> and <b>Lucky Buy</b> at the same time",
        luckyOneOnly: 'Lucky Buy is only available when opening <b>1 case</b>',
        openError: 'Error opening case',
        serverError: 'Server connection error',
        winPhrases: ['YOU WON!', 'YOU GOT', 'CONGRATULATIONS!', 'JACKPOT!']
    }
}[LANG];

let quickMode = false;
function toggleQuick() {
    quickMode = !quickMode;
    document.getElementById('quick-fast-btn').classList.toggle('active', quickMode);
}

// --- звук открытия кейса (вкл/выкл управляется кнопкой на странице профиля) ---
function playCaseOpenSound() {
    const src = quickMode ? window.CASE_OPEN_SOUND_URL_FAST : window.CASE_OPEN_SOUND_URL;
    if (window.SoundManager && src) {
        window.SoundManager.play(src);
    }
}

function navigate(btn) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const iconEl = document.getElementById('user-icon');
if (tgUser?.photo_url) iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;

// данные кейса приходят с бэкенда через window.CASE_DATA
const gifts = window.CASE_DATA.gifts;

const TON_SVG = `<img class="ton-icon-sm" src="${window.STATIC_TON_LOGO}" alt="">`;

const grid = document.getElementById('gifts-grid');
document.getElementById('gifts-meta').textContent = T.giftsCount(gifts.length);
gifts.forEach(g => {
    grid.innerHTML += `<div class="gift-card">
        <div class="gift-img-wrap"><img src="${g.img}" alt="${g.name}" loading="lazy" onerror="this.onerror=null;this.src='${gifts[0].img}'"></div>
        <div class="gift-name">${g.name}</div>
        <div class="gift-price-bar"><span class="gift-price">${g.price.toFixed(2)}</span>${TON_SVG}</div>
    </div>`;
});

gifts.slice(0, 4).forEach(g => {
    document.getElementById('live-scroll').innerHTML += `<div class="live-gift"><img src="${g.img}" alt=""></div>`;
});

const ITEM_W   = 94;
const ITEM_GAP = 8;
const CELL     = ITEM_W + ITEM_GAP;
const REPEATS  = 20;

function buildReelHTML() {
    let html = '';
    for (let r = 0; r < REPEATS; r++) {
        gifts.forEach((g, gi) => {
            html += `<div class="reel-item" data-gi="${gi}"><img src="${g.img}" alt="${g.name}" loading="lazy"></div>`;
        });
    }
    return html;
}

function initStrip(strip) {
    strip.innerHTML = buildReelHTML();

    strip.classList.remove('idle');
    strip.style.transition = '';
    strip.style.transform = '';

    void strip.offsetWidth;

    strip.classList.add('idle');
}

initStrip(document.getElementById('reel-strip-0'));

const BASE_PRICE = window.CASE_DATA.price;
let currentQty = 1;
let isSpinning = false;

function setQty(qty) {
    if (isSpinning) return;
    if (luckyMode && qty !== 1) { showAppToast(T.luckyOneOnly); return; }
    currentQty = qty;
    document.querySelectorAll('.qty-btn').forEach(b => b.classList.toggle('active', +b.dataset.qty === qty));

    const container = document.getElementById('reels-container');
    const existing  = container.querySelectorAll('.reel-wrap');

    if (qty > existing.length) {
        for (let i = existing.length; i < qty; i++) {
            const wrap = document.createElement('div');
            wrap.className = 'reel-wrap';
            wrap.id = `reel-wrap-${i}`;
            wrap.innerHTML = `<div class="reel-fade-l"></div><div class="reel-fade-r"></div><div class="reel-marker"></div><div class="reel-strip idle" id="reel-strip-${i}"></div>`;
            container.appendChild(wrap);
            initStrip(document.getElementById(`reel-strip-${i}`));
        }
    } else {
        while (container.querySelectorAll('.reel-wrap').length > qty) container.lastElementChild.remove();
    }

    updateBtn();
}

function updateBtn() {
    const btn = document.getElementById('open-btn');
    if (demoMode) {
        btn.innerHTML = `<i class="ti ti-gift"></i> ${T.freeOpen}`;
        return;
    }
    let price = BASE_PRICE * currentQty;
    if (luckyMode) price = price * (luckyPercent / 100);
    btn.innerHTML = `${T.openFor(price.toFixed(2))} <img class="ton                <!-- содержимым этой кнопки (текст + иконка TON) полностью управляет updateBtn() в JS,
                     поэтому data-ru/data-en тут намеренно не используются -->-logo" src="${window.STATIC_TON_LOGO}" alt="" style="width:22px;height:22px;flex-shrink:0;object-fit:contain">`;
}

let appToastTimer = null;
function showAppToast(html) {
    document.getElementById('app-toast-text').innerHTML = html;
    const el  = document.getElementById('app-toast');
    const bar = document.getElementById('app-toast-bar');
    el.classList.remove('hide');
    el.classList.add('show');
    bar.classList.remove('running');
    void bar.offsetWidth;
    bar.classList.add('running');
    clearTimeout(appToastTimer);
    appToastTimer = setTimeout(closeAppToast, 4000);
}
function closeAppToast() {
    const el = document.getElementById('app-toast');
    el.classList.remove('show');
    el.classList.add('hide');
    clearTimeout(appToastTimer);
}

let demoMode = false;
function toggleDemo() {
    if (isSpinning) return;
    if (!demoMode && luckyMode) { showAppToast(T.demoAndLucky); return; }
    demoMode = !demoMode;
    document.getElementById('demo-btn').classList.toggle('active', demoMode);
    updateBtn();
}

let luckyMode = false;
let luckyPercent = 40;
function toggleLucky() {
    if (isSpinning) return;
    if (!luckyMode && demoMode) { showAppToast(T.demoAndLucky); return; }
    if (!luckyMode && currentQty !== 1) { showAppToast(T.luckyOneOnly); return; }
    luckyMode = !luckyMode;
    document.getElementById('lucky-btn').classList.toggle('active', luckyMode);
    document.getElementById('lucky-panel-wrap').classList.toggle('open', luckyMode);
    updateBtn();
}
function setLuckyPercent(v) {
    if (isSpinning) return;
    luckyPercent = +v;
    const pct = ((luckyPercent - 5) / (75 - 5)) * 100;
    document.getElementById('lucky-slider').style.setProperty('--pct', pct + '%');
    document.getElementById('lucky-percent-val').textContent = luckyPercent + '%';
    updateBtn();
}
function openLuckyHelp() { document.getElementById('lucky-help-overlay').classList.add('visible'); }
function closeLuckyHelp(e) { if (e && e.target !== document.getElementById('lucky-help-overlay')) return; document.getElementById('lucky-help-overlay').classList.remove('visible'); }

// показываем корректную цену + иконку TON сразу при загрузке страницы
// (кнопка больше не переводится через data-ru/data-en, чтобы не терять иконку — весь её текст строит эта функция)
updateBtn();

const GAMBLE_ITEMS = [{ type: 'cross' }, { type: 'check' }];
function buildGambleHTML() {
    let html = '';
    for (let r = 0; r < REPEATS; r++) {
        GAMBLE_ITEMS.forEach((it, gi) => {
            html += `<div class="reel-item gamble-item ${it.type}" data-gi="${gi}"><i class="ti ti-${it.type === 'check' ? 'check' : 'x'}"></i></div>`;
        });
    }
    return html;
}
function spinGambleStrip(strip, success) {
    return new Promise(resolve => {
        const wonIdx = success ? 1 : 0;

        strip.innerHTML = buildGambleHTML();
        strip.classList.remove('idle');
        strip.style.transition = 'none';
        strip.style.transform  = 'translateX(0)';
        void strip.offsetWidth;

        const wrapW = strip.parentElement.clientWidth;
        const totalItems = GAMBLE_ITEMS.length * REPEATS;
        const minPos = Math.floor(totalItems * 0.6);
        const maxPos = Math.floor(totalItems * 0.8);

        let landPos = minPos;
        while (landPos % GAMBLE_ITEMS.length !== wonIdx) landPos++;
        while (landPos < minPos) landPos += GAMBLE_ITEMS.length;
        const extraCycles = Math.floor(Math.random() * Math.floor((maxPos - minPos) / GAMBLE_ITEMS.length));
        landPos += extraCycles * GAMBLE_ITEMS.length;
        if (landPos >= totalItems - 2) landPos -= GAMBLE_ITEMS.length;

        const padding = 10;
        const jitter  = (Math.random() - 0.5) * 60;
        const centerX = padding + landPos * CELL + ITEM_W / 2;
        const finalX  = -(centerX - wrapW / 2) + jitter;
        const snapX   = -(centerX - wrapW / 2);

        const spinDur = quickMode ? 1.2 : 4;
        strip.style.transition = `transform ${spinDur}s cubic-bezier(0.08, 0.82, 0.17, 1)`;
        strip.style.transform  = `translateX(${finalX}px)`;

        setTimeout(() => {
            strip.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)';
            strip.style.transform  = `translateX(${snapX}px)`;

            const items = strip.querySelectorAll('.reel-item');
            if (items[landPos]) items[landPos].classList.add('winner', success ? 'check' : 'cross');

            setTimeout(() => resolve(success), 380);
        }, spinDur * 1000 + 50);
    });
}

// теперь принимает весь объект результата с сервера (gift_id + inventory_item_id), а не просто имя
function spinStripToWon(strip, serverResult) {
    return new Promise(resolve => {
        const wonIdx = gifts.findIndex(g => g.id === serverResult.gift_id);
        const safeWonIdx = wonIdx !== -1 ? wonIdx : 0;
        const won = { ...gifts[safeWonIdx], inventoryItemId: serverResult.inventory_item_id };

        strip.classList.remove('idle');
        strip.style.transition = 'none';
        strip.style.transform  = 'translateX(0)';
        strip.querySelectorAll('.reel-item').forEach(el => el.classList.remove('winner'));

        void strip.offsetWidth;

        const wrapW = strip.parentElement.clientWidth;
        const totalItems = gifts.length * REPEATS;
        const minPos = Math.floor(totalItems * 0.6);
        const maxPos = Math.floor(totalItems * 0.8);

        let landPos = minPos;
        while (landPos % gifts.length !== safeWonIdx) landPos++;
        while (landPos < minPos) landPos += gifts.length;
        const extraCycles = Math.floor(Math.random() * Math.floor((maxPos - minPos) / gifts.length));
        landPos += extraCycles * gifts.length;
        if (landPos >= totalItems - 2) landPos -= gifts.length;

        const padding = 10;
        const jitter   = (Math.random() - 0.5) * 60;
        const centerX  = padding + landPos * CELL + ITEM_W / 2;
        const finalX   = -(centerX - wrapW / 2) + jitter;
        const snapX    = -(centerX - wrapW / 2);

        const spinDur = quickMode ? 1.2 : 4;
        strip.style.transition = `transform ${spinDur}s cubic-bezier(0.08, 0.82, 0.17, 1)`;
        strip.style.transform  = `translateX(${finalX}px)`;

        setTimeout(() => {
            strip.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)';
            strip.style.transform  = `translateX(${snapX}px)`;

            const items = strip.querySelectorAll('.reel-item');
            if (items[landPos]) items[landPos].classList.add('winner');

            setTimeout(() => resolve(won), 380);
        }, spinDur * 1000 + 50);
    });
}

async function openCase() {
    if (isSpinning) return;
    isSpinning = true;

    // звук должен стартовать сразу по нажатию, не дожидаясь ответа сервера
    playCaseOpenSound();

    const btn = document.getElementById('open-btn');
    btn.disabled = true;
    btn.style.opacity = '0.55';
    const luckySlider = document.getElementById('lucky-slider');
    if (luckySlider) luckySlider.disabled = true;

    try {
        const response = await fetch(`/api/case/${window.CASE_DATA.slug}/open/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                qty: currentQty,
                demo: demoMode,
                lucky_mode: luckyMode,
                lucky_percent: luckyPercent
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showAppToast(data.error || T.openError);
            isSpinning = false;
            btn.disabled = false;
            btn.style.opacity = '';
            if (luckySlider) luckySlider.disabled = false;
            return;
        }

        // обновляем баланс сразу после успешного открытия, не дожидаясь анимации
        if (data.new_balance !== undefined) {
            document.getElementById('balance-amount').textContent = parseFloat(data.new_balance).toFixed(2);
        }

        const serverResults = data.results;
        const strips = [...document.querySelectorAll('.reel-strip')];

        let spinPromises = strips.map((strip, idx) => {
            return spinStripToWon(strip, serverResults[idx]);
        });

        let wonGifts = await Promise.all(spinPromises);

        if (luckyMode) {
            await new Promise(r => setTimeout(r, 350));
            let gamblePromises = strips.map((strip, idx) => {
                return spinGambleStrip(strip, serverResults[idx].lucky_won);
            });
            await Promise.all(gamblePromises);
            wonGifts = wonGifts.filter((_, idx) => serverResults[idx].lucky_won);
            await new Promise(r => setTimeout(r, 300));
        }

        await new Promise(r => setTimeout(r, 300));

        if (wonGifts.length > 0) {
            showWinModal(wonGifts);
        } else {
            triggerLoseShake();
            setTimeout(() => {
                document.querySelectorAll('.reel-strip').forEach(s => initStrip(s));
                isSpinning = false;
                btn.disabled = false;
                btn.style.opacity = '';
                if (luckySlider) luckySlider.disabled = false;
            }, 500);
        }

    } catch (err) {
        showAppToast(T.serverError);
        isSpinning = false;
        btn.disabled = false;
        btn.style.opacity = '';
        if (luckySlider) luckySlider.disabled = false;
    }
}

const WIN_PHRASES = T.winPhrases;

let winSlideIdx = 0;
let winResults  = [];

function showWinModal(results) {
    winResults  = results;
    winSlideIdx = 0;

    const phrase = WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)];
    document.getElementById('win-title').textContent = phrase;

    const slidesEl = document.getElementById('win-slides');
    slidesEl.innerHTML = `<div class="win-slides-inner"><div class="win-slide">
        <div class="win-img-wrap"><img src="" alt=""></div>
        <div class="win-name"></div>
        <div class="win-price"><span></span><img class="ton-icon-sm" src="${window.STATIC_TON_LOGO}" alt=""></div>
    </div></div>`;

    const dotsEl = document.getElementById('win-dots');
    dotsEl.innerHTML = results.length > 1
        ? results.map((_, i) => `<div class="win-dot${i===0?' active':''}"></div>`).join('')
        : '';

    renderSlide();
    updateSliderUI();

    const sparks = document.getElementById('win-sparks');
    sparks.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const s = document.createElement('div');
        s.className = 'spark';
        const ang = (i / 20) * 360;
        const d   = 70 + Math.random() * 110;
        s.style.cssText = `left:50%;top:38%;--dx:${Math.cos(ang*Math.PI/180)*d}px;--dy:${Math.sin(ang*Math.PI/180)*d}px;animation-delay:${Math.random()*0.25}s`;
        sparks.appendChild(s);
    }

    document.getElementById('win-overlay').classList.add('visible');
}

function triggerLoseShake() {
    if (window.Telegram?.WebApp?.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.notificationOccurred("error");
    } else if (navigator.vibrate) {
        navigator.vibrate(120);
    }
}

function renderSlide() {
    const won = winResults[winSlideIdx];
    if (!won) return;
    const inner = document.querySelector('.win-slides-inner');
    if (!inner) return;
    const imgEl = inner.querySelector('.win-img-wrap img');
    imgEl.onerror = null;
    imgEl.src = won.img;
    imgEl.alt = won.name;
    imgEl.onerror = function () { this.onerror = null; this.src = gifts[0].img; };
    inner.querySelector('.win-name').textContent = won.name;
    inner.querySelector('.win-price span').textContent = won.price.toFixed(2);
}

function slideWin(dir) {
    const newIdx = Math.max(0, Math.min(winResults.length - 1, winSlideIdx + dir));
    if (newIdx === winSlideIdx) return;
    winSlideIdx = newIdx;

    const inner = document.querySelector('.win-slides-inner');
    if (inner) {
        inner.style.transform = `translateX(${dir > 0 ? '-40px' : '40px'})`;
        inner.style.opacity = '0';
        setTimeout(() => {
            renderSlide();
            inner.style.transition = 'none';
            inner.style.transform = `translateX(${dir > 0 ? '40px' : '-40px'})`;
            inner.offsetHeight;
            inner.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease';
            inner.style.transform = 'translateX(0)';
            inner.style.opacity = '1';
        }, 180);
    }
    updateSliderUI();
}

function updateSliderUI() {
    document.querySelectorAll('.win-dot').forEach((d, i) => d.classList.toggle('active', i === winSlideIdx));

    const prev = document.getElementById('win-prev');
    const next = document.getElementById('win-next');
    if (prev) prev.classList.toggle('hidden', winSlideIdx === 0 || winResults.length === 1);
    if (next) next.classList.toggle('hidden', winSlideIdx === winResults.length - 1 || winResults.length === 1);
}

// новая функция — продажа приза, который сейчас показан в слайдере
function sellWonItem() {
    const won = winResults[winSlideIdx];
    if (!won?.inventoryItemId) { closeWin(); return; }

    fetch('/api/gift/sale/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: won.inventoryItemId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.new_balance !== undefined) {
            document.getElementById('balance-amount').textContent = parseFloat(data.new_balance).toFixed(2);
        }
    })
    .catch(() => {})
    .finally(() => closeWin());
}

// новая функция — оставить приз в инвентаре (просто закрыть модалку, предмет уже начислен на бэкенде)
function takeWonItem() {
    closeWin();
}

function closeWin() {
    document.getElementById('win-overlay').classList.remove('visible');

    document.querySelectorAll('.reel-strip').forEach(strip => {
        strip.classList.remove('idle');
        void strip.offsetWidth;
        initStrip(strip);
    });

    isSpinning = false;

    const btn = document.getElementById('open-btn');
    btn.disabled = false;
    btn.style.opacity = '';

    const luckySlider = document.getElementById('lucky-slider');
    if (luckySlider) luckySlider.disabled = false;
}

document.getElementById('open-btn').addEventListener('click', openCase);
document.addEventListener('touchstart', function(){}, { passive: true });

async function refreshLiveFeed() {
    const res = await fetch('/api/live-feed/');
    const data = await res.json();
    const container = document.getElementById('live-scroll');
    container.innerHTML = data.items.map(item => `
        <div class="live-gift">
            <img src="${item.gift_img}" alt="">
        </div>
    `).join('');
}

refreshLiveFeed();
setInterval(refreshLiveFeed, 7000);