const LANG = window.APP_DATA?.lang || 'ru';
// Применяем перевод статических элементов страницы (data-ru / data-en), как на profile.html
document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + LANG);
});

const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const iconEl = document.getElementById('user-icon');

if (tgUser?.photo_url) {
    iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;
}

function openCase(type) {
    console.log('Opening case:', type);
}

function navigate(button) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    button.classList.add('active');
    window.location.href = button.dataset.page;
}

const track = document.getElementById('live-scroll');
let lastIds = new Set();
let allItems = [];

function buildTile(item) {
    return `
        <div class="live-gift" title="${item.gift_name || ''}">
            <img
                src="${item.gift_image_url}"
                alt="${item.gift_name || 'gift'}"
                onerror="this.src='https://cdn.changes.tg/gifts/models/Plush%20Pepe/png/Frozen.png'"
            >
        </div>
    `;
}

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