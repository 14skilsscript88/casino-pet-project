// ══ СОСТОЯНИЕ И НАСТРОЙКИ ══
const LANG = window.APP_DATA?.lang || 'ru';
document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + LANG);
});

const T = {
    ru: {
        giftsCount: n => `Количество подарков: ${n}`,
        openFree: 'Открыть бесплатно',
        forwardUnavailable: 'Функция пересылки временно недоступна',
        done: 'Готово',
        doAllTasks: 'Выполни все задания, чтобы открыть кейс',
        openError: 'Ошибка открытия кейса',
        serverError: 'Ошибка подключения к серверу',
        winPhrases: ['ВЫ ВЫИГРАЛИ!', 'ВАМ ВЫПАЛ', 'ПОЗДРАВЛЯЕМ!', 'ДЖЕКПОТ!'],
        noItemId: 'Не удалось определить ID предмета для продажи',
        soldOk: 'Предмет успешно продан!',
        sellError: 'Ошибка при продаже предмета'
    },
    en: {
        giftsCount: n => `Number of gifts: ${n}`,
        openFree: 'Open for free',
        forwardUnavailable: 'Forwarding is temporarily unavailable',
        done: 'Done',
        doAllTasks: 'Complete all tasks to open the case',
        openError: 'Error opening case',
        serverError: 'Server connection error',
        winPhrases: ['YOU WON!', 'YOU GOT', 'CONGRATULATIONS!', 'JACKPOT!'],
        noItemId: "Couldn't determine the item ID to sell",
        soldOk: 'Item sold successfully!',
        sellError: 'Error selling the item'
    }
}[LANG];

let quickMode = false;
function toggleQuick() {
    quickMode = !quickMode;
    document.getElementById('quick-fast-btn')?.classList.toggle('active', quickMode);
}

function navigate(btn) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
}

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const iconEl = document.getElementById('user-icon');
if (iconEl && tgUser?.photo_url) {
    iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;
}

const gifts = window.CASE_DATA?.gifts || [];
const TON_SVG = `<img class="ton-icon-sm" src="${window.STATIC_TON_LOGO}" alt="">`;

// Инициализация сетки призов
const grid = document.getElementById('gifts-grid');
if (grid) {
    const giftsMeta = document.getElementById('gifts-meta');
    if (giftsMeta) giftsMeta.textContent = T.giftsCount(gifts.length);
    
    gifts.forEach(g => {
        grid.innerHTML += `<div class="gift-card">
            <div class="gift-img-wrap"><img src="${g.img}" alt="${g.name}" loading="lazy" onerror="this.onerror=null;this.src='${gifts[0]?.img || ''}'"></div>
            <div class="gift-name">${g.name}</div>
            <div class="gift-price-bar"><span class="gift-price">${g.price.toFixed(2)}</span>${TON_SVG}</div>
        </div>`;
    });
}

// Инициализация Live-ленты по умолчанию
const liveScroll = document.getElementById('live-scroll');
if (liveScroll) {
    gifts.slice(0, 4).forEach(g => {
        liveScroll.innerHTML += `<div class="live-gift"><img src="${g.img}" alt=""></div>`;
    });
}

// ══ РУЛЕТКА И ВРАЩЕНИЕ ══
const ITEM_W   = 94;
const ITEM_GAP = 8;
const CELL     = ITEM_W + ITEM_GAP;
const REPEATS  = 20; // Увеличенное кол-во для бесшовного вращения и защиты от исчезновений

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
    if (!strip) return;

    strip.innerHTML = buildReelHTML();

    strip.classList.remove('idle');

    strip.style.transition = 'none';
    strip.style.removeProperty('transform');
    strip.style.removeProperty('animation');

    void strip.offsetWidth;

    strip.classList.add('idle');
}

const initialStrip = document.getElementById('reel-strip-0');
if (initialStrip) initStrip(initialStrip);

