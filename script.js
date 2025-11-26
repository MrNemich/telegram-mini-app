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
                inventory: {}, // ПУСТОЙ ИНВЕНТАРЬ
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
                    'saver': { completed: false, progress: 0 }
                },
                usedPromoCodes: [],
                dailyCasesOpened: 0,
                lastDailyReset: Date.now()
            };
            this.saveUserData();
        }
        
        // Сброс дневного счетчика если прошел день
        this.resetDailyCounter();
    }

    saveUserData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.userData));
    }

    resetDailyCounter() {
        const now = Date.now();
        const lastReset = this.userData.lastDailyReset;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (now - lastReset >= twentyFourHours) {
            this.userData.dailyCasesOpened = 0;
            this.userData.lastDailyReset = now;
            this.saveUserData();
        }
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

    addToInventory(item, image, sellPrice) {
        if (!this.userData.inventory[item]) {
            this.userData.inventory[item] = {
                quantity: 0,
                image: image,
                sellPrice: sellPrice
            };
        }
        this.userData.inventory[item].quantity += 1;
        this.saveUserData();
    }

    removeFromInventory(item) {
        if (this.userData.inventory[item] && this.userData.inventory[item].quantity > 0) {
            this.userData.inventory[item].quantity -= 1;
            if (this.userData.inventory[item].quantity <= 0) {
                delete this.userData.inventory[item];
            }
            this.saveUserData();
            return true;
        }
        return false;
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
        this.userData.dailyCasesOpened++;
        this.saveUserData();
    }

    openPaidCase() {
        this.userData.casesOpened++;
        this.userData.dailyCasesOpened++;
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
            this.userData.tasks[taskId].progress = Math.min(progress, 100);
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
            return false;
        }
        this.userData.usedPromoCodes.push(code);
        this.saveUserData();
        return true;
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
let currentWithdrawItem = null;

// Кэшируем элементы для производительности
const elements = {
    homeContent: document.getElementById('home-content'),
    rouletteContent: document.getElementById('roulette-content'),
    tasksContent: document.getElementById('tasks-content'),
    profileContent: document.getElementById('profile-content'),
    newsModal1: document.getElementById('newsModal1'),
    newsModal2: document.getElementById('newsModal2'),
    caseModal: document.getElementById('caseModal'),
    inventoryModal: document.getElementById('inventoryModal'),
    resultModal: document.getElementById('resultModal'),
    withdrawModal: document.getElementById('withdrawModal'),
    starsBalance: document.getElementById('starsBalance'),
    caseItemsTrack: document.getElementById('caseItemsTrack'),
    caseModalTitle: document.getElementById('caseModalTitle'),
    caseModalPrice: document.getElementById('caseModalPrice'),
    caseModalActions: document.getElementById('caseModalActions'),
    inventoryItems: document.getElementById('inventoryItems'),
    resultItemImg: document.getElementById('resultItemImg'),
    resultItemName: document.getElementById('resultItemName'),
    resultItemPrice: document.getElementById('resultItemPrice'),
    withdrawItemImage: document.getElementById('withdrawItemImage'),
    withdrawItemName: document.getElementById('withdrawItemName'),
    withdrawItemPrice: document.getElementById('withdrawItemPrice'),
    usernameInput: document.getElementById('usernameInput'),
    buttons: document.querySelectorAll('.nav-button'),
    freeCaseBtn: document.getElementById('freeCaseBtn'),
    freeCaseTimer: document.getElementById('freeCaseTimer'),
    freeCaseTimerDisplay: document.getElementById('freeCaseTimerDisplay'),
    promoCodeInput: document.getElementById('promoCodeInput'),
    // Элементы профиля
    profileName: document.getElementById('profileName'),
    profileLevel: document.getElementById('profileLevel'),
    profileAvatar: document.getElementById('profileAvatar'),
    statBalance: document.getElementById('statBalance'),
    statCases: document.getElementById('statCases'),
    statExperience: document.getElementById('statExperience'),
    statItems: document.getElementById('statItems'),
    achievementsGrid: document.getElementById('achievementsGrid'),
    // Прогресс заданий
    firstStepsProgress: document.getElementById('firstStepsProgress'),
    saverProgress: document.getElementById('saverProgress'),
    collectorProgress: document.getElementById('collectorProgress'),
    fastStartProgress: document.getElementById('fastStartProgress'),
    rareHunterProgress: document.getElementById('rareHunterProgress'),
    legendProgress: document.getElementById('legendProgress'),
    firstStepsBtn: document.getElementById('firstStepsBtn'),
    saverBtn: document.getElementById('saverBtn'),
    collectorBtn: document.getElementById('collectorBtn'),
    fastStartBtn: document.getElementById('fastStartBtn'),
    rareHunterBtn: document.getElementById('rareHunterBtn'),
    legendBtn: document.getElementById('legendBtn')
};

// Данные кейсов с реальными призами
const casesData = {
    0: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
            { item: "Шампанское", image: "nft/шампанское.png", sellPrice: 50, chance: 25 },
            { item: "Тортик", image: "nft/торт.png", sellPrice: 50, chance: 25 },
            { item: "Сердце", image: "nft/сердечко.png", sellPrice: 15, chance: 25 },
            { item: "Мишка", image: "nft/мишка.png", sellPrice: 15, chance: 25 }
        ]
    },
    50: {
        name: "Кейс Бомж",
        price: 50,
        rewards: [
            { item: "Шампанское", image: "nft/шампанское.png", sellPrice: 50, chance: 9.88 },
            { item: "Тортик", image: "nft/торт.png", sellPrice: 50, chance: 9.88 },
            { item: "Сердце", image: "nft/сердечко.png", sellPrice: 15, chance: 32.95 },
            { item: "Мишка", image: "nft/мишка.png", sellPrice: 15, chance: 32.95 },
            { item: "Алмаз", image: "nft/алмаз.png", sellPrice: 100, chance: 4.94 },
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 4.94 },
            { item: "Hypno Lollipop", image: "nft/лолипоп.png", sellPrice: 250, chance: 1.98 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 2.47 }
        ]
    },
    100: {
        name: "Кейс Чемпион",
        price: 100,
        rewards: [
            { item: "Шампанское", image: "nft/шампанское.png", sellPrice: 50, chance: 12.89 },
            { item: "Тортик", image: "nft/торт.png", sellPrice: 50, chance: 12.89 },
            { item: "Сердце", image: "nft/сердечко.png", sellPrice: 15, chance: 17.28 },
            { item: "Мишка", image: "nft/мишка.png", sellPrice: 15, chance: 17.28 },
            { item: "Алмаз", image: "nft/алмаз.png", sellPrice: 100, chance: 10.89 },
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 10.89 },
            { item: "Hypno Lollipop", image: "nft/лолипоп.png", sellPrice: 250, chance: 8.71 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 9.19 }
        ]
    },
    180: {
        name: "Кейс Эконом",
        price: 180,
        rewards: [
            { item: "Snoop Dog", image: "nft/снуп дог.png", sellPrice: 300, chance: 25.685 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 16.843 },
            { item: "Ice Cream", image: "nft/мороженное.png", sellPrice: 180, chance: 15.255 },
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 8.601 },
            { item: "Алмаз", image: "nft/алмаз.png", sellPrice: 100, chance: 8.601 },
            { item: "Тортик", image: "nft/торт.png", sellPrice: 50, chance: 8.130 },
            { item: "Мишка", image: "nft/мишка.png", sellPrice: 15, chance: 16.885 }
        ]
    },
    200: {
        name: "Pepe фарм",
        price: 200,
        rewards: [
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 99.9 },
            { item: "Plush Pepe", image: "nft/пепе.png", sellPrice: 1000000, chance: 0.1 }
        ]
    },
    350: {
        name: "БизнесМем",
        price: 350,
        rewards: [
            { item: "Торт", image: "nft/торт.png", sellPrice: 50, chance: 18.75 },
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 18.75 },
            { item: "Кубок", image: "nft/кубок.png", sellPrice: 100, chance: 18.75 },
            { item: "Ice Cream", image: "nft/мороженное.png", sellPrice: 180, chance: 18.75 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 3.00 },
            { item: "Snoop Dogg", image: "nft/снуп дог.png", sellPrice: 300, chance: 3.00 },
            { item: "Stellar Rocket", image: "nft/ракета нфт.png", sellPrice: 300, chance: 3.00 },
            { item: "Bunny Muffin", image: "nft/мафин.png", sellPrice: 400, chance: 3.00 },
            { item: "Jelly Bunny", image: "nft/желешка.png", sellPrice: 500, chance: 3.00 },
            { item: "Skull Flower", image: "nft/цветок.png", sellPrice: 600, chance: 3.00 },
            { item: "Top Hat", image: "nft/шляпа.png", sellPrice: 900, chance: 1.00 },
            { item: "Snoop Cigar", image: "nft/сигара.png", sellPrice: 900, chance: 1.00 },
            { item: "Ionic Dryer", image: "nft/фен.png", sellPrice: 1300, chance: 1.00 },
            { item: "Love Potion", image: "nft/зелье любви.png", sellPrice: 1200, chance: 1.00 },
            { item: "Sky Stilettos", image: "nft/каблуки.png", sellPrice: 800, chance: 1.00 },
            { item: "Voodoo Doll", image: "nft/вуду.png", sellPrice: 2300, chance: 0.50 },
            { item: "Electric Skull", image: "nft/череп.png", sellPrice: 2800, chance: 0.50 },
            { item: "Eternal Rose", image: "nft/роза в стекле.png", sellPrice: 1800, chance: 0.50 },
            { item: "Diamond Ring", image: "nft/кольцо в стекле.png", sellPrice: 2000, chance: 0.50 }
        ]
    },
    500: {
        name: "Кейс Рабочий",
        price: 500,
        rewards: [
            { item: "Алмаз", image: "nft/алмаз.png", sellPrice: 100, chance: 12.02 },
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 12.02 },
            { item: "Hypno Lollipop", image: "nft/лолипоп.png", sellPrice: 250, chance: 7.71 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 8.59 },
            { item: "Ice Cream", image: "nft/мороженное.png", sellPrice: 180, chance: 9.04 },
            { item: "Snoop Dogg", image: "nft/снуп дог.png", sellPrice: 300, chance: 7.06 },
            { item: "Stellar Rocket", image: "nft/ракета.png", sellPrice: 300, chance: 7.06 },
            { item: "Top Hat", image: "nft/шляпа.png", sellPrice: 900, chance: 4.15 },
            { item: "Bunny Muffin", image: "nft/мафин.png", sellPrice: 400, chance: 6.14 },
            { item: "Skull Flower", image: "nft/цветок.png", sellPrice: 600, chance: 5.05 },
            { item: "Jelly Bunny", image: "nft/желешка.png", sellPrice: 500, chance: 5.52 },
            { item: "Snoop Cigar", image: "nft/сигара.png", sellPrice: 900, chance: 4.15 },
            { item: "Ionic Dryer", image: "nft/фен.png", sellPrice: 1300, chance: 3.47 },
            { item: "Love Potion", image: "nft/зелье любви.png", sellPrice: 1200, chance: 3.61 },
            { item: "Sky Stilettos", image: "nft/каблуки.png", sellPrice: 800, chance: 4.39 }
        ]
    },
    1000: {
        name: "Кейс Элита",
        price: 1000,
        rewards: [
            { item: "Ice Cream", image: "nft/мороженное.png", sellPrice: 180, chance: 7.38 },
            { item: "Desk Calendar", image: "nft/календарь.png", sellPrice: 200, chance: 7.22 },
            { item: "Snoop Dogg", image: "nft/снуп дог.png", sellPrice: 300, chance: 7.00 },
            { item: "Stellar Rocket", image: "nft/ракета нфт.png", sellPrice: 300, chance: 7.00 },
            { item: "Bunny Muffin", image: "nft/мафин.png", sellPrice: 400, chance: 6.74 },
            { item: "Jelly Bunny", image: "nft/желешка.png", sellPrice: 500, chance: 6.55 },
            { item: "Skull Flower", image: "nft/цветок.png", sellPrice: 600, chance: 6.39 },
            { item: "Sky Stilettos", image: "nft/каблуки.png", sellPrice: 800, chance: 6.16 },
            { item: "Top Hat", image: "nft/шляпа.png", sellPrice: 900, chance: 6.06 },
            { item: "Snoop Cigar", image: "nft/сигара.png", sellPrice: 900, chance: 6.06 },
            { item: "Love Potion", image: "nft/зелье любви.png", sellPrice: 1200, chance: 5.84 },
            { item: "Ionic Dryer", image: "nft/фен.png", sellPrice: 1300, chance: 5.78 },
            { item: "Eternal Rose", image: "nft/роза в стекле.png", sellPrice: 1800, chance: 5.53 },
            { item: "Diamond Ring", image: "nft/кольцо в стекле.png", sellPrice: 2000, chance: 5.46 },
            { item: "Voodoo Doll", image: "nft/вуду.png", sellPrice: 2300, chance: 5.36 },
            { item: "Electric Skull", image: "nft/череп.png", sellPrice: 2800, chance: 5.22 }
        ]
    }
};

