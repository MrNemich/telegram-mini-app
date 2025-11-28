// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Глобальная база данных пользователей
class GlobalDatabase {
    constructor() {
        this.storageKey = 'global_users_database';
        this.loadGlobalData();
    }

    loadGlobalData() {
        const savedData = localStorage.getItem(this.storageKey);
        this.globalData = savedData ? JSON.parse(savedData) : {
            users: {},
            nextUserId: 8000001,
            settings: {
                referralBonus: 50,
                referralCommission: 0.1 // 10%
            }
        };
    }

    saveGlobalData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.globalData));
    }

    getNextUserId() {
        const userId = this.globalData.nextUserId;
        this.globalData.nextUserId++;
        this.saveGlobalData();
        return userId;
    }

    getUserByTelegramId(telegramId) {
        return this.globalData.users[telegramId];
    }

    createUser(telegramId, userData) {
        const userId = this.getNextUserId();
        const newUser = {
            userId: userId,
            telegramId: telegramId,
            balance: 100,
            inventory: {},
            casesOpened: 0,
            paidCasesOpened: 0,
            lastFreeCase: 0,
            achievements: ['Новичок'],
            level: 1,
            experience: 0,
            username: userData.username || 'Игрок',
            firstName: userData.first_name || 'Игрок',
            isBanned: false,
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
            lastDailyReset: Date.now(),
            uniqueItemsCollected: 0,
            ip: 'user_ip_' + telegramId,
            registrationDate: Date.now(),
            battlePassLevel: 1,
            battlePassExp: 0,
            lastDailyBonus: 0,
            dailyBonusStreak: 0,
            referralCode: this.generateReferralCode(),
            referredBy: null,
            referrals: [],
            referralEarnings: 0,
            tradeHistory: []
        };

        this.globalData.users[telegramId] = newUser;
        this.saveGlobalData();
        return newUser;
    }

    generateReferralCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    updateUser(telegramId, userData) {
        this.globalData.users[telegramId] = { ...this.globalData.users[telegramId], ...userData };
        this.saveGlobalData();
    }

    getAllUsers() {
        return Object.values(this.globalData.users);
    }

    getUserByReferralCode(code) {
        return Object.values(this.globalData.users).find(user => 
            user.referralCode === code
        );
    }

    processReferral(referrerTelegramId, newUserTelegramId) {
        const referrer = this.globalData.users[referrerTelegramId];
        if (referrer) {
            referrer.referrals.push(newUserTelegramId);
            referrer.balance += this.globalData.settings.referralBonus;
            referrer.referralEarnings += this.globalData.settings.referralBonus;
            this.saveGlobalData();
            return true;
        }
        return false;
    }

    addReferralCommission(referrerTelegramId, amount) {
        const referrer = this.globalData.users[referrerTelegramId];
        if (referrer) {
            const commission = Math.floor(amount * this.globalData.settings.referralCommission);
            referrer.balance += commission;
            referrer.referralEarnings += commission;
            this.saveGlobalData();
            return commission;
        }
        return 0;
    }
}

