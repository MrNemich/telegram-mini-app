// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Глобальная база данных пользователей с улучшенной структурой
class GlobalDatabase {
    constructor() {
        this.storageKey = 'global_users_database_v2';
        this.backupKey = 'global_users_database_backup';
        this.loadGlobalData();
        this.setupAutoBackup();
    }

    loadGlobalData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                this.globalData = JSON.parse(savedData);
                // Миграция данных если нужно
                this.migrateData();
            } else {
                this.initializeDefaultData();
            }
        } catch (error) {
            console.error('Error loading global data:', error);
            this.restoreFromBackup();
        }
    }

    initializeDefaultData() {
        this.globalData = {
            users: {},
            nextUserId: 8000001,
            settings: {
                referralBonus: 50,
                referralCommission: 0.1, // 10%
                maxKeyAttempts: 2,
                keyCooldownHours: 24,
                battlePassExpPerCase: 10,
                battlePassRewardPerLevel: 15
            },
            usedKeys: {},
            usedPromoCodes: {},
            adminUsers: ['G7#gQ!j2$Lp9@wRn'],
            version: '2.0'
        };
        this.saveGlobalData();
    }

    migrateData() {
        // Миграция с версии 1.0 на 2.0
        if (!this.globalData.version) {
            this.globalData.version = '2.0';
            this.globalData.settings = {
                referralBonus: 50,
                referralCommission: 0.1,
                maxKeyAttempts: 2,
                keyCooldownHours: 24,
                battlePassExpPerCase: 10,
                battlePassRewardPerLevel: 15
            };
            this.globalData.adminUsers = ['G7#gQ!j2$Lp9@wRn'];
            
            // Миграция пользователей
            Object.values(this.globalData.users).forEach(user => {
                if (!user.battlePassLevel) user.battlePassLevel = 1;
                if (!user.battlePassExp) user.battlePassExp = 0;
                if (!user.referralEarnings) user.referralEarnings = 0;
                if (!user.keyActivationAttempts) user.keyActivationAttempts = 0;
                if (!user.lastKeyAttempt) user.lastKeyAttempt = 0;
                if (!user.withdrawnItems) user.withdrawnItems = [];
            });
            
            this.saveGlobalData();
        }
    }

    setupAutoBackup() {
        // Авто-бэкап каждые 5 минут
        setInterval(() => {
            this.createBackup();
        }, 5 * 60 * 1000);
    }

    createBackup() {
        try {
            localStorage.setItem(this.backupKey, JSON.stringify(this.globalData));
        } catch (error) {
            console.error('Backup failed:', error);
        }
    }

    restoreFromBackup() {
        try {
            const backup = localStorage.getItem(this.backupKey);
            if (backup) {
                this.globalData = JSON.parse(backup);
                console.log('Data restored from backup');
            } else {
                this.initializeDefaultData();
            }
        } catch (error) {
            console.error('Restore from backup failed:', error);
            this.initializeDefaultData();
        }
    }

    saveGlobalData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.globalData));
            this.createBackup();
        } catch (error) {
            console.error('Save failed:', error);
            this.showStorageError();
        }
    }

    showStorageError() {
        if (window.showNotification) {
            window.showNotification('Ошибка сохранения данных', 'error');
        }
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

    createUser(telegramId, userData, referralCode = null) {
        const userId = this.getNextUserId();
        const newUser = {
            userId: userId,
            telegramId: telegramId,
            balance: 0, // ИЗМЕНЕНО: было 100, стало 0
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
                'first_steps': { completed: false, progress: 0, reward: 10 },
                'collector': { completed: false, progress: 0, reward: 10 },
                'fast_start': { completed: false, progress: 0, reward: 10 },
                'rare_hunter': { completed: false, progress: 0, reward: 15 },
                'legend': { completed: false, progress: 0, reward: 15 },
                'saver': { completed: false, progress: 0, reward: 15 }
            },
            usedPromoCodes: [],
            dailyCasesOpened: 0,
            lastDailyReset: Date.now(),
            uniqueItemsCollected: 0,
            ip: 'user_ip_' + telegramId,
            registrationDate: Date.now(),
            battlePassLevel: 1,
            battlePassExp: 0,
            referralCode: this.generateReferralCode(),
            referredBy: referralCode ? this.findUserByReferralCode(referralCode)?.telegramId : null,
            referrals: [],
            referralEarnings: 0,
            keyActivationAttempts: 0,
            lastKeyAttempt: 0,
            lastActive: Date.now(),
            withdrawnItems: [] // Новое поле для отслеживания выведенных предметов
        };

        this.globalData.users[telegramId] = newUser;
        this.saveGlobalData();

        // Обработка реферала если есть
        if (referralCode) {
            this.processReferralRegistration(referralCode, telegramId);
        }

        return newUser;
    }

    findUserByReferralCode(code) {
        return Object.values(this.globalData.users).find(user => 
            user.referralCode === code
        );
    }

    processReferralRegistration(referralCode, newUserTelegramId) {
        const referrer = this.findUserByReferralCode(referralCode);
        if (referrer && referrer.telegramId !== newUserTelegramId) {
            referrer.referrals.push(newUserTelegramId);
            referrer.balance += this.globalData.settings.referralBonus;
            referrer.referralEarnings += this.globalData.settings.referralBonus;
            this.saveGlobalData();
            
            // Уведомление рефереру
            this.notifyReferralBonus(referrer.telegramId, this.globalData.settings.referralBonus);
            return true;
        }
        return false;
    }

    notifyReferralBonus(telegramId, amount) {
        // В реальном приложении здесь можно отправить уведомление через бота
        console.log(`Реферальный бонус: ${amount} ⭐ для пользователя ${telegramId}`);
        if (window.showNotification) {
            window.showNotification(`🎉 Реферальный бонус! +${amount} ⭐`, 'success');
        }
    }

    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    updateUser(telegramId, userData) {
        if (this.globalData.users[telegramId]) {
            this.globalData.users[telegramId] = { 
                ...this.globalData.users[telegramId], 
                ...userData,
                lastActive: Date.now()
            };
            this.saveGlobalData();
        }
    }

    getAllUsers() {
        return Object.values(this.globalData.users);
    }

    getUserByReferralCode(code) {
        return this.findUserByReferralCode(code);
    }

    addReferralCommission(referrerTelegramId, amount) {
        const referrer = this.globalData.users[referrerTelegramId];
        if (referrer) {
            const commission = Math.floor(amount * this.globalData.settings.referralCommission);
            referrer.balance += commission;
            referrer.referralEarnings += commission;
            this.saveGlobalData();
            
            this.notifyReferralCommission(referrerTelegramId, commission);
            return commission;
        }
        return 0;
    }

    notifyReferralCommission(telegramId, commission) {
        console.log(`Реферальная комиссия: ${commission} ⭐ для пользователя ${telegramId}`);
        if (window.showNotification) {
            window.showNotification(`👥 Комиссия с реферала: +${commission} ⭐`, 'success');
        }
    }

    // Методы для работы с ключами
    isKeyUsed(key) {
        return !!this.globalData.usedKeys[key];
    }

    markKeyAsUsed(key, telegramId, stars) {
        this.globalData.usedKeys[key] = {
            telegramId: telegramId,
            usedAt: Date.now(),
            stars: stars
        };
        this.saveGlobalData();
    }

    getUserKeyAttempts(telegramId) {
        const user = this.globalData.users[telegramId];
        return user ? user.keyActivationAttempts : 0;
    }

    incrementKeyAttempts(telegramId) {
        const user = this.globalData.users[telegramId];
        if (user) {
            user.keyActivationAttempts = (user.keyActivationAttempts || 0) + 1;
            user.lastKeyAttempt = Date.now();
            this.saveGlobalData();
        }
    }

    resetKeyAttempts(telegramId) {
        const user = this.globalData.users[telegramId];
        if (user) {
            user.keyActivationAttempts = 0;
            this.saveGlobalData();
        }
    }

    canAttemptKeyActivation(telegramId) {
        const user = this.globalData.users[telegramId];
        if (!user) return true;
        
        const maxAttempts = this.globalData.settings.maxKeyAttempts;
        const cooldownHours = this.globalData.settings.keyCooldownHours;
        
        if (user.keyActivationAttempts >= maxAttempts) {
            const cooldownMs = cooldownHours * 60 * 60 * 1000;
            if (Date.now() - user.lastKeyAttempt < cooldownMs) {
                return false;
            } else {
                this.resetKeyAttempts(telegramId);
                return true;
            }
        }
        
        return true;
    }

    getKeyCooldownRemaining(telegramId) {
        const user = this.globalData.users[telegramId];
        if (!user || user.keyActivationAttempts < this.globalData.settings.maxKeyAttempts) {
            return 0;
        }
        
        const cooldownMs = this.globalData.settings.keyCooldownHours * 60 * 60 * 1000;
        const timePassed = Date.now() - user.lastKeyAttempt;
        return Math.max(0, cooldownMs - timePassed);
    }

    // Админ методы
    isAdmin(userId) {
        return this.globalData.adminUsers.includes(userId);
    }

    addAdmin(userId) {
        if (!this.globalData.adminUsers.includes(userId)) {
            this.globalData.adminUsers.push(userId);
            this.saveGlobalData();
        }
    }

    removeAdmin(userId) {
        this.globalData.adminUsers = this.globalData.adminUsers.filter(id => id !== userId);
        this.saveGlobalData();
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
        // Обработка реферального кода из start_param
        const startParam = this.tg.initDataUnsafe.start_param;
        let referralCode = null;
        
        if (startParam && startParam.startsWith('ref_')) {
            referralCode = startParam.substring(4);
        }

        let userData = this.globalDB.getUserByTelegramId(this.telegramId);
        
        if (!userData) {
            // Создаем нового пользователя с реферальным кодом если есть
            userData = this.globalDB.createUser(this.telegramId, {
                username: this.tg.initDataUnsafe.user?.username,
                first_name: this.tg.initDataUnsafe.user?.first_name
            }, referralCode);
        } else if (referralCode && !userData.referredBy) {
            // Обработка реферального кода для существующего пользователя
            this.processReferralForExistingUser(referralCode);
        }

        this.userData = userData;
        
        // Сброс дневного счетчика если прошел день
        this.resetDailyCounter();
    }

    processReferralForExistingUser(referralCode) {
        const result = this.useReferralCode(referralCode);
        if (result.success && window.showNotification) {
            window.showNotification(result.message, 'success');
        }
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
        
        // Обновление прогресса задания "Накопитель"
        this.updateSaverTaskProgress();
        
        return this.userData.balance;
    }

    updateSaverTaskProgress() {
        const saverProgress = Math.min((this.userData.balance / 300) * 100, 100);
        this.updateTaskProgress('saver', saverProgress);
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
        
        // Обновление прогресса заданий
        this.updateCollectorTaskProgress();
        
        if (sellPrice > 500) {
            this.addAchievement('Редкий охотник');
            this.updateTaskProgress('rare_hunter', 100);
        }
        
        return wasNewItem;
    }

    updateCollectorTaskProgress() {
        const collectorProgress = Math.min((this.userData.uniqueItemsCollected / 3) * 100, 100);
        this.updateTaskProgress('collector', collectorProgress);
    }

    removeFromInventory(item) {
        if (this.userData.inventory[item] && this.userData.inventory[item].quantity > 0) {
            this.userData.inventory[item].quantity -= 1;
            if (this.userData.inventory[item].quantity <= 0) {
                delete this.userData.inventory[item];
                this.userData.uniqueItemsCollected--;
                this.updateCollectorTaskProgress();
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
        this.updateFastStartTaskProgress();
        this.saveUserData();
    }

    openPaidCase() {
        this.userData.casesOpened++;
        this.userData.paidCasesOpened++;
        this.userData.dailyCasesOpened++;
        
        this.addBattlePassExp(this.globalDB.globalData.settings.battlePassExpPerCase);
        this.updateFirstStepsTaskProgress();
        this.updateFastStartTaskProgress();
        
        this.saveUserData();
    }

    updateFirstStepsTaskProgress() {
        const firstStepsProgress = Math.min(this.userData.paidCasesOpened * 100, 100);
        this.updateTaskProgress('first_steps', firstStepsProgress);
    }

    updateFastStartTaskProgress() {
        const fastStartProgress = Math.min((this.userData.dailyCasesOpened / 2) * 100, 100);
        this.updateTaskProgress('fast_start', fastStartProgress);
    }

    addExperience(amount) {
        this.userData.experience += amount;
        const expNeeded = this.userData.level * 100;
        
        if (this.userData.experience >= expNeeded) {
            this.userData.level++;
            this.userData.experience = 0;
            
            this.updateLegendTaskProgress();
            
            if (this.userData.level >= 2) {
                this.addAchievement('Легенда');
            }
            if (this.userData.level >= 5) {
                this.addAchievement('Опытный');
            }
        }
        this.saveUserData();
    }

    updateLegendTaskProgress() {
        const legendProgress = Math.min((this.userData.level / 2) * 100, 100);
        this.updateTaskProgress('legend', legendProgress);
    }

    addBattlePassExp(amount) {
        this.userData.battlePassExp += amount;
        const expNeeded = this.userData.battlePassLevel * 50;
        
        if (this.userData.battlePassExp >= expNeeded) {
            this.userData.battlePassLevel++;
            this.userData.battlePassExp = 0;
            
            const reward = this.globalDB.globalData.settings.battlePassRewardPerLevel;
            this.userData.balance += reward;
            
            this.saveUserData();
            
            if (window.showNotification) {
                window.showNotification(`🎮 Батл пасс уровень ${this.userData.battlePassLevel}! +${reward} ⭐`, 'success');
            }
            
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
            this.globalDB.processReferralRegistration(code, this.telegramId);
            
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
        const botUsername = 'GiftLabRobot';
        return `https://t.me/${botUsername}?start=ref_${this.userData.referralCode}`;
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
            
            // Автоматическое обновление UI если на странице заданий
            if (window.updateTasksProgress) {
                window.updateTasksProgress();
            }
        }
    }

    completeTask(taskId) {
        const task = this.userData.tasks[taskId];
        if (task && task.progress >= 100 && !task.completed) {
            task.completed = true;
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
        
        Object.keys(this.userData.tasks).forEach(taskId => {
            this.userData.tasks[taskId] = { 
                completed: false, 
                progress: 0,
                reward: this.userData.tasks[taskId]?.reward || 10
            };
        });
        
        this.saveUserData();
    }

    // Методы для работы с ключами
    canAttemptKeyActivation() {
        return this.globalDB.canAttemptKeyActivation(this.telegramId);
    }

    getKeyCooldownRemaining() {
        return this.globalDB.getKeyCooldownRemaining(this.telegramId);
    }

    incrementKeyAttempts() {
        this.globalDB.incrementKeyAttempts(this.telegramId);
    }

    activateKey(key) {
        // Проверяем возможность активации
        if (!this.canAttemptKeyActivation()) {
            const timeRemaining = this.getKeyCooldownRemaining();
            return {
                success: false,
                message: `Превышено количество попыток. Попробуйте через ${formatTime(timeRemaining)}`
            };
        }

        // Валидация формата ключа
        const cleanKey = key.replace(/\s/g, '').toUpperCase();
        const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
        
        if (!keyPattern.test(cleanKey)) {
            this.incrementKeyAttempts();
            return {
                success: false,
                message: 'Неверный формат ключа. Используйте: ххххх-ххххх-ххххх-ххххх'
            };
        }

        // Проверяем использован ли ключ
        if (this.globalDB.isKeyUsed(cleanKey)) {
            this.incrementKeyAttempts();
            return {
                success: false,
                message: 'Этот ключ уже был использован'
            };
        }

        // Проверяем валидность ключа и начисляем звезды
        const keyData = validateKey(cleanKey);
        if (keyData.valid) {
            // Помечаем ключ как использованный
            this.globalDB.markKeyAsUsed(cleanKey, this.telegramId, keyData.stars);
            
            // Начисляем звезды
            this.updateBalance(keyData.stars);
            
            // Начисляем реферальную комиссию
            this.addReferralEarnings(keyData.stars);
            
            // Сбрасываем счетчик попыток при успешной активации
            this.globalDB.resetKeyAttempts(this.telegramId);
            
            return {
                success: true,
                message: `Ключ активирован! Вы получили ${keyData.stars} ⭐`,
                stars: keyData.stars
            };
        } else {
            this.incrementKeyAttempts();
            return {
                success: false,
                message: 'Неверный ключ'
            };
        }
    }
}

// Глобальная база данных для заявок на вывод
class WithdrawDatabase {
    constructor() {
        this.storageKey = 'withdraw_requests_v2';
        this.backupKey = 'withdraw_requests_backup';
        this.loadData();
        this.setupAutoBackup();
    }

    setupAutoBackup() {
        setInterval(() => {
            this.createBackup();
        }, 5 * 60 * 1000);
    }

    createBackup() {
        try {
            localStorage.setItem(this.backupKey, JSON.stringify(this.requests));
        } catch (error) {
            console.error('Withdraw backup failed:', error);
        }
    }

    restoreFromBackup() {
        try {
            const backup = localStorage.getItem(this.backupKey);
            if (backup) {
                this.requests = JSON.parse(backup);
            }
        } catch (error) {
            console.error('Withdraw restore failed:', error);
        }
    }

    loadData() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            this.requests = savedData ? JSON.parse(savedData) : [];
        } catch (error) {
            console.error('Error loading withdraw data:', error);
            this.restoreFromBackup();
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
            this.createBackup();
        } catch (error) {
            console.error('Save withdraw data failed:', error);
        }
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
            status: 'pending',
            processed: false,
            userTelegramId: this.getUserById(userId)?.telegramId
        };
        this.requests.unshift(request);
        this.saveData();
        
        // Уведомление администратору
        this.notifyAdmin(request);
        return request;
    }

    notifyAdmin(request) {
        console.log(`Новая заявка на вывод от ${request.username}: ${request.itemName}`);
        // В реальном приложении здесь можно отправить уведомление администратору
    }

    getRequests() {
        return this.requests.filter(request => request.status === 'pending');
    }

    getAllRequests() {
        return this.requests;
    }

    completeRequest(requestId) {
        const request = this.requests.find(r => r.id === requestId);
        if (request && !request.processed) {
            request.status = 'completed';
            request.processed = true;
            request.processedAt = Date.now();
            this.saveData();
            
            // Отмечаем предмет как выведенный у пользователя
            const globalDB = new GlobalDatabase();
            const user = this.getUserById(request.userId);
            if (user) {
                if (!user.withdrawnItems) user.withdrawnItems = [];
                user.withdrawnItems.push({
                    itemName: request.itemName,
                    timestamp: Date.now(),
                    requestId: requestId
                });
                globalDB.updateUser(user.telegramId, { withdrawnItems: user.withdrawnItems });
            }
            
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

    validateUsername(username) {
        if (!username.startsWith('@')) {
            return { valid: false, message: 'Username должен начинаться с @' };
        }
        if (username.length < 5) {
            return { valid: false, message: 'Username слишком короткий' };
        }
        if (username.length > 32) {
            return { valid: false, message: 'Username слишком длинный' };
        }
        // Дополнительные проверки можно добавить здесь
        return { valid: true, message: '' };
    }
}

// Данные кейсов с реальными призами
const casesData = {
    free: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
            // Фейковые проценты - всегда выпадает 1 звезда
            { item: "1 ⭐", image: "nft/star.png", sellPrice: 1, chance: 99.99 },
            { item: "5 ⭐", image: "nft/star.png", sellPrice: 5, chance: 0.01 },
            { item: "10 ⭐", image: "nft/star.png", sellPrice: 10, chance: 0.005 },
            { item: "50 ⭐", image: "nft/star.png", sellPrice: 50, chance: 0.003 },
            { item: "100 ⭐", image: "nft/star.png", sellPrice: 100, chance: 0.002 }
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
        price: 1500,
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

// Обновленные цитаты для экрана загрузки
const loadingQuotes = [
    "«Любовь к своему делу должна быть сильнее страха перед неудачами.» - Алекс Закерман",
    "«Свобода важнее денег» - Павел Дуров",
    "«Никогда не сдавайтесь раньше времени» - Павел Дуров",
    "«Будьте готовы отказаться от всего, кроме своей мечты» - Павел Дуров",
    "«Да да - нет нет» - Андрей Бурин",
    "«цзаххйл ввдущ» - цжыжсх",
    "«Я помылся» - Меллстрой"
];

// Функция для валидации ключей
function validateKey(key) {
    const cleanKey = key.replace(/\s/g, '').toUpperCase();
    const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    if (!keyPattern.test(cleanKey)) {
        return { valid: false, stars: 0 };
    }
    
    // Объединяем все ключи в один большой массив для проверки
    const allKeys = {
        100: [
            "K9JMQ-BV7C4-P2XH8-F3RTL", "D8FGN-4LK9W-Y7HXQ-Z3PMT", "R2T9N-6Y8LP-QX4BH-K7JFV",
            "W4PZ7-M9K3L-X8QHN-B2FRT", "L3H8J-N9F4P-Q7XKM-V2RTC", "B4N7M-K8P3Q-X2JHF-V9TRL",
            "P9JX3-L8K4M-Q2NHB-V7FRT", "V3F7H-N9K2J-X8PQM-B4TRL", "T8R4N-6Y9LP-QX2BH-K7FMV",
            "Z3P7M-K9J4L-X8QHN-B2FRT", "M4K8J-N9F3P-Q7XHM-V2RTC", "H9JX3-L8K4M-Q2NHB-V7FPT",
            "C4N7M-K8P3Q-X2JHF-V9TRB", "F8GXN-4LK9W-Y7HJQ-Z3PMT", "Q2T9N-6Y8LP-JX4BH-K7RFV",
            "N4PZ7-M9K3L-W8QHX-B2FRT", "J3H8K-N9F4P-Q7XLM-V2RTC", "S4N7M-K8P3Q-X2JHF-V9TBL",
            "A9JX3-L8K4M-Q2NHB-V7FRP", "E3F7H-N9K2J-X8PQM-B4TRZ", "U8R4N-6Y9LP-QX2BH-K7FMV",
            "Y3P7M-K9J4L-X8QHN-B2FRW", "X4K8J-N9F3P-Q7XHM-V2RTC", "B9JX3-L8K4M-Q2NHB-V7FPT",
            "D4N7M-K8P3Q-X2JHF-V9TRC", "G2T9N-6Y8LP-QX4BH-K7JFV", "H4PZ7-M9K3L-X8QHN-B2FRT",
            "L3H8J-N9F4P-Q7XKM-V2RTC", "M4N7M-K8P3Q-X2JHF-V9TRL", "N9JX3-L8K4M-Q2NHB-V7FRT",
            "P3F7H-N9K2J-X8PQM-B4TRL", "Q8R4N-6Y9LP-QX2BH-K7FMV", "R3P7M-K9J4L-X8QHN-B2FRT",
            "S4K8J-N9F3P-Q7XHM-V2RTC", "T9JX3-L8K4M-Q2NHB-V7FPT", "V4N7M-K8P3Q-X2JHF-V9TRB",
            "W2T9N-6Y8LP-QX4BH-K7JFV", "X4PZ7-M9K3L-X8QHN-B2FRT", "Z3H8J-N9F4P-Q7XKM-V2RTC"
        ],
        200: [
            "7ZQ2M-K9PL4-X8N3H-BVFRT", "J4HX9-P8L3Q-K2MFN-V7CRT", "T8N2B-4M7XK-P9LQH-V3FRJ",
            "W3P9L-Q8X4M-K2JHN-B7FRV", "R2K9N-4L8XP-Q7MHJ-V3FBT", "F9J3P-L8K4M-Q2NHB-V7XRT",
            "C4M7N-K8P3Q-X2JHF-V9BRL", "G3F7H-N9K2J-X8PQM-B4TZV", "V8R4N-6Y9LP-QX2BH-K7FMW",
            "B3P7M-K9J4L-X8QHN-B2FRX", "N4K8J-N9F3P-Q7XHM-V2RTC", "M9JX3-L8K4M-Q2NHB-V7FPT",
            "D4N7M-K8P3Q-X2JHF-V9TRC", "H2T9N-6Y8LP-QX4BH-K7JFV", "L4PZ7-M9K3L-X8QHN-B2FRT",
            "P3H8J-N9F4P-Q7XKM-V2RTC", "Q4N7M-K8P3Q-X2JHF-V9TRL", "S9JX3-L8K4M-Q2NHB-V7FRT",
            "X3F7H-N9K2J-X8PQM-B4TRL", "Z8R4N-6Y9LP-QX2BH-K7FMV", "A3P7M-K9J4L-X8QHN-B2FRT",
            "C4K8J-N9F3P-Q7XHM-V2RTC", "E9JX3-L8K4M-Q2NHB-V7FPT", "G4N7M-K8P3Q-X2JHF-V9TRB",
            "J2T9N-6Y8LP-QX4BH-K7JFV", "K4PZ7-M9K3L-X8QHN-B2FRT", "M3H8J-N9F4P-Q7XKM-V2RTC",
            "N4N7M-K8P3Q-X2JHF-V9TRL", "P9JX3-L8K4M-Q2NHB-V7FRT", "Q3F7H-N9K2J-X8PQM-B4TRL",
            "R8R4N-6Y9LP-QX2BH-K7FMV", "S3P7M-K9J4L-X8QHN-B2FRT", "T4K8J-N9F3P-Q7XHM-V2RTC",
            "V9JX3-L8K4M-Q2NHB-V7FPT", "W4N7M-K8P3Q-X2JHF-V9TRB", "X2T9N-6Y8LP-QX4BH-K7JFV",
            "Y4PZ7-M9K3L-X8QHN-B2FRT", "Z3H8J-N9F4P-Q7XKM-V2RTC", "B4N7M-K8P3Q-X2JHF-V9TRL",
            "C9JX3-L8K4M-Q2NHB-V7FRT", "D3F7H-N9K2J-X8PQM-B4TRL", "F8R4N-6Y9LP-QX2BH-K7FMV",
            "G3P7M-K9J4L-X8QHN-B2FRT", "H4K8J-N9F3P-Q7XHM-V2RTC", "J9JX3-L8K4M-Q2NHB-V7FPT",
            "K4N7M-K8P3Q-X2JHF-V9TRB", "L2T9N-6Y8LP-QX4BH-K7JFV", "M4PZ7-M9K3L-X8QHN-B2FRT",
            "N3H8J-N9F4P-Q7XKM-V2RTC", "P4N7M-K8P3Q-X2JHF-V9TRL"
        ],
        400: [
            "8XQ2M-K9PL4-Z8N3H-BVFRT", "J5HX9-P8L3Q-K2MFN-V7CRT", "T9N2B-4M7XK-P9LQH-V3FRJ",
            "W4P9L-Q8X4M-K2JHN-B7FRV", "R3K9N-4L8XP-Q7MHJ-V3FBT", "F0J3P-L8K4M-Q2NHB-V7XRT",
            "C5M7N-K8P3Q-X2JHF-V9BRL", "G4F7H-N9K2J-X8PQM-B4TZV", "V9R4N-6Y9LP-QX2BH-K7FMW",
            "B4P7M-K9J4L-X8QHN-B2FRX", "N5K8J-N9F3P-Q7XHM-V2RTC", "M0JX3-L8K4M-Q2NHB-V7FPT",
            "D5N7M-K8P3Q-X2JHF-V9TRC", "H3T9N-6Y8LP-QX4BH-K7JFV", "L5PZ7-M9K3L-X8QHN-B2FRT",
            "P4H8J-N9F4P-Q7XKM-V2RTC", "Q5N7M-K8P3Q-X2JHF-V9TRL", "S0JX3-L8K4M-Q2NHB-V7FRT",
            "X4F7H-N9K2J-X8PQM-B4TRL", "Z9R4N-6Y9LP-QX2BH-K7FMV", "A4P7M-K9J4L-X8QHN-B2FRT",
            "C5K8J-N9F3P-Q7XHM-V2RTC", "E0JX3-L8K4M-Q2NHB-V7FPT", "G5N7M-K8P3Q-X2JHF-V9TRB",
            "J3T9N-6Y8LP-QX4BH-K7JFV", "K5PZ7-M9K3L-X8QHN-B2FRT", "M4H8J-N9F4P-Q7XKM-V2RTC",
            "N5N7M-K8P3Q-X2JHF-V9TRL", "P0JX3-L8K4M-Q2NHB-V7FRT", "Q4F7H-N9K2J-X8PQM-B4TRL",
            "R9R4N-6Y9LP-QX2BH-K7FMV", "S4P7M-K9J4L-X8QHN-B2FRT", "T5K8J-N9F3P-Q7XHM-V2RTC",
            "V0JX3-L8K4M-Q2NHB-V7FPT", "W5N7M-K8P3Q-X2JHF-V9TRB", "X3T9N-6Y8LP-QX4BH-K7JFV",
            "Y5PZ7-M9K3L-X8QHN-B2FRT", "Z4H8J-N9F4P-Q7XKM-V2RTC", "B5N7M-K8P3Q-X2JHF-V9TRL",
            "C0JX3-L8K4M-Q2NHB-V7FRT", "D4F7H-N9K2J-X8PQM-B4TRL", "F9R4N-6Y9LP-QX2BH-K7FMV",
            "G4P7M-K9J4L-X8QHN-B2FRT", "H5K8J-N9F3P-Q7XHM-V2RTC", "J0JX3-L8K4M-Q2NHB-V7FPT",
            "K5N7M-K8P3Q-X2JHF-V9TRB", "L3T9N-6Y8LP-QX4BH-K7JFV", "M5PZ7-M9K3L-X8QHN-B2FRT",
            "N4H8J-N9F4P-Q7XKM-V2RTC", "P5N7M-K8P3Q-X2JHF-V9TRL"
        ],
        600: [
            "9YQ2M-K9PL4-Z8N3H-BVFRT", "J6HX9-P8L3Q-K2MFN-V7CRT", "T0N2B-4M7XK-P9LQH-V3FRJ",
            "W5P9L-Q8X4M-K2JHN-B7FRV", "R4K9N-4L8XP-Q7MHJ-V3FBT", "F1J3P-L8K4M-Q2NHB-V7XRT",
            "C6M7N-K8P3Q-X2JHF-V9BRL", "G5F7H-N9K2J-X8PQM-B4TZV", "V0R4N-6Y9LP-QX2BH-K7FMW",
            "B5P7M-K9J4L-X8QHN-B2FRX", "N6K8J-N9F3P-Q7XHM-V2RTC", "M1JX3-L8K4M-Q2NHB-V7FPT",
            "D6N7M-K8P3Q-X2JHF-V9TRC", "H4T9N-6Y8LP-QX4BH-K7JFV", "L6PZ7-M9K3L-X8QHN-B2FRT",
            "P5H8J-N9F4P-Q7XKM-V2RTC", "Q6N7M-K8P3Q-X2JHF-V9TRL", "S1JX3-L8K4M-Q2NHB-V7FRT",
            "X5F7H-N9K2J-X8PQM-B4TRL", "Z0R4N-6Y9LP-QX2BH-K7FMV", "A5P7M-K9J4L-X8QHN-B2FRT",
            "C6K8J-N9F3P-Q7XHM-V2RTC", "E1JX3-L8K4M-Q2NHB-V7FPT", "G6N7M-K8P3Q-X2JHF-V9TRB",
            "J4T9N-6Y8LP-QX4BH-K7JFV", "K6PZ7-M9K3L-X8QHN-B2FRT", "M5H8J-N9F4P-Q7XKM-V2RTC",
            "N6N7M-K8P3Q-X2JHF-V9TRL", "P1JX3-L8K4M-Q2NHB-V7FRT", "Q5F7H-N9K2J-X8PQM-B4TRL",
            "R0R4N-6Y9LP-QX2BH-K7FMV", "S5P7M-K9J4L-X8QHN-B2FRT", "T6K8J-N9F3P-Q7XHM-V2RTC",
            "V1JX3-L8K4M-Q2NHB-V7FPT", "W6N7M-K8P3Q-X2JHF-V9TRB", "X4T9N-6Y8LP-QX4BH-K7JFV",
            "Y6PZ7-M9K3L-X8QHN-B2FRT", "Z5H8J-N9F4P-Q7XKM-V2RTC", "B6N7M-K8P3Q-X2JHF-V9TRL",
            "C1JX3-L8K4M-Q2NHB-V7FRT", "D5F7H-N9K2J-X8PQM-B4TRL", "F0R4N-6Y9LP-QX2BH-K7FMV",
            "G5P7M-K9J4L-X8QHN-B2FRT", "H6K8J-N9F3P-Q7XHM-V2RTC", "J1JX3-L8K4M-Q2NHB-V7FPT",
            "K6N7M-K8P3Q-X2JHF-V9TRB", "L4T9N-6Y8LP-QX4BH-K7JFV", "M6PZ7-M9K3L-X8QHN-B2FRT",
            "N5H8J-N9F4P-Q7XKM-V2RTC", "P6N7M-K8P3Q-X2JHF-V9TRL"
        ],
        800: [
            "0ZQ2M-K9PL4-Z8N3H-BVFRT", "J7HX9-P8L3Q-K2MFN-V7CRT", "T1N2B-4M7XK-P9LQH-V3FRJ",
            "W6P9L-Q8X4M-K2JHN-B7FRV", "R5K9N-4L8XP-Q7MHJ-V3FBT", "F2J3P-L8K4M-Q2NHB-V7XRT",
            "C7M7N-K8P3Q-X2JHF-V9BRL", "G6F7H-N9K2J-X8PQM-B4TZV", "V1R4N-6Y9LP-QX2BH-K7FMW",
            "B6P7M-K9J4L-X8QHN-B2FRX", "N7K8J-N9F3P-Q7XHM-V2RTC", "M2JX3-L8K4M-Q2NHB-V7FPT",
            "D7N7M-K8P3Q-X2JHF-V9TRC", "H5T9N-6Y8LP-QX4BH-K7JFV", "L7PZ7-M9K3L-X8QHN-B2FRT",
            "P6H8J-N9F4P-Q7XKM-V2RTC", "Q7N7M-K8P3Q-X2JHF-V9TRL", "S2JX3-L8K4M-Q2NHB-V7FRT",
            "X6F7H-N9K2J-X8PQM-B4TRL", "Z1R4N-6Y9LP-QX2BH-K7FMV", "A6P7M-K9J4L-X8QHN-B2FRT",
            "C7K8J-N9F3P-Q7XHM-V2RTC", "E2JX3-L8K4M-Q2NHB-V7FPT", "G7N7M-K8P3Q-X2JHF-V9TRB",
            "J5T9N-6Y8LP-QX4BH-K7JFV", "K7PZ7-M9K3L-X8QHN-B2FRT", "M6H8J-N9F4P-Q7XKM-V2RTC",
            "N7N7M-K8P3Q-X2JHF-V9TRL", "P2JX3-L8K4M-Q2NHB-V7FRT", "Q6F7H-N9K2J-X8PQM-B4TRL",
            "R1R4N-6Y9LP-QX2BH-K7FMV", "S6P7M-K9J4L-X8QHN-B2FRT", "T7K8J-N9F3P-Q7XHM-V2RTC",
            "V2JX3-L8K4M-Q2NHB-V7FPT", "W7N7M-K8P3Q-X2JHF-V9TRB", "X5T9N-6Y8LP-QX4BH-K7JFV",
            "Y7PZ7-M9K3L-X8QHN-B2FRT", "Z6H8J-N9F4P-Q7XKM-V2RTC", "B7N7M-K8P3Q-X2JHF-V9TRL",
            "C2JX3-L8K4M-Q2NHB-V7FRT", "D6F7H-N9K2J-X8PQM-B4TRL", "F1R4N-6Y9LP-QX2BH-K7FMV",
            "G6P7M-K9J4L-X8QHN-B2FRT", "H7K8J-N9F3P-Q7XHM-V2RTC", "J2JX3-L8K4M-Q2NHB-V7FPT",
            "K7N7M-K8P3Q-X2JHF-V9TRB", "L5T9N-6Y8LP-QX4BH-K7JFV", "M7PZ7-M9K3L-X8QHN-B2FRT",
            "N6H8J-N9F4P-Q7XKM-V2RTC", "P7N7M-K8P3Q-X2JHF-V9TRL"
        ],
        1000: [
            "1AQ2M-K9PL4-Z8N3H-BVFRT", "J8HX9-P8L3Q-K2MFN-V7CRT", "T2N2B-4M7XK-P9LQH-V3FRJ",
            "W7P9L-Q8X4M-K2JHN-B7FRV", "R6K9N-4L8XP-Q7MHJ-V3FBT", "F3J3P-L8K4M-Q2NHB-V7XRT",
            "C8M7N-K8P3Q-X2JHF-V9BRL", "G7F7H-N9K2J-X8PQM-B4TZV", "V2R4N-6Y9LP-QX2BH-K7FMW",
            "B7P7M-K9J4L-X8QHN-B2FRX", "N8K8J-N9F3P-Q7XHM-V2RTC", "M3JX3-L8K4M-Q2NHB-V7FPT",
            "D8N7M-K8P3Q-X2JHF-V9TRC", "H6T9N-6Y8LP-QX4BH-K7JFV", "L8PZ7-M9K3L-X8QHN-B2FRT",
            "P7H8J-N9F4P-Q7XKM-V2RTC", "Q8N7M-K8P3Q-X2JHF-V9TRL", "S3JX3-L8K4M-Q2NHB-V7FRT",
            "X7F7H-N9K2J-X8PQM-B4TRL", "Z2R4N-6Y9LP-QX2BH-K7FMV", "A7P7M-K9J4L-X8QHN-B2FRT",
            "C8K8J-N9F3P-Q7XHM-V2RTC", "E3JX3-L8K4M-Q2NHB-V7FPT", "G8N7M-K8P3Q-X2JHF-V9TRB",
            "J6T9N-6Y8LP-QX4BH-K7JFV", "K8PZ7-M9K3L-X8QHN-B2FRT", "M7H8J-N9F4P-Q7XKM-V2RTC",
            "N8N7M-K8P3Q-X2JHF-V9TRL", "P3JX3-L8K4M-Q2NHB-V7FRT", "Q7F7H-N9K2J-X8PQM-B4TRL",
            "R2R4N-6Y9LP-QX2BH-K7FMV", "S7P7M-K9J4L-X8QHN-B2FRT", "T8K8J-N9F3P-Q7XHM-V2RTC",
            "V3JX3-L8K4M-Q2NHB-V7FPT", "W8N7M-K8P3Q-X2JHF-V9TRB", "X6T9N-6Y8LP-QX4BH-K7JFV",
            "Y8PZ7-M9K3L-X8QHN-B2FRT", "Z7H8J-N9F4P-Q7XKM-V2RTC", "B8N7M-K8P3Q-X2JHF-V9TRL",
            "C3JX3-L8K4M-Q2NHB-V7FRT", "D7F7H-N9K2J-X8PQM-B4TRL", "F2R4N-6Y9LP-QX2BH-K7FMV",
            "G7P7M-K9J4L-X8QHN-B2FRT", "H8K8J-N9F3P-Q7XHM-V2RTC", "J3JX3-L8K4M-Q2NHB-V7FPT",
            "K8N7M-K8P3Q-X2JHF-V9TRB", "L6T9N-6Y8LP-QX4BH-K7JFV", "M8PZ7-M9K3L-X8QHN-B2FRT",
            "N7H8J-N9F4P-Q7XKM-V2RTC", "P8N7M-K8P3Q-X2JHF-V9TRL"
        ],
        2000: [
            "2BQ2M-K9PL4-Z8N3H-BVFRT", "J9HX9-P8L3Q-K2MFN-V7CRT", "T3N2B-4M7XK-P9LQH-V3FRJ",
            "W8P9L-Q8X4M-K2JHN-B7FRV", "R7K9N-4L8XP-Q7MHJ-V3FBT", "F4J3P-L8K4M-Q2NHB-V7XRT",
            "C9M7N-K8P3Q-X2JHF-V9BRL", "G8F7H-N9K2J-X8PQM-B4TZV", "V3R4N-6Y9LP-QX2BH-K7FMW",
            "B8P7M-K9J4L-X8QHN-B2FRX", "N9K8J-N9F3P-Q7XHM-V2RTC", "M4JX3-L8K4M-Q2NHB-V7FPT",
            "D9N7M-K8P3Q-X2JHF-V9TRC", "H7T9N-6Y8LP-QX4BH-K7JFV", "L9PZ7-M9K3L-X8QHN-B2FRT",
            "P8H8J-N9F4P-Q7XKM-V2RTC", "Q9N7M-K8P3Q-X2JHF-V9TRL", "S4JX3-L8K4M-Q2NHB-V7FRT",
            "X8F7H-N9K2J-X8PQM-B4TRL", "Z3R4N-6Y9LP-QX2BH-K7FMV", "A8P7M-K9J4L-X8QHN-B2FRT",
            "C9K8J-N9F3P-Q7XHM-V2RTC", "E4JX3-L8K4M-Q2NHB-V7FPT", "G9N7M-K8P3Q-X2JHF-V9TRB",
            "J7T9N-6Y8LP-QX4BH-K7JFV", "K9PZ7-M9K3L-X8QHN-B2FRT", "M8H8J-N9F4P-Q7XKM-V2RTC",
            "N9N7M-K8P3Q-X2JHF-V9TRL", "P4JX3-L8K4M-Q2NHB-V7FRT", "Q8F7H-N9K2J-X8PQM-B4TRL",
            "R3R4N-6Y9LP-QX2BH-K7FMV", "S8P7M-K9J4L-X8QHN-B2FRT", "T9K8J-N9F3P-Q7XHM-V2RTC",
            "V4JX3-L8K4M-Q2NHB-V7FPT", "W9N7M-K8P3Q-X2JHF-V9TRB", "X7T9N-6Y8LP-QX4BH-K7JFV",
            "Y9PZ7-M9K3L-X8QHN-B2FRT", "Z8H8J-N9F4P-Q7XKM-V2RTC", "B9N7M-K8P3Q-X2JHF-V9TRL",
            "C4JX3-L8K4M-Q2NHB-V7FRT", "D8F7H-N9K2J-X8PQM-B4TRL", "F3R4N-6Y9LP-QX2BH-K7FMV",
            "G8P7M-K9J4L-X8QHN-B2FRT", "H9K8J-N9F3P-Q7XHM-V2RTC", "J4JX3-L8K4M-Q2NHB-V7FPT",
            "K9N7M-K8P3Q-X2JHF-V9TRB", "L7T9N-6Y8LP-QX4BH-K7JFV", "M9PZ7-M9K3L-X8QHN-B2FRT",
            "N8H8J-N9F4P-Q7XKM-V2RTC", "P9N7M-K8P3Q-X2JHF-V9TRL"
        ],
        3000: [
            "3CQ2M-K9PL4-Z8N3H-BVFRT", "J0HX9-P8L3Q-K2MFN-V7CRT", "T4N2B-4M7XK-P9LQH-V3FRJ",
            "W9P9L-Q8X4M-K2JHN-B7FRV", "R8K9N-4L8XP-Q7MHJ-V3FBT", "F5J3P-L8K4M-Q2NHB-V7XRT",
            "C0M7N-K8P3Q-X2JHF-V9BRL", "G9F7H-N9K2J-X8PQM-B4TZV", "V4R4N-6Y9LP-QX2BH-K7FMW",
            "B9P7M-K9J4L-X8QHN-B2FRX", "N0K8J-N9F3P-Q7XHM-V2RTC", "M5JX3-L8K4M-Q2NHB-V7FPT",
            "D0N7M-K8P3Q-X2JHF-V9TRC", "H8T9N-6Y8LP-QX4BH-K7JFV", "L0PZ7-M9K3L-X8QHN-B2FRT",
            "P9H8J-N9F4P-Q7XKM-V2RTC", "Q0N7M-K8P3Q-X2JHF-V9TRL", "S5JX3-L8K4M-Q2NHB-V7FRT",
            "X9F7H-N9K2J-X8PQM-B4TRL", "Z4R4N-6Y9LP-QX2BH-K7FMV", "A9P7M-K9J4L-X8QHN-B2FRT",
            "C0K8J-N9F3P-Q7XHM-V2RTC", "E5JX3-L8K4M-Q2NHB-V7FPT", "G0N7M-K8P3Q-X2JHF-V9TRB",
            "J8T9N-6Y8LP-QX4BH-K7JFV", "K0PZ7-M9K3L-X8QHN-B2FRT", "M9H8J-N9F4P-Q7XKM-V2RTC",
            "N0N7M-K8P3Q-X2JHF-V9TRL", "P5JX3-L8K4M-Q2NHB-V7FRT", "Q9F7H-N9K2J-X8PQM-B4TRL",
            "R4R4N-6Y9LP-QX2BH-K7FMV", "S9P7M-K9J4L-X8QHN-B2FRT", "T0K8J-N9F3P-Q7XHM-V2RTC",
            "V5JX3-L8K4M-Q2NHB-V7FPT", "W0N7M-K8P3Q-X2JHF-V9TRB", "X8T9N-6Y8LP-QX4BH-K7JFV",
            "Y0PZ7-M9K3L-X8QHN-B2FRT", "Z9H8J-N9F4P-Q7XKM-V2RTC", "B0N7M-K8P3Q-X2JHF-V9TRL",
            "C5JX3-L8K4M-Q2NHB-V7FRT", "D9F7H-N9K2J-X8PQM-B4TRL", "F4R4N-6Y9LP-QX2BH-K7FMV",
            "G9P7M-K9J4L-X8QHN-B2FRT", "H0K8J-N9F3P-Q7XHM-V2RTC", "J5JX3-L8K4M-Q2NHB-V7FPT",
            "K0N7M-K8P3Q-X2JHF-V9TRB", "L8T9N-6Y8LP-QX4BH-K7JFV", "M0PZ7-M9K3L-X8QHN-B2FRT",
            "N9H8J-N9F4P-Q7XKM-V2RTC", "P0N7M-K8P3Q-X2JHF-V9TRL"
        ],
        4000: [
            "4DQ2M-K9PL4-Z8N3H-BVFRT", "J1HX9-P8L3Q-K2MFN-V7CRT", "T5N2B-4M7XK-P9LQH-V3FRJ",
            "W0P9L-Q8X4M-K2JHN-B7FRV", "R9K9N-4L8XP-Q7MHJ-V3FBT", "F6J3P-L8K4M-Q2NHB-V7XRT",
            "C1M7N-K8P3Q-X2JHF-V9BRL", "G0F7H-N9K2J-X8PQM-B4TZV", "V5R4N-6Y9LP-QX2BH-K7FMW",
            "B0P7M-K9J4L-X8QHN-B2FRX", "N1K8J-N9F3P-Q7XHM-V2RTC", "M6JX3-L8K4M-Q2NHB-V7FPT",
            "D1N7M-K8P3Q-X2JHF-V9TRC", "H9T9N-6Y8LP-QX4BH-K7JFV", "L1PZ7-M9K3L-X8QHN-B2FRT",
            "P0H8J-N9F4P-Q7XKM-V2RTC", "Q1N7M-K8P3Q-X2JHF-V9TRL", "S6JX3-L8K4M-Q2NHB-V7FRT",
            "X0F7H-N9K2J-X8PQM-B4TRL", "Z5R4N-6Y9LP-QX2BH-K7FMV", "A0P7M-K9J4L-X8QHN-B2FRT",
            "C1K8J-N9F3P-Q7XHM-V2RTC", "E6JX3-L8K4M-Q2NHB-V7FPT", "G1N7M-K8P3Q-X2JHF-V9TRB",
            "J9T9N-6Y8LP-QX4BH-K7JFV", "K1PZ7-M9K3L-X8QHN-B2FRT", "M0H8J-N9F4P-Q7XKM-V2RTC",
            "N1N7M-K8P3Q-X2JHF-V9TRL", "P6JX3-L8K4M-Q2NHB-V7FRT", "Q0F7H-N9K2J-X8PQM-B4TRL",
            "R5R4N-6Y9LP-QX2BH-K7FMV", "S0P7M-K9J4L-X8QHN-B2FRT", "T1K8J-N9F3P-Q7XHM-V2RTC",
            "V6JX3-L8K4M-Q2NHB-V7FPT", "W1N7M-K8P3Q-X2JHF-V9TRB", "X9T9N-6Y8LP-QX4BH-K7JFV",
            "Y1PZ7-M9K3L-X8QHN-B2FRT", "Z0H8J-N9F4P-Q7XKM-V2RTC", "B1N7M-K8P3Q-X2JHF-V9TRL",
            "C6JX3-L8K4M-Q2NHB-V7FRT", "D0F7H-N9K2J-X8PQM-B4TRL", "F5R4N-6Y9LP-QX2BH-K7FMV",
            "G0P7M-K9J4L-X8QHN-B2FRT", "H1K8J-N9F3P-Q7XHM-V2RTC", "J6JX3-L8K4M-Q2NHB-V7FPT",
            "K1N7M-K8P3Q-X2JHF-V9TRB", "L9T9N-6Y8LP-QX4BH-K7JFV", "M1PZ7-M9K3L-X8QHN-B2FRT",
            "N0H8J-N9F4P-Q7XKM-V2RTC", "P1N7M-K8P3Q-X2JHF-V9TRL"
        ],
        5500: [
            "5EQ2M-K9PL4-Z8N3H-BVFRT", "J2HX9-P8L3Q-K2MFN-V7CRT", "T6N2B-4M7XK-P9LQH-V3FRJ",
            "W1P9L-Q8X4M-K2JHN-B7FRV", "R0K9N-4L8XP-Q7MHJ-V3FBT", "F7J3P-L8K4M-Q2NHB-V7XRT",
            "C2M7N-K8P3Q-X2JHF-V9BRL", "G1F7H-N9K2J-X8PQM-B4TZV", "V6R4N-6Y9LP-QX2BH-K7FMW",
            "B1P7M-K9J4L-X8QHN-B2FRX", "N2K8J-N9F3P-Q7XHM-V2RTC", "M7JX3-L8K4M-Q2NHB-V7FPT",
            "D2N7M-K8P3Q-X2JHF-V9TRC", "H0T9N-6Y8LP-QX4BH-K7JFV", "L2PZ7-M9K3L-X8QHN-B2FRT",
            "P1H8J-N9F4P-Q7XKM-V2RTC", "Q2N7M-K8P3Q-X2JHF-V9TRL", "S7JX3-L8K4M-Q2NHB-V7FRT",
            "X1F7H-N9K2J-X8PQM-B4TRL", "Z6R4N-6Y9LP-QX2BH-K7FMV", "A1P7M-K9J4L-X8QHN-B2FRT",
            "C2K8J-N9F3P-Q7XHM-V2RTC", "E7JX3-L8K4M-Q2NHB-V7FPT", "G2N7M-K8P3Q-X2JHF-V9TRB",
            "J0T9N-6Y8LP-QX4BH-K7JFV", "K2PZ7-M9K3L-X8QHN-B2FRT", "M1H8J-N9F4P-Q7XKM-V2RTC",
            "N2N7M-K8P3Q-X2JHF-V9TRL", "P7JX3-L8K4M-Q2NHB-V7FRT", "Q1F7H-N9K2J-X8PQM-B4TRL",
            "R6R4N-6Y9LP-QX2BH-K7FMV", "S1P7M-K9J4L-X8QHN-B2FRT", "T2K8J-N9F3P-Q7XHM-V2RTC",
            "V7JX3-L8K4M-Q2NHB-V7FPT", "W2N7M-K8P3Q-X2JHF-V9TRB", "X0T9N-6Y8LP-QX4BH-K7JFV",
            "Y2PZ7-M9K3L-X8QHN-B2FRT", "Z1H8J-N9F4P-Q7XKM-V2RTC", "B2N7M-K8P3Q-X2JHF-V9TRL",
            "C7JX3-L8K4M-Q2NHB-V7FRT", "D1F7H-N9K2J-X8PQM-B4TRL", "F6R4N-6Y9LP-QX2BH-K7FMV",
            "G1P7M-K9J4L-X8QHN-B2FRT", "H2K8J-N9F3P-Q7XHM-V2RTC", "J7JX3-L8K4M-Q2NHB-V7FPT",
            "K2N7M-K8P3Q-X2JHF-V9TRB", "L0T9N-6Y8LP-QX4BH-K7JFV", "M2PZ7-M9K3L-X8QHN-B2FRT",
            "N1H8J-N9F4P-Q7XKM-V2RTC", "P2N7M-K8P3Q-X2JHF-V9TRL"
        ]
    };
    
    // Проверяем все группы ключей
    for (const [stars, keys] of Object.entries(allKeys)) {
        if (keys.includes(cleanKey)) {
            return { valid: true, stars: parseInt(stars) };
        }
    }
    
    return { valid: false, stars: 0 };
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
let imageCache = new Map();

// Кэшируем элементы для производительности
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    mainContainer: document.getElementById('mainContainer'),
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
    keyActivationModal: document.getElementById('keyActivationModal'),
    keyHelpModal: document.getElementById('keyHelpModal'),
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
    referralCode: document.getElementById('referralCode'),
    referralInput: document.getElementById('referralInput'),
    referralEarnings: document.getElementById('referralEarnings'),
    keyInput: document.getElementById('keyInput'),
    keyActivationBtn: document.getElementById('keyActivationBtn'),
    keyActivationInfo: document.getElementById('keyActivationInfo'),
    loadingProgressFill: document.getElementById('loadingProgressFill'),
    loadingQuote: document.getElementById('loadingQuote')
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

// Функция смены страницы с анимацией
function changePage(page) {
    if (isAnimating || currentPage === page) return;
    
    isAnimating = true;
    
    // Виброотклик
    vibrate(10);
    
    // Анимация перехода
    const currentContent = document.getElementById(`${currentPage}-content`);
    const newContent = document.getElementById(`${page}-content`);
    
    if (currentContent && newContent) {
        currentContent.style.opacity = '0';
        currentContent.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            currentContent.style.display = 'none';
            newContent.style.display = 'block';
            
            setTimeout(() => {
                newContent.style.opacity = '1';
                newContent.style.transform = 'translateY(0)';
                currentPage = page;
                updateActiveButton(page);
                isAnimating = false;
                
                // Обновление контента страницы
                updatePageContent(page);
            }, 50);
        }, 300);
    } else {
        currentPage = page;
        updateActiveButton(page);
        switchContent(page);
        isAnimating = false;
    }
}

// Обновление контента страницы
function updatePageContent(page) {
    switch(page) {
        case 'roulette':
            updateBalanceDisplay();
            startFreeCaseTimer();
            break;
        case 'tasks':
            updateTasksProgress();
            break;
        case 'profile':
            updateProfile();
            break;
    }
}

// Обновление активной кнопки
function updateActiveButton(activePage) {
    elements.buttons.forEach(button => {
        const isActive = button.getAttribute('data-page') === activePage;
        button.classList.toggle('active', isActive);
    });
}

// Смена контента (fallback)
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

// Обновление прогресса заданий
function updateTasksProgress() {
    const userData = userDB.userData;
    const tasks = userDB.getTasks();
    
    // Прогресс обновляется автоматически через UserDatabase
    elements.firstStepsProgress.style.width = `${tasks.first_steps.progress}%`;
    elements.saverProgress.style.width = `${tasks.saver.progress}%`;
    elements.collectorProgress.style.width = `${tasks.collector.progress}%`;
    elements.fastStartProgress.style.width = `${tasks.fast_start.progress}%`;
    elements.rareHunterProgress.style.width = `${tasks.rare_hunter.progress}%`;
    elements.legendProgress.style.width = `${tasks.legend.progress}%`;
    
    // Обновление кнопок
    elements.firstStepsBtn.disabled = tasks.first_steps.completed || tasks.first_steps.progress < 100;
    elements.firstStepsBtn.textContent = tasks.first_steps.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.first_steps.completed) elements.firstStepsBtn.classList.add('completed');
    
    elements.saverBtn.disabled = tasks.saver.completed || tasks.saver.progress < 100;
    elements.saverBtn.textContent = tasks.saver.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.saver.completed) elements.saverBtn.classList.add('completed');
    
    elements.collectorBtn.disabled = tasks.collector.completed || tasks.collector.progress < 100;
    elements.collectorBtn.textContent = tasks.collector.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.collector.completed) elements.collectorBtn.classList.add('completed');
    
    elements.fastStartBtn.disabled = tasks.fast_start.completed || tasks.fast_start.progress < 100;
    elements.fastStartBtn.textContent = tasks.fast_start.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.fast_start.completed) elements.fastStartBtn.classList.add('completed');
    
    elements.rareHunterBtn.disabled = tasks.rare_hunter.completed || tasks.rare_hunter.progress < 100;
    elements.rareHunterBtn.textContent = tasks.rare_hunter.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.rare_hunter.completed) elements.rareHunterBtn.classList.add('completed');
    
    elements.legendBtn.disabled = tasks.legend.completed || tasks.legend.progress < 100;
    elements.legendBtn.textContent = tasks.legend.completed ? 'Выполнено' : 'Выполнить';
    if (tasks.legend.completed) elements.legendBtn.classList.add('completed');
}

