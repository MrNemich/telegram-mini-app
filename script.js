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
                balance: 100,
                inventory: [], // ПУСТОЙ ИНВЕНТАРЬ - массив объектов
                casesOpened: 0,
                lastFreeCase: 0,
                achievements: ['Новичок'],
                level: 1,
                experience: 0,
                userId: this.userId,
                username: tg.initDataUnsafe.user?.username || 'Игрок',
                firstName: tg.initDataUnsafe.user?.first_name || 'Игрок',
                tasks: {
                    'first_steps': { completed: false, progress: 0 },
                    'collector': { completed: false, progress: 0 },
                    'fast_start': { completed: false, progress: 0 },
                    'rare_hunter': { completed: false, progress: 0 },
                    'legend': { completed: false, progress: 0 },
                    'saver': { completed: false, progress: 0 },
                    'opener': { completed: false, progress: 0 }
                },
                usedPromoCodes: [],
                totalValue: 0
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

    addToInventory(item) {
        this.userData.inventory.push(item);
        this.userData.totalValue += item.sellPrice;
        this.saveUserData();
    }

    removeFromInventory(itemId) {
        const itemIndex = this.userData.inventory.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const item = this.userData.inventory[itemIndex];
            this.userData.totalValue -= item.sellPrice;
            this.userData.inventory.splice(itemIndex, 1);
            this.saveUserData();
            return true;
        }
        return false;
    }

    getInventoryItem(itemId) {
        return this.userData.inventory.find(item => item.id === itemId);
    }

    canOpenFreeCase() {
        const now = Date.now();
        const lastOpen = this.userData.lastFreeCase;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
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

    openCase() {
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
            inventoryCount: this.userData.inventory.length,
            totalValue: this.userData.totalValue
        };
    }

    getTasks() {
        return this.userData.tasks;
    }

    updateTaskProgress(taskId, progress) {
        if (this.userData.tasks[taskId]) {
            this.userData.tasks[taskId].progress = Math.min(progress, 100);
            if (this.userData.tasks[taskId].progress >= 100) {
                this.userData.tasks[taskId].completed = true;
            }
            this.saveUserData();
        }
    }

    completeTask(taskId) {
        if (this.userData.tasks[taskId] && this.userData.tasks[taskId].progress >= 100 && !this.userData.tasks[taskId].completed) {
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

    usePromoCode(code) {
        if (this.userData.usedPromoCodes.includes(code)) {
            return { success: false, message: 'Промокод уже использован' };
        }
        
        const promo = promoCodes[code];
        if (promo) {
            this.userData.usedPromoCodes.push(code);
            this.updateBalance(promo.reward);
            this.saveUserData();
            return { success: true, message: `Промокод активирован! Получено ${promo.reward} ⭐`, reward: promo.reward };
        }
        
        return { success: false, message: 'Неверный промокод' };
    }

    getUsedPromoCodes() {
        return this.userData.usedPromoCodes;
    }

    addExperience(amount) {
        this.userData.experience += amount;
        const expNeeded = this.userData.level * 100;
        if (this.userData.experience >= expNeeded) {
            this.userData.level++;
            this.userData.experience = 0;
            this.saveUserData();
            return true; // Уровень повышен
        }
        this.saveUserData();
        return false;
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

// Промокоды
const promoCodes = {
    'FREE2025': { reward: 10, name: 'Бесплатные звезды 2025' },
    'WELCOME': { reward: 50, name: 'Приветственный бонус' },
    'NFTGAME': { reward: 100, name: 'NFT Игра' }
};

// Текущая активная страница
let currentPage = 'home';
let isAnimating = false;
let currentCaseModal = null;
let freeCaseTimerInterval = null;
let currentSelectedItem = null;
let currentInventoryFilter = 'all';

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    tasksContent: document.getElementById('tasks-content'),
    profileContent: document.getElementById('profile-content'),
    newsModal: document.getElementById('newsModal'),
    caseModal: document.getElementById('caseModal'),
    inventoryModal: document.getElementById('inventoryModal'),
    itemModal: document.getElementById('itemModal'),
    withdrawModal: document.getElementById('withdrawModal'),
    resultModal: document.getElementById('resultModal'),
    promoInfoModal: document.getElementById('promoInfoModal'),
    starsBalance: document.getElementById('starsBalance'),
    openedCases: document.getElementById('openedCases'),
    caseItemsTrack: document.getElementById('caseItemsTrack'),
    caseModalTitle: document.getElementById('caseModalTitle'),
    caseModalPrice: document.getElementById('caseModalPrice'),
    caseModalActions: document.getElementById('caseModalActions'),
    casePreview: document.getElementById('casePreview'),
    inventoryItems: document.getElementById('inventoryItems'),
    inventoryCount: document.getElementById('inventoryCount'),
    inventoryValue: document.getElementById('inventoryValue'),
    resultGift: document.getElementById('resultGift'),
    resultItemName: document.getElementById('resultItemName'),
    resultItemRarity: document.getElementById('resultItemRarity'),
    resultItemQuantity: document.getElementById('resultItemQuantity'),
    buttons: document.querySelectorAll('.nav-button'),
    freeCaseBtn: document.getElementById('freeCaseBtn'),
    freeCaseTimer: document.getElementById('freeCaseTimer'),
    freeCaseTimerDisplay: document.getElementById('freeCaseTimerDisplay'),
    tasksList: document.getElementById('tasksList'),
    promoCodeInput: document.getElementById('promoCodeInput'),
    activePromos: document.getElementById('activePromos'),
    withdrawItemIcon: document.getElementById('withdrawItemIcon'),
    withdrawItemName: document.getElementById('withdrawItemName'),
    withdrawItemValue: document.getElementById('withdrawItemValue'),
    usernameInput: document.getElementById('usernameInput'),
    // Элементы профиля
    profileName: document.getElementById('profileName'),
    profileLevel: document.getElementById('profileLevel'),
    profileExp: document.getElementById('profileExp'),
    profileExpNeeded: document.getElementById('profileExpNeeded'),
    profileAvatar: document.getElementById('profileAvatar'),
    statBalance: document.getElementById('statBalance'),
    statCases: document.getElementById('statCases'),
    statExperience: document.getElementById('statExperience'),
    statItems: document.getElementById('statItems'),
    achievementsGrid: document.getElementById('achievementsGrid'),
    // Элементы модальных окон
    newsModalTitle: document.getElementById('newsModalTitle'),
    newsModalDate: document.getElementById('newsModalDate'),
    newsModalText: document.getElementById('newsModalText'),
    itemModalIcon: document.getElementById('itemModalIcon'),
    itemModalName: document.getElementById('itemModalName'),
    itemModalValue: document.getElementById('itemModalValue'),
    itemModalRarity: document.getElementById('itemModalRarity')
};

// Данные кейсов с реальными призами (исправленные эмодзи)
const casesData = {
    0: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
            { item: "💰 Игровая валюта", quantity: 50, chance: 100, icon: "💰", sellPrice: 50, type: "currency", rarity: "common" },
            { item: "⚡ Бустеры", quantity: 1, chance: 70, icon: "⚡", sellPrice: 30, type: "booster", rarity: "common" },
            { item: "💎 Редкие кристаллы", quantity: 1, chance: 30, icon: "💎", sellPrice: 80, type: "crystal", rarity: "rare" },
            { item: "🔑 Ключи", quantity: 1, chance: 15, icon: "🔑", sellPrice: 100, type: "key", rarity: "rare" },
            { item: "🏆 Трофеи", quantity: 1, chance: 5, icon: "🏆", sellPrice: 200, type: "trophy", rarity: "epic" }
        ]
    },
    50: {
        name: "Кейс Бомж",
        price: 50,
        rewards: [
            { item: "🍾 Шампанское", quantity: 1, chance: 9.88, icon: "🍾", sellPrice: 50, type: "champagne", rarity: "common" },
            { item: "🎂 Тортик", quantity: 1, chance: 9.88, icon: "🎂", sellPrice: 50, type: "cake", rarity: "common" },
            { item: "💖 Сердце", quantity: 1, chance: 32.95, icon: "💖", sellPrice: 15, type: "heart", rarity: "common" },
            { item: "🧸 Мишка", quantity: 1, chance: 32.95, icon: "🧸", sellPrice: 15, type: "bear", rarity: "common" },
            { item: "💎 Алмаз", quantity: 1, chance: 4.94, icon: "💎", sellPrice: 100, type: "diamond", rarity: "rare" },
            { item: "💍 Кольцо", quantity: 1, chance: 4.94, icon: "💍", sellPrice: 100, type: "ring", rarity: "rare" },
            { item: "🍭 Lollipop", quantity: 1, chance: 1.98, icon: "🍭", sellPrice: 250, type: "lollipop", rarity: "epic" },
            { item: "📅 Календарь", quantity: 1, chance: 2.47, icon: "📅", sellPrice: 200, type: "calendar", rarity: "epic" }
        ]
    },
    100: {
        name: "Кейс Чемпион",
        price: 100,
        rewards: [
            { item: "🍾 Шампанское", quantity: 1, chance: 12.89, icon: "🍾", sellPrice: 50, type: "champagne", rarity: "common" },
            { item: "🎂 Тортик", quantity: 1, chance: 12.89, icon: "🎂", sellPrice: 50, type: "cake", rarity: "common" },
            { item: "💖 Сердце", quantity: 1, chance: 17.28, icon: "💖", sellPrice: 15, type: "heart", rarity: "common" },
            { item: "🧸 Мишка", quantity: 1, chance: 17.28, icon: "🧸", sellPrice: 15, type: "bear", rarity: "common" },
            { item: "💎 Алмаз", quantity: 1, chance: 10.89, icon: "💎", sellPrice: 100, type: "diamond", rarity: "rare" },
            { item: "💍 Кольцо", quantity: 1, chance: 10.89, icon: "💍", sellPrice: 100, type: "ring", rarity: "rare" },
            { item: "🍭 Lollipop", quantity: 1, chance: 8.71, icon: "🍭", sellPrice: 250, type: "lollipop", rarity: "epic" },
            { item: "📅 Календарь", quantity: 1, chance: 9.19, icon: "📅", sellPrice: 200, type: "calendar", rarity: "epic" }
        ]
    },
    180: {
        name: "Кейс Эконом",
        price: 180,
        rewards: [
            { item: "🐕 Snoop Dog", quantity: 1, chance: 25.685, icon: "🐕", sellPrice: 300, type: "snoop", rarity: "rare" },
            { item: "📅 Календарь", quantity: 1, chance: 16.843, icon: "📅", sellPrice: 200, type: "calendar", rarity: "rare" },
            { item: "🍦 Ice Cream", quantity: 1, chance: 15.255, icon: "🍦", sellPrice: 180, type: "icecream", rarity: "common" },
            { item: "💍 Кольцо", quantity: 1, chance: 8.601, icon: "💍", sellPrice: 100, type: "ring", rarity: "common" },
            { item: "💎 Алмаз", quantity: 1, chance: 8.601, icon: "💎", sellPrice: 100, type: "diamond", rarity: "common" },
            { item: "🎂 Тортик", quantity: 1, chance: 8.130, icon: "🎂", sellPrice: 50, type: "cake", rarity: "common" },
            { item: "🧸 Мишка", quantity: 1, chance: 16.885, icon: "🧸", sellPrice: 15, type: "bear", rarity: "common" }
        ]
    },
    200: {
        name: "Pepe фарм",
        price: 200,
        rewards: [
            { item: "💍 Кольцо", quantity: 1, chance: 99.9, icon: "💍", sellPrice: 100, type: "ring", rarity: "common" },
            { item: "🐸 Plush Pepe", quantity: 1, chance: 0.1, icon: "🐸", sellPrice: 1000000, type: "pepe", rarity: "legendary" }
        ]
    },
    350: {
        name: "БизнесМем",
        price: 350,
        rewards: [
            { item: "🎂 Торт", quantity: 1, chance: 18.75, icon: "🎂", sellPrice: 50, type: "cake", rarity: "common" },
            { item: "💍 Кольцо", quantity: 1, chance: 18.75, icon: "💍", sellPrice: 100, type: "ring", rarity: "common" },
            { item: "🏆 Кубок", quantity: 1, chance: 18.75, icon: "🏆", sellPrice: 100, type: "cup", rarity: "common" },
            { item: "🍦 Ice Cream", quantity: 1, chance: 18.75, icon: "🍦", sellPrice: 180, type: "icecream", rarity: "rare" },
            { item: "📅 Календарь", quantity: 1, chance: 3.00, icon: "📅", sellPrice: 200, type: "calendar", rarity: "rare" },
            { item: "🐕 Snoop Dogg", quantity: 1, chance: 3.00, icon: "🐕", sellPrice: 300, type: "snoop", rarity: "epic" },
            { item: "🚀 Ракета", quantity: 1, chance: 3.00, icon: "🚀", sellPrice: 300, type: "rocket", rarity: "epic" },
            { item: "🧁 Мафин", quantity: 1, chance: 3.00, icon: "🧁", sellPrice: 400, type: "muffin", rarity: "epic" },
            { item: "🐰 Желешка", quantity: 1, chance: 3.00, icon: "🐰", sellPrice: 500, type: "jelly", rarity: "epic" },
            { item: "🌺 Цветок", quantity: 1, chance: 3.00, icon: "🌺", sellPrice: 600, type: "flower", rarity: "epic" },
            { item: "🎩 Шляпа", quantity: 1, chance: 1.00, icon: "🎩", sellPrice: 900, type: "hat", rarity: "legendary" },
            { item: "💨 Сигара", quantity: 1, chance: 1.00, icon: "💨", sellPrice: 900, type: "cigar", rarity: "legendary" },
            { item: "💨 Фен", quantity: 1, chance: 1.00, icon: "💨", sellPrice: 1300, type: "dryer", rarity: "legendary" },
            { item: "🧪 Зелье", quantity: 1, chance: 1.00, icon: "🧪", sellPrice: 1200, type: "potion", rarity: "legendary" },
            { item: "👠 Каблуки", quantity: 1, chance: 1.00, icon: "👠", sellPrice: 800, type: "shoes", rarity: "legendary" },
            { item: "🪆 Вуду", quantity: 1, chance: 0.50, icon: "🪆", sellPrice: 2300, type: "voodoo", rarity: "mythic" },
            { item: "💀 Череп", quantity: 1, chance: 0.50, icon: "💀", sellPrice: 2800, type: "skull", rarity: "mythic" },
            { item: "🌹 Роза", quantity: 1, chance: 0.50, icon: "🌹", sellPrice: 1800, type: "rose", rarity: "mythic" },
            { item: "💎 Кольцо VIP", quantity: 1, chance: 0.50, icon: "💎", sellPrice: 2000, type: "diamond_ring", rarity: "mythic" }
        ]
    },
    500: {
        name: "Кейс Рабочий",
        price: 500,
        rewards: [
            { item: "💎 Алмаз", quantity: 1, chance: 12.02, icon: "💎", sellPrice: 100, type: "diamond", rarity: "common" },
            { item: "💍 Кольцо", quantity: 1, chance: 12.02, icon: "💍", sellPrice: 100, type: "ring", rarity: "common" },
            { item: "🍭 Lollipop", quantity: 1, chance: 7.71, icon: "🍭", sellPrice: 250, type: "lollipop", rarity: "rare" },
            { item: "📅 Календарь", quantity: 1, chance: 8.59, icon: "📅", sellPrice: 200, type: "calendar", rarity: "rare" },
            { item: "🍦 Ice Cream", quantity: 1, chance: 9.04, icon: "🍦", sellPrice: 180, type: "icecream", rarity: "rare" },
            { item: "🐕 Snoop Dogg", quantity: 1, chance: 7.06, icon: "🐕", sellPrice: 300, type: "snoop", rarity: "epic" },
            { item: "🚀 Ракета", quantity: 1, chance: 7.06, icon: "🚀", sellPrice: 300, type: "rocket", rarity: "epic" },
            { item: "🎩 Шляпа", quantity: 1, chance: 4.15, icon: "🎩", sellPrice: 900, type: "hat", rarity: "epic" },
            { item: "🧁 Мафин", quantity: 1, chance: 6.14, icon: "🧁", sellPrice: 400, type: "muffin", rarity: "epic" },
            { item: "🌺 Цветок", quantity: 1, chance: 5.05, icon: "🌺", sellPrice: 600, type: "flower", rarity: "epic" },
            { item: "🐰 Желешка", quantity: 1, chance: 5.52, icon: "🐰", sellPrice: 500, type: "jelly", rarity: "epic" },
            { item: "💨 Сигара", quantity: 1, chance: 4.15, icon: "💨", sellPrice: 900, type: "cigar", rarity: "legendary" },
            { item: "💨 Фен", quantity: 1, chance: 3.47, icon: "💨", sellPrice: 1300, type: "dryer", rarity: "legendary" },
            { item: "🧪 Зелье", quantity: 1, chance: 3.61, icon: "🧪", sellPrice: 1200, type: "potion", rarity: "legendary" },
            { item: "👠 Каблуки", quantity: 1, chance: 4.39, icon: "👠", sellPrice: 800, type: "shoes", rarity: "legendary" }
        ]
    },
    1000: {
        name: "Кейс Элита",
        price: 1000,
        rewards: [
            { item: "🍦 Ice Cream", quantity: 1, chance: 7.38, icon: "🍦", sellPrice: 180, type: "icecream", rarity: "rare" },
            { item: "📅 Календарь", quantity: 1, chance: 7.22, icon: "📅", sellPrice: 200, type: "calendar", rarity: "rare" },
            { item: "🐕 Snoop Dogg", quantity: 1, chance: 7.00, icon: "🐕", sellPrice: 300, type: "snoop", rarity: "epic" },
            { item: "🚀 Ракета", quantity: 1, chance: 7.00, icon: "🚀", sellPrice: 300, type: "rocket", rarity: "epic" },
            { item: "🧁 Мафин", quantity: 1, chance: 6.74, icon: "🧁", sellPrice: 400, type: "muffin", rarity: "epic" },
            { item: "🐰 Желешка", quantity: 1, chance: 6.55, icon: "🐰", sellPrice: 500, type: "jelly", rarity: "epic" },
            { item: "🌺 Цветок", quantity: 1, chance: 6.39, icon: "🌺", sellPrice: 600, type: "flower", rarity: "epic" },
            { item: "👠 Каблуки", quantity: 1, chance: 6.16, icon: "👠", sellPrice: 800, type: "shoes", rarity: "legendary" },
            { item: "🎩 Шляпа", quantity: 1, chance: 6.06, icon: "🎩", sellPrice: 900, type: "hat", rarity: "legendary" },
            { item: "💨 Сигара", quantity: 1, chance: 6.06, icon: "💨", sellPrice: 900, type: "cigar", rarity: "legendary" },
            { item: "🧪 Зелье", quantity: 1, chance: 5.84, icon: "🧪", sellPrice: 1200, type: "potion", rarity: "legendary" },
            { item: "💨 Фен", quantity: 1, chance: 5.78, icon: "💨", sellPrice: 1300, type: "dryer", rarity: "legendary" },
            { item: "🌹 Роза", quantity: 1, chance: 5.53, icon: "🌹", sellPrice: 1800, type: "rose", rarity: "mythic" },
            { item: "💎 Кольцо VIP", quantity: 1, chance: 5.46, icon: "💎", sellPrice: 2000, type: "diamond_ring", rarity: "mythic" },
            { item: "🪆 Вуду", quantity: 1, chance: 5.36, icon: "🪆", sellPrice: 2300, type: "voodoo", rarity: "mythic" },
            { item: "💀 Череп", quantity: 1, chance: 5.22, icon: "💀", sellPrice: 2800, type: "skull", rarity: "mythic" }
        ]
    },
    1000: {
        name: "Кейс Премиум",
        price: 1000,
        rewards: [
            { item: "🍦 Ice Cream", quantity: 1, chance: 13.75, icon: "🍦", sellPrice: 180, type: "icecream", rarity: "rare" },
            { item: "🐕 Snoop Dogg", quantity: 1, chance: 10.44, icon: "🐕", sellPrice: 300, type: "snoop", rarity: "epic" },
            { item: "🎩 Шляпа", quantity: 1, chance: 5.78, icon: "🎩", sellPrice: 900, type: "hat", rarity: "legendary" },
            { item: "🧁 Мафин", quantity: 1, chance: 8.94, icon: "🧁", sellPrice: 400, type: "muffin", rarity: "epic" },
            { item: "🌺 Цветок", quantity: 1, chance: 7.19, icon: "🌺", sellPrice: 600, type: "flower", rarity: "epic" },
            { item: "🐰 Желешка", quantity: 1, chance: 7.93, icon: "🐰", sellPrice: 500, type: "jelly", rarity: "epic" },
            { item: "💨 Сигара", quantity: 1, chance: 5.78, icon: "💨", sellPrice: 900, type: "cigar", rarity: "legendary" },
            { item: "💨 Фен", quantity: 1, chance: 4.74, icon: "💨", sellPrice: 1300, type: "dryer", rarity: "legendary" },
            { item: "🧪 Зелье", quantity: 1, chance: 4.95, icon: "🧪", sellPrice: 1200, type: "potion", rarity: "legendary" },
            { item: "👠 Каблуки", quantity: 1, chance: 6.16, icon: "👠", sellPrice: 800, type: "shoes", rarity: "legendary" },
            { item: "🪆 Вуду", quantity: 1, chance: 3.49, icon: "🪆", sellPrice: 2300, type: "voodoo", rarity: "mythic" },
            { item: "💀 Череп", quantity: 1, chance: 3.13, icon: "💀", sellPrice: 2800, type: "skull", rarity: "mythic" },
            { item: "🌹 Роза", quantity: 1, chance: 3.98, icon: "🌹", sellPrice: 1800, type: "rose", rarity: "mythic" },
            { item: "💎 Кольцо VIP", quantity: 1, chance: 3.76, icon: "💎", sellPrice: 2000, type: "diamond_ring", rarity: "mythic" },
            { item: "🚗 Машина", quantity: 1, chance: 2.78, icon: "🚗", sellPrice: 3500, type: "car", rarity: "mythic" },
            { item: "🧸 Медведь", quantity: 1, chance: 3.00, icon: "🧸", sellPrice: 3000, type: "toy_bear", rarity: "mythic" }
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
    { name: "Легенда", icon: "👑", description: "Достигните 10 уровня" },
    { name: "Ветеран", icon: "🎖️", description: "Откройте 50 кейсов" },
    { name: "Миллионер", icon: "💎", description: "Накопите 5000 звезд" }
];

// Данные заданий
const tasksData = [
    { id: 'first_steps', title: '🎯 Первые шаги', reward: 50, description: 'Откройте свой первый кейс в игре', target: 1, type: 'cases' },
    { id: 'saver', title: '💰 Накопитель', reward: 100, description: 'Накопите 500 звёзд на балансе', target: 500, type: 'balance' },
    { id: 'collector', title: '🏆 Коллекционер', reward: 200, description: 'Соберите 10 различных предметов', target: 10, type: 'inventory' },
    { id: 'fast_start', title: '🚀 Быстрый старт', reward: 150, description: 'Откройте 5 кейсов за один день', target: 5, type: 'cases' },
    { id: 'rare_hunter', title: '💎 Редкий охотник', reward: 300, description: 'Получите 3 редких предмета', target: 3, type: 'inventory' },
    { id: 'legend', title: '🌟 Легенда', reward: 500, description: 'Достигните 10 уровня', target: 10, type: 'level' },
    { id: 'opener', title: '🎁 Открыватель', reward: 100, description: 'Откройте 10 кейсов', target: 10, type: 'cases' }
];

// Новости
const newsData = {
    'new_cases': {
        title: 'Новые NFT кейсы уже доступны! V2.0',
        date: '26.11.2025',
        text: `
            <p><strong>В нашем боте начали выходить новые кейсы с уникальными NFT предметами.</strong> Начиная от мишек заканчивая редкими Пепе. При нажатие на кнопку показать текст полностью написанно тоже самое но в конце Предложение Спасибо за использование нашего бота!</p>
            
            <p style="margin-top: 20px; color: #8A2BE2; font-weight: 600; text-align: center;">
                🎁 Открывайте кейсы и получайте уникальные NFT предметы! 🎁
            </p>
            
            <p style="margin-top: 15px; text-align: center;">
                <strong>Не забудьте активировать промокод FREE2025 для получения бонусных звёзд!</strong>
            </p>
            
            <p style="margin-top: 20px; text-align: center; font-style: italic;">
                Спасибо за использование нашего бота!
            </p>
        `
    },
    'development': {
        title: 'Запуск NFT платформы V1.0',
        date: '23.11.2025',
        text: `
            <p><strong>Мы запустили первую версию нашей NFT платформы!</strong> Теперь вы можете собирать, продавать и выводить уникальные предметы.</p>
            
            <p>Мы надеемся что платформа подарит вам много впечатлений как и нам. Спасибо за ваше использование.</p>
            
            <p style="margin-top: 20px; color: #8A2BE2; font-weight: 600; text-align: center;">
                🚀 Следите за обновлениями! 🚀
            </p>
            
            <p style="margin-top: 15px; text-align: center;">
                <strong>Промокод FREE2025 уже активен - используйте его для получения бонуса!</strong>
            </p>
        `
    }
};

// Редкости предметов
const rarityData = {
    'common': { name: 'Обычный', color: '#8A2BE2', emoji: '⚪' },
    'rare': { name: 'Редкий', color: '#007AFF', emoji: '🔵' },
    'epic': { name: 'Эпический', color: '#5856D6', emoji: '🟣' },
    'legendary': { name: 'Легендарный', color: '#FF2D55', emoji: '🔴' },
    'mythic': { name: 'Мифический', color: '#FF9500', emoji: '🟠' },
    'legendary': { name: 'Легендарный', color: '#FFCC00', emoji: '🟡' }
};

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
        elements.freeCaseBtn.style.display = 'none';
        elements.freeCaseTimer.style.display = 'block';
        elements.freeCaseTimerDisplay.textContent = formatTime(cooldown);
    } else {
        elements.freeCaseBtn.style.display = 'block';
        elements.freeCaseTimer.style.display = 'none';
        
        if (freeCaseTimerInterval) {
            clearInterval(freeCaseTimerInterval);
            freeCaseTimerInterval = null;
        }
    }
}

