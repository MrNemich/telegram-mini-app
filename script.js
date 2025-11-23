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
let currentTab = 'inventory';

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    otherContent: document.getElementById('other-content'),
    newsModal: document.getElementById('newsModal'),
    pageTitle: document.getElementById('pageTitle'),
    pageDescription: document.getElementById('pageDescription'),
    buttons: document.querySelectorAll('.nav-button'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    starsBalance: document.getElementById('starsBalance')
};

// Данные страниц
const pagesData = {
    home: {
        title: '🏠 Главная',
        description: 'Последние новости и обновления'
    },
    roulette: {
        title: '🎰 Рулетка',
        description: 'Откройте кейсы и получите награды'
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
    if (page === 'home') {
        elements.homeContent.style.display = 'block';
        elements.otherContent.style.display = 'none';
    } else {
        elements.homeContent.style.display = 'none';
        elements.otherContent.style.display = 'block';
        
        const data = pagesData[page];
        if (elements.pageTitle) elements.pageTitle.textContent = data.title;
        if (elements.pageDescription) elements.pageDescription.textContent = data.description;
    }
    
    isAnimating = false;
}

// Функция переключения табов
function switchTab(tabName) {
    if (currentTab === tabName) return;
    
    currentTab = tabName;
    
    // Обновляем активные табы
    elements.tabButtons.forEach(button => {
        const isActive = button.getAttribute('data-tab') === tabName;
        button.classList.toggle('active', isActive);
    });
    
    // Переключаем контент табов
    elements.tabContents.forEach(content => {
        const isActive = content.id === `${tabName}-tab`;
        content.classList.toggle('active', isActive);
    });
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(3);
    }
}

// Функция для открытия кейса
function openCase(price) {
    const caseNames = {
        100: "Начальный набор",
        200: "Золотой сундук", 
        500: "Эпический ларец",
        1000: "Легендарный артефакт",
        1500: "Мифическая шкатулка"
    };
    
    const caseDescriptions = {
        100: "Отличный старт для новичка!",
        200: "Возможность получить редкие предметы",
        500: "Эксклюзивные награды ждут тебя!",
        1000: "Уникальные предметы высшего качества",
        1500: "Легендарные сокровища из древних времён"
    };
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate([10, 5, 10]);
    }
    
    tg.showPopup({
        title: '🎁 Открытие кейса',
        message: `${caseDescriptions[price]}\n\n${caseNames[price]} за ${price} звёзд`,
        buttons: [
            { 
                id: 'open', 
                type: 'default', 
                text: `Открыть за ${price} ⭐` 
            },
            { 
                type: 'cancel' 
            }
        ]
    }).then(function(buttonId) {
        if (buttonId === 'open') {
            // Логика открытия кейса
            simulateCaseOpening(price, caseNames[price]);
        }
    });
    
    console.log(`Попытка открыть ${caseNames[price]} за ${price} звёзд`);
}

// Симуляция открытия кейса
function simulateCaseOpening(price, caseName) {
    // Проверяем достаточно ли звёзд
    const currentBalance = parseInt(elements.starsBalance.textContent.replace(',', ''));
    if (currentBalance < price) {
        tg.showPopup({
            title: '❌ Недостаточно звёзд',
            message: `Вам нужно ещё ${price - currentBalance} звёзд для открытия этого кейса`,
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Обновляем баланс
    const newBalance = currentBalance - price;
    elements.starsBalance.textContent = newBalance.toLocaleString();
    
    // Показываем анимацию открытия
    tg.showPopup({
        title: '🎉 Поздравляем!',
        message: `Вы открыли ${caseName}!\n\nПолучены:\n• 150 игровой валюты\n• 3 редких кристалла\n• 1 случайный предмет`,
        buttons: [{ type: 'ok' }]
    });
    
    // Виброотклик успеха
    if (navigator.vibrate) {
        navigator.vibrate([20, 10, 20]);
    }
}

// Функции для модального окна новости
function openNewsModal() {
    elements.newsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Виброотклик при открытии
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function closeNewsModal() {
    elements.newsModal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Виброотклик при закрытии
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Закрытие модального окна по клику на фон
elements.newsModal.addEventListener('click', function(e) {
    if (e.target === elements.newsModal) {
        closeNewsModal();
    }
});

// Закрытие модального окна по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && elements.newsModal.classList.contains('show')) {
        closeNewsModal();
    }
});

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
        if (!e.target.closest('.bottom-nav') && !e.target.closest('.modal-content')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение полностью загружено и готово!');
    console.log('📱 Текущая страница:', currentPage);
    
    // Инициализируем начальный таб
    switchTab('inventory');
});

console.log('✅ Новостной Mini App запущен!');
