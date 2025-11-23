// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализируем приложение
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// Устанавливаем темный цвет фона Telegram
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Включаем темную тему если поддерживается
if (tg.colorScheme === 'dark') {
    document.body.style.background = '#000000';
    tg.setBackgroundColor('#000000');
}

// Текущая активная страница
let currentPage = 'home';

// Функция смены страницы
function changePage(page) {
    // Убираем активный класс со всех кнопок
    const buttons = document.querySelectorAll('.nav-button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной кнопке
    event.currentTarget.classList.add('active');
    
    // Меняем контент в зависимости от страницы
    const title = document.getElementById('pageTitle');
    const description = document.getElementById('pageDescription');
    
    switch(page) {
        case 'home':
            title.innerHTML = '🌙 Главная';
            description.textContent = 'Добро пожаловать в темное царство';
            currentPage = 'home';
            break;
            
        case 'tasks':
            title.innerHTML = '✅ Задания';
            description.textContent = 'Выполняйте задания и получайте награды';
            currentPage = 'tasks';
            break;
            
        case 'shop':
            title.innerHTML = '🛒 Магазин';
            description.textContent = 'Покупайте уникальные предметы';
            currentPage = 'shop';
            break;
            
        case 'stories':
            title.innerHTML = '📖 Истории';
            description.textContent = 'Читайте увлекательные истории';
            currentPage = 'stories';
            break;
    }
    
    // Виброотклик при переключении
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
    // Анимация смены контента
    animateContentChange();
}

// Функция анимации смены контента
function animateContentChange() {
    const content = document.querySelector('.content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
        content.style.transition = 'all 0.3s ease';
    }, 150);
}

// Функция для кнопки
function showAlert() {
    const messages = {
        'home': 'Исследуйте главную страницу! 🏠',
        'tasks': 'Новые задания ждут вас! ✅',
        'shop': 'Специальные предложения в магазине! 🛒',
        'stories': 'Новые истории уже доступны! 📖'
    };
    
    tg.showPopup({
        title: 'Уведомление 🔔',
        message: messages[currentPage],
        buttons: [{ type: 'ok' }]
    });
}

// Показываем информацию о пользователе если есть
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    console.log('Пользователь Telegram:', user);
    
    // Добавляем приветствие с именем пользователя
    if (user.first_name && currentPage === 'home') {
        const welcomeElement = document.querySelector('h1');
        welcomeElement.innerHTML = `Привет, ${user.first_name}! 🌙`;
    }
}

// Интерактивность для мобильных устройств
let lastTouchY = 0;

document.addEventListener('touchstart', function(e) {
    lastTouchY = e.touches[0].clientY;
});

document.addEventListener('touchmove', function(e) {
    if (!e.target.closest('.bottom-nav')) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaY = touch.clientY - lastTouchY;
        
        const effect = document.querySelector('.background-effect');
        const intensity = Math.min(Math.abs(deltaY) * 0.1, 15);
        
        effect.style.transform = `scale(${1 + intensity * 0.008}) rotate(${deltaY * 0.05}deg)`;
        effect.style.filter = `blur(${35 - intensity * 0.5}px) brightness(${0.8 - intensity * 0.01})`;
    }
});

// Виброотклик на кнопки навигации
document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('touchstart', function() {
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }
    });
});

// Адаптация под изменение ориентации
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        const effect = document.querySelector('.background-effect');
        effect.style.animation = 'none';
        setTimeout(() => {
            effect.style.animation = '';
        }, 50);
    }, 300);
});

console.log('✅ Mini App с навигацией успешно запущен!');
