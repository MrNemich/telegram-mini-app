// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// База данных пользователя
class UserDatabase {
    constructor() {
        this.userId = tg.initDataUnsafe.user?.id || 'default_user';
        this.storageKey = `user_data_${this.userId}`;
        this.loadUserData();
    }

    loadUserData() {
        const savedData = localStorage.getItem(this.storageKey);
        if (savedData) {
            this.userData = JSON.parse(savedData);
        } else {
            // Начальные данные для нового пользователя
            this.userData = {
                balance: 850,
                inventory: {
                    '💰 Игровая валюта': 2580,
                    '💎 Редкие кристаллы': 8,
                    '🔑 Ключи': 2,
                    '🏆 Трофеи': 3,
                    '⚡ Бустеры': 5,
                    '🛡️ Защита': 1,
                    '🎨 Краски': 12,
                    '🔧 Инструменты': 4
                },
                casesOpened: 0,
                lastFreeCase: 0,
                achievements: ['Новичок'],
                level: 5,
                experience: 1250
            };
            this.saveUserData();
        }
    }

    saveUserData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.userData));
    }

    getBalance() {
        return this.userData.balance;
    }

    updateBalance(amount) {
        this.userData.balance += amount;
        if (this.userData.balance < 0) this.userData.balance = 0;
        this.saveUserData();
        return this.userData.balance;
    }

    getInventory() {
        return this.userData.inventory;
    }

    addToInventory(item, quantity = 1) {
        if (!this.userData.inventory[item]) {
            this.userData.inventory[item] = 0;
        }
        this.userData.inventory[item] += quantity;
        this.saveUserData();
    }

    removeFromInventory(item, quantity = 1) {
        if (this.userData.inventory[item]) {
            this.userData.inventory[item] -= quantity;
            if (this.userData.inventory[item] <= 0) {
                delete this.userData.inventory[item];
            }
            this.saveUserData();
        }
    }

    canOpenFreeCase() {
        const now = Date.now();
        const lastOpen = this.userData.lastFreeCase;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        return (now - lastOpen) >= twentyFourHours;
    }

    openFreeCase() {
        this.userData.lastFreeCase = Date.now();
        this.userData.casesOpened++;
        this.saveUserData();
    }

    getStats() {
        return {
            casesOpened: this.userData.casesOpened,
            level: this.userData.level,
            experience: this.userData.experience,
            achievements: this.userData.achievements
        };
    }
}

// Инициализируем приложение
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// Устанавливаем темный цвет фона
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Инициализация базы данных
const userDB = new UserDatabase();

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
    starsBalance: document.getElementById('starsBalance'),
    inventoryGrid: document.getElementById('inventoryGrid')
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

// Данные кейсов
const casesData = {
    0: {
        name: "Бесплатный кейс",
        description: "Открывается каждые 24 часа",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 50, chance: 100 },
            { item: "⚡ Бустеры", quantity: 1, chance: 70 },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 30 },
            { item: "🔑 Ключи", quantity: 1, chance: 15 }
        ]
    },
    100: {
        name: "Начальный набор",
        description: "Идеально для новичков",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 150, chance: 100 },
            { item: "⚡ Бустеры", quantity: 2, chance: 80 },
            { item: "💎 Редкие кристаллы", quantity: 2, chance: 50 },
            { item: "🔑 Ключи", quantity: 1, chance: 30 },
            { item: "🎨 Краски", quantity: 3, chance: 40 }
        ]
    },
    200: {
        name: "Золотой сундук",
        description: "Шанс на редкие предметы",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 300, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 3, chance: 70 },
            { item: "🔑 Ключи", quantity: 2, chance: 50 },
            { item: "🏆 Трофеи", quantity: 1, chance: 30 },
            { item: "🔧 Инструменты", quantity: 2, chance: 40 }
        ]
    },
    500: {
        name: "Эпический ларец",
        description: "Эксклюзивные награды",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 750, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 5, chance: 80 },
            { item: "🔑 Ключи", quantity: 3, chance: 60 },
            { item: "🏆 Трофеи", quantity: 2, chance: 40 },
            { item: "🛡️ Защита", quantity: 1, chance: 25 }
        ]
    },
    1000: {
        name: "Легендарный артефакт",
        description: "Уникальные предметы",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 1500, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 8, chance: 90 },
            { item: "🔑 Ключи", quantity: 5, chance: 70 },
            { item: "🏆 Трофеи", quantity: 3, chance: 50 },
            { item: "🛡️ Защита", quantity: 2, chance: 35 }
        ]
    },
    1500: {
        name: "Мифическая шкатулка",
        description: "Легендарные сокровища",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 2500, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 12, chance: 95 },
            { item: "🔑 Ключи", quantity: 8, chance: 80 },
            { item: "🏆 Трофеи", quantity: 5, chance: 60 },
            { item: "🛡️ Защита", quantity: 3, chance: 45 }
        ]
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
        
        // Обновляем баланс при переходе на страницу рулетки
        if (page === 'roulette') {
            updateBalanceDisplay();
            loadInventory();
        }
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

// Обновление отображения баланса
function updateBalanceDisplay() {
    const balance = userDB.getBalance();
    elements.starsBalance.textContent = balance.toLocaleString();
}