// Кейс Премиум (отдельный, тоже за 1000)
const premiumCaseData = {
    name: "Кейс Премиум",
    price: 1000,
    rewards: [
        { item: "Ice Cream", image: "nft/мороженное.png", sellPrice: 180, chance: 13.75 },
        { item: "Snoop Dogg", image: "nft/снуп дог.png", sellPrice: 300, chance: 10.44 },
        { item: "Top Hat", image: "nft/шляпа.png", sellPrice: 900, chance: 5.78 },
        { item: "Bunny Muffin", image: "nft/мафин.png", sellPrice: 400, chance: 8.94 },
        { item: "Skull Flower", image: "nft/цветок.png", sellPrice: 600, chance: 7.19 },
        { item: "Jelly Bunny", image: "nft/желешка.png", sellPrice: 500, chance: 7.93 },
        { item: "Snoop Cigar", image: "nft/сигара.png", sellPrice: 900, chance: 5.78 },
        { item: "Ionic Dryer", image: "nft/фен.png", sellPrice: 1300, chance: 4.74 },
        { item: "Love Potion", image: "nft/зелье любви.png", sellPrice: 1200, chance: 4.95 },
        { item: "Sky Stilettos", image: "nft/каблуки.png", sellPrice: 800, chance: 6.16 },
        { item: "Voodoo Doll", image: "nft/вуду.png", sellPrice: 2300, chance: 3.49 },
        { item: "Electric Skull", image: "nft/череп.png", sellPrice: 2800, chance: 3.13 },
        { item: "Eternal Rose", image: "nft/роза в стекле.png", sellPrice: 1800, chance: 3.98 },
        { item: "Diamond Ring", image: "nft/кольцо в стекле.png", sellPrice: 2000, chance: 3.76 },
        { item: "Low Rider", image: "nft/снуп машина.png", sellPrice: 3500, chance: 2.78 },
        { item: "Toy Bear", image: "nft/Медведь нфт.png", sellPrice: 3000, chance: 3.00 }
    ]
};