// База данных пользователя
class UserDatabase {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.telegramId = this.tg.initDataUnsafe.user?.id || 'default_user';
        this.globalDB = new GlobalDatabase();
        this.loadUserData();
    }

    loadUserData() {
        let userData = this.globalDB.getUserByTelegramId(this.telegramId);
        
        if (!userData) {
            // Создаем нового пользователя
            userData = this.globalDB.createUser(this.telegramId, {
                username: this.tg.initDataUnsafe.user?.username,
                first_name: this.tg.initDataUnsafe.user?.first_name
            });
        }

        this.userData = userData;
        
        // Сброс дневного счетчика если прошел день
        this.resetDailyCounter();
        // Проверка ежедневного бонуса
        this.checkDailyBonus();
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

    checkDailyBonus() {
        const now = Date.now();
        const lastBonus = this.userData.lastDailyBonus;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (lastBonus === 0 || (now - lastBonus) >= twentyFourHours) {
            if (lastBonus > 0 && (now - lastBonus) >= (twentyFourHours * 2)) {
                this.userData.dailyBonusStreak = 0;
                this.saveUserData();
            }
        }
    }

    saveUserData() {
        this.globalDB.updateUser(this.telegramId, this.userData);
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
        const wasNewItem = !this.userData.inventory[item];
        
        if (!this.userData.inventory[item]) {
            this.userData.inventory[item] = {
                quantity: 0,
                image: image,
                sellPrice: sellPrice
            };
            if (wasNewItem) {
                this.userData.uniqueItemsCollected++;
            }
        }
        this.userData.inventory[item].quantity += 1;
        this.saveUserData();
        
        if (this.userData.uniqueItemsCollected >= 3) {
            this.addAchievement('Коллекционер');
        }
        
        if (sellPrice > 500) {
            this.addAchievement('Редкий охотник');
        }
    }

    removeFromInventory(item) {
        if (this.userData.inventory[item] && this.userData.inventory[item].quantity > 0) {
            this.userData.inventory[item].quantity -= 1;
            if (this.userData.inventory[item].quantity <= 0) {
                delete this.userData.inventory[item];
                this.userData.uniqueItemsCollected--;
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
        this.userData.paidCasesOpened++;
        this.userData.dailyCasesOpened++;
        
        this.addBattlePassExp(10);
        
        this.saveUserData();
    }

    addExperience(amount) {
        this.userData.experience += amount;
        const expNeeded = this.userData.level * 100;
        
        if (this.userData.experience >= expNeeded) {
            this.userData.level++;
            this.userData.experience = 0;
            
            if (this.userData.level >= 2) {
                this.addAchievement('Легенда');
            }
            if (this.userData.level >= 5) {
                this.addAchievement('Опытный');
            }
        }
        this.saveUserData();
    }

    addBattlePassExp(amount) {
        this.userData.battlePassExp += amount;
        const expNeeded = this.userData.battlePassLevel * 50;
        
        if (this.userData.battlePassExp >= expNeeded) {
            this.userData.battlePassLevel++;
            this.userData.battlePassExp = 0;
            
            const reward = 5;
            this.userData.balance += reward;
            
            this.saveUserData();
            return {
                leveledUp: true,
                newLevel: this.userData.battlePassLevel,
                reward: reward
            };
        }
        
        this.saveUserData();
        return {
            leveledUp: false,
            currentExp: this.userData.battlePassExp,
            neededExp: expNeeded
        };
    }

    getBattlePassInfo() {
        const expNeeded = this.userData.battlePassLevel * 50;
        return {
            level: this.userData.battlePassLevel,
            exp: this.userData.battlePassExp,
            neededExp: expNeeded,
            progress: (this.userData.battlePassExp / expNeeded) * 100
        };
    }

    useReferralCode(code) {
        if (this.userData.referredBy) {
            return { success: false, message: 'Вы уже использовали реферальный код' };
        }
        
        const referrer = this.globalDB.getUserByReferralCode(code);
        if (referrer && referrer.telegramId !== this.telegramId) {
            this.userData.referredBy = referrer.telegramId;
            this.saveUserData();
            
            // Начисляем бонус рефереру
            this.globalDB.processReferral(referrer.telegramId, this.telegramId);
            
            return { success: true, message: 'Реферальный код активирован! Вы получили 50 ⭐' };
        }
        
        return { success: false, message: 'Неверный реферальный код' };
    }

    addReferralEarnings(amount) {
        if (this.userData.referredBy) {
            this.globalDB.addReferralCommission(this.userData.referredBy, amount);
        }
    }

    getReferralInfo() {
        return {
            code: this.userData.referralCode,
            referredBy: this.userData.referredBy,
            referrals: this.userData.referrals.length,
            earnings: this.userData.referralEarnings
        };
    }

    getReferralLink() {
        const botUsername = 'your_bot_username'; // Замените на username вашего бота
        return `https://t.me/${botUsername}?start=ref_${this.userData.referralCode}`;
    }

    tradeWithUser(targetUserId, giveItem, receiveItem) {
        const allUsers = this.globalDB.getAllUsers();
        const targetUser = allUsers.find(user => user.userId === parseInt(targetUserId));
        
        if (!targetUser) {
            return { success: false, message: 'Пользователь не найден' };
        }

        if (!this.userData.inventory[giveItem] || this.userData.inventory[giveItem].quantity === 0) {
            return { success: false, message: 'У вас нет этого предмета' };
        }
        
        if (!targetUser.inventory[receiveItem] || targetUser.inventory[receiveItem].quantity === 0) {
            return { success: false, message: 'У пользователя нет этого предмета' };
        }

        // Обмен предметами
        this.removeFromInventory(giveItem);
        this.addToInventory(receiveItem, targetUser.inventory[receiveItem].image, targetUser.inventory[receiveItem].sellPrice);
        
        // Обновляем инвентарь целевого пользователя
        targetUser.inventory[receiveItem].quantity -= 1;
        if (!targetUser.inventory[giveItem]) {
            targetUser.inventory[giveItem] = {
                quantity: 0,
                image: this.userData.inventory[giveItem].image,
                sellPrice: this.userData.inventory[giveItem].sellPrice
            };
        }
        targetUser.inventory[giveItem].quantity += 1;
        
        // Сохраняем изменения целевого пользователя
        this.globalDB.updateUser(targetUser.telegramId, {
            inventory: targetUser.inventory
        });
        
        const tradeRecord = {
            date: Date.now(),
            from: this.userData.userId,
            to: targetUser.userId,
            giveItem: giveItem,
            receiveItem: receiveItem
        };
        
        this.userData.tradeHistory.push(tradeRecord);
        targetUser.tradeHistory = targetUser.tradeHistory || [];
        targetUser.tradeHistory.push(tradeRecord);
        
        this.globalDB.updateUser(targetUser.telegramId, {
            tradeHistory: targetUser.tradeHistory
        });
        
        this.saveUserData();
        
        return { success: true, message: 'Обмен успешно завершен!' };
    }

    getStats() {
        return {
            casesOpened: this.userData.casesOpened,
            paidCasesOpened: this.userData.paidCasesOpened,
            level: this.userData.level,
            experience: this.userData.experience,
            achievements: this.userData.achievements,
            userId: this.userData.userId,
            telegramId: this.telegramId,
            username: this.userData.username,
            firstName: this.userData.firstName,
            inventoryCount: Object.keys(this.userData.inventory).length,
            uniqueItemsCollected: this.userData.uniqueItemsCollected,
            isBanned: this.userData.isBanned,
            registrationDate: this.userData.registrationDate,
            battlePassLevel: this.userData.battlePassLevel,
            battlePassExp: this.userData.battlePassExp,
            dailyBonusStreak: this.userData.dailyBonusStreak,
            referralEarnings: this.userData.referralEarnings
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
            
            if (window.showAchievementNotification) {
                window.showAchievementNotification(achievement);
            }
            
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

    claimDailyBonus() {
        const now = Date.now();
        const lastBonus = this.userData.lastDailyBonus;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (lastBonus === 0 || (now - lastBonus) >= twentyFourHours) {
            const bonusAmount = 1;
            this.userData.balance += bonusAmount;
            this.userData.lastDailyBonus = now;
            
            if (lastBonus > 0 && (now - lastBonus) < (twentyFourHours * 2)) {
                this.userData.dailyBonusStreak++;
            } else {
                this.userData.dailyBonusStreak = 1;
            }
            
            this.saveUserData();
            return {
                success: true,
                amount: bonusAmount,
                streak: this.userData.dailyBonusStreak
            };
        }
        
        return {
            success: false,
            timeRemaining: twentyFourHours - (now - lastBonus)
        };
    }

    banUser() {
        this.userData.isBanned = true;
        this.saveUserData();
    }

    unbanUser() {
        this.userData.isBanned = false;
        this.saveUserData();
    }

    resetUser() {
        this.userData.balance = 100;
        this.userData.inventory = {};
        this.userData.level = 1;
        this.userData.experience = 0;
        this.userData.casesOpened = 0;
        this.userData.paidCasesOpened = 0;
        this.userData.uniqueItemsCollected = 0;
        this.userData.achievements = ['Новичок'];
        this.userData.battlePassLevel = 1;
        this.userData.battlePassExp = 0;
        this.userData.dailyBonusStreak = 0;
        
        Object.keys(this.userData.tasks).forEach(taskId => {
            this.userData.tasks[taskId] = { completed: false, progress: 0 };
        });
        
        this.saveUserData();
    }
}

// Глобальная база данных для заявок на вывод
class WithdrawDatabase {
    constructor() {
        this.storageKey = 'withdraw_requests';
        this.loadData();
    }

    loadData() {
        const savedData = localStorage.getItem(this.storageKey);
        this.requests = savedData ? JSON.parse(savedData) : [];
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
    }

    addRequest(userId, username, itemName, itemImage, itemPrice) {
        const request = {
            id: Date.now().toString(),
            userId: userId,
            username: username,
            itemName: itemName,
            itemImage: itemImage,
            itemPrice: itemPrice,
            timestamp: Date.now(),
            status: 'pending'
        };
        this.requests.unshift(request);
        this.saveData();
        return request;
    }

    getRequests() {
        return this.requests.filter(request => request.status === 'pending');
    }

    getAllRequests() {
        return this.requests;
    }

    completeRequest(requestId) {
        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            request.status = 'completed';
            this.saveData();
            return true;
        }
        return false;
    }

    getUserById(userId) {
        const globalDB = new GlobalDatabase();
        const allUsers = globalDB.getAllUsers();
        return allUsers.find(user => user.userId === parseInt(userId));
    }

    getAllUsers() {
        const globalDB = new GlobalDatabase();
        return globalDB.getAllUsers().sort((a, b) => a.userId - b.userId);
    }
}

// Инициализируем приложение
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Инициализация баз данных
const userDB = new UserDatabase();
const withdrawDB = new WithdrawDatabase();

// Текущая активная страница
let currentPage = 'home';
let isAnimating = false;
let currentCaseModal = null;
let freeCaseTimerInterval = null;
let currentWithdrawItem = null;
let selectedRewardIndex = null;
let selectedStarsOption = null;

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
    consoleModal: document.getElementById('consoleModal'),
    adminModal: document.getElementById('adminModal'),
    withdrawRequestsModal: document.getElementById('withdrawRequestsModal'),
    userSearchModal: document.getElementById('userSearchModal'),
    allUsersModal: document.getElementById('allUsersModal'),
    starsShopModal: document.getElementById('starsShopModal'),
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
    consoleInput: document.getElementById('consoleInput'),
    consoleOutput: document.getElementById('consoleOutput'),
    withdrawRequestsList: document.getElementById('withdrawRequestsList'),
    userIdInput: document.getElementById('userIdInput'),
    userInfo: document.getElementById('userInfo'),
    allUsersList: document.getElementById('allUsersList'),
    buttons: document.querySelectorAll('.nav-button'),
    freeCaseBtn: document.getElementById('freeCaseBtn'),
    freeCaseTimer: document.getElementById('freeCaseTimer'),
    freeCaseTimerDisplay: document.getElementById('freeCaseTimerDisplay'),
    promoCodeInput: document.getElementById('promoCodeInput'),
    profileName: document.getElementById('profileName'),
    profileLevel: document.getElementById('profileLevel'),
    profileId: document.getElementById('profileId'),
    profileAvatar: document.getElementById('profileAvatar'),
    statBalance: document.getElementById('statBalance'),
    statCases: document.getElementById('statCases'),
    statExperience: document.getElementById('statExperience'),
    statItems: document.getElementById('statItems'),
    achievementsGrid: document.getElementById('achievementsGrid'),
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
    legendBtn: document.getElementById('legendBtn'),
    battlePassLevel: document.getElementById('battlePassLevel'),
    battlePassExp: document.getElementById('battlePassExp'),
    battlePassProgress: document.getElementById('battlePassProgress'),
    dailyBonusBtn: document.getElementById('dailyBonusBtn'),
    dailyBonusStreak: document.getElementById('dailyBonusStreak'),
    referralCode: document.getElementById('referralCode'),
    referralInput: document.getElementById('referralInput'),
    referralEarnings: document.getElementById('referralEarnings'),
    tradeModal: document.getElementById('tradeModal'),
    tradeUserId: document.getElementById('tradeUserId'),
    tradeGiveItem: document.getElementById('tradeGiveItem'),
    tradeReceiveItem: document.getElementById('tradeReceiveItem'),
    starsBuyBtn: document.getElementById('starsBuyBtn')
};

// Данные кейсов с реальными призами
const casesData = {
    free: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
            { item: "Шампанское", image: "nft/шампанское.png", sellPrice: 50, chance: 25 },
            { item: "Тортик", image: "nft/торт.png", sellPrice: 50, chance: 25 },
            { item: "Сердце", image: "nft/сердечко.png", sellPrice: 15, chance: 25 },
            { item: "Мишка", image: "nft/мишка.png", sellPrice: 15, chance: 25 }
        ]
    },
    bomj: {
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
    champion: {
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
    economy: {
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
    pepe: {
        name: "Pepe фарм",
        price: 200,
        rewards: [
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 99.9 },
            { item: "Plush Pepe", image: "nft/пепе.png", sellPrice: 1000000, chance: 0.1 }
        ]
    },
    cap: {
        name: "Cap фарм",
        price: 200,
        rewards: [
            { item: "Кольцо", image: "nft/кольцо.png", sellPrice: 100, chance: 99.9 },
            { item: "Durov's Cap", image: "nft/кепка.png", sellPrice: 100000, chance: 0.1 }
        ]
    },
    business: {
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
    worker: {
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
    elite: {
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
    },
    premium: {
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
    }
};

// Данные достижений
const achievementsData = [
    { name: "Новичок", icon: "🎯", description: "Начните играть" },
    { name: "Первые шаги", icon: "🚶", description: "Откройте первый платный кейс" },
    { name: "Коллекционер", icon: "🏆", description: "Соберите 3 предмета" },
    { name: "Богач", icon: "💰", description: "Накопите 500 звезд" },
    { name: "Опытный", icon: "⭐", description: "Достигните 5 уровня" },
    { name: "Легенда", icon: "👑", description: "Достигните 10 уровня" },
    { name: "Редкий охотник", icon: "💎", description: "Получите редкий предмет" }
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

// Магазин Stars
function openStarsShop() {
    elements.starsShopModal.style.display = 'block';
    selectedStarsOption = null;
    
    // Сбрасываем выделение всех опций
    document.querySelectorAll('.stars-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    elements.starsBuyBtn.disabled = true;
}

function closeStarsShop() {
    elements.starsShopModal.style.display = 'none';
}

function selectStarsOption(stars, price) {
    selectedStarsOption = { stars, price };
    
    // Снимаем выделение со всех опций
    document.querySelectorAll('.stars-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранную опцию
    event.currentTarget.classList.add('selected');
    elements.starsBuyBtn.disabled = false;
}

function buyStars() {
    if (!selectedStarsOption) return;
    
    if (selectedStarsOption.price === 0) {
        // Бесплатное пополнение
        userDB.updateBalance(selectedStarsOption.stars);
        updateBalanceDisplay();
        updateProfile();
        
        tg.showPopup({
            title: '⭐ Баланс пополнен!',
            message: `Вы получили ${selectedStarsOption.stars} ⭐ бесплатно!`,
            buttons: [{ type: 'ok' }]
        });
        
        closeStarsShop();
    } else {
        // Покупка через Telegram Stars
        tg.showPopup({
            title: '💰 Покупка Stars',
            message: `Купить ${selectedStarsOption.stars} ⭐ за ${selectedStarsOption.price} Telegram Stars?`,
            buttons: [
                { type: 'ok', text: 'Купить' },
                { type: 'cancel', text: 'Отмена' }
            ]
        }).then((result) => {
            if (result === 'ok') {
                // Здесь должна быть интеграция с Telegram Stars API
                // Временно эмулируем успешную покупку
                userDB.updateBalance(selectedStarsOption.stars);
                userDB.addReferralEarnings(selectedStarsOption.stars);
                updateBalanceDisplay();
                updateProfile();
                
                tg.showPopup({
                    title: '✅ Успешно!',
                    message: `Вы купили ${selectedStarsOption.stars} ⭐`,
                    buttons: [{ type: 'ok' }]
                });
                
                closeStarsShop();
            }
        });
    }
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

// Обновление прогресса заданий
function updateTasksProgress() {
    const userData = userDB.userData;
    const tasks = userDB.getTasks();
    const inventory = userDB.getInventory();
    
    const firstStepsProgress = Math.min(userData.paidCasesOpened * 100, 100);
    userDB.updateTaskProgress('first_steps', firstStepsProgress);
    elements.firstStepsProgress.style.width = `${firstStepsProgress}%`;
    elements.firstStepsBtn.disabled = tasks.first_steps.completed || firstStepsProgress < 100;
    elements.firstStepsBtn.textContent = tasks.first_steps.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.first_steps.completed) elements.firstStepsBtn.classList.add('completed');
    
    const saverProgress = Math.min((userData.balance / 300) * 100, 100);
    userDB.updateTaskProgress('saver', saverProgress);
    elements.saverProgress.style.width = `${saverProgress}%`;
    elements.saverBtn.disabled = tasks.saver.completed || saverProgress < 100;
    elements.saverBtn.textContent = tasks.saver.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.saver.completed) elements.saverBtn.classList.add('completed');
    
    const collectorProgress = Math.min((userData.uniqueItemsCollected / 3) * 100, 100);
    userDB.updateTaskProgress('collector', collectorProgress);
    elements.collectorProgress.style.width = `${collectorProgress}%`;
    elements.collectorBtn.disabled = tasks.collector.completed || collectorProgress < 100;
    elements.collectorBtn.textContent = tasks.collector.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.collector.completed) elements.collectorBtn.classList.add('completed');
    
    const fastStartProgress = Math.min((userData.dailyCasesOpened / 2) * 100, 100);
    userDB.updateTaskProgress('fast_start', fastStartProgress);
    elements.fastStartProgress.style.width = `${fastStartProgress}%`;
    elements.fastStartBtn.disabled = tasks.fast_start.completed || fastStartProgress < 100;
    elements.fastStartBtn.textContent = tasks.fast_start.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.fast_start.completed) elements.fastStartBtn.classList.add('completed');
    
    const hasRareItem = Object.values(inventory).some(item => item.sellPrice > 500);
    const rareHunterProgress = hasRareItem ? 100 : 0;
    userDB.updateTaskProgress('rare_hunter', rareHunterProgress);
    elements.rareHunterProgress.style.width = `${rareHunterProgress}%`;
    elements.rareHunterBtn.disabled = tasks.rare_hunter.completed || rareHunterProgress < 100;
    elements.rareHunterBtn.textContent = tasks.rare_hunter.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.rare_hunter.completed) elements.rareHunterBtn.classList.add('completed');
    
    const legendProgress = Math.min((userData.level / 2) * 100, 100);
    userDB.updateTaskProgress('legend', legendProgress);
    elements.legendProgress.style.width = `${legendProgress}%`;
    elements.legendBtn.disabled = tasks.legend.completed || legendProgress < 100;
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
    const battlePassInfo = userDB.getBattlePassInfo();
    const referralInfo = userDB.getReferralInfo();
    
    elements.profileName.textContent = stats.firstName;
    elements.profileLevel.textContent = stats.level;
    elements.profileId.textContent = stats.userId;
    elements.statBalance.textContent = userData.balance.toLocaleString();
    elements.statCases.textContent = stats.casesOpened;
    elements.statExperience.textContent = userData.experience;
    elements.statItems.textContent = stats.uniqueItemsCollected;
    
    elements.battlePassLevel.textContent = battlePassInfo.level;
    elements.battlePassExp.textContent = `${battlePassInfo.exp}/${battlePassInfo.neededExp}`;
    elements.battlePassProgress.style.width = `${battlePassInfo.progress}%`;
    
    elements.dailyBonusStreak.textContent = stats.dailyBonusStreak;
    
    elements.referralCode.textContent = referralInfo.code;
    elements.referralEarnings.textContent = referralInfo.earnings;
    
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

// Показ уведомления о достижении
window.showAchievementNotification = function(achievementName) {
    tg.showPopup({
        title: '🏆 Новое достижение!',
        message: `Вы получили достижение: ${achievementName}`,
        buttons: [{ type: 'ok' }]
    });
};

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
            
            if (userDB.getBalance() >= 500) {
                userDB.addAchievement('Богач');
            }
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

// Получение ежедневного бонуса
function claimDailyBonus() {
    const result = userDB.claimDailyBonus();
    
    if (result.success) {
        updateBalanceDisplay();
        updateProfile();
        
        tg.showPopup({
            title: '🎁 Ежедневный бонус!',
            message: `Вы получили ${result.amount} ⭐\nСтрик: ${result.streak} дней`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        const timeRemaining = formatTime(result.timeRemaining);
        tg.showPopup({
            title: '⏰ Бонус недоступен',
            message: `Следующий бонус через: ${timeRemaining}`,
            buttons: [{ type: 'ok' }]
        });
    }
}

// Реферальная система
function useReferralCode() {
    const code = elements.referralInput.value.trim().toUpperCase();
    
    if (!code) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Введите реферальный код',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const result = userDB.useReferralCode(code);
    
    if (result.success) {
        elements.referralInput.value = '';
        updateProfile();
        
        tg.showPopup({
            title: '🎉 Код активирован!',
            message: result.message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Ошибка',
            message: result.message,
            buttons: [{ type: 'ok' }]
        });
    }
}

function copyReferralCode() {
    const referralLink = userDB.getReferralLink();
    navigator.clipboard.writeText(referralLink).then(() => {
        tg.showPopup({
            title: '✅ Скопировано',
            message: 'Реферальная ссылка скопирована в буфер обмена',
            buttons: [{ type: 'ok' }]
        });
    });
}

// Трейдинг система
function openTradeModal() {
    elements.tradeModal.style.display = 'block';
    loadTradeItems();
}

function closeTradeModal() {
    elements.tradeModal.style.display = 'none';
}

function loadTradeItems() {
    const inventory = userDB.getInventory();
    
    elements.tradeGiveItem.innerHTML = '<option value="">Выберите предмет</option>';
    elements.tradeReceiveItem.innerHTML = '<option value="">Выберите предмет</option>';
    
    Object.keys(inventory).forEach(item => {
        if (inventory[item].quantity > 0) {
            const option1 = document.createElement('option');
            option1.value = item;
            option1.textContent = `${item} (${inventory[item].quantity} шт.)`;
            elements.tradeGiveItem.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = item;
            option2.textContent = `${item} (${inventory[item].quantity} шт.)`;
            elements.tradeReceiveItem.appendChild(option2);
        }
    });
}

function confirmTrade() {
    const targetUserId = elements.tradeUserId.value.trim();
    const giveItem = elements.tradeGiveItem.value;
    const receiveItem = elements.tradeReceiveItem.value;
    
    if (!targetUserId) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Введите ID пользователя',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!giveItem || !receiveItem) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Выберите предметы для обмена',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (giveItem === receiveItem) {
        tg.showPopup({
            title: '❌ Ошибка',
            message: 'Нельзя обменять одинаковые предметы',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const result = userDB.tradeWithUser(targetUserId, giveItem, receiveItem);
    
    if (result.success) {
        closeTradeModal();
        updateProfile();
        
        tg.showPopup({
            title: '✅ Обмен завершен!',
            message: result.message,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Ошибка',
            message: result.message,
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
            itemElement.className = 'inventory-item-card';
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
                    <button class="inventory-action-btn withdraw-action-btn" onclick="openWithdrawModal('${itemName}')">Вывести</button>
                    <button class="inventory-action-btn sell-action-btn" onclick="sellItem('${itemName}')">Продать</button>
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
                    
                    if (elements.inventoryModal.style.display === 'block') {
                        openInventory();
                    }
                    
                    if (userDB.getBalance() >= 500) {
                        userDB.addAchievement('Богач');
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
    
    const inventory = userDB.getInventory();
    const itemData = inventory[currentWithdrawItem];
    
    if (itemData && itemData.quantity > 0) {
        withdrawDB.addRequest(
            userDB.userData.userId,
            username,
            currentWithdrawItem,
            itemData.image,
            itemData.sellPrice
        );
        
        userDB.removeFromInventory(currentWithdrawItem);
        
        tg.showPopup({
            title: '📤 Запрос на вывод отправлен',
            message: `Запрос на вывод "${currentWithdrawItem}" для ${username} отправлен администратору. Ожидайте подтверждения.`,
            buttons: [{ type: 'ok' }]
        }).then(() => {
            closeWithdrawModal();
            
            if (elements.inventoryModal.style.display === 'block') {
                openInventory();
            }
            
            updateProfile();
        });
    }
}

// Закрытие инвентаря
function closeInventory() {
    elements.inventoryModal.style.display = 'none';
    
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

// Открытие модального окна кейса
function openCaseModal(price, caseType) {
    const caseData = casesData[caseType];
    
    if (!caseData) return;
    
    if (price === 0 && !userDB.canOpenFreeCase()) {
        tg.showPopup({
            title: '⏰ Бесплатный кейс недоступен',
            message: 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    currentCaseModal = { price, caseType, caseData };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = `Цена: ${price} ⭐`;
    
    elements.caseItemsTrack.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        caseData.rewards.forEach((reward, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.setAttribute('data-reward-index', index);
            itemElement.innerHTML = `
                <div class="case-item-image">
                    <img src="${reward.image}" alt="${reward.item}" onerror="this.src='nft/placeholder.png'">
                </div>
                <div class="case-item-name">${reward.item}</div>
                <div class="case-item-price">${reward.sellPrice} ⭐</div>
                <div class="case-item-chance">${reward.chance}%</div>
            `;
            elements.caseItemsTrack.appendChild(itemElement);
        });
    }
    
    elements.caseModalActions.innerHTML = '';
    
    if (price === 0) {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = 'Открыть кейс';
        openButton.onclick = () => openCase(price, caseType);
        elements.caseModalActions.appendChild(openButton);
    } else {
        const openButton = document.createElement('button');
        openButton.className = 'case-action-btn open-btn';
        openButton.textContent = `Открыть за ${price} ⭐`;
        openButton.onclick = () => openCase(price, caseType);
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
    selectedRewardIndex = null;
}

// Открытие кейса
function openCase(price, caseType) {
    const caseData = casesData[caseType];
    const balance = userDB.getBalance();
    
    if (price > 0 && balance < price) {
        tg.showPopup({
            title: '❌ Недостаточно звёзд',
            message: `На вашем счету недостаточно звёзд. Нужно ещё ${price - balance} ⭐`,
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (price === 0 && !userDB.canOpenFreeCase()) {
        tg.showPopup({
            title: '⏰ Бесплатный кейс недоступен',
            message: 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (price > 0) {
        userDB.updateBalance(-price);
        updateBalanceDisplay();
        userDB.openPaidCase();
        userDB.addReferralEarnings(price);
    } else {
        userDB.openFreeCase();
        startFreeCaseTimer();
    }
    
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    const reward = getRandomReward(caseData.rewards);
    selectedRewardIndex = caseData.rewards.findIndex(r => r.item === reward.item);
    
    elements.caseItemsTrack.classList.add('spinning');
    
    setTimeout(() => {
        elements.caseItemsTrack.classList.remove('spinning');
        
        userDB.addToInventory(reward.item, reward.image, reward.sellPrice);
        userDB.addExperience(10);
        
        userDB.saveUserData();
        
        closeCaseModal();
        
        showResultModal(reward);
        
        updateTasksProgress();
        
    }, 8000);
}

// Показ красивого окна результата
function showResultModal(reward) {
    elements.resultItemImg.src = reward.image;
    elements.resultItemName.textContent = reward.item;
    elements.resultItemPrice.textContent = `Цена при продаже: ${reward.sellPrice} ⭐`;
    
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

// Консоль администратора
function openConsole() {
    elements.consoleModal.style.display = 'block';
    elements.consoleInput.value = '';
    elements.consoleOutput.innerHTML = '<div class="console-message">Введите команду для выполнения...</div>';
}

function closeConsole() {
    elements.consoleModal.style.display = 'none';
}

function executeConsoleCommand() {
    const command = elements.consoleInput.value.trim();
    
    if (!command) {
        elements.consoleOutput.innerHTML = '<div class="console-error">Введите команду</div>';
        return;
    }
    
    if (command === '/admin G7#gQ!j2$Lp9@wRn') {
        closeConsole();
        openAdminPanel();
    } else if (command.startsWith('print(') && command.endsWith(')')) {
        const text = command.slice(6, -1);
        elements.consoleOutput.innerHTML = `<div class="console-message">${text}</div>`;
    } else if (command === 'exit') {
        closeConsole();
    } else {
        elements.consoleOutput.innerHTML = '<div class="console-error">Неизвестная команда</div>';
    }
}

// Админ панель
function openAdminPanel() {
    elements.adminModal.style.display = 'block';
}

function closeAdminPanel() {
    elements.adminModal.style.display = 'none';
}

// Заявки на вывод
function openWithdrawRequests() {
    const requests = withdrawDB.getAllRequests();
    elements.withdrawRequestsList.innerHTML = '';
    
    if (requests.length === 0) {
        elements.withdrawRequestsList.innerHTML = '<div class="no-requests">Нет активных заявок на вывод</div>';
    } else {
        requests.forEach(request => {
            const requestElement = document.createElement('div');
            requestElement.className = 'withdraw-request-item';
            requestElement.innerHTML = `
                <div class="request-header">
                    <div class="request-user">${request.username}</div>
                    <div class="request-date">${new Date(request.timestamp).toLocaleString()}</div>
                </div>
                <div class="request-item">
                    <img src="${request.itemImage}" alt="${request.itemName}" onerror="this.src='nft/placeholder.png'">
                    <div class="request-item-info">
                        <div class="request-item-name">${request.itemName}</div>
                        <div class="request-item-price">${request.itemPrice} ⭐</div>
                    </div>
                </div>
                <div class="request-user-id">ID: ${request.userId}</div>
                <div class="request-status ${request.status}">Статус: ${request.status === 'pending' ? 'Ожидание' : 'Завершено'}</div>
                ${request.status === 'pending' ? 
                    `<button class="request-confirm-btn" onclick="confirmWithdrawRequest('${request.id}')">Подтвердить вывод</button>` : 
                    '<div class="request-completed">✅ Заявка обработана</div>'
                }
            `;
            elements.withdrawRequestsList.appendChild(requestElement);
        });
    }
    
    elements.withdrawRequestsModal.style.display = 'block';
}

function closeWithdrawRequests() {
    elements.withdrawRequestsModal.style.display = 'none';
}

function confirmWithdrawRequest(requestId) {
    if (withdrawDB.completeRequest(requestId)) {
        tg.showPopup({
            title: '✅ Вывод подтвержден',
            message: 'Заявка на вывод успешно обработана',
            buttons: [{ type: 'ok' }]
        });
        openWithdrawRequests();
    }
}

// Поиск пользователя
function openUserSearch() {
    elements.userSearchModal.style.display = 'block';
    elements.userIdInput.value = '';
    elements.userInfo.innerHTML = '';
}

function closeUserSearch() {
    elements.userSearchModal.style.display = 'none';
}

function searchUser() {
    const userId = elements.userIdInput.value.trim();
    
    if (!userId) {
        elements.userInfo.innerHTML = '<div class="user-info-error">Введите ID пользователя</div>';
        return;
    }
    
    const user = withdrawDB.getUserById(userId);
    if (user) {
        elements.userInfo.innerHTML = `
            <div class="user-info-card">
                <div class="user-info-item"><strong>ID:</strong> ${user.userId}</div>
                <div class="user-info-item"><strong>Telegram ID:</strong> ${user.telegramId}</div>
                <div class="user-info-item"><strong>Имя:</strong> ${user.firstName}</div>
                <div class="user-info-item"><strong>Баланс:</strong> ${user.balance} ⭐</div>
                <div class="user-info-item"><strong>Уровень:</strong> ${user.level}</div>
                <div class="user-info-item"><strong>Кейсы:</strong> ${user.casesOpened}</div>
                <div class="user-info-item"><strong>Предметы:</strong> ${Object.keys(user.inventory || {}).length}</div>
                <div class="user-info-item"><strong>Статус:</strong> ${user.isBanned ? '🔒 Заблокирован' : '✅ Активен'}</div>
                <div class="user-info-item"><strong>Дата регистрации:</strong> ${new Date(user.registrationDate).toLocaleDateString()}</div>
            </div>
        `;
    } else {
        elements.userInfo.innerHTML = '<div class="user-info-error">Пользователь не найден</div>';
    }
}

// Все пользователи
function showAllUsers() {
    const users = withdrawDB.getAllUsers();
    elements.allUsersList.innerHTML = '';
    
    if (users.length === 0) {
        elements.allUsersList.innerHTML = '<div class="no-requests">Нет зарегистрированных пользователей</div>';
    } else {
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-list-item';
            userElement.innerHTML = `
                <div class="user-list-header">
                    <div class="user-list-name">${user.firstName}</div>
                    <div class="user-list-id">ID: ${user.userId}</div>
                </div>
                <div class="user-list-stats">
                    <div class="user-list-stat">Баланс: ${user.balance} ⭐</div>
                    <div class="user-list-stat">Уровень: ${user.level}</div>
                    <div class="user-list-stat">Кейсы: ${user.casesOpened}</div>
                    <div class="user-list-stat">Предметы: ${Object.keys(user.inventory || {}).length}</div>
                    <div class="user-list-stat">Статус: ${user.isBanned ? '🔒' : '✅'}</div>
                </div>
            `;
            elements.allUsersList.appendChild(userElement);
        });
    }
    
    elements.allUsersModal.style.display = 'block';
}

function closeAllUsers() {
    elements.allUsersModal.style.display = 'none';
}

// Добавление звезд пользователю
function addStarsToUser() {
    const userId = prompt("Введите ID пользователя:");
    if (!userId) return;
    
    const amount = prompt("Введите количество звезд:");
    if (!amount || isNaN(amount)) return;
    
    const globalDB = new GlobalDatabase();
    const allUsers = globalDB.getAllUsers();
    const user = allUsers.find(u => u.userId === parseInt(userId));
    
    if (user) {
        user.balance += parseInt(amount);
        globalDB.updateUser(user.telegramId, { balance: user.balance });
        
        tg.showPopup({
            title: '✅ Звезды добавлены',
            message: `Пользователю ${userId} добавлено ${amount} ⭐`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Пользователь не найден',
            message: 'Пользователь с таким ID не найден',
            buttons: [{ type: 'ok' }]
        });
    }
}

// Забрать звезды у пользователя
function removeStarsFromUser() {
    const userId = prompt("Введите ID пользователя:");
    if (!userId) return;
    
    const amount = prompt("Введите количество звезд для списания:");
    if (!amount || isNaN(amount)) return;
    
    const globalDB = new GlobalDatabase();
    const allUsers = globalDB.getAllUsers();
    const user = allUsers.find(u => u.userId === parseInt(userId));
    
    if (user) {
        user.balance = Math.max(0, user.balance - parseInt(amount));
        globalDB.updateUser(user.telegramId, { balance: user.balance });
        
        tg.showPopup({
            title: '✅ Звезды списаны',
            message: `У пользователя ${userId} списано ${amount} ⭐`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Пользователь не найден',
            message: 'Пользователь с таким ID не найден',
            buttons: [{ type: 'ok' }]
        });
    }
}

// Блокировка пользователя
function banUser() {
    const userId = prompt("Введите ID пользователя для блокировки:");
    if (!userId) return;
    
    const globalDB = new GlobalDatabase();
    const allUsers = globalDB.getAllUsers();
    const user = allUsers.find(u => u.userId === parseInt(userId));
    
    if (user) {
        user.isBanned = true;
        globalDB.updateUser(user.telegramId, { isBanned: true });
        
        tg.showPopup({
            title: '✅ Пользователь заблокирован',
            message: `Пользователь ${userId} заблокирован`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Пользователь не найден',
            message: 'Пользователь с таким ID не найден',
            buttons: [{ type: 'ok' }]
        });
    }
}

// Разблокировка пользователя
function unbanUser() {
    const userId = prompt("Введите ID пользователя для разблокировки:");
    if (!userId) return;
    
    const globalDB = new GlobalDatabase();
    const allUsers = globalDB.getAllUsers();
    const user = allUsers.find(u => u.userId === parseInt(userId));
    
    if (user) {
        user.isBanned = false;
        globalDB.updateUser(user.telegramId, { isBanned: false });
        
        tg.showPopup({
            title: '✅ Пользователь разблокирован',
            message: `Пользователь ${userId} разблокирован`,
            buttons: [{ type: 'ok' }]
        });
    } else {
        tg.showPopup({
            title: '❌ Пользователь не найден',
            message: 'Пользователь с таким ID не найден',
            buttons: [{ type: 'ok' }]
        });
    }
}

// Сброс всех данных
function resetAllData() {
    if (confirm("Вы уверены, что хотите сбросить ВСЕ данные? Это действие нельзя отменить!")) {
        localStorage.clear();
        location.reload();
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

elements.consoleModal.addEventListener('click', function(e) {
    if (e.target === elements.consoleModal) {
        closeConsole();
    }
});

elements.adminModal.addEventListener('click', function(e) {
    if (e.target === elements.adminModal) {
        closeAdminPanel();
    }
});

elements.withdrawRequestsModal.addEventListener('click', function(e) {
    if (e.target === elements.withdrawRequestsModal) {
        closeWithdrawRequests();
    }
});

elements.userSearchModal.addEventListener('click', function(e) {
    if (e.target === elements.userSearchModal) {
        closeUserSearch();
    }
});

elements.allUsersModal.addEventListener('click', function(e) {
    if (e.target === elements.allUsersModal) {
        closeAllUsers();
    }
});

elements.starsShopModal.addEventListener('click', function(e) {
    if (e.target === elements.starsShopModal) {
        closeStarsShop();
    }
});

elements.tradeModal.addEventListener('click', function(e) {
    if (e.target === elements.tradeModal) {
        closeTradeModal();
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
        if (elements.consoleModal.style.display === 'block') {
            closeConsole();
        }
        if (elements.adminModal.style.display === 'block') {
            closeAdminPanel();
        }
        if (elements.withdrawRequestsModal.style.display === 'block') {
            closeWithdrawRequests();
        }
        if (elements.userSearchModal.style.display === 'block') {
            closeUserSearch();
        }
        if (elements.allUsersModal.style.display === 'block') {
            closeAllUsers();
        }
        if (elements.starsShopModal.style.display === 'block') {
            closeStarsShop();
        }
        if (elements.tradeModal.style.display === 'block') {
            closeTradeModal();
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
