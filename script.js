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
    content: document.getElementById('content'),
    title: document.getElementById('pageTitle'),
    description: document.getElementById('pageDescription'),
    buttons: document.querySelectorAll('.nav-button')
};

// Данные страниц (простой объект для быстрого доступа)
const pagesData = {
    home: {
        title: '🏠 Главная',
        description: 'Добро пожаловать в приложение'
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

// Функция смены страницы (оптимизированная)
function changePage(page) {
    // Защита от двойного нажатия
    if (isAnimating || currentPage === page) return;
    
    isAnimating = true;
    currentPage = page;
    
    // Быстрое обновление активной кнопки
    updateActiveButton(page);
    
    // Плавная смена контента
    switchContent(page);
    
    // Виброотклик (если поддерживается)
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Обновление активной кнопки (минимальная анимация)
function updateActiveButton(activePage) {
    elements.buttons.forEach(button => {
        const isActive = button.getAttribute('data-page') === activePage;
        button.classList.toggle('active', isActive);
    });
}

// Смена контента (оптимизированная)
function switchContent(page) {
    // Добавляем класс для анимации исчезновения
    elements.content.classList.add('content-changing');
    
    // Используем requestAnimationFrame для плавности
    requestAnimationFrame(() => {
        // Быстрое обновление контента
        const data = pagesData[page];
        elements.title.textContent = data.title;
        elements.description.textContent = data.description;
        
        // Убираем класс анимации
        requestAnimationFrame(() => {
            elements.content.classList.remove('content-changing');
            isAnimating = false;
        });
    });
}

// Функция для кнопки
function showAlert() {
    const messages = {
        home: 'Добро пожаловать на главную! 🏠',
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
    if (user.first_name && currentPage === 'home') {
        elements.title.textContent = `Привет, ${user.first_name}! 🏠`;
    }
}

// Простая интерактивность фона (отключена для старых устройств)
let touchEnabled = 'ontouchstart' in window;
if (touchEnabled) {
    document.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.bottom-nav')) {
            e.preventDefault();
        }
    }, { passive: false });
}

console.log('✅ Оптимизированный Mini App запущен!');