// Cap фарм кейс (отдельный)
const capFarmCaseData = {
    name: "Cap фарм",
    price: 200,
    rewards: [
        { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 99.9 },
        { item: "Durov's Cap", image: "nft/кепка.png", sellPrice: 100000, chance: 0.1 }
    ]
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

// Промокоды
const promoCodes = {
    "FREE2025": { stars: 10, used: false }
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
            updateTasksProgress();
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
    updateTasksProgress();
    
    tg.showPopup({
        title: '💰 Баланс пополнен!',
        message: `Вы получили ${amount} ⭐`,
        buttons: [{ type: 'ok' }]
    });
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Обновление прогресса заданий
function updateTasksProgress() {
    const userData = userDB.userData;
    const tasks = userDB.getTasks();
    const inventory = userDB.getInventory();
    
    // Первые шаги - открыть 1 кейс
    const firstStepsProgress = Math.min(userData.casesOpened * 100, 100);
    userDB.updateTaskProgress('first_steps', firstStepsProgress);
    elements.firstStepsProgress.style.width = `${firstStepsProgress}%`;
    elements.firstStepsBtn.disabled = !tasks.first_steps.completed;
    elements.firstStepsBtn.textContent = tasks.first_steps.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.first_steps.completed) elements.firstStepsBtn.classList.add('completed');
    
    // Накопитель - 500 звезд
    const saverProgress = Math.min((userData.balance / 500) * 100, 100);
    userDB.updateTaskProgress('saver', saverProgress);
    elements.saverProgress.style.width = `${saverProgress}%`;
    elements.saverBtn.disabled = !tasks.saver.completed;
    elements.saverBtn.textContent = tasks.saver.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.saver.completed) elements.saverBtn.classList.add('completed');
    
    // Коллекционер - 5 предметов
    const collectorProgress = Math.min(Object.keys(inventory).length * 20, 100);
    userDB.updateTaskProgress('collector', collectorProgress);
    elements.collectorProgress.style.width = `${collectorProgress}%`;
    elements.collectorBtn.disabled = !tasks.collector.completed;
    elements.collectorBtn.textContent = tasks.collector.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.collector.completed) elements.collectorBtn.classList.add('completed');
    
    // Быстрый старт - 3 кейса в день
    const fastStartProgress = Math.min((userData.dailyCasesOpened / 3) * 100, 100);
    userDB.updateTaskProgress('fast_start', fastStartProgress);
    elements.fastStartProgress.style.width = `${fastStartProgress}%`;
    elements.fastStartBtn.disabled = !tasks.fast_start.completed;
    elements.fastStartBtn.textContent = tasks.fast_start.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.fast_start.completed) elements.fastStartBtn.classList.add('completed');
    
    // Редкий охотник - 1 редкий предмет (стоимость > 500)
    const hasRareItem = Object.values(inventory).some(item => item.sellPrice > 500);
    const rareHunterProgress = hasRareItem ? 100 : 0;
    userDB.updateTaskProgress('rare_hunter', rareHunterProgress);
    elements.rareHunterProgress.style.width = `${rareHunterProgress}%`;
    elements.rareHunterBtn.disabled = !tasks.rare_hunter.completed;
    elements.rareHunterBtn.textContent = tasks.rare_hunter.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.rare_hunter.completed) elements.rareHunterBtn.classList.add('completed');
    
    // Легенда - 3 уровень
    const legendProgress = Math.min((userData.level / 3) * 100, 100);
    userDB.updateTaskProgress('legend', legendProgress);
    elements.legendProgress.style.width = `${legendProgress}%`;
    elements.legendBtn.disabled = !tasks.legend.completed;
    elements.legendBtn.textContent = tasks.legend.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.legend.completed) elements.legendBtn.classList.add('completed');
}

