const BASE_LANG = window.APP_DATA?.lang || 'ru';

document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + BASE_LANG);
});

const giveawayMsgEl = document.getElementById('giveaway-toast-msg');
if (giveawayMsgEl) {
    giveawayMsgEl.innerHTML = BASE_LANG === 'en'
        ? 'The <b>Giveaways</b> tab is under development...'
        : 'Вкладка <b>Розыгрыши</b> в разработке...';
}

const BASE_T = {
    ru: {
        deposit: 'Пополнить',
        openBank: 'Открыть @BlazeGift_bank',
        enterStars: 'Введите количество Stars для пополнения',
        yourAddress: 'Ваш адрес',
        enterGram: 'Введите сумму GRAM, которую вы хотите внести',
        enterUsdt: 'Введите сумму USDT для пополнения',
        enterTon: 'Введите сумму TON для пополнения',
        minAmount: (min, suf) => `Минимальная сумма ${min} ${suf}`,
        depositProcessing: (val, suf) => `Пополнение ${val} ${suf} — обрабатывается!`
    },
    en: {
        deposit: 'Deposit',
        openBank: 'Open @BlazeGift_bank',
        enterStars: 'Enter the amount of Stars to deposit',
        yourAddress: 'Your address',
        enterGram: 'Enter the amount of GRAM you want to deposit',
        enterUsdt: 'Enter the amount of USDT to deposit',
        enterTon: 'Enter the amount of TON to deposit',
        minAmount: (min, suf) => `Minimum amount ${min} ${suf}`,
        depositProcessing: (val, suf) => `Deposit of ${val} ${suf} is being processed!`
    }
}[BASE_LANG];

const WALLET_ADDRESS = 'UQCr8iDn9eXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX7kJJ';

let currentMethod = 'stars';
let cryptoCurrency = 'USDT';

// SVG иконки для crypto toggle
const svgUSDT = `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="28" fill="#26A17B"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="22" font-weight="700" font-family="Arial">₮</text></svg>`;
const svgTON  = `<img src="icons/toncoin-ton-logo.png" style="width:18px;height:18px;border-radius:50%;">`;