const BASE_PRICE = window.CASE_DATA?.price || 0;
let currentQty = 1;
let isSpinning = false;

function setQty(qty) {
    if (isSpinning) return;
    currentQty = qty;
    document.querySelectorAll('.qty-btn').forEach(b => b.classList.toggle('active', +b.dataset.qty === qty));

    const container = document.getElementById('reels-container');
    if (!container) return;
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
    if (!window.FREE_CASE_META?.canClaim) return;
    const btn = document.getElementById('open-btn');
    if (btn) btn.innerHTML = `${T.openFree} <i class="ti ti-gift" style="font-size:20px;"></i>`;
}

// ══ УВЕДОМЛЕНИЯ (TOAST) ══
let appToastTimer = null;
function showAppToast(html) {
    const textEl = document.getElementById('app-toast-text');
    const el     = document.getElementById('app-toast');
    const bar    = document.getElementById('app-toast-bar');
    if (!textEl || !el || !bar) return;

    textEl.innerHTML = html;
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
    if (el) {
        el.classList.remove('show');
        el.classList.add('hide');
    }
    clearTimeout(appToastTimer);
}

// ══ ШТОРКА ЗАДАНИЙ ══
function openTasksSheet() {
    document.getElementById('tasksOverlay')?.classList.add('active');
    document.getElementById('tasksSheet')?.classList.add('open');
}

function closeTasksSheet() {
    document.getElementById('tasksOverlay')?.classList.remove('active');
    document.getElementById('tasksSheet')?.classList.remove('open');
}

function doSubscribeTask() {
    const url = window.CASE_DATA?.channelUrl;
    if (window.Telegram?.WebApp?.openTelegramLink && url) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else if (url) {
        window.open(url, '_blank');
    }
}

function doForwardTask() {
    const msgId = window.CASE_DATA?.shareMessageId;
    if (!window.Telegram?.WebApp?.shareMessage || !msgId) {
        showAppToast(T.forwardUnavailable);
        return;
    }
    window.Telegram.WebApp.shareMessage(msgId, (sent) => {
        if (sent) {
            fetch('/api/tasks/mark-forward/', { method: 'POST' })
                .then(r => r.json())
                .then(() => {
                    const btn = document.getElementById('task-fwd-btn');
                    if (btn) {
                        btn.textContent = T.done;
                        btn.classList.add('done');
                    }
                })
                .catch(() => {});
        }
    });
}

async function checkTasks(checkBtn) {
    checkBtn.disabled = true;
    let subscribedOk = false;
    let forwardOk = false;

    try {
        const r = await fetch('/api/tasks/check-free-case/', { method: 'POST' });
        const d = await r.json();
        subscribedOk = !!d.subscribed;
        forwardOk = !!d.forwarded;
    } catch (e) {
        subscribedOk = false;
        forwardOk = false;
    }

    document.getElementById('task-sub-error')?.classList.toggle('show', !subscribedOk);
    document.getElementById('task-fwd-error')?.classList.toggle('show', !forwardOk);
    
    const subBtn = document.getElementById('task-sub-btn');
    if (subBtn) {
        subBtn.classList.toggle('done', subscribedOk);
        if (subscribedOk) subBtn.textContent = T.done;
    }

    const fwdBtn = document.getElementById('task-fwd-btn');
    if (fwdBtn && forwardOk) {
        fwdBtn.textContent = T.done;
        fwdBtn.classList.add('done');
    }

    checkBtn.disabled = false;

    if (subscribedOk && forwardOk) {
        closeTasksSheet();
        startCaseOpen();
    } else {
        showAppToast(T.doAllTasks);
    }
}