// Выполнение задания
function completeTask(taskId, reward) {
    if (userDB.completeTask(taskId)) {
        userDB.updateBalance(reward);
        updateBalanceDisplay();
        updateProfile();
        updateTasksProgress();
        
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
    
    if (code === 'FREE2025') {
        if (userDB.usePromoCode(code)) {
            userDB.updateBalance(10);
            updateBalanceDisplay();
            updateProfile();
            elements.promoCodeInput.value = '';
            
            tg.showPopup({
                title: '🎉 Промокод активирован!',
                message: 'Вы получили 10 ⭐',
                buttons: [{ type: 'ok' }]
            });
        } else {
            tg.showPopup({
                title: '❌ Ошибка',
                message: 'Промокод уже использован',
                buttons: [{ type: 'ok' }]
            });
        }
    } else {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Неверный промокод',
            buttons: [{ type: 'ok' }]
        });
    }
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
        Object.entries(inventory).forEach(([itemName, itemData]) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.innerHTML = `
                <div class="inventory-item-image">
                    <img src="${itemData.image}" alt="${itemName}" onerror="this.src='nft/placeholder.png'">
                </div>
                <div class="inventory-item-info">
                    <div class="inventory-item-name">${itemName}</div>
                    <div class="inventory-item-price">Цена: ${itemData.sellPrice} ⭐</div>
                    <div class="inventory-item-quantity">Количество: ${itemData.quantity} шт.</div>
                </div>
                <div class="inventory-item-actions">
                    <button class="withdraw-btn" onclick="openWithdrawModal('${itemName}')">Вывести</button>
                    <button class="sell-btn" onclick="sellItem('${itemName}')">Продать</button>
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

// Продажа предмета
function sellItem(itemName) {
    const inventory = userDB.getInventory();
    const itemData = inventory[itemName];
    
    if (itemData && itemData.quantity > 0) {
        const sellPrice = itemData.sellPrice;
        
        tg.showPopup({
            title: '💰 Продажа предмета',
            message: `Вы уверены, что хотите продать "${itemName}" за ${sellPrice} ⭐?`,
            buttons: [
                { type: 'ok', text: 'Продать' },
                { type: 'cancel', text: 'Отмена' }
            ]
        }).then((result) => {
            if (result === 'ok') {
                if (userDB.removeFromInventory(itemName)) {
                    userDB.updateBalance(sellPrice);
                    updateBalanceDisplay();
                    updateProfile();
                    updateTasksProgress();
                    
                    tg.showPopup({
                        title: '✅ Предмет продан!',
                        message: `Вы получили ${sellPrice} ⭐`,
                        buttons: [{ type: 'ok' }]
                    });
                    
                    // Обновляем инвентарь если он открыт
                    if (elements.inventoryModal.style.display === 'block') {
                        openInventory();
                    }
                }
            }
        });
    }
}

// Открытие модального окна вывода
function openWithdrawModal(itemName) {
    const inventory = userDB.getInventory();
    const itemData = inventory[itemName];
    
    if (itemData && itemData.quantity > 0) {
        currentWithdrawItem = itemName;
        elements.withdrawItemImage.src = itemData.image;
        elements.withdrawItemName.textContent = itemName;
        elements.withdrawItemPrice.textContent = `Цена: ${itemData.sellPrice} ⭐`;
        elements.usernameInput.value = '';
        elements.withdrawModal.style.display = 'block';
    }
}

// Закрытие модального окна вывода
function closeWithdrawModal() {
    elements.withdrawModal.style.display = 'none';
    currentWithdrawItem = null;
}

// Подтверждение вывода
function confirmWithdraw() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Введите ваш @username',
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
    
    // Здесь должна быть логика отправки запроса админу
    // В демо-версии просто удаляем предмет и показываем сообщение
    
    tg.showPopup({
        title: '📤 Запрос на вывод отправлен',
        message: `Запрос на вывод "${currentWithdrawItem}" для ${username} отправлен администратору. Ожидайте подтверждения.`,
        buttons: [{ type: 'ok' }]
    }).then(() => {
        // В реальном приложении предмет удаляется только после подтверждения админа
        // В демо-версии удаляем сразу для тестирования
        userDB.removeFromInventory(currentWithdrawItem);
        closeWithdrawModal();
        
        // Обновляем инвентарь если он открыт
        if (elements.inventoryModal.style.display === 'block') {
            openInventory();
        }
        
        updateProfile();
    });
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
    let caseData;
    
    // Определяем какой кейс открываем
    if (price === 1000 && action === 'premium') {
        caseData = premiumCaseData;
    } else if (price === 200 && action === 'cap') {
        caseData = capFarmCaseData;
    } else {
        caseData = casesData[price];
    }
    
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
    
    currentCaseModal = { price, action, caseData };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = `Цена: ${price} ⭐`;
    
    // Заполняем трек предметами
    elements.caseItemsTrack.innerHTML = '';
    for (let i = 0; i < 5; i++) { // 5 кругов для плавной анимации
        caseData.rewards.forEach(reward => {
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.innerHTML = `
                <div class="case-item-image">
                    <img src="${reward.image}" alt="${reward.item}" onerror="this.src='nft/placeholder.png'">
                </div>
                <div class="case-item-name">${reward.item}</div>
                <div class="case-item-price">${reward.sellPrice} ⭐</div>
            `;
            elements.caseItemsTrack.appendChild(itemElement);
        });
    }
    
    elements.caseModalActions.innerHTML = '';
    
    if (price === 0) {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = 'Открыть кейс';
        openButton.onclick = () => openCase(price, action);
        elements.caseModalActions.appendChild(openButton);
    } else {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = `Открыть за ${price} ⭐`;
        openButton.onclick = () => openCase(price, action);
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
function openCase(price, action) {
    let caseData;
    
    if (price === 1000 && action === 'premium') {
        caseData = premiumCaseData;
    } else if (price === 200 && action === 'cap') {
        caseData = capFarmCaseData;
    } else {
        caseData = casesData[price];
    }
    
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
        userDB.openPaidCase();
    } else {
        userDB.openFreeCase();
        startFreeCaseTimer();
    }
    
    // Отключаем кнопки во время анимации
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    // Запускаем анимацию вращения - 8 СЕКУНД
    elements.caseItemsTrack.classList.add('spinning');
    
    // Выбираем случайную награду
    const reward = getRandomReward(caseData.rewards);
    
    // Останавливаем анимацию и показываем результат через 8 секунд
    setTimeout(() => {
        elements.caseItemsTrack.classList.remove('spinning');
        
        // Добавляем награду в инвентарь
        userDB.addToInventory(reward.item, reward.image, reward.sellPrice);
        userDB.userData.experience += 10;
        
        checkLevelUp();
        userDB.saveUserData();
        
        // Закрываем модальное окно кейса
        closeCaseModal();
        
        // Показываем красивое окно результата
        showResultModal(reward);
        
        // Обновляем прогресс заданий
        updateTasksProgress();
        
    }, 8000); // 8 секунд анимации
}

// Показ красивого окна результата
function showResultModal(reward) {
    elements.resultItemImg.src = reward.image;
    elements.resultItemName.textContent = reward.item;
    elements.resultItemPrice.textContent = `Цена при продаже: ${reward.sellPrice} ⭐`;
    
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
        
        updateTasksProgress();
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
function openNewsModal(newsId) {
    const modal = document.getElementById(`newsModal${newsId.slice(-1)}`);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function closeNewsModal() {
    document.querySelectorAll('.news-modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = '';
    
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Закрытие модальных окон по клику на фон
document.querySelectorAll('.news-modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeNewsModal();
        }
    });
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

elements.withdrawModal.addEventListener('click', function(e) {
    if (e.target === elements.withdrawModal) {
        closeWithdrawModal();
    }
});

// Закрытие модальных окон по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.querySelector('.news-modal.show')) {
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
        if (elements.withdrawModal.style.display === 'block') {
            closeWithdrawModal();
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
    updateTasksProgress();
    startFreeCaseTimer();
});

console.log('✅ Игровое мини-приложение запущено!');
