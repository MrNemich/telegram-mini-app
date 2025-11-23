// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализируем приложение
tg.ready();
tg.expand(); // Раскрываем на весь экран
tg.enableClosingConfirmation(); // Подтверждение закрытия

// Показываем информацию о пользователе если есть
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    console.log('Пользователь Telegram:', user);
    
    // Можно добавить приветствие с именем пользователя
    const welcomeElement = document.querySelector('h1');
    if (user.first_name) {
        welcomeElement.textContent = `Привет, ${user.first_name}! ✨`;
    }
}

// Функция для кнопки
function showAlert() {
    tg.showPopup({
        title: 'Ура! 🎉',
        message: 'Ваш Mini App работает отлично!',
        buttons: [{ type: 'ok' }]
    });
}

// Добавляем интерактивность - разводы реагируют на движение
document.addEventListener('mousemove', function(e) {
    const effect = document.querySelector('.background-effect');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    effect.style.transform = `scale(${1 + x * 0.05}) rotate(${x * 2}deg)`;
});

// Для мобильных устройств - тач события
document.addEventListener('touchmove', function(e) {
    const effect = document.querySelector('.background-effect');
    const touch = e.touches[0];
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;
    
    effect.style.transform = `scale(${1 + x * 0.05}) rotate(${x * 2}deg)`;
});

console.log('✅ Mini App успешно запущен!');