// Выполнение задания
function completeTask(taskId) {
    showLoading('Проверка задания...');
    
    setTimeout(() => {
        const task = userDB.userData.tasks[taskId];
        const reward = task.reward || 10; // По умолчанию 10 звезд
        
        if (userDB.completeTask(taskId)) {
            userDB.updateBalance(reward);
            updateBalanceDisplay();
            updateProfile();
            updateTasksProgress();
            hideLoading();
            
            showNotification('🎉 Задание выполнено!', `Вы получили ${reward} ⭐`, 'success');
            vibrate([100, 50, 100]);
        } else {
            hideLoading();
            showNotification('❌ Задание не выполнено', 'Выполните условия задания', 'error');
            vibrate(100);
        }
    }, 1000);
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
    elements.statBalance.textContent = userData.balance.toLocaleString();
    elements.statCases.textContent = stats.casesOpened;
    elements.statExperience.textContent = userData.experience;
    elements.statItems.textContent = stats.uniqueItemsCollected;
    
    elements.battlePassLevel.textContent = battlePassInfo.level;
    elements.battlePassExp.textContent = `${battlePassInfo.exp}/${battlePassInfo.neededExp}`;
    elements.battlePassProgress.style.width = `${battlePassInfo.progress}%`;
    
    elements.referralCode.textContent = referralInfo.code;
    elements.referralEarnings.textContent = referralInfo.earnings;
    
    loadAchievements(achievements);
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
    showNotification('🏆 Новое достижение!', `Вы получили достижение: ${achievementName}`, 'success');
    vibrate([100, 50, 100, 50, 100]);
};

