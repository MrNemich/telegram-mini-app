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
            // Начальные данные для нового пользователя - баланс 0
            this.userData = {
                balance: 0,
                inventory: {
                    '💰 Игровая валюта': 0,
                    '💎 Редкие кристаллы': 0,
                    '🔑 Ключи': 0,
                    '🏆 Трофеи': 0,
                    '⚡ Бустеры': 0,
                    '🛡️ Защита': 0
                },
                casesOpened: 0,
                lastFreeCase: 0,
                achievements: ['Новичок'],
                level: 1,
                experience: 0,
                userId: this.userId,
                username: tg.initDataUnsafe.user?.username || 'Игрок',
                firstName: tg.initDataUnsafe.user?.first_name || 'Игрок'
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
            achievements: this.userData.achievements,
            userId: this.userId,
            username: this.userData.username,
            firstName: this.userData.firstName,
            inventoryCount: Object.keys(this.userData.inventory).length
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

// Показываем основную кнопку
tg.MainButton.setText('🎮 ВЕРНУТЬСЯ В БОТА');
tg.MainButton.show();
tg.MainButton.onClick(() => {
    tg.close();
});

// Инициализация базы данных
const userDB = new UserDatabase();

// Текущая активная страница
let currentPage = 'home';
let isAnimating = false;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    inventoryContent: document.getElementById('inventory-content'),
    tasksContent: document.getElementById('tasks-content'),
    profileContent: document.getElementById('profile-content'),
    newsModal: document.getElementById('newsModal'),
    starsBalance: document.getElementById('starsBalance'),
    inventoryGrid: document.getElementById('inventoryGrid'),
    buttons: document.querySelectorAll('.nav-button'),
    // Элементы профиля
    profileName: document.getElementById('profileName'),
    profileLevel: document.getElementById('profileLevel'),
    statBalance: document.getElementById('statBalance'),
    statCases: document.getElementById('statCases'),
    statExperience: document.getElementById('statExperience'),
    statItems: document.getElementById('statItems'),
    currentLevel: document.getElementById('currentLevel'),
    currentExp: document.getElementById('currentExp'),
    neededExp: document.getElementById('neededExp'),
    levelProgress: document.getElementById('levelProgress')
};

