// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализируем приложение
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// Устанавливаем темный цвет фона
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Текущая активная страница
let currentPage = 'home';
let isAnimating = false;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    otherContent: document.getElementById('other-content'),
    stickerPanel: document.getElementById('stickerPanel'),
    pageTitle: document.getElementById('pageTitle'),
    pageDescription: document.getElementById('pageDescription'),
    buttons: document.querySelectorAll('.nav-button')
};

// Данные страниц
const pagesData = {
    home: {
        title: '🏠 Главная',
        description: 'Последние новости и обновления'
    },
    roulette: {
        title: '🎰 Рулетка',
        description: 'Испытайте удачу в рулетке'
    },
    tasks: {
        title: '✅ Задания',
        description: 'Выполняйте задания и получайте награды'
    },
    profile: {
        title: '👤 Профиль',
        description: 'Ваш профиль и статистика'
    }
};

// Функция смены страницы
function changePage(page) {
    if (isAnimating || currentPage === page) return;
    
    isAnimating = true;
    currentPage = page;
    
    // Закрываем панель стикеров если открыта
    closeStickers();
    
    // Обновляем активную кнопку
    updateActiveButton(page);
    
    // Переключаем контент
    switchContent(page);
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Обновление активной кнопки
function updateActiveButton(activePage) {
    elements.buttons.forEach(button => {
        const isActive = button.getAttribute('data-page') === activePage;
        button.classList.toggle('active', isActive);
    });
}

// Смена контента
function switchContent(page) {
    // Скрываем все контенты
    elements.homeContent.style.display = 'none';
    elements.rouletteContent.style.display = 'none';
    elements.otherContent.style.display = 'none';
    
    // Показываем нужный контент
    if (page === 'home') {
        elements.homeContent.style.display = 'block';
    } else if (page === 'roulette') {
        elements.rouletteContent.style.display = 'block';
    } else {
        elements.otherContent.style.display = 'block';
        const data = pagesData[page];
        elements.pageTitle.textContent = data.title;
        elements.pageDescription.textContent = data.description;
    }
    
    isAnimating = false;
}

// Функции для панели стикеров
function showStickers() {
    elements.stickerPanel.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function closeStickers() {
    elements.stickerPanel.classList.remove('show');
    document.body.style.overflow = '';
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

function sendSticker(sticker) {
    // Здесь можно добавить логику отправки стикера
    tg.showPopup({
        title: 'Стикер отправлен',
        message: `Вы отправили стикер: ${sticker}`,
        buttons: [{ type: 'ok' }]
    });
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
    
    closeStickers();
}

// Функции для модального окна новости
function openNewsModal(newsId) {
    const modal = document.getElementById(`newsModal${newsId}`);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Виброотклик при открытии
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
}

function closeNewsModal(newsId) {
    const modal = document.getElementById(`newsModal${newsId}`);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Виброотклик при закрытии
        if (navigator.vibrate) {
            navigator.vibrate(5);
        }
    }
}

// Закрытие модальных окон по клику на фон
document.querySelectorAll('.news-modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            const modalId = modal.id.replace('newsModal', '');
            closeNewsModal(modalId);
        }
    });
});

// Закрытие модальных окон по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.news-modal.show').forEach(modal => {
            const modalId = modal.id.replace('newsModal', '');
            closeNewsModal(modalId);
        });
        closeStickers();
    }
});

// Функция для рулетки
function playRoulette(stars) {
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
    
    // Анимация нажатия
    const button = event.currentTarget;
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        button.style.transform = '';
        
        // Показываем результат
        const results = [
            `🎉 Поздравляем! Вы выиграли ${Math.round(stars * 0.5)} звёзд!`,
            `😊 Вы выиграли ${Math.round(stars * 0.8)} звёзд!`,
            `🎰 Упс! Вы проиграли ${stars} звёзд...`,
            `🚀 Вау! Вы выиграли ${stars * 2} звёзд!`,
            `⭐ Вы выиграли ${Math.round(stars * 1.5)} звёзд!`
        ];
        
        const randomResult = results[Math.floor(Math.random() * results.length)];
        
        tg.showPopup({
            title: 'Результат рулетки',
            message: randomResult,
            buttons: [{ type: 'ok' }]
        });
        
    }, 150);
}

// Функция для кнопки
function showAlert() {
    const messages = {
        home: 'Читайте последние новости! 🏠',
        roulette: 'Крутите рулетку и выигрывайте! 🎰',
        tasks: 'Новые задания ждут выполнения! ✅',
        profile: 'Посмотрите свою статистику! 👤'
    };
    
    tg.showPopup({
        title: 'Уведомление',
        message: messages[currentPage] || 'Привет!',
        buttons: [{ type: 'ok' }]
    });
}

// Информация о пользователе
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    if (user.first_name) {
        console.log('Пользователь:', user.first_name);
        // Можно добавить персонализацию в будущем
    }
}

// Простая интерактивность фона
let touchEnabled = 'ontouchstart' in window;
if (touchEnabled) {
    document.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.bottom-nav') && !e.target.closest('.modal-content') && !e.target.closest('.sticker-panel')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение полностью загружено и готово!');
    console.log('📱 Текущая страница:', currentPage);
});

console.log('✅ Новостной Mini App запущен!');