// Активация промокода
function activatePromoCode() {
    const code = elements.promoCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('❌ Ошибка', 'Введите промокод', 'error');
        return;
    }
    
    showLoading('Активация промокода...');
    
    setTimeout(() => {
        if (code === 'FREE2025') {
            if (userDB.usePromoCode(code)) {
                userDB.updateBalance(10);
                updateBalanceDisplay();
                updateProfile();
                elements.promoCodeInput.value = '';
                hideLoading();
                
                showNotification('🎉 Промокод активирован!', 'Вы получили 10 ⭐', 'success');
                vibrate([100, 50, 100]);
                
                if (userDB.getBalance() >= 500) {
                    userDB.addAchievement('Богач');
                }
            } else {
                hideLoading();
                showNotification('❌ Ошибка', 'Промокод уже использован', 'error');
                vibrate(100);
            }
        } else {
            hideLoading();
            showNotification('❌ Ошибка', 'Неверный промокод', 'error');
            vibrate(100);
        }
    }, 1000);
}

// Реферальная система
function useReferralCode() {
    const code = elements.referralInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('❌ Ошибка', 'Введите реферальный код', 'error');
        return;
    }
    
    showLoading('Активация реферального кода...');
    
    setTimeout(() => {
        const result = userDB.useReferralCode(code);
        
        if (result.success) {
            elements.referralInput.value = '';
            updateProfile();
            hideLoading();
            
            showNotification('🎉 Код активирован!', result.message, 'success');
            vibrate([100, 50, 100]);
        } else {
            hideLoading();
            showNotification('❌ Ошибка', result.message, 'error');
            vibrate(100);
        }
    }, 1000);
}