// Загрузка инвентаря
function loadInventory() {
    const inventory = userDB.getInventory();
    elements.inventoryGrid.innerHTML = '';
    
    Object.entries(inventory).forEach(([itemName, quantity]) => {
        const icon = getItemIcon(itemName);
        const inventoryItem = document.createElement('div');
        inventoryItem.className = 'inventory-item';
        inventoryItem.innerHTML = `
            <div class="inventory-icon">${icon}</div>
            <div class="inventory-name">${itemName}</div>
            <div class="inventory-count">${quantity}</div>
        `;
        elements.inventoryGrid.appendChild(inventoryItem);
    });
}

// Получение иконки для предмета
function getItemIcon(itemName) {
    const iconMap = {
        '💰 Игровая валюта': '💰',
        '💎 Редкие кристаллы': '💎',
        '🔑 Ключи': '🔑',
        '🏆 Трофеи': '🏆',
        '⚡ Бустеры': '⚡',
        '🛡️ Защита': '🛡️',
        '🎨 Краски': '🎨',
        '🔧 Инструменты': '🔧'
    };
    return iconMap[itemName] || '📦';
}

// Функция для открытия кейса
function openCase(price) {
    // Проверка для бесплатного кейса
    if (price === 0) {
        if (!userDB.canOpenFreeCase()) {
            const lastOpen = new Date(userDB.userData.lastFreeCase);
            const nextOpen = new Date(lastOpen.getTime() + 24 * 60 * 60 * 1000);
            const timeLeft = nextOpen - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
            
            tg.showPopup({
                title: '⏰ Ещё не время',
                message: `Бесплатный кейс будет доступен через ${hoursLeft} часов`,
                buttons: [{ type: 'ok' }]
            });
            return;
        }
    } else {
        // Проверяем достаточно ли звёзд для платного кейса
        const currentBalance = userDB.getBalance();
        if (currentBalance < price) {
            tg.showPopup({
                title: '❌ Недостаточно звёзд',
                message: `Вам нужно ещё ${price - currentBalance} звёзд для открытия этого кейса`,
                buttons: [{ type: 'ok' }]
            });
            return;
        }
    }
    
    // Виброотклик
    if (navigator.vibrate) {
        navigator.vibrate([10, 5, 10]);
    }
    
    const caseInfo = casesData[price];
    
    tg.showPopup({
        title: '🎁 Открытие кейса',
        message: `${caseInfo.description}\n\n${caseInfo.name} за ${price === 0 ? 'бесплатно' : price + ' звёзд'}`,
        buttons: [
            { 
                id: 'open', 
                type: 'default', 
                text: `Открыть ${price === 0 ? '🆓' : 'за ' + price + ' ⭐'}` 
            },
            { 
                type: 'cancel' 
            }
        ]
    }).then(function(buttonId) {
        if (buttonId === 'open') {
            simulateCaseOpening(price, caseInfo);
        }
    });
}

// Симуляция открытия кейса
function simulateCaseOpening(price, caseInfo) {
    // Список полученных наград
    const rewards = [];
    
    // Генерируем награды на основе шансов
    caseInfo.rewards.forEach(reward => {
        if (Math.random() * 100 <= reward.chance) {
            rewards.push({
                item: reward.item,
                quantity: reward.quantity
            });
            // Добавляем в инвентарь
            userDB.addToInventory(reward.item, reward.quantity);
        }
    });
    
    // Обновляем баланс для платных кейсов
    if (price > 0) {
        userDB.updateBalance(-price);
        updateBalanceDisplay();
    } else {
        userDB.openFreeCase();
    }
    
    // Увеличиваем счетчик открытых кейсов
    userDB.userData.casesOpened++;
    userDB.saveUserData();
    
    // Формируем сообщение о наградах
    let rewardsMessage = '🎉 Поздравляем! Вы открыли кейс!\n\nПолучены:\n';
    rewards.forEach(reward => {
        rewardsMessage += `• ${reward.item}: ${reward.quantity}\n`;
    });
    
    // Добавляем опыт
    const expGained = price === 0 ? 10 : price / 10;
    userDB.userData.experience += expGained;
    
    // Проверяем повышение уровня
    const neededExp = userDB.userData.level * 100;
    if (userDB.userData.experience >= neededExp) {
        userDB.userData.level++;
        userDB.userData.experience = 0;
        rewardsMessage += `\n🎊 Уровень повышен! Теперь у вас ${userDB.userData.level} уровень!`;
    }
    
    userDB.saveUserData();
    
    // Показываем попап с наградами
    tg.showPopup({
        title: '🎁 Награды получены!',
        message: rewardsMessage,
        buttons: [{ type: 'ok' }]
    });
    
    // Обновляем инвентарь
    loadInventory();
    
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
    
    // Загружаем начальные данные
    updateBalanceDisplay();
    loadInventory();
    
    // Добавляем обработчики скролла для табов
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.addEventListener('touchmove', function(e) {
            // Разрешаем скролл внутри табов
        }, { passive: true });
        
        tab.addEventListener('wheel', function(e) {
            // Разрешаем скролл колесиком мыши
        }, { passive: true });
    });
});

console.log('✅ Новостной Mini App запущен!');
