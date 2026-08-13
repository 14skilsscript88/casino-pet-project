const LANG = window.APP_DATA?.lang || 'ru';

// Применяем перевод статических элементов страницы (data-ru / data-en), как на profile.html
document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + LANG);
});

const T = {
    ru: { user: 'Пользователь', empty: 'Список пока пуст', you: 'Вы' },
    en: { user: 'User', empty: 'The list is empty for now', you: 'You' }
}[LANG] || { user: 'Пользователь', empty: 'Список пока пуст', you: 'Вы' };

const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;

const iconEl = document.getElementById('user-icon');

if (tgUser) {
    if (tgUser.photo_url) {
        iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;
        document.getElementById('my-avatar').innerHTML = `<img src="${tgUser.photo_url}" alt="me">`;
    } else {
        const initials = (tgUser.first_name?.[0] ?? '') + (tgUser.last_name?.[0] ?? '');
        iconEl.innerHTML = `<div class="avatar-initials">${initials}</div>`;
        document.getElementById('my-avatar').innerHTML = `<div class="lb-avatar-letter">${initials}</div>`;
    }
    const displayName = tgUser.username
        ? `@${tgUser.username}`
        : `${tgUser.first_name ?? ''}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`.trim() || T.you;
    document.getElementById('my-name').textContent = displayName;
}

const serverData = JSON.parse(document.getElementById('django-data').textContent);

const tonSVG = `<img class="ton-icon-sm" src="${window?.APP_DATA?.tonPath}" alt="TON">`;

const rankMeta = [
    { numCls: 'gold',   rowCls: 'rank-1' },
    { numCls: 'silver', rowCls: 'rank-2' },
    { numCls: 'bronze', rowCls: 'rank-3' },
];

function renderList(data) {
    const header = `<div class="lb-header">
        <div class="lb-header-rank">№</div>
        <div class="lb-header-user">${T.user}</div>
    </div>`;

    if (!data || data.length === 0) {
        document.getElementById('lb-list').innerHTML = header + `<div style="text-align:center; padding: 20px; color: #888;">${T.empty}</div>`;
        return;
    }

    const rows = data.map((entry, i) => {
        const rank = i + 1;
        const meta = i < 3 ? rankMeta[i] : { numCls: 'grey', rowCls: '' };
        const letter = entry.name?.[0]?.toUpperCase() ?? '?';
        const avatarHtml = entry.avatar
            ? `<img src="${entry.avatar}" alt="${entry.name}">`
            : `<div class="lb-avatar-letter">${letter}</div>`;

        return `
        <div class="lb-row ${meta.rowCls}">
            <div class="lb-rank-wrap">
                <span class="lb-rank-num ${meta.numCls}">${rank}.</span>
            </div>
            <div class="lb-avatar">${avatarHtml}</div>
            <div class="lb-name">${entry.name}</div>
            <div class="lb-amount">${Number(entry.amount).toFixed(2)} ${tonSVG}</div>
        </div>`;
    }).join('');

    document.getElementById('lb-list').innerHTML = header + rows;
}

function updateMyStats(userStats) {
    if (!userStats) return;
    document.getElementById('my-name').textContent = userStats.name || T.you;
    document.getElementById('my-rank').textContent = userStats.rank;
    document.getElementById('my-amount').textContent = Number(userStats.amount).toFixed(2);
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (i === 0 && tab === 'month') || (i === 1 && tab === 'alltime'));
    });

    if (tab === 'month') {
        renderList(serverData.month);
        updateMyStats(serverData.myMonth);
    } else {
        renderList(serverData.alltime);
        updateMyStats(serverData.myAlltime);
    }
}

switchTab('month');

document.addEventListener('touchstart', function(){}, { passive: true });