// Данные кейсов
const casesData = {
    0: {
        name: "Бесплатный кейс",
        description: "Открывается каждые 24 часа",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 50, chance: 100 },
            { item: "⚡ Бустеры", quantity: 1, chance: 70 },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 30 }
        ]
    },
    100: {
        name: "Начальный набор",
        description: "Идеально для новичков",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 150, chance: 100 },
            { item: "⚡ Бустеры", quantity: 2, chance: 80 },
            { item: "💎 Редкие кристаллы", quantity: 2, chance: 50 },
            { item: "🔑 Ключи", quantity: 1, chance: 30 }
        ]
    },
    200: {
        name: "Золотой сундук",
        description: "Шанс на редкие предметы",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 300, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 3, chance: 70 },
            { item: "🔑 Ключи", quantity: 2, chance: 50 },
            { item: "🏆 Трофеи", quantity: 1, chance: 30 }
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
    },
    2000: {
        name: "Чемпионский кейс",
        description: "Для настоящих победителей",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 3500, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 15, chance: 95 },
            { item: "🔑 Ключи", quantity: 10, chance: 85 },
            { item: "🏆 Трофеи", quantity: 7, chance: 65 },
            { item: "🛡️ Защита", quantity: 5, chance: 50 }
        ]
    },
    3000: {
        name: "Королевский кейс",
        description: "Эксклюзив для королей",
        rewards: [
            { item: "💰 Игровая валюта", quantity: 5000, chance: 100 },
            { item: "💎 Редкие кристаллы", quantity: 20, chance: 98 },
            { item: "🔑 Ключи", quantity: 15, chance: 90 },
            { item: "🏆 Трофеи", quantity: 10, chance: 75 },
            { item: "🛡️ Защита", quantity: 8, chance: 60 }
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
    
    isAnimating = false;
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
    elements.inventoryContent.style.display = 'none';
    elements.tasksContent.style.display = 'none';
    elements.profileContent.style.display = 'none';
    
    // Показываем нужный контент
    switch(page) {
        case 'home':
            elements.homeContent.style.display = 'block';
            break;
        case 'roulette':
            elements.rouletteContent.style.display = 'block';
            updateBalanceDisplay();
            break;
        case 'inventory':
            elements.inventoryContent.style.display = 'block';
            loadInventory();
            break;
        case 'tasks':
            elements.tasksContent.style.display = 'block';
            break;
        case 'profile':
            elements.profileContent.style.display = 'block';
            updateProfile();
            break;
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
    
    let hasItems = false;
    
    Object.entries(inventory).forEach(([itemName, quantity]) => {
        if (quantity > 0) {
            hasItems = true;
            const icon = getItemIcon(itemName);
            const inventoryItem = document.createElement('div');
            inventoryItem.className = 'inventory-item';
            inventoryItem.innerHTML = `
                <div class="inventory-icon">${icon}</div>
                <div class="inventory-name">${itemName}</div>
                <div class="inventory-count">${quantity}</div>
            `;
            elements.inventoryGrid.appendChild(inventoryItem);
        }
    });
    
    // Если инвентарь пустой
    if (!hasItems) {
        elements.inventoryGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #888;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                <div>Инвентарь пуст</div>
                <div style="font-size: 0.8rem; margin-top: 5px;">Откройте кейсы чтобы получить предметы</div>
            </div>
        `;
    }
}

// Обновление профиля
function updateProfile() {
    const stats = userDB.getStats();
    const userData = userDB.userData;
    
    // Обновляем данные профиля
    elements.profileName.textContent = stats.firstName;
    elements.profileLevel.textContent = stats.level;
    elements.statBalance.textContent = userData.balance;
    elements.statCases.textContent = stats.casesOpened;
    elements.statExperience.textContent = userData.experience;
    elements.statItems.textContent = stats.inventoryCount;
    
    // Обновляем прогресс уровня
    const neededExp = stats.level * 100;
    const progressPercent = (userData.experience / neededExp) * 100;
    
    elements.currentLevel.textContent = stats.level;
    elements.currentExp.textContent = userData.experience;
    elements.neededExp.textContent = neededExp;
    elements.levelProgress.style.width = `${progressPercent}%`;
}

// Получение иконки для предмета
function getItemIcon(itemName) {
    const iconMap = {
        '💰 Игровая валюта': '💰',
        '💎 Редкие кристаллы': '💎',
        '🔑 Ключи': '🔑',
        '🏆 Трофеи': '🏆',
        '⚡ Бустеры': '⚡',
        '🛡️ Защита': '🛡️'
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
    } else {
        userDB.openFreeCase();
    }
    
    // Увеличиваем счетчик открытых кейсов
    userDB.userData.casesOpened++;
    
    // Добавляем опыт
    const expGained = price === 0 ? 10 : price / 10;
    userDB.userData.experience += expGained;
    
    // Проверяем повышение уровня
    const neededExp = userDB.userData.level * 100;
    if (userDB.userData.experience >= neededExp) {
        userDB.userData.level++;
        userDB.userData.experience = 0;
        // Награда за уровень
        userDB.updateBalance(50);
        userDB.addToInventory('💰 Игровая валюта', 100);
    }
    
    userDB.saveUserData();
    
    // Формируем сообщение о наградах
    let rewardsMessage = '🎉 Поздравляем! Вы открыли кейс!\n\nПолучены:\n';
    rewards.forEach(reward => {
        rewardsMessage += `• ${reward.item}: ${reward.quantity}\n`;
    });
    
    // Добавляем информацию о повышении уровня
    if (userDB.userData.experience === 0 && userDB.userData.level > 1) {
        rewardsMessage += `\n🎊 Уровень повышен! Теперь у вас ${userDB.userData.level} уровень!`;
        rewardsMessage += `\n🎁 Награда за уровень: +50 ⭐ и +100 💰`;
    }
    
    // Показываем попап с наградами
    tg.showPopup({
        title: '🎁 Награды получены!',
        message: rewardsMessage,
        buttons: [{ type: 'ok' }]
    });
    
    // Обновляем все отображения
    updateBalanceDisplay();
    updateProfile();
    
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

// Информация о пользователе
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    if (user.first_name) {
        console.log('👤 Пользователь:', user.first_name, '(ID:', user.id, ')');
        // Обновляем приветствие на главной
        document.querySelector('#home-content h1').textContent = `🏠 Привет, ${user.first_name}!`;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Мини-приложение полностью загружено и готово!');
    console.log('📱 Текущая страница:', currentPage);
    
    // Загружаем начальные данные
    updateBalanceDisplay();
    updateProfile();
});

console.log('✅ Игровое мини-приложение запущено!');