// Запуск таймера бесплатного кейса
function startFreeCaseTimer() {
    updateFreeCaseTimer();
    
    if (userDB.getFreeCaseCooldown() > 0 && !freeCaseTimerInterval) {
        freeCaseTimerInterval = setInterval(updateFreeCaseTimer, 1000);
    }
}

// Функция смены страницы
function changePage(page) {
    if (isAnimating || currentPage === page) return;
    
    isAnimating = true;
    currentPage = page;
    
    updateActiveButton(page);
    switchContent(page);
    
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
    elements.homeContent.style.display = 'none';
    elements.rouletteContent.style.display = 'none';
    elements.tasksContent.style.display = 'none';
    elements.profileContent.style.display = 'none';
    
    switch(page) {
        case 'home':
            elements.homeContent.style.display = 'block';
            break;
        case 'roulette':
            elements.rouletteContent.style.display = 'block';
            updateBalanceDisplay();
            startFreeCaseTimer();
            break;
        case 'tasks':
            elements.tasksContent.style.display = 'block';
            loadTasks();
            break;
        case 'profile':
            elements.profileContent.style.display = 'block';
            updateProfile();
            loadActivePromos();
            break;
    }
}

// Обновление отображения баланса
function updateBalanceDisplay() {
    const balance = userDB.getBalance();
    const stats = userDB.getStats();
    elements.starsBalance.textContent = balance.toLocaleString();
    elements.openedCases.textContent = stats.casesOpened;
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

// Загрузка заданий
function loadTasks() {
    elements.tasksList.innerHTML = '';
    const userTasks = userDB.getTasks();
    
    tasksData.forEach(task => {
        const taskData = userTasks[task.id] || { completed: false, progress: 0 };
        const progress = taskData.progress || 0;
        const progressPercent = Math.min((progress / task.target) * 100, 100);
        
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-reward">⭐ +${task.reward}</div>
            </div>
            <div class="task-description">
                ${task.description}
            </div>
            <div class="task-progress">
                <div class="task-progress-bar" style="width: ${progressPercent}%"></div>
            </div>
            <button class="task-button ${taskData.completed ? 'completed' : ''}" 
                    onclick="completeTask('${task.id}', ${task.reward})"
                    ${taskData.completed ? 'disabled' : ''}>
                ${taskData.completed ? '✅ Выполнено' : `Получить ${task.reward} ⭐`}
            </button>
        `;
        
        elements.tasksList.appendChild(taskElement);
    });
}

// Обновление прогресса заданий
function updateTaskProgress() {
    const stats = userDB.getStats();
    const inventory = userDB.getInventory();
    const userTasks = userDB.getTasks();
    
    // Первые шаги
    if (stats.casesOpened > 0) {
        userDB.updateTaskProgress('first_steps', 100);
    }
    
    // Накопитель
    const balance = userDB.getBalance();
    userDB.updateTaskProgress('saver', (balance / 500) * 100);
    
    // Коллекционер
    userDB.updateTaskProgress('collector', (inventory.length / 10) * 100);
    
    // Быстрый старт (упрощенная версия)
    userDB.updateTaskProgress('fast_start', (stats.casesOpened / 5) * 100);
    
    // Редкий охотник
    const rareItems = inventory.filter(item => item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic').length;
    userDB.updateTaskProgress('rare_hunter', (rareItems / 3) * 100);
    
    // Легенда
    userDB.updateTaskProgress('legend', (stats.level / 10) * 100);
    
    // Открыватель
    userDB.updateTaskProgress('opener', (stats.casesOpened / 10) * 100);
}

// Выполнение задания
function completeTask(taskId, reward) {
    if (userDB.completeTask(taskId)) {
        userDB.updateBalance(reward);
        updateBalanceDisplay();
        updateProfile();
        loadTasks();
        
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
    const expNeeded = userData.level * 100;
    
    elements.profileName.textContent = stats.firstName;
    elements.profileLevel.textContent = stats.level;
    elements.profileExp.textContent = userData.experience;
    elements.profileExpNeeded.textContent = expNeeded;
    elements.statBalance.textContent = userData.balance.toLocaleString();
    elements.statCases.textContent = stats.casesOpened;
    elements.statExperience.textContent = userData.experience;
    elements.statItems.textContent = stats.inventoryCount;
    
    updateProfileAvatar(stats.level);
    loadAchievements(userData.achievements);
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

// Загрузка активных промокодов
function loadActivePromos() {
    const usedPromos = userDB.getUsedPromoCodes();
    elements.activePromos.innerHTML = '';
    
    if (usedPromos.length === 0) {
        elements.activePromos.innerHTML = `
            <div style="text-align: center; color: #888; padding: 20px;">
                <div>🎁 Активируйте первый промокод!</div>
            </div>
        `;
        return;
    }
    
    usedPromos.forEach(promoCode => {
        const promo = promoCodes[promoCode];
        if (promo) {
            const promoElement = document.createElement('div');
            promoElement.className = 'promo-active-item';
            promoElement.innerHTML = `
                <span class="promo-active-code">${promoCode}</span>
                <span class="promo-active-reward">+${promo.reward} ⭐</span>
            `;
            elements.activePromos.appendChild(promoElement);
        }
    });
}

// Показать информацию о промокодах
function showPromoInfo() {
    elements.promoInfoModal.style.display = 'block';
}

// Закрыть информацию о промокодах
function closePromoInfo() {
    elements.promoInfoModal.style.display = 'none';
}

// Активация промокода
function activatePromoCode() {
    const code = elements.promoCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Введите промокод',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const result = userDB.usePromoCode(code);
    
    tg.showPopup({
        title: result.success ? '🎉 Успех!' : '❌ Ошибка',
        message: result.message,
        buttons: [{ type: 'ok' }]
    });
    
    if (result.success) {
        elements.promoCodeInput.value = '';
        updateBalanceDisplay();
        updateProfile();
        loadActivePromos();
    }
}

// Открытие инвентаря
function openInventory() {
    updateInventory();
    elements.inventoryModal.style.display = 'block';
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Обновление инвентаря
function updateInventory() {
    const inventory = userDB.getInventory();
    const stats = userDB.getStats();
    
    elements.inventoryCount.textContent = inventory.length;
    elements.inventoryValue.textContent = stats.totalValue.toLocaleString();
    
    elements.inventoryItems.innerHTML = '';
    
    if (inventory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-inventory';
        emptyMessage.innerHTML = `
            <div style="text-align: center; color: #888; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">📦</div>
                <div style="font-size: 1.2rem; margin-bottom: 10px;">Инвентарь пуст</div>
                <div style="font-size: 0.9rem; opacity: 0.7;">Открывайте кейсы чтобы получить NFT предметы!</div>
            </div>
        `;
        elements.inventoryItems.appendChild(emptyMessage);
    } else {
        let filteredInventory = inventory;
        
        if (currentInventoryFilter !== 'all') {
            filteredInventory = inventory.filter(item => item.rarity === currentInventoryFilter);
        }
        
        filteredInventory.forEach((item) => {
            const rarityInfo = rarityData[item.rarity] || rarityData.common;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.onclick = () => openItemModal(item);
            itemElement.innerHTML = `
                <div class="inventory-item-icon">${item.icon}</div>
                <div class="inventory-item-info">
                    <div class="inventory-item-name">${item.name}</div>
                    <div class="inventory-item-value">${item.sellPrice} ⭐</div>
                    <div class="inventory-item-rarity">${rarityInfo.emoji} ${rarityInfo.name}</div>
                </div>
            `;
            elements.inventoryItems.appendChild(itemElement);
        });
    }
}

// Фильтрация инвентаря
function filterInventory(filter) {
    currentInventoryFilter = filter;
    
    // Обновляем активные кнопки фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updateInventory();
}

// Закрытие инвентаря
function closeInventory() {
    elements.inventoryModal.style.display = 'none';
    currentInventoryFilter = 'all';
    
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Открытие модального окна предмета
function openItemModal(item) {
    currentSelectedItem = item;
    const rarityInfo = rarityData[item.rarity] || rarityData.common;
    
    elements.itemModalIcon.textContent = item.icon;
    elements.itemModalName.textContent = item.name;
    elements.itemModalValue.textContent = `Стоимость: ${item.sellPrice} ⭐`;
    elements.itemModalRarity.textContent = `Редкость: ${rarityInfo.name}`;
    elements.itemModalRarity.style.color = rarityInfo.color;
    
    elements.itemModal.style.display = 'block';
}

// Закрытие модального окна предмета
function closeItemModal() {
    elements.itemModal.style.display = 'none';
    currentSelectedItem = null;
}

// Вывод предмета
function withdrawItem() {
    if (!currentSelectedItem) return;
    
    elements.withdrawItemIcon.textContent = currentSelectedItem.icon;
    elements.withdrawItemName.textContent = currentSelectedItem.name;
    elements.withdrawItemValue.textContent = `Стоимость: ${currentSelectedItem.sellPrice} ⭐`;
    
    elements.withdrawModal.style.display = 'block';
    elements.itemModal.style.display = 'none';
}

// Закрытие модального окна вывода
function closeWithdrawModal() {
    elements.withdrawModal.style.display = 'none';
    elements.usernameInput.value = '';
}

// Подтверждение вывода
function confirmWithdraw() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Введите username',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!username.startsWith('@')) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Username должен начинаться с @',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!currentSelectedItem) return;
    
    // Отправка запроса на вывод (в реальном приложении здесь был бы запрос к серверу)
    tg.showPopup({
        title: '📤 Запрос на вывод отправлен',
        message: `NFT "${currentSelectedItem.name}" будет передан на аккаунт ${username} после подтверждения админом`,
        buttons: [{ type: 'ok' }]
    });
    
    // Удаляем предмет из инвентаря
    userDB.removeFromInventory(currentSelectedItem.id);
    
    closeWithdrawModal();
    closeInventory();
    updateInventory();
    updateProfile();
}

// Продажа предмета
function sellItem() {
    if (!currentSelectedItem) return;
    
    const sellPrice = currentSelectedItem.sellPrice;
    
    tg.showPopup({
        title: '💰 Продажа NFT',
        message: `Вы уверены, что хотите продать "${currentSelectedItem.name}" за ${sellPrice} ⭐?`,
        buttons: [
            { type: 'ok', text: 'Да, продать' },
            { type: 'cancel', text: 'Отмена' }
        ]
    }).then((result) => {
        if (result === 'ok') {
            userDB.updateBalance(sellPrice);
            userDB.removeFromInventory(currentSelectedItem.id);
            
            updateBalanceDisplay();
            updateProfile();
            closeItemModal();
            closeInventory();
            updateInventory();
            
            tg.showPopup({
                title: '✅ NFT продан',
                message: `Вы получили ${sellPrice} ⭐`,
                buttons: [{ type: 'ok' }]
            });
        }
    });
}

// Открытие модального окна кейса
function openCaseModal(price) {
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
    
    currentCaseModal = { price };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = `Цена: ${price} ⭐`;
    
    // Превью предметов
    elements.casePreview.innerHTML = '';
    const previewItems = caseData.rewards.slice(0, 4); // Показываем первые 4 предмета
    previewItems.forEach(reward => {
        const previewElement = document.createElement('div');
        previewElement.className = 'preview-item';
        previewElement.innerHTML = `
            <div class="preview-item-icon">${reward.icon}</div>
            <div class="preview-item-name">${reward.item}</div>
        `;
        elements.casePreview.appendChild(previewElement);
    });
    
    // Заполняем трек предметами
    elements.caseItemsTrack.innerHTML = '';
    for (let i = 0; i < 5; i++) { // 5 кругов для плавной анимации
        caseData.rewards.forEach(reward => {
            const rarityInfo = rarityData[reward.rarity] || rarityData.common;
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.innerHTML = `
                <div class="case-item-icon">${reward.icon}</div>
                <div class="case-item-name">${reward.item}</div>
                <div class="case-item-quantity" style="color: ${rarityInfo.color}">${rarityInfo.emoji}</div>
            `;
            elements.caseItemsTrack.appendChild(itemElement);
        });
    }
    
    elements.caseModalActions.innerHTML = '';
    
    if (price === 0) {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = '🎁 Открыть кейс';
        openButton.onclick = () => openCase(price);
        elements.caseModalActions.appendChild(openButton);
    } else {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = `🎁 Открыть за ${price} ⭐`;
        openButton.onclick = () => openCase(price);
        elements.caseModalActions.appendChild(openButton);
    }
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'case-action-btn cancel-btn';
    cancelButton.textContent = '❌ Отмена';
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
        startFreeCaseTimer();
    } else {
        userDB.openCase();
    }
    
    // Отключаем кнопки во время анимации
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    // Запускаем анимацию вращения
    elements.caseItemsTrack.classList.add('spinning');
    
    // Выбираем случайную награду
    const reward = getRandomReward(caseData.rewards);
    
    // Останавливаем анимацию и показываем результат через 6 секунд
    setTimeout(() => {
        elements.caseItemsTrack.classList.remove('spinning');
        
        // Создаем уникальный ID для предмета
        const itemId = Date.now() + Math.random().toString(36).substr(2, 9);
        const inventoryItem = {
            id: itemId,
            name: reward.item,
            icon: reward.icon,
            sellPrice: reward.sellPrice,
            type: reward.type,
            quantity: reward.quantity,
            rarity: reward.rarity,
            case: caseData.name,
            obtainedAt: new Date().toISOString()
        };
        
        userDB.addToInventory(inventoryItem);
        
        // Добавляем опыт
        const expGained = 10;
        const levelUp = userDB.addExperience(expGained);
        
        updateTaskProgress();
        userDB.saveUserData();
        
        closeCaseModal();
        showResultModal(reward, levelUp);
        
    }, 6000); // 6 секунд анимации
}

// Показ красивого окна результата
function showResultModal(reward, levelUp = false) {
    const rarityInfo = rarityData[reward.rarity] || rarityData.common;
    
    elements.resultGift.textContent = reward.icon;
    elements.resultItemName.textContent = reward.item;
    elements.resultItemRarity.textContent = `${rarityInfo.emoji} ${rarityInfo.name}`;
    elements.resultItemRarity.style.color = rarityInfo.color;
    elements.resultItemQuantity.textContent = `Стоимость: ${reward.sellPrice} ⭐`;
    
    // Активируем фейерверки
    const fireworks = document.querySelectorAll('.firework');
    fireworks.forEach(firework => {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        firework.style.setProperty('--x', `${x}px`);
        firework.style.setProperty('--y', `${y}px`);
    });
    
    elements.resultModal.style.display = 'block';
    
    if (levelUp) {
        setTimeout(() => {
            tg.showPopup({
                title: '🎉 Уровень повышен!',
                message: `Поздравляем! Вы достигли ${userDB.userData.level} уровня!`,
                buttons: [{ type: 'ok' }]
            });
        }, 1000);
    }
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
}

// Закрытие окна результата
function closeResultModal() {
    elements.resultModal.style.display = 'none';
    updateProfile();
    updateBalanceDisplay();
    loadTasks();
}

// Проверка повышения уровня (теперь в методе addExperience)

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
function openNewsModal(newsId) {
    const news = newsData[newsId];
    if (!news) return;
    
    elements.newsModalTitle.textContent = news.title;
    elements.newsModalDate.textContent = news.date;
    elements.newsModalText.innerHTML = news.text;
    
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

elements.itemModal.addEventListener('click', function(e) {
    if (e.target === elements.itemModal) {
        closeItemModal();
    }
});

elements.withdrawModal.addEventListener('click', function(e) {
    if (e.target === elements.withdrawModal) {
        closeWithdrawModal();
    }
});

elements.resultModal.addEventListener('click', function(e) {
    if (e.target === elements.resultModal) {
        closeResultModal();
    }
});

elements.promoInfoModal.addEventListener('click', function(e) {
    if (e.target === elements.promoInfoModal) {
        closePromoInfo();
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
        if (elements.itemModal.style.display === 'block') {
            closeItemModal();
        }
        if (elements.withdrawModal.style.display === 'block') {
            closeWithdrawModal();
        }
        if (elements.resultModal.style.display === 'block') {
            closeResultModal();
        }
        if (elements.promoInfoModal.style.display === 'block') {
            closePromoInfo();
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
    console.log('🚀 NFT мини-приложение полностью загружено и готово!');
    
    updateBalanceDisplay();
    updateProfile();
    updateTaskProgress();
    loadTasks();
    loadActivePromos();
    startFreeCaseTimer();
});

console.log('✅ NFT игровое мини-приложение запущено!');
