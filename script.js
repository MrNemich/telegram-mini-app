// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализируем приложение
tg.ready();
tg.expand(); // Раскрываем на весь экран
tg.enableClosingConfirmation(); // Подтверждение закрытия

// Устанавливаем цвет фона Telegram
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Показываем информацию о пользователе если есть
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    console.log('Пользователь Telegram:', user);
    
    // Добавляем приветствие с именем пользователя
    const welcomeElement = document.querySelector('h1');
    if (user.first_name) {
        welcomeElement.textContent = `Привет, ${user.first_name}! ✨`;
    }
}

// Функция для кнопки
function showAlert() {
    tg.showPopup({
        title: 'Ура! 🎉',
        message: 'Ваш Mini App работает отлично на телефоне!',
        buttons: [{ type: 'ok' }]
    });
}

// Интерактивность для мобильных устройств
let lastTouchY = 0;

document.addEventListener('touchstart', function(e) {
    lastTouchY = e.touches[0].clientY;
});

document.addEventListener('touchmove', function(e) {
    e.preventDefault(); // Предотвращаем скролл
    const touch = e.touches[0];
    const deltaY = touch.clientY - lastTouchY;
    
    const effect = document.querySelector('.background-effect');
    const intensity = Math.min(Math.abs(deltaY) * 0.1, 20);
    
    effect.style.transform = `scale(${1 + intensity * 0.01}) rotate(${deltaY * 0.1}deg)`;
});

// Виброотклик на кнопку (если поддерживается)
document.querySelector('.tg-button').addEventListener('touchstart', function() {
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
});

// Адаптация под изменение ориентации
window.addEventListener('orientationchange', function() {
    // Даем время на поворот экрана
    setTimeout(() => {
        const effect = document.querySelector('.background-effect');
        effect.style.animation = 'none';
        setTimeout(() => {
            effect.style.animation = '';
        }, 50);
    }, 300);
});

console.log('✅ Mini App для телефона успешно запущен!');