// ══ АНИМАЦИЯ ВРАЩЕНИЯ ══
function spinStripToWon(strip, serverItemResult) {
    return new Promise(resolve => {
        strip.classList.remove('idle');
        strip.style.animation = 'none';
        void strip.offsetWidth;
        const wonItemName = serverItemResult?.gift_name || serverItemResult?.name;
        const wonIdx = gifts.findIndex(g => g.name === wonItemName);
        const safeWonIdx = wonIdx !== -1 ? wonIdx : 0;
        
        // Формируем полный объект выигрыша (данные подарка + ID инвентаря)
        const won = {
            ...gifts[safeWonIdx],
            ...serverItemResult,
            inventoryItemId: serverItemResult?.inventory_item_id || serverItemResult?.inventoryItemId || serverItemResult?.item_id || serverItemResult?.drop_id || serverItemResult?.id
        };

        // Захватываем текущую трансформацию во избежание скачка перед остановкой idle
        const currentTransform = window.getComputedStyle(strip).transform;
        strip.classList.remove('idle');
        strip.style.transition = 'none';
        strip.style.transform  = currentTransform !== 'none' ? currentTransform : 'translateX(0)';

        strip.querySelectorAll('.reel-item').forEach(el => el.classList.remove('winner'));
        void strip.offsetWidth; // Принудительный пересчет стилей (reflow)

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
        const jitter   = (Math.random() - 0.5) * 40;
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

function openCase() {
    if (isSpinning) return;
    if (!window.FREE_CASE_META?.canClaim) return;
    openTasksSheet();
}

async function startCaseOpen() {
    if (isSpinning) return;
    isSpinning = true;
    const btn = document.getElementById('open-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.55';
    }

    try {
        const response = await fetch(`/api/case/${window.CASE_DATA.slug}/open/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                qty: 1,
                free: true
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showAppToast(data.error || T.openError);
            isSpinning = false;
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '';
            }
            return;
        }

        if (data.new_balance !== undefined) {
            const balEl = document.getElementById('balance-amount');
            if (balEl) balEl.textContent = parseFloat(data.new_balance).toFixed(2);
        }

        window.FREE_CASE_META.canClaim = false;
        window.FREE_CASE_META.cooldownEndsAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

        const serverResults = data.results || [];
        const strips = [...document.querySelectorAll('.reel-strip')];

        strips.forEach(strip => {
            strip.classList.remove('idle');
            strip.style.animation = 'none';
        });

        let spinPromises = strips.map((strip, idx) => {
            const itemResult = serverResults[idx] || serverResults[0];
            return spinStripToWon(strip, itemResult);
        });

        let wonGifts = await Promise.all(spinPromises);

        await new Promise(r => setTimeout(r, 300));

        if (wonGifts.length > 0) {
            showWinModal(wonGifts);
        } else {
            triggerLoseShake();
            setTimeout(() => {
                document.querySelectorAll('.reel-strip').forEach(s => initStrip(s));
                isSpinning = false;
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                }
                updateFreeCaseButton();
            }, 500);
        }

    } catch (err) {
        showAppToast(T.serverError);
        isSpinning = false;
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '';
        }
    }
}

const WIN_PHRASES = T.winPhrases;

let winSlideIdx = 0;
let winResults  = [];

function showWinModal(results) {
    winResults  = results;
    winSlideIdx = 0;

    const phrase = WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)];
    const titleEl = document.getElementById('win-title');
    if (titleEl) titleEl.textContent = phrase;

    const slidesEl = document.getElementById('win-slides');
    if (slidesEl) {
        slidesEl.innerHTML = `<div class="win-slides-inner"><div class="win-slide">
            <div class="win-img-wrap"><img src="" alt=""></div>
            <div class="win-name"></div>
            <div class="win-price"><span></span><img class="ton-icon-sm" src="${window.STATIC_TON_LOGO}" alt=""></div>
        </div></div>`;
    }

    const dotsEl = document.getElementById('win-dots');
    if (dotsEl) {
        dotsEl.innerHTML = results.length > 1
            ? results.map((_, i) => `<div class="win-dot${i===0?' active':''}"></div>`).join('')
            : '';
    }

    renderSlide();
    updateSliderUI();

    const sparks = document.getElementById('win-sparks');
    if (sparks) {
        sparks.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const s = document.createElement('div');
            s.className = 'spark';
            const ang = (i / 20) * 360;
            const d   = 70 + Math.random() * 110;
            s.style.cssText = `left:50%;top:38%;--dx:${Math.cos(ang*Math.PI/180)*d}px;--dy:${Math.sin(ang*Math.PI/180)*d}px;animation-delay:${Math.random()*0.25}s`;
            sparks.appendChild(s);
        }
    }

    document.getElementById('win-overlay')?.classList.add('visible');
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
    if (imgEl) {
        imgEl.onerror = null;
        imgEl.src = won.img || won.image_url;
        imgEl.alt = won.name;
        imgEl.onerror = function () { this.onerror = null; this.src = gifts[0]?.img || ''; };
    }
    
    const nameEl = inner.querySelector('.win-name');
    if (nameEl) nameEl.textContent = won.name;

    const priceSpan = inner.querySelector('.win-price span');
    if (priceSpan) priceSpan.textContent = Number(won.price || 0).toFixed(2);
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

function closeWin() {
    document.getElementById('win-overlay')?.classList.remove('visible');
    document.querySelectorAll('.reel-strip').forEach(strip => {
        initStrip(strip);
    });
    isSpinning = false;
    const btn = document.getElementById('open-btn');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
    }
    updateFreeCaseButton();
}

function takeWonItem() {
    if (winSlideIdx < winResults.length - 1) {
        slideWin(1);
    } else {
        closeWin();
    }
}

function sellWonItem() {
    const won = winResults[winSlideIdx];
    const itemId = won?.inventoryItemId || won?.inventory_item_id || won?.item_id || won?.drop_id || won?.id;

    if (!itemId) {
        showAppToast(T.noItemId);
        if (winSlideIdx < winResults.length - 1) {
            slideWin(1);
        } else {
            closeWin();
        }
        return;
    }

    fetch('/api/gift/sale/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.new_balance !== undefined) {
            const balEl = document.getElementById('balance-amount');
            if (balEl) balEl.textContent = parseFloat(data.new_balance).toFixed(2);
            showAppToast(T.soldOk);
        } else if (data.error) {
            showAppToast(data.error);
        }
    })
    .catch(() => {
        showAppToast(T.sellError);
    })
    .finally(() => {
        if (winSlideIdx < winResults.length - 1) {
            slideWin(1);
        } else {
            closeWin();
        }
    });
}

document.getElementById('open-btn')?.addEventListener('click', openCase);
document.addEventListener('touchstart', function(){}, { passive: true });

function updateFreeCaseButton() {
    const btn = document.getElementById('open-btn');
    if (!btn) return;
    if (window.FREE_CASE_META?.canClaim) {
        btn.disabled = false;
        btn.innerHTML = `${T.openFree} <i class="ti ti-gift" style="font-size:20px;"></i>`;
        return;
    }
    const endsAt = new Date(window.FREE_CASE_META?.cooldownEndsAt).getTime();
    const tick = () => {
        const diff = endsAt - Date.now();
        if (diff <= 0) {
            if (window.FREE_CASE_META) window.FREE_CASE_META.canClaim = true;
            updateFreeCaseButton();
            return;
        }
        const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        btn.disabled = true;
        btn.textContent = `${h}:${m}:${s}`;
        requestAnimationFrame(tick);
    };
    tick();
}
updateFreeCaseButton();

async function refreshLiveFeed() {
    try {
        const res = await fetch('/api/live-feed/');
        const data = await res.json();
        const container = document.getElementById('live-scroll');
        if (container && data.items) {
            container.innerHTML = data.items.map(item => `
                <div class="live-gift">
                    <img src="${item.gift_img}" alt="">
                </div>
            `).join('');
        }
    } catch (e) {}
}

refreshLiveFeed();
setInterval(refreshLiveFeed, 7000);