function copyReferralCode() {
    const referralLink = userDB.getReferralLink();
    navigator.clipboard.writeText(referralLink).then(() => {
        showNotification('✅ Скопировано', 'Реферальная ссылка скопирована в буфер обмена', 'success');
        vibrate(50);
    }).catch(() => {
        showNotification('❌ Ошибка', 'Не удалось скопировать ссылку', 'error');
    });
}

// Открытие инвентаря
function openInventory() {
    vibrate(10);
    showLoading('Загрузка инвентаря...');
    
    setTimeout(() => {
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
                        <img src="${itemData.image}" alt="${itemName}" loading="lazy" onerror="this.src='nft/placeholder.png'">
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
        
        hideLoading();
        elements.inventoryModal.style.display = 'block';
    }, 500);
}

// Обновление UI инвентаря
window.updateInventoryUI = function() {
    if (elements.inventoryModal.style.display === 'block') {
        openInventory();
    }
};

// Продажа предмета
function sellItem(itemName) {
    const inventory = userDB.getInventory();
    const itemData = inventory[itemName];
    
    if (itemData && itemData.quantity > 0) {
        const sellPrice = itemData.sellPrice;
        
        showConfirmation(
            '💰 Продажа предмета',
            `Вы уверены, что хотите продать "${itemName}" за ${sellPrice} ⭐?`,
            'Продать',
            'Отмена'
        ).then((result) => {
            if (result) {
                showLoading('Продажа предмета...');
                
                setTimeout(() => {
                    if (userDB.removeFromInventory(itemName)) {
                        // ИСПРАВЛЕНО: Правильное начисление звезд
                        const newBalance = userDB.updateBalance(sellPrice);
                        elements.starsBalance.textContent = newBalance.toLocaleString();
                        updateProfile();
                        updateTasksProgress();
                        hideLoading();
                        
                        showNotification('✅ Предмет продан!', `Вы получили ${sellPrice} ⭐`, 'success');
                        vibrate([100, 50, 100]);
                        
                        if (elements.inventoryModal.style.display === 'block') {
                            openInventory();
                        }
                        
                        if (userDB.getBalance() >= 500) {
                            userDB.addAchievement('Богач');
                        }
                    } else {
                        hideLoading();
                        showNotification('❌ Ошибка', 'Не удалось продать предмет', 'error');
                    }
                }, 1000);
            }
        });
    }
}

