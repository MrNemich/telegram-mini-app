// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Базовый URL для API (замени на свой домен Vercel)
const API_BASE_URL = 'https://telegram-mini-app-snowy-five.vercel.app/api';

// Глобальная онлайн база данных
class OnlineDatabase {
    constructor() {
        this.telegramId = tg.initDataUnsafe.user?.id || 'default_user';
        this.apiBase = API_BASE_URL;
        this.userData = null;
    }

    async apiRequest(endpoint, data) {
        try {
            const response = await fetch(`${this.apiBase}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Пользовательские методы
    async getUserData() {
        try {
            const response = await this.apiRequest('users.js', {
                action: 'getUser',
                telegramId: this.telegramId,
                userData: {
                    username: tg.initDataUnsafe.user?.username,
                    firstName: tg.initDataUnsafe.user?.first_name
                }
            });
            
            if (response.success) {
                this.userData = response.user;
                return this.userData;
            }
            throw new Error('Failed to get user data');
        } catch (error) {
            console.error('Get user data failed:', error);
            // Fallback на локальные данные если API недоступен
            this.userData = this.createLocalUser();
            return this.userData;
        }
    }

    createLocalUser() {
        // Только как fallback
        return {
            userId: 8000000 + Math.floor(Math.random() * 10000),
            telegramId: this.telegramId,
            balance: 0,
            inventory: {},
            casesOpened: 0,
            paidCasesOpened: 0,
            lastFreeCase: 0,
            achievements: ['Новичок'],
            level: 1,
            experience: 0,
            username: tg.initDataUnsafe.user?.username || 'Игрок',
            firstName: tg.initDataUnsafe.user?.first_name || 'Игрок',
            isBanned: false,
            tasks: {
                'first_steps': { completed: false, progress: 0, reward: 20 },
                'collector': { completed: false, progress: 0, reward: 40 },
                'fast_start': { completed: false, progress: 0, reward: 25 },
                'rare_hunter': { completed: false, progress: 0, reward: 50 },
                'legend': { completed: false, progress: 0, reward: 60 },
                'saver': { completed: false, progress: 0, reward: 30 }
            },
            usedPromoCodes: [],
            dailyCasesOpened: 0,
            lastDailyReset: Date.now(),
            uniqueItemsCollected: 0,
            registrationDate: Date.now(),
            battlePassLevel: 1,
            battlePassExp: 0,
            referralCode: this.generateReferralCode(),
            referredBy: null,
            referrals: [],
            referralEarnings: 0,
            keyActivationAttempts: 0,
            lastKeyAttempt: 0,
            lastActive: Date.now(),
            withdrawnItems: []
        };
    }

    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({length: 6}, () => 
            chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
    }

    async updateUserData(updates) {
        try {
            const response = await this.apiRequest('users.js', {
                action: 'updateUser',
                telegramId: this.telegramId,
                userData: updates
            });
            
            if (response.success) {
                if (this.userData) {
                    Object.assign(this.userData, updates);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Update user data failed:', error);
            // Локальное обновление как fallback
            if (this.userData) {
                Object.assign(this.userData, updates);
            }
            return true;
        }
    }

    // Методы для работы с балансом
    async updateBalance(amount) {
        if (!this.userData) return 0;
        
        this.userData.balance += amount;
        if (this.userData.balance < 0) this.userData.balance = 0;
        
        await this.updateUserData({ balance: this.userData.balance });
        return this.userData.balance;
    }

    getBalance() {
        return this.userData ? this.userData.balance : 0;
    }

    getInventory() {
        return this.userData ? this.userData.inventory : {};
    }

    getStats() {
        if (!this.userData) return null;
        
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
            inventoryCount: Object.keys(this.userData.inventory || {}).length,
            uniqueItemsCollected: this.userData.uniqueItemsCollected,
            isBanned: this.userData.isBanned,
            registrationDate: this.userData.registrationDate,
            battlePassLevel: this.userData.battlePassLevel,
            battlePassExp: this.userData.battlePassExp,
            referralEarnings: this.userData.referralEarnings
        };
    }

    getTasks() {
        return this.userData ? this.userData.tasks : {};
    }

    getAchievements() {
        return this.userData ? this.userData.achievements : ['Новичок'];
    }

    // Инвентарь
    async addToInventory(item, image, sellPrice) {
        if (!this.userData) return false;
        
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
        
        await this.updateUserData({ 
            inventory: this.userData.inventory,
            uniqueItemsCollected: this.userData.uniqueItemsCollected
        });
        
        return wasNewItem;
    }

    async removeFromInventory(item) {
        if (!this.userData || !this.userData.inventory[item] || this.userData.inventory[item].quantity <= 0) {
            return false;
        }
        
        this.userData.inventory[item].quantity -= 1;
        if (this.userData.inventory[item].quantity <= 0) {
            delete this.userData.inventory[item];
            this.userData.uniqueItemsCollected--;
        }
        
        await this.updateUserData({ 
            inventory: this.userData.inventory,
            uniqueItemsCollected: this.userData.uniqueItemsCollected
        });
        return true;
    }

    canOpenFreeCase() {
        if (!this.userData) return false;
        
        const now = Date.now();
        const lastOpen = this.userData.lastFreeCase;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (lastOpen === 0 || (now - lastOpen) >= twentyFourHours) {
            return true;
        }
        return false;
    }

    getFreeCaseCooldown() {
        if (!this.userData) return 0;
        
        const now = Date.now();
        const lastOpen = this.userData.lastFreeCase;
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (lastOpen === 0) return 0;
        
        const timePassed = now - lastOpen;
        const timeRemaining = twentyFourHours - timePassed;
        
        return timeRemaining > 0 ? timeRemaining : 0;
    }

    async openFreeCase() {
        if (!this.userData) return;
        
        this.userData.lastFreeCase = Date.now();
        this.userData.casesOpened++;
        this.userData.dailyCasesOpened++;
        
        await this.updateUserData({
            lastFreeCase: this.userData.lastFreeCase,
            casesOpened: this.userData.casesOpened,
            dailyCasesOpened: this.userData.dailyCasesOpened
        });
    }

    async openPaidCase() {
        if (!this.userData) return;
        
        this.userData.casesOpened++;
        this.userData.paidCasesOpened++;
        this.userData.dailyCasesOpened++;
        
        await this.updateUserData({
            casesOpened: this.userData.casesOpened,
            paidCasesOpened: this.userData.paidCasesOpened,
            dailyCasesOpened: this.userData.dailyCasesOpened
        });
    }

    async addExperience(amount) {
        if (!this.userData) return;
        
        this.userData.experience += amount;
        const expNeeded = this.userData.level * 100;
        
        if (this.userData.experience >= expNeeded) {
            this.userData.level++;
            this.userData.experience = 0;
        }
        
        await this.updateUserData({
            level: this.userData.level,
            experience: this.userData.experience
        });
    }

    async addBattlePassExp(amount) {
        if (!this.userData) return { leveledUp: false };
        
        this.userData.battlePassExp += amount;
        const expNeeded = this.userData.battlePassLevel * 50;
        
        let leveledUp = false;
        let reward = 0;
        
        if (this.userData.battlePassExp >= expNeeded) {
            this.userData.battlePassLevel++;
            this.userData.battlePassExp = 0;
            leveledUp = true;
            reward = 15; // Награда за уровень
            
            this.userData.balance += reward;
        }
        
        await this.updateUserData({
            battlePassLevel: this.userData.battlePassLevel,
            battlePassExp: this.userData.battlePassExp,
            balance: this.userData.balance
        });
        
        if (leveledUp) {
            return {
                leveledUp: true,
                newLevel: this.userData.battlePassLevel,
                reward: reward
            };
        }
        
        return {
            leveledUp: false,
            currentExp: this.userData.battlePassExp,
            neededExp: expNeeded
        };
    }

    getBattlePassInfo() {
        if (!this.userData) {
            return {
                level: 1,
                exp: 0,
                neededExp: 50,
                progress: 0
            };
        }
        
        const expNeeded = this.userData.battlePassLevel * 50;
        return {
            level: this.userData.battlePassLevel,
            exp: this.userData.battlePassExp,
            neededExp: expNeeded,
            progress: (this.userData.battlePassExp / expNeeded) * 100
        };
    }

    async usePromoCode(code) {
        if (!this.userData) return false;
        
        if (this.userData.usedPromoCodes.includes(code)) {
            return false;
        }
        
        this.userData.usedPromoCodes.push(code);
        await this.updateUserData({ usedPromoCodes: this.userData.usedPromoCodes });
        return true;
    }

    async completeTask(taskId) {
        if (!this.userData || !this.userData.tasks[taskId]) return false;
        
        const task = this.userData.tasks[taskId];
        if (task.progress >= 100 && !task.completed) {
            task.completed = true;
            await this.updateUserData({ tasks: this.userData.tasks });
            return true;
        }
        return false;
    }

    async updateTaskProgress(taskId, progress) {
        if (!this.userData || !this.userData.tasks[taskId]) return;
        
        this.userData.tasks[taskId].progress = Math.min(progress, 100);
        await this.updateUserData({ tasks: this.userData.tasks });
    }

    async addAchievement(achievement) {
        if (!this.userData) return false;
        
        if (!this.userData.achievements.includes(achievement)) {
            this.userData.achievements.push(achievement);
            await this.updateUserData({ achievements: this.userData.achievements });
            return true;
        }
        return false;
    }

    async useReferralCode(code) {
        // Реализация реферальной системы
        if (!this.userData) return { success: false, message: 'Ошибка пользователя' };
        
        if (this.userData.referredBy) {
            return { success: false, message: 'Вы уже использовали реферальный код' };
        }
        
        // В реальном приложении здесь была бы проверка кода через API
        // Пока возвращаем успех для тестирования
        this.userData.referredBy = code;
        this.userData.balance += 50;
        
        await this.updateUserData({
            referredBy: this.userData.referredBy,
            balance: this.userData.balance
        });
        
        return { success: true, message: 'Реферальный код активирован! Вы получили 50 ⭐' };
    }

    getReferralInfo() {
        if (!this.userData) {
            return {
                code: 'XXXXXX',
                referredBy: null,
                referrals: 0,
                earnings: 0
            };
        }
        
        return {
            code: this.userData.referralCode || 'XXXXXX',
            referredBy: this.userData.referredBy,
            referrals: this.userData.referrals ? this.userData.referrals.length : 0,
            earnings: this.userData.referralEarnings || 0
        };
    }

    getReferralLink() {
        const botUsername = 'GiftLabRobot';
        const code = this.userData?.referralCode || 'XXXXXX';
        return `https://t.me/${botUsername}?start=ref_${code}`;
    }

    // Заявки на вывод
    async addWithdrawRequest(username, itemName, itemImage, itemPrice) {
        try {
            const response = await this.apiRequest('withdraw.js', {
                action: 'addRequest',
                userId: this.userData.userId,
                userTelegramId: this.telegramId,
                username: username,
                itemName: itemName,
                itemImage: itemImage,
                itemPrice: itemPrice
            });
            
            return response.success;
        } catch (error) {
            console.error('Add withdraw request failed:', error);
            return false;
        }
    }

    async getWithdrawRequests() {
        try {
            const response = await this.apiRequest('withdraw.js', {
                action: 'getRequests'
            });
            
            if (response.success) {
                return response.requests;
            }
            return [];
        } catch (error) {
            console.error('Get withdraw requests failed:', error);
            return [];
        }
    }

    async completeWithdrawRequest(requestId) {
        try {
            const response = await this.apiRequest('withdraw.js', {
                action: 'completeRequest',
                requestId: requestId
            });
            
            return response.success;
        } catch (error) {
            console.error('Complete withdraw request failed:', error);
            return false;
        }
    }

    // Методы для работы с ключами
    async activateKey(key) {
        // Валидация формата ключа
        const cleanKey = key.replace(/\s/g, '').toUpperCase();
        const keyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
        
        if (!keyPattern.test(cleanKey)) {
            return {
                success: false,
                message: 'Неверный формат ключа. Используйте: ххххх-ххххх-ххххх-ххххх'
            };
        }

        // Здесь должна быть проверка ключа через API
        // Пока эмулируем успешную активацию
        const keyData = validateKey(cleanKey);
        if (keyData.valid) {
            const stars = keyData.stars;
            this.userData.balance += stars;
            
            await this.updateUserData({ balance: this.userData.balance });
            
            return {
                success: true,
                message: `Ключ активирован! Вы получили ${stars} ⭐`,
                stars: stars
            };
        }
        
        return {
            success: false,
            message: 'Неверный ключ'
        };
    }

    // Админ методы
    async adminRequest(action, data = {}) {
        try {
            const response = await this.apiRequest('admin.js', {
                action: action,
                adminKey: 'G7#gQ!j2$Lp9@wRn',
                ...data
            });
            
            return response;
        } catch (error) {
            console.error('Admin request failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Данные кейсов с реальными призами
const casesData = {
    free: {
        name: "Бесплатный кейс",
        price: 0,
        rewards: [
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

// Инициализация онлайн базы данных
const db = new OnlineDatabase();

// Текущая активная страница
let currentPage = 'roulette'; // ИЗМЕНЕНО: Рулетка теперь стартовая
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
    const cooldown = db.getFreeCaseCooldown();
    
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
    
    if (db.getFreeCaseCooldown() > 0 && !freeCaseTimerInterval) {
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
    const balance = db.getBalance();
    elements.starsBalance.textContent = balance.toLocaleString();
}

// Обновление прогресса заданий
function updateTasksProgress() {
    if (!db.userData) return;
    
    const tasks = db.getTasks();
    
    // Прогресс обновляется автоматически через OnlineDatabase
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
async function completeTask(taskId) {
    showLoading('Проверка задания...');
    
    try {
        const task = db.userData.tasks[taskId];
        const reward = task.reward || 20;
        
        if (await db.completeTask(taskId)) {
            await db.updateBalance(reward);
            updateBalanceDisplay();
            await updateProfile();
            updateTasksProgress();
            hideLoading();
            
            showNotification('🎉 Задание выполнено!', `Вы получили ${reward} ⭐`, 'success');
            vibrate([100, 50, 100]);
        } else {
            hideLoading();
            showNotification('❌ Задание не выполнено', 'Выполните условия задания', 'error');
            vibrate(100);
        }
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Не удалось выполнить задание', 'error');
    }
}

// Обновление профиля
async function updateProfile() {
    if (!db.userData) return;
    
    const stats = db.getStats();
    const userData = db.userData;
    const achievements = db.getAchievements();
    const battlePassInfo = db.getBattlePassInfo();
    const referralInfo = db.getReferralInfo();
    
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
async function activatePromoCode() {
    const code = elements.promoCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('❌ Ошибка', 'Введите промокод', 'error');
        return;
    }
    
    showLoading('Активация промокода...');
    
    try {
        if (code === 'FREE2025') {
            if (await db.usePromoCode(code)) {
                await db.updateBalance(10);
                updateBalanceDisplay();
                await updateProfile();
                elements.promoCodeInput.value = '';
                hideLoading();
                
                showNotification('🎉 Промокод активирован!', 'Вы получили 10 ⭐', 'success');
                vibrate([100, 50, 100]);
                
                if (db.userData.balance >= 500) {
                    await db.addAchievement('Богач');
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
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Ошибка активации промокода', 'error');
    }
}

// Реферальная система
async function useReferralCode() {
    const code = elements.referralInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('❌ Ошибка', 'Введите реферальный код', 'error');
        return;
    }
    
    showLoading('Активация реферального кода...');
    
    try {
        const result = await db.useReferralCode(code);
        
        if (result.success) {
            elements.referralInput.value = '';
            await updateProfile();
            hideLoading();
            
            showNotification('🎉 Код активирован!', result.message, 'success');
            vibrate([100, 50, 100]);
        } else {
            hideLoading();
            showNotification('❌ Ошибка', result.message, 'error');
            vibrate(100);
        }
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Ошибка активации кода', 'error');
    }
}

function copyReferralCode() {
    const referralLink = db.getReferralLink();
    navigator.clipboard.writeText(referralLink).then(() => {
        showNotification('✅ Скопировано', 'Реферальная ссылка скопирована в буфер обмена', 'success');
        vibrate(50);
    }).catch(() => {
        showNotification('❌ Ошибка', 'Не удалось скопировать ссылку', 'error');
    });
}

// Открытие инвентаря
async function openInventory() {
    vibrate(10);
    showLoading('Загрузка инвентаря...');
    
    try {
        const inventory = db.getInventory();
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
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Не удалось загрузить инвентарь', 'error');
    }
}

// Обновление UI инвентаря
window.updateInventoryUI = function() {
    if (elements.inventoryModal.style.display === 'block') {
        openInventory();
    }
};

// Продажа предмета
async function sellItem(itemName) {
    const inventory = db.getInventory();
    const itemData = inventory[itemName];
    
    if (itemData && itemData.quantity > 0) {
        const sellPrice = itemData.sellPrice;
        
        showConfirmation(
            '💰 Продажа предмета',
            `Вы уверены, что хотите продать "${itemName}" за ${sellPrice} ⭐?`,
            'Продать',
            'Отмена'
        ).then(async (result) => {
            if (result) {
                showLoading('Продажа предмета...');
                
                try {
                    if (await db.removeFromInventory(itemName)) {
                        const newBalance = await db.updateBalance(sellPrice);
                        elements.starsBalance.textContent = newBalance.toLocaleString();
                        await updateProfile();
                        updateTasksProgress();
                        hideLoading();
                        
                        showNotification('✅ Предмет продан!', `Вы получили ${sellPrice} ⭐`, 'success');
                        vibrate([100, 50, 100]);
                        
                        if (elements.inventoryModal.style.display === 'block') {
                            openInventory();
                        }
                        
                        if (db.userData.balance >= 500) {
                            await db.addAchievement('Богач');
                        }
                    } else {
                        hideLoading();
                        showNotification('❌ Ошибка', 'Не удалось продать предмет', 'error');
                    }
                } catch (error) {
                    hideLoading();
                    showNotification('❌ Ошибка', 'Ошибка при продаже предмета', 'error');
                }
            }
        });
    }
}

// Открытие модального окна вывода
function openWithdrawModal(itemName) {
    vibrate(10);
    
    const inventory = db.getInventory();
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
async function confirmWithdraw() {
    const username = elements.usernameInput.value.trim();
    
    if (!username || !username.startsWith('@')) {
        showNotification('❌ Ошибка', 'Введите корректный @username', 'error');
        return;
    }
    
    showLoading('Отправка заявки...');
    
    try {
        const inventory = db.getInventory();
        const itemData = inventory[currentWithdrawItem];
        
        if (itemData && itemData.quantity > 0) {
            // Добавляем в онлайн базу
            const success = await db.addWithdrawRequest(
                username,
                currentWithdrawItem,
                itemData.image,
                itemData.sellPrice
            );
            
            if (success) {
                // Удаляем предмет у пользователя
                await db.removeFromInventory(currentWithdrawItem);
                
                hideLoading();
                showNotification('📤 Запрос на вывод отправлен', 
                    `Запрос на вывод "${currentWithdrawItem}" для ${username} отправлен администратору. Ожидайте подтверждения.`, 
                    'success');
                
                closeWithdrawModal();
                
                if (elements.inventoryModal.style.display === 'block') {
                    openInventory();
                }
                
                await updateProfile();
            } else {
                hideLoading();
                showNotification('❌ Ошибка', 'Не удалось отправить заявку', 'error');
            }
        } else {
            hideLoading();
            showNotification('❌ Ошибка', 'Предмет не найден в инвентаре', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Ошибка при отправке заявки', 'error');
    }
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
    
    if (price === 0 && !db.canOpenFreeCase()) {
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
async function openCase(price, caseType) {
    const caseData = casesData[caseType];
    const balance = db.getBalance();
    
    if (price > 0 && balance < price) {
        showNotification('❌ Недостаточно звёзд', `На вашем счету недостаточно звёзд. Нужно ещё ${price - balance} ⭐`, 'error');
        return;
    }
    
    if (price === 0 && !db.canOpenFreeCase()) {
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
    setTimeout(async () => {
        // Запускаем анимацию с плавным замедлением
        elements.caseItemsTrack.style.transition = 'transform 8s cubic-bezier(0.1, 0.8, 0.2, 1)';
        elements.caseItemsTrack.style.transform = `translateX(${targetPosition}%)`;
        
        // Обработка оплаты и начислений после завершения анимации
        setTimeout(async () => {
            try {
                if (price > 0) {
                    await db.updateBalance(-price);
                    updateBalanceDisplay();
                    await db.openPaidCase();
                    
                    // Обновляем прогресс заданий
                    await db.updateTaskProgress('first_steps', db.userData.paidCasesOpened * 100);
                } else {
                    await db.openFreeCase();
                    startFreeCaseTimer();
                }
                
                const wasNewItem = await db.addToInventory(reward.item, reward.image, reward.sellPrice);
                await db.addExperience(10);
                
                // Обновляем прогресс заданий
                if (wasNewItem) {
                    const collectorProgress = Math.min((db.userData.uniqueItemsCollected / 3) * 100, 100);
                    await db.updateTaskProgress('collector', collectorProgress);
                }
                
                if (reward.sellPrice > 500) {
                    await db.addAchievement('Редкий охотник');
                    await db.updateTaskProgress('rare_hunter', 100);
                }
                
                // Обновляем ежедневные задания
                const dailyProgress = Math.min((db.userData.dailyCasesOpened / 2) * 100, 100);
                await db.updateTaskProgress('fast_start', dailyProgress);
                
                // Обновляем задание "Легенда"
                const legendProgress = Math.min((db.userData.level / 2) * 100, 100);
                await db.updateTaskProgress('legend', legendProgress);
                
                // Обновляем задание "Накопитель"
                const saverProgress = Math.min((db.userData.balance / 300) * 100, 100);
                await db.updateTaskProgress('saver', saverProgress);
                
                closeCaseModal();
                showResultModal(reward);
                updateTasksProgress();
                
            } catch (error) {
                console.error('Ошибка при открытии кейса:', error);
                showNotification('❌ Ошибка', 'Не удалось открыть кейс', 'error');
            }
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
async function openWithdrawRequests() {
    showLoading('Загрузка заявок...');
    
    try {
        const requests = await db.getWithdrawRequests();
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
                    <div class="request-user-id">ID пользователя: ${request.userId}</div>
                    <div class="request-status ${request.status}">Статус: ${request.status === 'pending' ? 'Ожидание' : 'Завершено'}</div>
                    ${request.status === 'pending' ? 
                        `<button class="request-confirm-btn" onclick="confirmWithdrawRequest('${request.id}')">Подтвердить вывод</button>` : 
                        '<div class="request-completed">✅ Заявка обработана</div>'
                    }
                `;
                elements.withdrawRequestsList.appendChild(requestElement);
            });
        }
        
        hideLoading();
        elements.withdrawRequestsModal.style.display = 'block';
    } catch (error) {
        hideLoading();
        showNotification('❌ Ошибка', 'Не удалось загрузить заявки', 'error');
    }
}

function closeWithdrawRequests() {
    elements.withdrawRequestsModal.style.display = 'none';
}

async function confirmWithdrawRequest(requestId) {
    showConfirmation(
        'Подтверждение вывода',
        'Вы уверены, что хотите подтвердить эту заявку на вывод?',
        'Подтвердить',
        'Отмена'
    ).then(async (result) => {
        if (result) {
            const success = await db.completeWithdrawRequest(requestId);
            if (success) {
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

// Все пользователи
function showAllUsers() {
    // В онлайн версии эта функция требует API для получения всех пользователей
    showNotification('ℹ️ Информация', 'Для онлайн версии требуется API для получения списка пользователей', 'info');
}

function closeAllUsers() {
    elements.allUsersModal.style.display = 'none';
}

// Добавление звезд пользователю
function addStarsToUser() {
    showNotification('ℹ️ Информация', 'Для онлайн версии требуется API администратора', 'info');
}

// Забрать звезды у пользователя
function removeStarsFromUser() {
    showNotification('ℹ️ Информация', 'Для онлайн версии требуется API администратора', 'info');
}

// Блокировка пользователя
function banUser() {
    showNotification('ℹ️ Информация', 'Для онлайн версии требуется API администратора', 'info');
}

// Разблокировка пользователя
function unbanUser() {
    showNotification('ℹ️ Информация', 'Для онлайн версии требуется API администратора', 'info');
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

async function activateKey() {
    const key = elements.keyInput.value.trim();
    
    if (!key) {
        elements.keyActivationInfo.innerHTML = '<div style="color: #ff6b6b; text-align: center;">Введите ключ</div>';
        return;
    }
    
    showLoading('Активация ключа...');
    
    try {
        const result = await db.activateKey(key);
        
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
    } catch (error) {
        elements.keyActivationInfo.innerHTML = '<div style="color: #ff6b6b; text-align: center;">Ошибка активации ключа</div>';
        hideLoading();
    }
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
async function initializeApp() {
    console.log('🚀 Мини-приложение полностью загружено и готово!');
    
    try {
        await db.getUserData();
        console.log('✅ Онлайн база данных загружена');
        console.log('👤 ID пользователя:', db.userData.userId);
        
        // Предзагрузка изображений
        preloadImages();
        
        // Настройка обработки ошибок
        setupErrorHandling();
        
        // Инициализация UI
        updateBalanceDisplay();
        await updateProfile();
        updateTasksProgress();
        startFreeCaseTimer();
        
        // Показ уведомления о бэкапе
        setTimeout(() => {
            showNotification('✅ Данные сохранены', 'Ваш прогресс автоматически сохраняется', 'success');
        }, 2000);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('⚠️ Внимание', 'Используется локальный режим', 'warning');
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

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики навигации
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const page = button.getAttribute('data-page');
            changePage(page);
        });
    });
    
    // Обработчики новостей
    document.querySelectorAll('.news-card').forEach(card => {
        card.addEventListener('click', () => {
            const newsId = card.getAttribute('data-news');
            openNewsModal(newsId);
        });
    });
    
    // Обработчики закрытия модалок
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Запуск экрана загрузки при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    showLoadingScreen();
});

console.log('✅ Онлайн версия игрового мини-приложения запущена!');

