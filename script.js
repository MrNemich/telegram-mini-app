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
            // Начальные данные для нового пользователя - ПУСТОЙ ИНВЕНТАРЬ
            this.userData = {
                balance: 1000,
                inventory: {}, // ПУСТОЙ ИНВЕНТАРЬ
                cases: {},
                casesOpened: 0,
                lastFreeCase: 0, // Время последнего открытия бесплатного кейса
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
        
        // Если никогда не открывали или прошло больше 24 часов
        if (lastOpen === 0 || (now - lastOpen) >= twentyFourHours) {
            return true;
        }
        return false;
    }

    getFreeCaseCooldown() {
        const now = Date.now();
        const lastOpen = this.userData.lastFreeCase;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (lastOpen === 0) return 0;
        
        const timePassed = now - lastOpen;
        const timeRemaining = twentyFourHours - timePassed;
        
        return timeRemaining > 0 ? timeRemaining : 0;
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
let freeCaseTimerInterval = null;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    tasksContent: document.getElementById('tasks-content'),
    profileContent: document.getElementById('profile-content'),
    newsModal: document.getElementById('newsModal'),
    caseModal: document.getElementById('caseModal'),
    inventoryModal: document.getElementById('inventoryModal'),
    resultModal: document.getElementById('resultModal'),
    starsBalance: document.getElementById('starsBalance'),
    caseItemsTrack: document.getElementById('caseItemsTrack'),
    caseModalTitle: document.getElementById('caseModalTitle'),
    caseModalPrice: document.getElementById('caseModalPrice'),
    caseModalActions: document.getElementById('caseModalActions'),
    inventoryItems: document.getElementById('inventoryItems'),
    resultGift: document.getElementById('resultGift'),
    resultItemName: document.getElementById('resultItemName'),
    resultItemQuantity: document.getElementById('resultItemQuantity'),
    buttons: document.querySelectorAll('.nav-button'),
    freeCaseBtn: document.getElementById('freeCaseBtn'),
    freeCaseTimer: document.getElementById('freeCaseTimer'),
    freeCaseTimerDisplay: document.getElementById('freeCaseTimerDisplay'),
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

// Данные новых кейсов
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
    50: {
        name: "Кейс Бомж",
        price: 50,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 80, chance: 100, icon: "💰" },
            { item: "⚡ Бустеры", quantity: 1, chance: 75, icon: "⚡" },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 35, icon: "💎" },
            { item: "🔑 Ключи", quantity: 1, chance: 20, icon: "🔑" },
            { item: "🎨 Краски", quantity: 1, chance: 25, icon: "🎨" }
        ]
    },
    100: {
        name: "Кейс Чемпион",
        price: 100,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 120, chance: 100, icon: "💰" },
            { item: "⚡ Бустеры", quantity: 2, chance: 80, icon: "⚡" },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 45, icon: "💎" },
            { item: "🔑 Ключи", quantity: 1, chance: 30, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 1, chance: 15, icon: "🏆" }
        ]
    },
    200: {
        name: "Pepe фарм",
        price: 200,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 180, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 2, chance: 60, icon: "💎" },
            { item: "🔑 Ключи", quantity: 2, chance: 40, icon: "🔑" },
            { item: "⚡ Бустеры", quantity: 2, chance: 70, icon: "⚡" },
            { item: "🔧 Инструменты", quantity: 1, chance: 25, icon: "🔧" }
        ]
    },
    350: {
        name: "БизнесМем",
        price: 350,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 250, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 3, chance: 70, icon: "💎" },
            { item: "🔑 Ключи", quantity: 2, chance: 50, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 1, chance: 30, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 1, chance: 20, icon: "🛡️" }
        ]
    },
    500: {
        name: "Кейс Рабочий",
        price: 500,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 350, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 4, chance: 75, icon: "💎" },
            { item: "🔑 Ключи", quantity: 3, chance: 55, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 2, chance: 35, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 1, chance: 25, icon: "🛡️" }
        ]
    },
    1000: {
        name: "Кейс Элита",
        price: 1000,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 600, chance: 100, icon: "💰" },
            { item: "💎 Редкие кристаллы", quantity: 5, chance: 85, icon: "💎" },
            { item: "🔑 Ключи", quantity: 4, chance: 65, icon: "🔑" },
            { item: "🏆 Трофеи", quantity: 3, chance: 45, icon: "🏆" },
            { item: "🛡️ Защита", quantity: 2, chance: 35, icon: "🛡️" }
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