// Открытие модального окна вывода
function openWithdrawModal(itemName) {
    vibrate(10);
    
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
    
    // Валидация username
    const validation = withdrawDB.validateUsername(username);
    if (!validation.valid) {
        showNotification('❌ Ошибка', validation.message, 'error');
        return;
    }
    
    showLoading('Отправка заявки...');
    
    setTimeout(() => {
        const inventory = userDB.getInventory();
        const itemData = inventory[currentWithdrawItem];
        
        if (itemData && itemData.quantity > 0) {
            // Проверяем, не выводил ли пользователь уже этот предмет
            const userData = userDB.userData;
            const hasWithdrawn = userData.withdrawnItems && 
                userData.withdrawnItems.some(item => item.itemName === currentWithdrawItem);
            
            if (hasWithdrawn) {
                hideLoading();
                showNotification('❌ Ошибка', 'Вы уже выводили этот предмет ранее', 'error');
                return;
            }
            
            // Создаем заявку
            withdrawDB.addRequest(
                userDB.userData.userId,
                username,
                currentWithdrawItem,
                itemData.image,
                itemData.sellPrice
            );
            
            // Удаляем предмет из инвентаря
            userDB.removeFromInventory(currentWithdrawItem);
            
            // Добавляем в список выведенных предметов
            if (!userDB.userData.withdrawnItems) {
                userDB.userData.withdrawnItems = [];
            }
            userDB.userData.withdrawnItems.push({
                itemName: currentWithdrawItem,
                timestamp: Date.now()
            });
            userDB.saveUserData();
            
            hideLoading();
            
            showNotification('📤 Запрос на вывод отправлен', `Запрос на вывод "${currentWithdrawItem}" для ${username} отправлен администратору. Ожидайте подтверждения.`, 'success');
            vibrate([100, 50, 100]);
            
            closeWithdrawModal();
            
            if (elements.inventoryModal.style.display === 'block') {
                openInventory();
            }
            
            updateProfile();
        } else {
            hideLoading();
            showNotification('❌ Ошибка', 'Предмет не найден в инвентаре', 'error');
        }
    }, 1000);
}

