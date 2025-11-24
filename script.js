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
                balance: 1000,
                inventory: {
                    '💰 Игровая валюта': 100,
                    '💎 Редкие кристаллы': 5,
                    '🔑 Ключи': 2,
                    '⚡ Бустеры': 3,
                    '🎨 Краски': 1
                },
                cases: {},
                casesOpened: 0,
                lastFreeCase: 0,
                achievements: ['Новичок'],
                level: 1,
                experience: 0,
                userId: this.userId,
                username: tg.initDataUnsafe.user?.username || 'Игрок',
                firstName: tg.initDataUnsafe.user?.first_name || 'Игрок',
                tasks: {
                    'first_steps': { completed: false, progress: 30 },
                    'collector': { completed: false, progress: 60 },
                    'fast_start': { completed: false, progress: 40 },
                    'rare_hunter': { completed: false, progress: 20 },
                    'legend': { completed: false, progress: 5 },
                    'saver': { completed: false, progress: 10 }
                }
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
        if (this.userData.inventory[item] && this.userData.inventory[item] >= quantity) {
            this.userData.inventory[item] -= quantity;
            if (this.userData.inventory[item] <= 0) {
                delete this.userData.inventory[item];
            }
            this.saveUserData();
            return true;
        }
        return false;
    }

    // Управление кейсами
    addCase(caseType, quantity = 1) {
        if (!this.userData.cases[caseType]) {
            this.userData.cases[caseType] = 0;
        }
        this.userData.cases[caseType] += quantity;
        this.saveUserData();
    }

    removeCase(caseType, quantity = 1) {
        if (this.userData.cases[caseType] && this.userData.cases[caseType] >= quantity) {
            this.userData.cases[caseType] -= quantity;
            if (this.userData.cases[caseType] <= 0) {
                delete this.userData.cases[caseType];
            }
            this.saveUserData();
            return true;
        }
        return false;
    }

    getCases() {
        return this.userData.cases;
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

    getTasks() {
        return this.userData.tasks;
    }

    updateTaskProgress(taskId, progress) {
        if (this.userData.tasks[taskId]) {
            this.userData.tasks[taskId].progress = progress;
            if (progress >= 100) {
                this.userData.tasks[taskId].completed = true;
            }
            this.saveUserData();
        }
    }

    completeTask(taskId) {
        if (this.userData.tasks[taskId] && this.userData.tasks[taskId].progress >= 100) {
            this.userData.tasks[taskId].completed = true;
            this.saveUserData();
            return true;
        }
        return false;
    }

    addAchievement(achievement) {
        if (!this.userData.achievements.includes(achievement)) {
            this.userData.achievements.push(achievement);
            this.saveUserData();
            return true;
        }
        return false;
    }

    getAchievements() {
        return this.userData.achievements;
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
let currentCaseModal = null;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    tasksContent: document.getElementById('tasks-content'),
    profileContent: document.getElementById('profile-content'),
    newsModal: document.getElementById('newsModal'),
    caseModal: document.getElementById('caseModal'),
    starsBalance: document.getElementById('starsBalance'),
    caseItemsTrack: document.getElementById('caseItemsTrack'),
    caseModalTitle: document.getElementById('caseModalTitle'),
    caseModalPrice: document.getElementById('caseModalPrice'),
    caseModalActions: document.getElementById('caseModalActions'),
    buttons: document.querySelectorAll('.nav-button'),
    // Элементы профиля
    profileName: document.getElementById('profileName'),
    profileLevel: document.getElementById('profileLevel'),
    profileAvatar: document.getElementById('profileAvatar'),
    statBalance: document.getElementById('statBalance'),
    statCases: document.getElementById('statCases'),
    statExperience: document.getElementById('statExperience'),
    statItems: document.getElementById('statItems'),
    achievementsGrid: document.getElementById('achievementsGrid')
};

// Данные кейсов
const casesData = {
    0: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 50, chance: 100, icon: "💰" },
            { item: "⚡ Бустеры", quantity: 1, chance: 70, icon: "⚡" },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 30, icon: "💎" },
            { item: "🔑 Ключи", quantity: 1, chance: 15, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 1, chance: 5, icon: "🏆" }
        ]
    },
    100: {
        name: "Начальный набор",
        price: 100,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 150, chance: 100, icon: "💰" },
            { item: "⚡ Бустеры", quantity: 2, chance: 80, icon: "⚡" },
            { item: "💎 Редкие кристаллы", quantity: 2, chance: 50, icon: "💎" },
            { item: "🔑 Ключи", quantity: 1, chance: 30, icon: "🔑" },
            { item: "🎨 Краски", quantity: 3, chance: 40, icon: "🎨" }
        ]
    },
    200: {
        name: "Золотой сундук",
        price: 200,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 300, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 3, chance: 70, icon: "💎" },
            { item: "🔑 Ключи", quantity: 2, chance: 50, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 1, chance: 30, icon: "🏆" },
            { item: "🔧 Инструменты", quantity: 2, chance: 40, icon: "🔧" }
        ]
    },
    500: {
        name: "Эпический ларец",
        price: 500,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 750, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 5, chance: 80, icon: "💎" },
            { item: "🔑 Ключи", quantity: 3, chance: 60, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 2, chance: 40, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 1, chance: 25, icon: "🛡️" }
        ]
    },
    1000: {
        name: "Легендарный артефакт",
        price: 1000,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 1500, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 8, chance: 90, icon: "💎" },
            { item: "🔑 Ключи", quantity: 5, chance: 70, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 3, chance: 50, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 2, chance: 35, icon: "🛡️" }
        ]
    },
    1500: {
        name: "Мифическая шкатулка",
        price: 1500,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 2500, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 12, chance: 95, icon: "💎" },
            { item: "🔑 Ключи", quantity: 8, chance: 80, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 5, chance: 60, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 3, chance: 45, icon: "🛡️" }
        ]
    }
};