function openDeposit() {
    document.getElementById('depositOverlay').classList.add('active');
    document.getElementById('depositSheet').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDeposit() {
    document.getElementById('depositOverlay').classList.remove('active');
    document.getElementById('depositSheet').classList.remove('open');
    document.body.style.overflow = '';
}

function selectMethod(btn, method) {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active','active-gold'));
    currentMethod = method;
    btn.classList.add(method === 'stars' ? 'active-gold' : 'active');

    const addrSection   = document.getElementById('addrSection');
    const addrLabel     = document.getElementById('addrLabel');
    const inputSection  = document.getElementById('inputSection');
    const giftsSection  = document.getElementById('giftsSection');
    const balanceInfo   = document.getElementById('balanceInfo');
    const cryptoToggle  = document.getElementById('cryptoToggle');
    const inputDesc     = document.getElementById('inputDesc');
    const inputSuffix   = document.getElementById('inputSuffix');
    const infoRow       = document.getElementById('infoRow');
    const submitBtn     = document.getElementById('submitBtn');

    // Reset
    addrSection.classList.remove('hidden');
    inputSection.classList.remove('hidden');
    giftsSection.classList.add('hidden');
    balanceInfo.classList.remove('hidden');
    cryptoToggle.classList.add('hidden');
    infoRow.classList.remove('hidden');
    submitBtn.textContent = BASE_T.deposit;

    document.getElementById('amountInput').value = '';
    document.getElementById('errorMsg').classList.remove('show');

    if (method === 'stars') {
        addrSection.classList.add('hidden');
        balanceInfo.classList.add('hidden');
        inputDesc.textContent = BASE_T.enterStars;
        inputSuffix.textContent = '⭐';
    }
    else if (method === 'ton') {
        addrLabel.textContent = BASE_T.yourAddress;
        balanceInfo.classList.remove('hidden');
        inputDesc.textContent = BASE_T.enterGram;
        inputSuffix.textContent = 'TON';
    }
    else if (method === 'crypto') {
        addrSection.classList.add('hidden');
        balanceInfo.classList.add('hidden');
        cryptoToggle.classList.remove('hidden');
        cryptoCurrency = 'USDT';
        updateCryptoToggle();
        inputDesc.textContent = BASE_T.enterUsdt;
        inputSuffix.textContent = 'USDT';
    }
    else if (method === 'gifts') {
        addrSection.classList.add('hidden');
        inputSection.classList.add('hidden');
        giftsSection.classList.remove('hidden');
        infoRow.classList.add('hidden');
        submitBtn.textContent = BASE_T.openBank;
    }
}

function toggleCrypto() {
    cryptoCurrency = cryptoCurrency === 'USDT' ? 'GRAM' : 'USDT';
    updateCryptoToggle();
    document.getElementById('amountInput').value = '';
    document.getElementById('errorMsg').classList.remove('show');
}

function updateCryptoToggle() {
    const label  = document.getElementById('cryptoLabel');
    const suffix = document.getElementById('inputSuffix');
    const desc   = document.getElementById('inputDesc');
    const iconEl = document.getElementById('cryptoIconImg');

    if (cryptoCurrency === 'USDT') {
        iconEl.innerHTML = `<img src="/static/images/usdt-logo.png" style="width:16px;height:16px;border-radius:50%;object-fit:cover;flex-shrink:0;">`;
        label.textContent = 'USDT';
        suffix.textContent = 'USDT';
        desc.textContent = BASE_T.enterUsdt;
    } else {
        iconEl.innerHTML = `<img src="/static/images/toncoin-logo.png" style="width:16px;height:16px;border-radius:50%;object-fit:cover;flex-shrink:0;">`; 
        label.textContent = 'GRAM';
        suffix.textContent = 'GRAM';
        desc.textContent = BASE_T.enterTon;
    }
}

function addAmount(val) {
    const input = document.getElementById('amountInput');
    const cur = parseFloat(input.value) || 0;
    const dec = (currentMethod === 'ton' || (currentMethod === 'crypto' && cryptoCurrency === 'GRAM')) ? 2 : 0;
    input.value = dec ? (cur + val).toFixed(2) : String(cur + val);
    document.getElementById('errorMsg').classList.remove('show');
}

function validateAmount() {
    const val = parseFloat(document.getElementById('amountInput').value);
    const min = getMin();
    const suf = getSuffix();
    const err = document.getElementById('errorMsg');
    if (val && val < min) {
        err.textContent = BASE_T.minAmount(min, suf);
        err.classList.add('show');
    } else {
        err.classList.remove('show');
    }
}

function getMin() {
    if (currentMethod === 'stars') return 1;
    if (currentMethod === 'ton')   return 0.01;
    if (currentMethod === 'crypto') return 1;
    return 0;
}

function getSuffix() {
    if (currentMethod === 'stars') return '⭐';
    if (currentMethod === 'ton')   return 'TON';
    if (currentMethod === 'crypto') return cryptoCurrency;
    return '';
}

function submitDeposit() {
    if (currentMethod === 'gifts') {
        window.open('https://t.me/BlazeGift_bank', '_blank');
        return;
    }
    const val = parseFloat(document.getElementById('amountInput').value);
    const min = getMin();
    const suf = getSuffix();
    if (!val || val < min) {
        const err = document.getElementById('errorMsg');
        err.textContent = BASE_T.minAmount(min, suf);
        err.classList.add('show');
        document.getElementById('amountInput').focus();
        return;
    }
    alert(BASE_T.depositProcessing(val, suf));
    closeDeposit();
}

function navigate(button) {
    const url = button.dataset.page;
    if (url) {
        window.location.href = url;
    }
}

// ── GIVEAWAY TOAST ──
let giveawayToastTimer = null;

function showGiveawayToast() {
    const toast = document.getElementById('giveaway-toast');
    const bar   = document.getElementById('giveaway-toast-bar');
    bar.classList.remove('running');
    void bar.offsetWidth;
    toast.classList.remove('hide');
    toast.classList.add('show');
    bar.classList.add('running');
    clearTimeout(giveawayToastTimer);
    giveawayToastTimer = setTimeout(() => closeGiveawayToast(), 4000);
}

function closeGiveawayToast() {
    clearTimeout(giveawayToastTimer);
    const toast = document.getElementById('giveaway-toast');
    const bar   = document.getElementById('giveaway-toast-bar');
    // Stop and hide bar immediately so it doesn't flash during slide-up
    bar.classList.remove('running');
    bar.style.opacity = '0';
    toast.classList.remove('show');
    toast.classList.add('hide');
    // Restore bar opacity after animation finishes
    setTimeout(() => { bar.style.opacity = ''; }, 420);
}

(function(){
    const canvas = document.getElementById('rain-canvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    const drops = Array.from({length:55},()=>({ x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight, len:Math.random()*22+8, speed:Math.random()*0.9+0.3, alpha:Math.random()*0.45+0.08, width:Math.random()*1.1+0.3 }));
    function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
        drops.forEach(d=>{
            const g=ctx.createLinearGradient(d.x,d.y,d.x,d.y+d.len);
            g.addColorStop(0,'rgba(255,160,0,0)'); g.addColorStop(1,`rgba(255,160,0,${d.alpha})`);
            ctx.strokeStyle=g; ctx.lineWidth=d.width; ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x,d.y+d.len); ctx.stroke();
            d.y+=d.speed; if(d.y>canvas.height+30){ d.y=-30; d.x=Math.random()*canvas.width; }
        });
        requestAnimationFrame(draw);
    }
    draw();
})();