// Функция для форматирования времени
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Функция для обновления таймера бесплатного кейса
function updateFreeCaseTimer() {
    const cooldown = userDB.getFreeCaseCooldown();
    
    if (cooldown > 0) {
        // Показываем таймер и скрываем кнопку
        elements.freeCaseBtn.style.display = 'none';
        elements.freeCaseTimer.style.display = 'block';
        elements.freeCaseTimerDisplay.textContent = formatTime(cooldown);
    } else {
        // Скрываем таймер и показываем кнопку
        elements.freeCaseBtn.style.display = 'block';
        elements.freeCaseTimer.style.display = 'none';
        
        // Останавливаем интервал если таймер закончился
        if (freeCaseTimerInterval) {
            clearInterval(freeCaseTimerInterval);
            freeCaseTimerInterval = null;
        }
    }
}

// Запуск таймера бесплатного кейса
function startFreeCaseTimer() {
    // Обновляем сразу
    updateFreeCaseTimer();
    
    // Запускаем интервал только если таймер активен
    if (userDB.getFreeCaseCooldown() > 0 && !freeCaseTimerInterval) {
        freeCaseTimerInterval = setInterval(updateFreeCaseTimer, 1000);
    }
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
            startFreeCaseTimer(); // Запускаем таймер при переходе на страницу рулетки
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

// Открытие инвентаря
function openInventory() {
    const inventory = userDB.getInventory();
    elements.inventoryItems.innerHTML = '';
    
    if (Object.keys(inventory).length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-inventory';
        emptyMessage.innerHTML = `
            <div style="text-align: center; color: #888; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📦</div>
                <div style="font-size: 1.2rem; margin-bottom: 10px;">Инвентарь пуст</div>
                <div style="font-size: 0.9rem; opacity: 0.7;">Открывайте кейсы чтобы получить предметы!</div>
            </div>
        `;
        elements.inventoryItems.appendChild(emptyMessage);
    } else {
        Object.entries(inventory).forEach(([item, quantity]) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.innerHTML = `
                <div class="inventory-item-icon">${getItemIcon(item)}</div>
                <div class="inventory-item-info">
                    <div class="inventory-item-name">${item}</div>
                    <div class="inventory-item-quantity">${quantity} шт.</div>
                </div>
            `;
            elements.inventoryItems.appendChild(itemElement);
        });
    }
    
    elements.inventoryModal.style.display = 'block';
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Получение иконки для предмета
function getItemIcon(item) {
    const iconMap = {
        '💰 Игровая валюта': '💰',
        '💎 Редкие кристаллы': '💎',
        '🔑 Ключи': '🔑',
        '⚡ Бустеры': '⚡',
        '🎨 Краски': '🎨',
        '🏆 Трофеи': '🏆',
        '🔧 Инструменты': '🔧',
        '🛡️ Защита': '🛡️'
    };
    return iconMap[item] || '📦';
}

// Закрытие инвентаря
function closeInventory() {
    elements.inventoryModal.style.display = 'none';
    
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Открытие модального окна кейса
function openCaseModal(price, action) {
    const caseData = casesData[price];
    if (!caseData) return;
    
    // Для бесплатного кейса проверяем кулдаун
    if (price === 0 && !userDB.canOpenFreeCase()) {
        tg.showPopup({
            title: '⏰ Бесплатный кейс недоступен',
            message: 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    currentCaseModal = { price, action };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = `Цена: ${price} ⭐`;
    
    // Заполняем трек предметами - ТОЛЬКО ОДИН КРУГ
    elements.caseItemsTrack.innerHTML = '';
    for (let i = 0; i < 3; i++) { // Только 3 предмета для одного круга
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
    
    // Для бесплатного кейса сразу кнопка "Открыть"
    if (price === 0) {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = 'Открыть кейс';
        openButton.onclick = () => openCase(price);
        elements.caseModalActions.appendChild(openButton);
    } else {
        // Для платных кейсов кнопка "Открыть"
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = `Открыть за ${price} ⭐`;
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

// Открытие кейса
function openCase(price) {
    const caseData = casesData[price];
    const balance = userDB.getBalance();
    
    // Проверяем баланс для платных кейсов
    if (price > 0 && balance < price) {
        tg.showPopup({
            title: '❌ Недостаточно звёзд',
            message: `На вашем счету недостаточно звёзд. Нужно ещё ${price - balance} ⭐`,
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Для бесплатного кейса проверяем кулдаун еще раз
    if (price === 0 && !userDB.canOpenFreeCase()) {
        tg.showPopup({
            title: '⏰ Бесплатный кейс недоступен',
            message: 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Снимаем деньги с баланса для платных кейсов
    if (price > 0) {
        userDB.updateBalance(-price);
        updateBalanceDisplay();
    }
    
    // Для бесплатного кейса записываем время открытия
    if (price === 0) {
        userDB.openFreeCase();
        startFreeCaseTimer(); // Запускаем таймер после открытия
    }
    
    // Отключаем кнопки во время анимации
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    // Запускаем анимацию вращения - ОДИН РАЗ 8 СЕКУНД
    elements.caseItemsTrack.classList.add('spinning');
    
    // Выбираем случайную награду
    const reward = getRandomReward(caseData.rewards);
    
    // Останавливаем анимацию и показываем результат через 8 секунд
    setTimeout(() => {
        elements.caseItemsTrack.classList.remove('spinning');
        
        // Добавляем награду в инвентарь
        userDB.addToInventory(reward.item, reward.quantity);
        userDB.userData.casesOpened++;
        userDB.userData.experience += 10;
        
        checkLevelUp();
        userDB.saveUserData();
        
        // Закрываем модальное окно кейса
        closeCaseModal();
        
        // Показываем красивое окно результата
        showResultModal(reward);
        
    }, 8000); // 8 секунд анимации - ОДИН РАЗ
}

// Показ красивого окна результата
function showResultModal(reward) {
    elements.resultGift.textContent = reward.icon;
    elements.resultItemName.textContent = reward.item;
    elements.resultItemQuantity.textContent = `${reward.quantity} шт.`;
    
    // Активируем фейерверки
    const fireworks = document.querySelectorAll('.firework');
    fireworks.forEach(firework => {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        firework.style.setProperty('--x', `${x}px`);
        firework.style.setProperty('--y', `${y}px`);
    });
    
    elements.resultModal.style.display = 'block';
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
}

// Закрытие окна результата
function closeResultModal() {
    elements.resultModal.style.display = 'none';
    updateProfile();
    updateBalanceDisplay();
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

elements.inventoryModal.addEventListener('click', function(e) {
    if (e.target === elements.inventoryModal) {
        closeInventory();
    }
});

elements.resultModal.addEventListener('click', function(e) {
    if (e.target === elements.resultModal) {
        closeResultModal();
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
        if (elements.inventoryModal.style.display === 'block') {
            closeInventory();
        }
        if (elements.resultModal.style.display === 'block') {
            closeResultModal();
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
    startFreeCaseTimer(); // Запускаем таймер при загрузке
});

console.log('✅ Игровое мини-приложение запущено!');
