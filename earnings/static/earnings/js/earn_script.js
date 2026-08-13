const LANG = window.APP_DATA?.lang || 'ru';

// Применяем перевод статических элементов страницы (data-ru / data-en), как на profile.html
document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = el.getAttribute('data-' + LANG);
});

const T = {
    ru: {
        start: 'Начать', check: 'Проверить', checking: 'Проверка...', done: 'Выполнено',
        noUserId: 'Не удалось получить ваш ID. Откройте приложение через Telegram.',
        notSubscribed: 'Вы не подписаны', serverError: 'Ошибка сервера',
        inviteText: 'Заходи в BlazeGift и получай NFT-подарки! 🎁',
        heroRefTitle: 'Приглашай друзей', heroRefSub: 'И получай 10% от их депозитов на свой баланс',
        heroTasksTitle: 'Выполняй задания', heroTasksSub: 'И получай за это хорошие награды'
    },
    en: {
        start: 'Start', check: 'Check', checking: 'Checking...', done: 'Done',
        noUserId: "Couldn't get your ID. Please open the app through Telegram.",
        notSubscribed: 'Not subscribed', serverError: 'Server error',
        inviteText: 'Join BlazeGift and get NFT gifts! 🎁',
        heroRefTitle: 'Invite friends', heroRefSub: 'And get 10% of their deposits on your balance',
        heroTasksTitle: 'Complete tasks', heroTasksSub: 'And get great rewards for it'
    }
}[LANG];

const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const iconEl = document.getElementById('user-icon');

if (tgUser) {
    if (tgUser.photo_url) {
        iconEl.innerHTML = `<img src="${tgUser.photo_url}" alt="avatar">`;
    } else {
        const initials = (tgUser.first_name?.[0] ?? '') + (tgUser.last_name?.[0] ?? '');
        iconEl.innerHTML = `<div class="avatar-initials">${initials}</div>`;
    }
}

const heroData = {
    ref: { icon: 'ti-users', title: T.heroRefTitle, sub: T.heroRefSub },
    tasks: { icon: 'ti-clipboard-list', title: T.heroTasksTitle, sub: T.heroTasksSub }
};

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (i === 0 && tab === 'ref') || (i === 1 && tab === 'tasks'));
    });
    document.getElementById('tab-tasks').classList.toggle('active', tab === 'tasks');
    document.getElementById('tab-ref').classList.toggle('active', tab === 'ref');

    // Update hero banner
    const d = heroData[tab];
    const hero = document.getElementById('earn-hero');
    hero.querySelector('.earn-hero-icon i').className = 'ti ' + d.icon;
    hero.querySelector('.earn-hero-title').textContent = d.title;
    hero.querySelector('.earn-hero-sub').textContent = d.sub;
}

// Состояние кнопки задания храним отдельно от отображаемого текста (data-state),
// чтобы переключение языка не ломало логику "начать -> проверить"
function doTask(btn, url) {
    const state = btn.dataset.state || 'start';

    if (state === 'start') {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            tg.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }

        btn.innerText = T.check;
        btn.dataset.state = 'check';

    } else if (state === 'check') {
        const userId = tg.initDataUnsafe?.user?.id;

        if (!userId) {
            alert(T.noUserId);
            return;
        }

        let targetType = url.includes('BlazeGiftChat') ? 'chat' : 'channel';

        checkTask(btn, userId, targetType);
    }
}

async function checkTask(buttonElement, telegramUserId, targetType) {
    buttonElement.disabled = true;
    buttonElement.innerText = T.checking;

    try {
        const response = await fetch('/api/check-subscription/', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: telegramUserId,
                target: targetType
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            buttonElement.innerText = T.done;
            buttonElement.classList.add("done");
            buttonElement.dataset.state = 'done';
        } else if (result.status === 'not_subscribed') {
            alert(T.notSubscribed);
            buttonElement.innerText = T.check;
            buttonElement.dataset.state = 'check';
            buttonElement.disabled = false;
        } else {
            alert(T.serverError + ": " + result.message);
            buttonElement.innerText = T.check;
            buttonElement.dataset.state = 'check';
            buttonElement.disabled = false;
        }
    } catch (error) {
        alert(T.serverError);
        buttonElement.innerText = T.check;
        buttonElement.dataset.state = 'check';
        buttonElement.disabled = false;
    }
}

document.getElementById('copyBtn').addEventListener('click', function() {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id ?? '0';
    const link = 'https://t.me/BlazeGift_Bot?startapp=' + userId;
    navigator.clipboard?.writeText(link).catch(() => {});
    const icon = this.querySelector('i');
    icon.className = 'ti ti-check';
    setTimeout(() => icon.className = 'ti ti-copy', 2000);
});

document.getElementById('inviteBtn').addEventListener('click', function() {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id ?? '0';
    const link = 'https://t.me/BlazeGift_Bot?startapp=' + userId;
    const text = encodeURIComponent(T.inviteText);
    if (tg) {
        tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + text);
    } else {
        window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + text, '_blank');
    }
});