// Данные достижений
const achievementsData = [
    { name: "Новичок", icon: "🎯", description: "Начните играть" },
    { name: "Первые шаги", icon: "🚶", description: "Откройте первый кейс" },
    { name: "Коллекционер", icon: "🏆", description: "Соберите 5 предметов" },
    { name: "Богач", icon: "💰", description: "Накопите 1000 звезд" },
    { name: "Опытный", icon: "⭐", description: "Достигните 5 уровня" },
    { name: "Легенда", icon: "👑", description: "Достигните 10 уровня" }
];

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
    
    setTimeout(() => {
        isAnimating = false;
    }, 300);
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

// Функция пополнения баланса
function addBalance() {
    const amount = 500;
    userDB.updateBalance(amount);
    updateBalanceDisplay();
    updateProfile();
    
    tg.showPopup({
        title: '💰 Баланс пополнен!',
        message: `Вы получили ${amount} ⭐`,
        buttons: [{ type: 'ok' }]
    });
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Выполнение задания
function completeTask(taskId, reward) {
    if (userDB.completeTask(taskId)) {
        userDB.updateBalance(reward);
        updateBalanceDisplay();
        updateProfile();
        
        tg.showPopup({
            title: '🎉 Задание выполнено!',
            message: `Вы получили ${reward} ⭐`,
            buttons: [{ type: 'ok' }]
        });
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    } else {
        tg.showPopup({
            title: '❌ Задание не выполнено',
            message: 'Выполните условия задания',
            buttons: [{ type: 'ok' }]
        });
    }
}

// Обновление профиля
function updateProfile() {
    const stats = userDB.getStats();
    const userData = userDB.userData;
    const achievements = userDB.getAchievements();
    
    elements.profileName.textContent = stats.firstName;
    elements.profileLevel.textContent = stats.level;
    elements.statBalance.textContent = userData.balance.toLocaleString();
    elements.statCases.textContent = stats.casesOpened;
    elements.statExperience.textContent = userData.experience;
    elements.statItems.textContent = stats.inventoryCount;
    
    updateProfileAvatar(stats.level);
    loadAchievements(achievements);
}

// Обновление аватара профиля
function updateProfileAvatar(level) {
    const avatars = ['👤', '🦊', '🐯', '🐉', '🦄', '👑'];
    let avatarIndex = 0;
    
    if (level >= 10) avatarIndex = 5;
    else if (level >= 8) avatarIndex = 4;
    else if (level >= 6) avatarIndex = 3;
    else if (level >= 4) avatarIndex = 2;
    else if (level >= 2) avatarIndex = 1;
    
    elements.profileAvatar.textContent = avatars[avatarIndex];
}

// Загрузка достижений
function loadAchievements(userAchievements) {
    elements.achievementsGrid.innerHTML = '';
    
    achievementsData.forEach(achievement => {
        const isUnlocked = userAchievements.includes(achievement.name);
        const achievementElement = document.createElement('div');
        achievementElement.className = `achievement-item ${isUnlocked ? 'unlocked' : ''}`;
        
        achievementElement.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
        `;
        
        elements.achievementsGrid.appendChild(achievementElement);
    });
}

// Открытие модального окна кейса
function openCaseModal(price, action) {
    const caseData = casesData[price];
    if (!caseData) return;
    
    currentCaseModal = { price, action };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = action === 'buy' ? `Цена: ${price} ⭐` : 'Ваш кейс';
    
    elements.caseItemsTrack.innerHTML = '';
    for (let i = 0; i < 50; i++) {
        caseData.rewards.forEach(reward => {
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.innerHTML = `
                <div class="case-item-icon">${reward.icon}</div>
                <div class="case-item-name">${reward.item}</div>
                <div class="case-item-quantity">${reward.quantity}</div>
            `;
            elements.caseItemsTrack.appendChild(itemElement);
        });
    }
    
    elements.caseModalActions.innerHTML = '';
    
    if (action === 'buy') {
        const buyButton = document.createElement('button');
        buyButton.className = 'case-action-btn buy-btn';
        buyButton.textContent = `Купить за ${price} ⭐`;
        buyButton.onclick = () => buyCase(price);
        elements.caseModalActions.appendChild(buyButton);
    } else {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = 'Открыть';
        openButton.onclick = () => openCase(price);
        elements.caseModalActions.appendChild(openButton);
    }
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'case-action-btn cancel-btn';
    cancelButton.textContent = 'Отмена';
    cancelButton.onclick = closeCaseModal;
    elements.caseModalActions.appendChild(cancelButton);
    
    elements.caseModal.style.display = 'block';
}

// Закрытие модального окна кейса
function closeCaseModal() {
    elements.caseModal.style.display = 'none';
    currentCaseModal = null;
}

// Покупка кейса
function buyCase(price) {
    const balance = userDB.getBalance();
    const caseData = casesData[price];
    
    if (balance < price) {
        tg.showPopup({
            title: '❌ Недостаточно звёзд',
            message: `На вашем счету недостаточно звёзд. Нужно ещё ${price - balance} ⭐`,
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    userDB.updateBalance(-price);
    userDB.addCase(price, 1);
    
    updateBalanceDisplay();
    updateProfile();
    
    tg.showPopup({
        title: '🎉 Успех!',
        message: `Кейс "${caseData.name}" добавлен в ваш инвентарь!`,
        buttons: [{ type: 'ok' }]
    });
    
    closeCaseModal();
}

// Открытие кейса
function openCase(price) {
    const caseData = casesData[price];
    
    elements.caseItemsTrack.classList.add('fast-spin');
    
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    setTimeout(() => {
        elements.caseItemsTrack.classList.remove('fast-spin');
        
        const reward = getRandomReward(caseData.rewards);
        
        userDB.addToInventory(reward.item, reward.quantity);
        userDB.removeCase(price, 1);
        userDB.userData.casesOpened++;
        userDB.userData.experience += 10;
        
        checkLevelUp();
        userDB.saveUserData();
        
        showOpenResult(reward);
        
    }, 8000);
}

// Проверка повышения уровня
function checkLevelUp() {
    const userData = userDB.userData;
    const expNeeded = userData.level * 100;
    
    if (userData.experience >= expNeeded) {
        userData.level++;
        userData.experience = 0;
        userDB.addAchievement(achievementsData[userData.level]?.name || 'Новый уровень');
        
        tg.showPopup({
            title: '🎉 Уровень повышен!',
            message: `Поздравляем! Вы достигли ${userData.level} уровня!`,
            buttons: [{ type: 'ok' }]
        });
    }
}

// Выбор случайной награды
function getRandomReward(rewards) {
    const totalChance = rewards.reduce((sum, reward) => sum + reward.chance, 0);
    let random = Math.random() * totalChance;
    
    for (const reward of rewards) {
        if (random < reward.chance) {
            return reward;
        }
        random -= reward.chance;
    }
    
    return rewards[0];
}

// Показ результата открытия
function showOpenResult(reward) {
    elements.caseModalActions.innerHTML = '';
    elements.caseItemsTrack.innerHTML = `
        <div class="open-result">
            <div class="result-icon">${reward.icon}</div>
            <div class="result-title">🎉 Поздравляем!</div>
            <div class="result-item">${reward.item}</div>
            <div class="result-quantity">${reward.quantity} шт.</div>
        </div>
    `;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'case-action-btn cancel-btn';
    closeButton.textContent = 'Закрыть';
    closeButton.onclick = () => {
        closeCaseModal();
        updateProfile();
    };
    elements.caseModalActions.appendChild(closeButton);
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Функции для модального окна новости
function openNewsModal() {
    elements.newsModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function closeNewsModal() {
    elements.newsModal.classList.remove('show');
    document.body.style.overflow = '';
    
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Закрытие модальных окон по клику на фон
elements.newsModal.addEventListener('click', function(e) {
    if (e.target === elements.newsModal) {
        closeNewsModal();
    }
});

elements.caseModal.addEventListener('click', function(e) {
    if (e.target === elements.caseModal) {
        closeCaseModal();
    }
});

// Закрытие модальных окон по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (elements.newsModal.classList.contains('show')) {
            closeNewsModal();
        }
        if (elements.caseModal.style.display === 'block') {
            closeCaseModal();
        }
    }
});

// Информация о пользователе
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    if (user.first_name) {
        console.log('👤 Пользователь:', user.first_name, '(ID:', user.id, ')');
        document.querySelector('#home-content h1').textContent = `🏠 Привет, ${user.first_name}!`;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Мини-приложение полностью загружено и готово!');
    
    updateBalanceDisplay();
    updateProfile();
});

console.log('✅ Игровое мини-приложение запущено!');