// Закрытие инвентаря
function closeInventory() {
    elements.inventoryModal.style.display = 'none';
    vibrate(5);
}

// Открытие модального окна кейса
function openCaseModal(price, caseType) {
    vibrate(10);
    
    const caseData = casesData[caseType];
    
    if (!caseData) return;
    
    if (price === 0 && !userDB.canOpenFreeCase()) {
        showNotification('⏰ Бесплатный кейс недоступен', 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!', 'error');
        return;
    }
    
    currentCaseModal = { price, caseType, caseData };
    
    elements.caseModalTitle.textContent = caseData.name;
    elements.caseModalPrice.textContent = `Цена: ${price} ⭐`;
    
    elements.caseItemsTrack.innerHTML = '';
    
    // Создаем 10 копий предметов для плавной анимации
    for (let i = 0; i < 10; i++) {
        caseData.rewards.forEach((reward, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'case-item';
            itemElement.setAttribute('data-reward-index', index);
            itemElement.innerHTML = `
                <div class="case-item-image">
                    <img src="${reward.image}" alt="${reward.item}" loading="lazy" onerror="this.src='nft/placeholder.png'">
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

// ОСНОВНАЯ ИСПРАВЛЕННАЯ ФУНКЦИЯ - Открытие кейса
function openCase(price, caseType) {
    const caseData = casesData[caseType];
    const balance = userDB.getBalance();
    
    if (price > 0 && balance < price) {
        showNotification('❌ Недостаточно звёзд', `На вашем счету недостаточно звёзд. Нужно ещё ${price - balance} ⭐`, 'error');
        return;
    }
    
    if (price === 0 && !userDB.canOpenFreeCase()) {
        showNotification('⏰ Бесплатный кейс недоступен', 'Вы уже открыли бесплатный кейс сегодня. Приходите через 24 часа!', 'error');
        return;
    }
    
    // Блокируем кнопки
    const buttons = elements.caseModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);
    
    // ВЫБИРАЕМ РАНДОМНУЮ НАГРАДУ ЗАРАНЕЕ
    const reward = getRandomReward(caseData.rewards);
    
    // НАХОДИМ ИНДЕКС ВЫБРАННОЙ НАГРАДЫ В МАССИВЕ
    selectedRewardIndex = caseData.rewards.findIndex(r => 
        r.item === reward.item && 
        r.image === reward.image && 
        r.sellPrice === reward.sellPrice
    );
    
    if (selectedRewardIndex === -1) {
        selectedRewardIndex = 0; // fallback на первый элемент
    }
    
    // Рассчитываем финальную позицию для правильной остановки на выбранном предмете
    const itemWidth = 33.333; // 33.333% ширины для каждого предмета
    const itemsCount = caseData.rewards.length;
    
    // ВЫЧИСЛЯЕМ ПРАВИЛЬНОЕ СМЕЩЕНИЕ:
    // 1. Пройдем 5 полных циклов (10 * itemsCount предметов)
    // 2. Добавим смещение до выбранного предмета
    // 3. Учтем, что центральный предмет должен быть выбранным (индекс 1 в группе из 3)
    const cycles = 5; // Количество полных циклов прокрутки
    const targetOffset = (cycles * itemsCount * itemWidth) + (selectedRewardIndex * itemWidth);
    
    // Вычитаем половину ширины контейнера, чтобы выбранный предмет оказался по центру
    const targetPosition = -targetOffset + (itemWidth / 2);
    
    // Устанавливаем начальную позицию
    elements.caseItemsTrack.style.transition = 'none';
    elements.caseItemsTrack.style.transform = 'translateX(0)';
    
    // Даем время на отрисовку
    setTimeout(() => {
        // Запускаем анимацию с плавным замедлением
        elements.caseItemsTrack.style.transition = 'transform 8s cubic-bezier(0.1, 0.8, 0.2, 1)';
        elements.caseItemsTrack.style.transform = `translateX(${targetPosition}%)`;
        
        // Обработка оплаты и начислений после завершения анимации
        setTimeout(() => {
            if (price > 0) {
                userDB.updateBalance(-price);
                updateBalanceDisplay();
                userDB.openPaidCase();
                userDB.addReferralEarnings(price);
            } else {
                userDB.openFreeCase();
                startFreeCaseTimer();
            }
            
            userDB.addToInventory(reward.item, reward.image, reward.sellPrice);
            userDB.addExperience(10);
            
            userDB.saveUserData();
            
            closeCaseModal();
            showResultModal(reward);
            updateTasksProgress();
            
        }, 8000); // 8 секунд анимации
        
    }, 50);
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
    vibrate([100, 50, 100, 50, 100]);
}

// Закрытие окна результата
function closeResultModal() {
    elements.resultModal.style.display = 'none';
    updateProfile();
    updateBalanceDisplay();
}

// Выбор случайной награды с учетом шансов
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
    vibrate(10);
}

function closeNewsModal() {
    document.querySelectorAll('.news-modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.body.style.overflow = '';
    vibrate(5);
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
                    <img src="${request.itemImage}" alt="${request.itemName}" loading="lazy" onerror="this.src='nft/placeholder.png'">
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
    showConfirmation(
        'Подтверждение вывода',
        'Вы уверены, что хотите подтвердить эту заявку на вывод?',
        'Подтвердить',
        'Отмена'
    ).then((result) => {
        if (result) {
            if (withdrawDB.completeRequest(requestId)) {
                showNotification('✅ Вывод подтвержден', 'Заявка на вывод успешно обработана', 'success');
                openWithdrawRequests();
            }
        }
    });
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
        
        showNotification('✅ Звезды добавлены', `Пользователю ${userId} добавлено ${amount} ⭐`, 'success');
    } else {
        showNotification('❌ Пользователь не найден', 'Пользователь с таким ID не найден', 'error');
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
        
        showNotification('✅ Звезды списаны', `У пользователя ${userId} списано ${amount} ⭐`, 'success');
    } else {
        showNotification('❌ Пользователь не найден', 'Пользователь с таким ID не найден', 'error');
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
        
        showNotification('✅ Пользователь заблокирован', `Пользователь ${userId} заблокирован`, 'success');
    } else {
        showNotification('❌ Пользователь не найден', 'Пользователь с таким ID не найден', 'error');
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
        
        showNotification('✅ Пользователь разблокирован', `Пользователь ${userId} разблокирован`, 'success');
    } else {
        showNotification('❌ Пользователь не найден', 'Пользователь с таким ID не найден', 'error');
    }
}

// Сброс всех данных
function resetAllData() {
    showConfirmation(
        'Сброс всех данных',
        'Вы уверены, что хотите сбросить ВСЕ данные? Это действие нельзя отменить!',
        'Сбросить',
        'Отмена'
    ).then((result) => {
        if (result) {
            localStorage.clear();
            location.reload();
        }
    });
}

// Система активации ключей
function openKeyActivationModal() {
    elements.keyActivationModal.style.display = 'block';
    elements.keyInput.value = '';
    elements.keyActivationInfo.innerHTML = '';
}

function closeKeyActivationModal() {
    elements.keyActivationModal.style.display = 'none';
}

function activateKey() {
    const key = elements.keyInput.value.trim();
    
    if (!key) {
        elements.keyActivationInfo.innerHTML = '<div style="color: #ff6b6b; text-align: center;">Введите ключ</div>';
        return;
    }
    
    showLoading('Активация ключа...');
    
    setTimeout(() => {
        const result = userDB.activateKey(key);
        
        if (result.success) {
            elements.keyActivationInfo.innerHTML = `<div style="color: #34C759; text-align: center;">${result.message}</div>`;
            updateBalanceDisplay();
            updateProfile();
            hideLoading();
            
            setTimeout(() => {
                closeKeyActivationModal();
            }, 2000);
        } else {
            elements.keyActivationInfo.innerHTML = `<div style="color: #ff6b6b; text-align: center;">${result.message}</div>`;
            hideLoading();
        }
    }, 1000);
}

function showKeyHelp() {
    elements.keyHelpModal.style.display = 'block';
}

function closeKeyHelpModal() {
    elements.keyHelpModal.style.display = 'none';
}

// Функция для кнопки Soon
function showSoonMessage() {
    showNotification('🚀 Скоро', 'Эта функция находится в разработке и появится в ближайшем обновлении!', 'info');
}

// Утилитные функции
function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

function showLoading(message = 'Загрузка...') {
    let loadingEl = document.getElementById('loadingState');
    if (!loadingEl) {
        loadingEl = document.createElement('div');
        loadingEl.id = 'loadingState';
        loadingEl.className = 'loading-state';
        loadingEl.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        document.body.appendChild(loadingEl);
    }
    loadingEl.style.display = 'flex';
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function showNotification(title, message, type = 'info') {
    tg.showPopup({
        title: title,
        message: message,
        buttons: [{ type: 'ok' }]
    });
}

window.showNotification = showNotification;

function showConfirmation(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        tg.showPopup({
            title: title,
            message: message,
            buttons: [
                { type: 'ok', text: confirmText },
                { type: 'cancel', text: cancelText }
            ]
        }).then((result) => {
            resolve(result === 'ok');
        });
    });
}

// Кэширование изображений
function preloadImages() {
    const images = [];
    
    // Собираем все изображения из кейсов
    Object.values(casesData).forEach(caseData => {
        caseData.rewards.forEach(reward => {
            if (reward.image && !imageCache.has(reward.image)) {
                images.push(reward.image);
            }
        });
    });
    
    // Предзагрузка изображений
    images.forEach(src => {
        const img = new Image();
        img.src = src;
        img.onload = () => imageCache.set(src, true);
        img.onerror = () => console.warn('Failed to load image:', src);
    });
}

// Обработка ошибок сети
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showNotification('❌ Ошибка', 'Произошла непредвиденная ошибка', 'error');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showNotification('❌ Ошибка', 'Произошла ошибка при выполнении операции', 'error');
    });
}

// Добавляем парящие частицы на экран загрузки
function addParticles() {
    const loadingScreen = elements.loadingScreen;
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        loadingScreen.appendChild(particle);
    }
}

// Экран загрузки
function showLoadingScreen() {
    // Добавляем частицы
    addParticles();
    
    let progress = 0;
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    const progressIncrement = 100 / steps;
    
    let currentQuoteIndex = 0;
    const quoteChangeInterval = 2000;
    
    elements.loadingQuote.textContent = loadingQuotes[currentQuoteIndex];
    
    const progressInterval = setInterval(() => {
        progress += progressIncrement;
        elements.loadingProgressFill.style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
            clearInterval(progressInterval);
            clearInterval(quoteInterval);
            
            setTimeout(() => {
                elements.loadingScreen.style.display = 'none';
                elements.mainContainer.style.display = 'block';
                initializeApp();
            }, 800);
        }
    }, interval);
    
    const quoteInterval = setInterval(() => {
        currentQuoteIndex = (currentQuoteIndex + 1) % loadingQuotes.length;
        elements.loadingQuote.textContent = loadingQuotes[currentQuoteIndex];
        elements.loadingQuote.style.animation = 'none';
        setTimeout(() => {
            elements.loadingQuote.style.animation = 'quoteFade 1.5s ease-out';
        }, 10);
    }, quoteChangeInterval);
}

// Инициализация приложения после загрузки
function initializeApp() {
    console.log('🚀 Мини-приложение полностью загружено и готово!');
    
    // Предзагрузка изображений
    preloadImages();
    
    // Настройка обработки ошибок
    setupErrorHandling();
    
    // Инициализация UI
    updateBalanceDisplay();
    updateProfile();
    updateTasksProgress();
    startFreeCaseTimer();
    
    // Показ уведомления о бэкапе
    setTimeout(() => {
        showNotification('✅ Данные сохранены', 'Ваш прогресс автоматически сохраняется', 'success');
    }, 2000);
}

// Закрытие модальных окон по клику на фон
document.querySelectorAll('.news-modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeNewsModal();
        }
    });
});

// Добавляем обработчики для всех модальных окон
const modals = [
    'caseModal', 'inventoryModal', 'resultModal', 'withdrawModal', 
    'consoleModal', 'adminModal', 'withdrawRequestsModal', 
    'userSearchModal', 'allUsersModal', 'keyActivationModal', 'keyHelpModal'
];

modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                const closeFunction = window[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1).replace('Modal', '')}`];
                if (closeFunction) closeFunction();
            }
        });
    }
});

// Закрытие модальных окон по ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const openModals = modals.filter(id => 
            document.getElementById(id)?.style.display === 'block'
        );
        if (openModals.length > 0) {
            const lastModal = openModals[openModals.length - 1];
            const closeFunction = window[`close${lastModal.charAt(0).toUpperCase() + lastModal.slice(1).replace('Modal', '')}`];
            if (closeFunction) closeFunction();
        } else if (document.querySelector('.news-modal.show')) {
            closeNewsModal();
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

// Запуск экрана загрузки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    showLoadingScreen();
});

console.log('✅ Игровое мини-приложение запущено!');
