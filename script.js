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
let selectedRoulette = 0;
let isSpinning = false;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    otherContent: document.getElementById('other-content'),
    newsModal: document.getElementById('newsModal'),
    resultModal: document.getElementById('resultModal'),
    pageTitle: document.getElementById('pageTitle'),
    pageDescription: document.getElementById('pageDescription'),
    buttons: document.querySelectorAll('.nav-button'),
    rouletteItems: document.getElementById('rouletteItems'),
    spinBtn: document.getElementById('spinBtn'),
    selectedRoulette: document.getElementById('selectedRoulette'),
    resultIcon: document.getElementById('resultIcon'),
    resultTitle: document.getElementById('resultTitle'),
    resultText: document.getElementById('resultText')
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

// Призы для рулетки
const roulettePrizes = [
    { name: "10 ⭐", value: 10, color: "#6A0DAD" },
    { name: "20 ⭐", value: 20, color: "#8A2BE2" },
    { name: "50 ⭐", value: 50, color: "#DA70D6" },
    { name: "100 ⭐", value: 100, color: "#FF69B4" },
    { name: "200 ⭐", value: 200, color: "#FF1493" },
    { name: "Удача!", value: 0, color: "#32CD32" },
    { name: "5 ⭐", value: 5, color: "#6A0DAD" },
    { name: "30 ⭐", value: 30, color: "#8A2BE2" }
];

// Инициализация рулетки
function initRoulette() {
    elements.rouletteItems.innerHTML = '';
    
    const itemCount = roulettePrizes.length;
    const angleStep = 360 / itemCount;
    
    roulettePrizes.forEach((prize, index) => {
        const item = document.createElement('div');
        item.className = 'roulette-item';
        item.style.transform = `rotate(${index * angleStep}deg)`;
        item.style.backgroundColor = prize.color;
        
        const content = document.createElement('div');
        content.className = 'roulette-item-content';
        content.textContent = prize.name;
        
        item.appendChild(content);
        elements.rouletteItems.appendChild(item);
    });
}

// Функция смены страницы
function changePage(page) {
    if (isAnimating || currentPage === page) return;
    
    isAnimating = true;
    currentPage = page;
    
    // Обновляем активную кнопку
    updateActiveButton(page);
    
    // Переключаем контент
    switchContent(page);
    
    // Инициализируем рулетку при переходе на страницу рулетки
    if (page === 'roulette') {
        initRoulette();
    }
    
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
        elements.pageTitle.textContent = data.title;
        elements.pageDescription.textContent = data.description;
    }
    
    isAnimating = false;
}

// Выбор рулетки
function selectRoulette(stars) {
    if (isSpinning) return;
    
    selectedRoulette = stars;
    elements.selectedRoulette.textContent = `Выбрана рулетка за ${stars} звёзд`;
    elements.spinBtn.disabled = false;
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Вращение рулетки
function spinRoulette() {
    if (isSpinning || selectedRoulette === 0) return;
    
    isSpinning = true;
    elements.spinBtn.disabled = true;
    
    // Медленное вращение в начале
    elements.rouletteItems.style.transition = 'transform 0.5s ease-out';
    elements.rouletteItems.style.transform = 'rotate(180deg)';
    
    // Быстрое вращение после небольшой паузы
    setTimeout(() => {
        elements.rouletteItems.style.transition = 'transform 7s cubic-bezier(0.1, 0.2, 0.3, 1)';
        
        // Случайный угол остановки (несколько полных оборотов + случайный приз)
        const fullRotations = 5 + Math.floor(Math.random() * 3);
        const prizeIndex = Math.floor(Math.random() * roulettePrizes.length);
        const angleStep = 360 / roulettePrizes.length;
        const stopAngle = fullRotations * 360 + (prizeIndex * angleStep) + (Math.random() * angleStep * 0.5);
        
        elements.rouletteItems.style.transform = `rotate(${stopAngle}deg)`;
        
        // Показ результата после остановки
        setTimeout(() => {
            showResult(roulettePrizes[prizeIndex]);
            isSpinning = false;
            
            // Сброс выбора
            selectedRoulette = 0;
            elements.selectedRoulette.textContent = 'Выберите ставку';
        }, 7500);
    }, 600);
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Показать результат
function showResult(prize) {
    elements.resultIcon.textContent = prize.value > 0 ? "🎉" : "✨";
    elements.resultTitle.textContent = prize.value > 0 ? "Поздравляем!" : "Удача!";
    
    if (prize.value > 0) {
        elements.resultText.textContent = `Вы выиграли ${prize.name}!`;
    } else {
        elements.resultText.textContent = "В этот раз не повезло, попробуйте ещё раз!";
    }
    
    elements.resultModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
}

// Закрыть модальное окно результата
function closeResultModal() {
    elements.resultModal.style.display = 'none';
    document.body.style.overflow = '';
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate(5);
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

elements.resultModal.addEventListener('click', function(e) {
    if (e.target === elements.resultModal) {
        closeResultModal();
    }
});

// Закрытие модального окна по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (elements.newsModal.classList.contains('show')) {
            closeNewsModal();
        }
        if (elements.resultModal.style.display === 'block') {
            closeResultModal();
        }
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
        if (!e.target.closest('.bottom-nav') && !e.target.closest('.modal-content') && !e.target.closest('.result-content')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Приложение полностью загружено и готово!');
    console.log('📱 Текущая страница:', currentPage);
    
    // Инициализация рулетки при загрузке
    initRoulette();
});

console.log('✅ Новостной Mini App запущен!');
