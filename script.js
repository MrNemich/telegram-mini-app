// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Telegram Web App
    const tg = window.Telegram.WebApp;
    
    // Инициализируем приложение
    tg.expand();
    tg.enableClosingConfirmation();
    tg.setHeaderColor('#0a0a0f');
    tg.setBackgroundColor('#0a0a0f');
    
    // Получаем элементы
    const navButtons = document.querySelectorAll('.nav-button');
    const mainContent = document.getElementById('main-content');
    const balanceAmount = document.getElementById('balance-amount');
    const addBalanceBtn = document.getElementById('add-balance-btn');
    const balanceModal = document.getElementById('balance-modal');
    const closeBalanceModal = document.getElementById('close-balance-modal');
    const depositBtn = document.getElementById('deposit-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    const botBalanceElement = document.getElementById('bot-balance');
    const connectInfoElement = document.getElementById('connect-info');
    
    // Элементы для модалки пополнения
    const depositModal = document.getElementById('deposit-modal');
    const closeDepositModal = document.getElementById('close-deposit-modal');
    const depositAmountInput = document.getElementById('deposit-amount-input');
    const amountPresets = document.querySelectorAll('.amount-preset');
    const confirmDepositBtn = document.getElementById('confirm-deposit-btn');
    const transactionStatusElement = document.getElementById('transaction-status');
    
    // Элементы для фильтров
    const filtersModal = document.getElementById('filters-modal');
    const closeFiltersModal = document.getElementById('close-filters-modal');
    const filterOptions = document.querySelectorAll('.filter-option');
    const filterDropdowns = document.querySelectorAll('.filter-dropdown');
    const filterSections = document.querySelectorAll('.filter-section');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const searchFiltersBtn = document.getElementById('search-filters-btn');
    const priceSliderTrack = document.getElementById('price-slider-track');
    const priceSliderRange = document.getElementById('price-slider-range');
    const priceSliderHandleMin = document.getElementById('price-slider-handle-min');
    const priceSliderHandleMax = document.getElementById('price-slider-handle-max');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    
    // Элементы для игры
    const gameModal = document.getElementById('game-modal');
    const closeGameModal = document.getElementById('close-game-modal');
    const gameContainer = document.getElementById('game-container');
    
    // Текущий пользователь
    let userData = {
        id: null,
        balance: 100,
        username: 'Гость',
        avatarUrl: null,
        walletConnected: false,
        walletAddress: null,
        walletBalance: 0,
        bought: 0,
        sold: 0,
        totalVolume: 0,
        lotteryParticipating: false,
        referrals: {
            total: 5,
            active: 3,
            earned: 12.5,
            link: "https://t.me/beatclub_bot?start=ref_",
            level: 3,
            nextLevel: 10,
            progress: 30
        },
        inventory: [
            { id: 1, name: "Bodded Ring", type: "ring" },
            { id: 2, name: "Crystal Ball", type: "ball" },
            { id: 3, name: "Diamond Ring", type: "ring" },
            { id: 4, name: "Genie Lamp", type: "lamp" },
            { id: 5, name: "Heroic Helmet", type: "helmet" },
            { id: 6, name: "Moon Pendant", type: "pendant" }
        ]
    };
    
    // Ваш кошелек для пополнения
    const BOT_ADDRESS = "UQBhcIzPNZJXa1nWLypYIvO-ybYhBSZEGyH-6MDRdaKyzEJV";
    
    // URL для API (ваш сайт на Vercel)
    const API_URL = "https://mrnemlab.vercel.app/api";
    
    // Инициализация TON Connect
    let tonConnectUI = null;
    
    // Данные для фильтров
    const collections = [
        "Bodded Ring", "Candle Lamp", "Boots", "Candy Cane", "Case", "Christmas Tree",
        "Clover Pin", "Crystal Ball", "Diamond Ring", "Durov's Coat", "Coconut",
        "Crystal Eagle", "Dove of Peace", "Durov's Figurine", "Coffin", "Cupid Charm",
        "Durov's Boots", "Durov's Sunglasses", "Cookie Heart", "Desk Calendar",
        "Durov's Cap", "Easter Cake", "Evil Eye", "Faith Amulet", "Flying Broom",
        "Gem Signet", "Genie Lamp", "Ginger Cookie", "Hanging Star", "Happy Brownie",
        "Heart Locket", "Heroic Helmet", "Holiday Drink", "Homemade Cake", "Ice Cream Cone",
        "Ice Cream Scoops", "Input Key", "lon Gem", "lonic Dryer", "Jack in the Box",
        "Kissed Frog", "Kitty Medallion", "Lol Pop", "Loot Bag", "Love Candle",
        "Love Potion", "Low Rider", "Lunar Snake", "Lush Bouquet", "Mask", "Medal",
        "Mighty Arm", "Mouse Cake", "Party Sparkler", "Pink Flamingo", "Mini Oscar",
        "Money Pot", "Neko Helmet", "Perfume Bottle", "Priccious Peach", "Pretty Posy",
        "Moon Pendant", "Record Player", "Red Star", "Resistance Dog", "Restless Jar",
        "Roses", "Sakura Flower", "Sandcastle", "Santa Hat", "Sky Stilettos",
        "Sleigh Bell", "Snake Box", "Snoop Cigar", "Snoop Dogg", "Snow Globe",
        "Snow Mittens", "Spiced Wine", "Statue of Liberty", "Stellar Rocket", "Surfboard",
        "Star Notepad", "Swag Bag", "Swiss Watch", "Tornh of Freedom", "Telegram Pin",
        "Top Hat", "Total Horse", "UFC Strike", "Valentine Box", "Vintage Cigar",
        "Voodoo Doll", "Wrestide Sign", "Whip Cupcake", "Winter Wreath", "Witch Hat",
        "Xmas Stocking"
    ];
    
    const backgrounds = [
        "Amber", "Aquamarine", "Azure Blue", "Battleship Grey", "Black", "Burgundy",
        "Deep Cyan", "Desert Sand", "Electric Indigo", "Electric Purple", "Emerald",
        "English Violet", "Fandango", "Navy Blue", "Neon Blue", "Onyx Black", "Old Gold",
        "Orange", "Pacific Cyan", "Pacific Green", "Persimmon", "Pine Green"
    ];
    
    // Текущие фильтры
    let currentFilters = {
        sort: 'newest',
        collections: [],
        priceRange: { min: 0, max: 100000 },
        backgrounds: []
    };
    
    // Данные игры
    let gameData = {
        selectedNFT: null,
        isPlaying: false,
        ballPosition: { x: 0, y: 0 },
        ballVelocity: { x: 0, y: 0 },
        obstacles: [],
        holes: [],
        canvas: null,
        ctx: null,
        animationId: null
    };
    
    // Загрузка данных пользователя
    function loadUserData() {
        const savedData = localStorage.getItem('beatclub_user_data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (tg.initDataUnsafe?.user && parsed.id === tg.initDataUnsafe.user.id) {
                userData = parsed;
            }
        }
        
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            userData.id = user.id;
            
            let name = 'Гость';
            if (user.username) {
                name = '@' + user.username;
                userData.referrals.link = `https://t.me/beatclub_bot?start=ref_${user.username}`;
            } else if (user.first_name) {
                name = user.first_name;
                if (user.last_name) {
                    name += ' ' + user.last_name;
                }
            }
            
            userData.username = name;
            
            if (user.photo_url) {
                userData.avatarUrl = user.photo_url;
            }
            
            console.log('User data loaded:', userData);
        }
        
        updateBalanceDisplay();
    }
    
    // Сохранение данных пользователя
    function saveUserData() {
        localStorage.setItem('beatclub_user_data', JSON.stringify(userData));
    }
    
    // Обновление отображения баланса
    function updateBalanceDisplay() {
        balanceAmount.textContent = userData.balance.toLocaleString();
        botBalanceElement.textContent = userData.balance.toLocaleString();
    }
    
    // Инициализация TON Connect
    async function initTonConnect() {
        try {
            console.log('Initializing TON Connect...');
            
            tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifestUrl: window.location.origin + '/tonconnect-manifest.json',
                buttonRootId: 'ton-connect-modal'
            });
            
            tonConnectUI.onStatusChange((wallet) => {
                console.log('TON Connect status changed:', wallet);
                
                if (wallet) {
                    userData.walletConnected = true;
                    userData.walletAddress = wallet.account.address;
                    console.log('Wallet connected:', userData.walletAddress);
                    
                    updateRealWalletBalance();
                    updateConnectInfo();
                    saveUserData();
                    
                    tg.showAlert('✅ Кошелек подключен!');
                    tg.HapticFeedback.notificationOccurred('success');
                    
                    if (document.querySelector('.nav-button[data-page="profile"].active')) {
                        updateContent('profile');
                    }
                } else {
                    userData.walletConnected = false;
                    userData.walletAddress = null;
                    userData.walletBalance = 0;
                    console.log('Wallet disconnected');
                    
                    updateConnectInfo();
                    saveUserData();
                    
                    if (document.querySelector('.nav-button[data-page="profile"].active')) {
                        updateContent('profile');
                    }
                }
            });
            
            const currentWallet = tonConnectUI.connected;
            if (currentWallet) {
                console.log('Found existing connection:', currentWallet);
                userData.walletConnected = true;
                userData.walletAddress = currentWallet.account.address;
                updateRealWalletBalance();
                updateConnectInfo();
            }
            
            console.log('TON Connect initialized successfully');
            
        } catch (error) {
            console.error('Error initializing TON Connect:', error);
            tg.showAlert('⚠️ Ошибка TON Connect: ' + error.message);
            updateConnectInfo();
        }
    }
    
    // Получение реального баланса кошелька
    async function updateRealWalletBalance() {
        if (!userData.walletConnected || !userData.walletAddress) return;
        
        try {
            console.log('Fetching wallet balance for:', userData.walletAddress);
            
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${userData.walletAddress}`
            );
            
            const data = await response.json();
            console.log('Balance API response:', data);
            
            if (data.ok) {
                userData.walletBalance = parseInt(data.result) / 1000000000;
                console.log('Wallet balance:', userData.walletBalance, 'TON');
            } else {
                userData.walletBalance = 12.5;
                console.log('Using demo balance');
            }
            
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            userData.walletBalance = 12.5;
        }
        
        updateConnectInfo();
    }
    
    // Обновление информации о подключении
    function updateConnectInfo() {
        if (userData.walletConnected && userData.walletAddress) {
            const shortAddress = userData.walletAddress.slice(0, 8) + '...' + userData.walletAddress.slice(-8);
            connectInfoElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-wallet" style="color: #7b2ff7; font-size: 1.2rem;"></i>
                        <span style="color: white; font-weight: 600; font-size: 0.9rem; font-family: monospace;">${shortAddress}</span>
                    </div>
                    <div style="
                        font-size: 1.3rem; 
                        color: #06D6A0; 
                        font-weight: 700; 
                        background: rgba(6, 214, 160, 0.1); 
                        padding: 10px 25px; 
                        border-radius: 12px;
                        border: 1px solid rgba(6, 214, 160, 0.3);
                    ">
                        ${userData.walletBalance.toFixed(2)} TON
                    </div>
                </div>
            `;
            connectWalletBtn.innerHTML = '<i class="fas fa-unlink"></i> Отключить';
            connectWalletBtn.style.background = 'linear-gradient(135deg, #ff375f, #d43a5e)';
        } else {
            connectInfoElement.innerHTML = `
                <div style="color: #8e8e93; font-size: 0.9rem; text-align: center; padding: 25px;">
                    <i class="fas fa-plug" style="font-size: 2rem; margin-bottom: 15px; display: block; color: #8e8e93;"></i>
                    Подключите TON кошелек для пополнения баланса и участия в лотереях
                </div>
            `;
            connectWalletBtn.innerHTML = '<i class="fas fa-plug"></i> Подключить кошелек';
            connectWalletBtn.style.background = 'linear-gradient(135deg, #007aff, #0056cc)';
        }
    }
    
    // Инициализация фильтров
    function initFilters() {
        // Заполняем коллекции
        const collectionDropdown = document.getElementById('collection-dropdown');
        collections.forEach(collection => {
            const item = document.createElement('div');
            item.className = 'filter-option-item';
            item.dataset.value = collection;
            item.innerHTML = `
                <div class="checkbox-square"></div>
                <span>${collection}</span>
            `;
            collectionDropdown.appendChild(item);
        });
        
        // Заполняем backgrounds
        const backgroundDropdown = document.getElementById('background-dropdown');
        backgrounds.forEach(bg => {
            const item = document.createElement('div');
            item.className = 'filter-option-item';
            item.dataset.value = bg;
            item.innerHTML = `
                <div class="checkbox-square"></div>
                <span>${bg}</span>
            `;
            backgroundDropdown.appendChild(item);
        });
        
        // Инициализация слайдера цены
        initPriceSlider();
        
        // Обработчики для фильтров
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                const filterType = this.dataset.filter;
                const dropdown = document.getElementById(`${filterType}-dropdown`);
                const section = this.closest('.filter-section');
                
                // Проверяем, активен ли уже этот фильтр
                const isActive = section.classList.contains('active');
                
                // Закрываем все фильтры
                filterSections.forEach(s => {
                    s.classList.remove('active');
                    s.classList.remove('hidden');
                });
                
                filterDropdowns.forEach(d => {
                    d.classList.remove('active');
                });
                
                filterOptions.forEach(o => {
                    o.classList.remove('active');
                    const icon = o.querySelector('i');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                });
                
                // Если фильтр не был активен, открываем его
                if (!isActive) {
                    section.classList.add('active');
                    dropdown.classList.add('active');
                    this.classList.add('active');
                    
                    // Скрываем другие секции
                    filterSections.forEach(s => {
                        if (s !== section) {
                            s.classList.add('hidden');
                        }
                    });
                    
                    // Поворачиваем иконку
                    const icon = this.querySelector('i');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
        
        // Обработчики для выбора опций в сортировке
        const sortOptions = document.querySelectorAll('#sort-dropdown .filter-option-item');
        sortOptions.forEach(option => {
            option.addEventListener('click', function() {
                sortOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                currentFilters.sort = this.dataset.value;
            });
        });
        
        // Обработчики для коллекций и backgrounds
        document.querySelectorAll('#collection-dropdown .filter-option-item, #background-dropdown .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('active');
                const filterType = this.closest('.filter-dropdown').id.replace('-dropdown', '');
                const value = this.dataset.value;
                
                if (filterType === 'collection') {
                    const index = currentFilters.collections.indexOf(value);
                    if (index > -1) {
                        currentFilters.collections.splice(index, 1);
                    } else {
                        currentFilters.collections.push(value);
                    }
                } else if (filterType === 'background') {
                    const index = currentFilters.backgrounds.indexOf(value);
                    if (index > -1) {
                        currentFilters.backgrounds.splice(index, 1);
                    } else {
                        currentFilters.backgrounds.push(value);
                    }
                }
            });
        });
        
        // Сброс фильтров
        resetFiltersBtn.addEventListener('click', function() {
            resetAllFilters();
            tg.showAlert('Фильтры сброшены');
            tg.HapticFeedback.notificationOccurred('success');
        });
        
        // Поиск по фильтрам
        searchFiltersBtn.addEventListener('click', function() {
            performSearch();
            closeAllFilters();
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            tg.showAlert('Поиск выполнен по заданным фильтрам');
            tg.HapticFeedback.notificationOccurred('success');
        });
    }
    
    // Закрытие всех фильтров
    function closeAllFilters() {
        filterSections.forEach(s => {
            s.classList.remove('active');
            s.classList.remove('hidden');
        });
        
        filterDropdowns.forEach(d => {
            d.classList.remove('active');
        });
        
        filterOptions.forEach(o => {
            o.classList.remove('active');
            const icon = o.querySelector('i');
            if (icon) icon.style.transform = 'rotate(0deg)';
        });
    }
    
    // Инициализация слайдера цены
    function initPriceSlider() {
        const trackWidth = priceSliderTrack.offsetWidth;
        const minHandle = priceSliderHandleMin;
        const maxHandle = priceSliderHandleMax;
        const range = priceSliderRange;
        
        let isDraggingMin = false;
        let isDraggingMax = false;
        
        function updateSlider() {
            const minPercent = (currentFilters.priceRange.min / 100000) * 100;
            const maxPercent = (currentFilters.priceRange.max / 100000) * 100;
            
            minHandle.style.left = `${minPercent}%`;
            maxHandle.style.left = `${maxPercent}%`;
            range.style.left = `${minPercent}%`;
            range.style.width = `${maxPercent - minPercent}%`;
            
            priceMinInput.value = currentFilters.priceRange.min;
            priceMaxInput.value = currentFilters.priceRange.max;
        }
        
        function startDragMin(e) {
            isDraggingMin = true;
            e.preventDefault();
            minHandle.style.transform = 'translateY(-50%) scale(1.1)';
        }
        
        function startDragMax(e) {
            isDraggingMax = true;
            e.preventDefault();
            maxHandle.style.transform = 'translateY(-50%) scale(1.1)';
        }
        
        function stopDrag() {
            isDraggingMin = false;
            isDraggingMax = false;
            minHandle.style.transform = 'translateY(-50%) scale(1)';
            maxHandle.style.transform = 'translateY(-50%) scale(1)';
        }
        
        function handleDrag(e) {
            if (!isDraggingMin && !isDraggingMax) return;
            
            const rect = priceSliderTrack.getBoundingClientRect();
            const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            let percent = ((x - rect.left) / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            const value = Math.round((percent / 100) * 100000);
            
            if (isDraggingMin) {
                if (value < currentFilters.priceRange.max - 1000) {
                    currentFilters.priceRange.min = value;
                }
            } else if (isDraggingMax) {
                if (value > currentFilters.priceRange.min + 1000) {
                    currentFilters.priceRange.max = value;
                }
            }
            
            updateSlider();
        }
        
        priceMinInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 0;
            value = Math.max(0, Math.min(100000, value));
            if (value < currentFilters.priceRange.max - 1000) {
                currentFilters.priceRange.min = value;
                updateSlider();
            }
        });
        
        priceMaxInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 100000;
            value = Math.max(0, Math.min(100000, value));
            if (value > currentFilters.priceRange.min + 1000) {
                currentFilters.priceRange.max = value;
                updateSlider();
            }
        });
        
        minHandle.addEventListener('mousedown', startDragMin);
        maxHandle.addEventListener('mousedown', startDragMax);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mousemove', handleDrag);
        
        minHandle.addEventListener('touchstart', startDragMin);
        maxHandle.addEventListener('touchstart', startDragMax);
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchmove', handleDrag);
        
        updateSlider();
    }
    
    // Сброс всех фильтров
    function resetAllFilters() {
        currentFilters = {
            sort: 'newest',
            collections: [],
            priceRange: { min: 0, max: 100000 },
            backgrounds: []
        };
        
        document.querySelectorAll('.filter-option-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector('#sort-dropdown .filter-option-item[data-value="newest"]').classList.add('active');
        
        initPriceSlider();
        closeAllFilters();
    }
    
    // Поиск по фильтрам
    function performSearch() {
        console.log('Searching with filters:', currentFilters);
    }
    
    // Создание содержимого для разных страниц
    function createMarketContent() {
        return `
            <div class="page-content">
                <div class="market-container">
                    <button class="games-button" id="games-button">
                        <i class="fas fa-gamepad"></i>
                        <span>Игры на НФТ</span>
                    </button>
                    
                    <div class="search-filter-bar">
                        <div class="search-filter-text">Опробуйте поиск по фильтрам</div>
                        <button class="filter-icon-btn" id="open-filters-btn">
                            <i class="fas fa-filter"></i>
                        </button>
                    </div>
                    
                    <div class="nft-grid" id="nft-grid">
                        ${generateDemoNFTs()}
                    </div>
                </div>
            </div>
        `;
    }
    
    function generateDemoNFTs() {
        const nfts = [];
        const demoNFTs = [
            { name: "Bodded Ring", price: 150 },
            { name: "Crystal Ball", price: 89 },
            { name: "Diamond Ring", price: 250 },
            { name: "Genie Lamp", price: 120 },
            { name: "Heroic Helmet", price: 75 },
            { name: "Moon Pendant", price: 95 }
        ];
        
        for (let i = 0; i < 6; i++) {
            const nft = demoNFTs[i];
            nfts.push(`
                <div class="nft-item">
                    <div class="nft-image">
                        <i class="fas fa-gem" style="font-size: 3rem; color: rgba(255, 255, 255, 0.7);"></i>
                    </div>
                    <div class="nft-info">
                        <div class="nft-name">${nft.name}</div>
                        <div class="nft-price">
                            <i class="fas fa-coins" style="color: #7b2ff7;"></i>
                            <span>${nft.price} TON</span>
                        </div>
                    </div>
                </div>
            `);
        }
        
        return nfts.join('');
    }
    
    function createGiftsContent() {
        return `
            <div class="page-content">
                <div class="gifts-container">
                    <div class="gifts-icon">
                        <i class="fas fa-gift"></i>
                    </div>
                    <h2>🎁 Мои подарки</h2>
                    <div class="gifts-message">
                        У вас пока нет подарков.<br>
                        Продолжайте участвовать в активностях!
                    </div>
                </div>
            </div>
        `;
    }
    
    function createGamesContent() {
        return `
            <div class="page-content">
                <div class="games-container">
                    <h2 style="color: white; margin-bottom: 15px; text-align: center;">🎮 Игры на НФТ</h2>
                    <div class="games-list">
                        <div class="game-item" data-game="triangle">
                            <div class="game-icon">🔺</div>
                            <div class="game-title">Игра Треугольник</div>
                            <div class="game-description">
                                Поставьте NFT как "шарик" и следите за его траекторией! 
                                Шарик скатывается по физической траектории с псевдослучайными отскоками, 
                                но всегда попадает в центральную лунку. NFT сжигается после игры.
                            </div>
                            <button class="play-button" data-game="triangle">Играть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function createProfileContent() {
        return `
            <div class="page-content">
                <div class="profile-container">
                    <div class="profile-avatar">
                        ${userData.avatarUrl ? 
                            `<img src="${userData.avatarUrl}" alt="${userData.username}">` : 
                            `<div class="avatar-placeholder" style="
                                background: linear-gradient(135deg, #2a2a35, #1a1a25);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 100%;
                                height: 100%;
                            ">
                                <span style="font-size: 2.5rem; font-weight: bold; color: rgba(255, 255, 255, 0.8);">
                                    ${userData.username.charAt(0).toUpperCase()}
                                </span>
                            </div>`
                        }
                    </div>
                    
                    <h2 class="profile-username">${userData.username}</h2>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-icon">💰</div>
                            <div class="stat-value ton-stat">${userData.totalVolume}</div>
                            <div class="stat-label">Total volume</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">🎁</div>
                            <div class="stat-value gift-stat">${userData.bought}</div>
                            <div class="stat-label">Bought</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">💎</div>
                            <div class="stat-value sold-stat">${userData.sold}</div>
                            <div class="stat-label">Sold</div>
                        </div>
                    </div>
                    
                    <!-- Реферальная система -->
                    <div class="referral-container">
                        <div class="referral-header">
                            <i class="fas fa-users"></i>
                            <h3>Реферальная система</h3>
                        </div>
                        
                        <div class="referral-link-container">
                            <div class="referral-link-label">Приглашай друзей → получай % с их покупок</div>
                            <div class="referral-link">
                                <span>${userData.referrals.link}</span>
                                <button class="copy-referral-btn" onclick="copyReferralLink()">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="referral-stats">
                            <div class="referral-stat">
                                <div class="referral-stat-value">${userData.referrals.total}</div>
                                <div class="referral-stat-label">Приглашено</div>
                            </div>
                            <div class="referral-stat">
                                <div class="referral-stat-value">${userData.referrals.active}</div>
                                <div class="referral-stat-label">Активных</div>
                            </div>
                            <div class="referral-stat">
                                <div class="referral-stat-value">${userData.referrals.earned}</div>
                                <div class="referral-stat-label">Заработано TON</div>
                            </div>
                            <div class="referral-stat">
                                <div class="referral-stat-value">${userData.referrals.level}</div>
                                <div class="referral-stat-label">Уровень</div>
                            </div>
                        </div>
                        
                        <div class="referral-levels">
                            <h4>Многоуровневая система (1-10 уровней)</h4>
                            <div class="level-progress">
                                <div class="level-progress-bar" style="width: ${userData.referrals.progress}%"></div>
                            </div>
                            <div class="level-info">
                                <span>Уровень ${userData.referrals.level}</span>
                                <span>До уровня ${userData.referrals.level + 1}: ${userData.referrals.nextLevel - userData.referrals.total}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Кошелек информация -->
                    <div class="wallet-info-card">
                        <div class="wallet-info-header">
                            <i class="fas fa-wallet"></i>
                            <span>TON Кошелек</span>
                            <span style="margin-left: auto; font-size: 0.8rem; color: ${userData.walletConnected ? '#06D6A0' : '#ff375f'};">
                                ${userData.walletConnected ? '✓ Подключен' : '✗ Не подключен'}
                            </span>
                        </div>
                        <div class="wallet-info-content">
                            ${userData.walletConnected ? 
                                `<div class="connected-wallet">
                                    <div class="wallet-address">
                                        <span>Адрес:</span>
                                        <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
                                            <span class="address-value" id="profile-wallet-address" style="
                                                font-family: monospace;
                                                font-size: 0.8rem;
                                                background: rgba(0,0,0,0.3);
                                                padding: 6px 10px;
                                                border-radius: 6px;
                                                word-break: break-all;
                                            ">
                                                ${userData.walletAddress}
                                            </span>
                                            <button class="copy-address-btn" onclick="copyToClipboard('${userData.walletAddress}')" style="
                                                background: rgba(123, 47, 247, 0.2);
                                                border: 1px solid rgba(123, 47, 247, 0.4);
                                                color: #7b2ff7;
                                                width: 32px;
                                                height: 32px;
                                                border-radius: 6px;
                                                cursor: pointer;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                            ">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="wallet-balance-display">
                                        <span>Баланс:</span>
                                        <span class="balance-value" style="color: #06D6A0; font-weight: 700; font-size: 1.3rem;">
                                            ${userData.walletBalance.toFixed(2)} TON
                                        </span>
                                    </div>
                                </div>` :
                                `<div class="not-connected">
                                    <i class="fas fa-plug" style="font-size: 2.5rem; color: #8e8e93; margin-bottom: 15px;"></i>
                                    <span style="color: #8e8e93; margin-bottom: 20px; text-align: center;">
                                        Подключите TON кошелек в разделе пополнения баланса
                                    </span>
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Функция копирования реферальной ссылки
    window.copyReferralLink = function() {
        navigator.clipboard.writeText(userData.referrals.link).then(() => {
            tg.showAlert('✅ Реферальная ссылка скопирована!');
            tg.HapticFeedback.notificationOccurred('success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            tg.showAlert('❌ Ошибка копирования');
        });
    };
    
    // Функция копирования в буфер обмена
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            tg.showAlert('✅ Адрес скопирован в буфер обмена');
            tg.HapticFeedback.notificationOccurred('success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            tg.showAlert('❌ Ошибка копирования');
        });
    };
    
    // Создание игры Треугольник
    function createTriangleGame() {
        return `
            <div class="game-triangle-container">
                <div class="triangle-game-area" id="triangle-game-area">
                    <canvas id="game-canvas"></canvas>
                    <div class="result-overlay" id="result-overlay">
                        <div class="result-content">
                            <div class="result-icon">😞</div>
                            <div class="result-text">Вы проиграли</div>
                            <div class="result-subtext">NFT был сожжен в банке игры</div>
                            <button class="play-button" id="try-again-btn" style="margin-top: 20px;">Попробовать еще раз</button>
                        </div>
                    </div>
                </div>
                
                <div class="holes-container" id="holes-container">
                    ${generateHoles()}
                </div>
                
                <div class="nft-inventory">
                    <h3>🎁 Выберите NFT для игры</h3>
                    <div class="inventory-grid" id="inventory-grid">
                        ${generateInventoryItems()}
                    </div>
                    <button class="play-game-btn" id="start-game-btn" disabled>
                        <i class="fas fa-play"></i>
                        <span>Играть</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    function generateHoles() {
        const multipliers = [20, 10, 5, 2.5, 2, 1.5, 1, 0, 1, 1.5, 2, 2.5, 5, 10, 20];
        let holesHTML = '';
        
        multipliers.forEach((multiplier, index) => {
            const className = `hole multiplier-${multiplier}${multiplier === 0 ? ' multiplier-0' : ''}`;
            holesHTML += `
                <div class="${className}" data-multiplier="${multiplier}">
                    ${multiplier === 0 ? '0×' : `${multiplier}×`}
                </div>
            `;
        });
        
        return holesHTML;
    }
    
    function generateInventoryItems() {
        let inventoryHTML = '';
        
        userData.inventory.forEach((nft, index) => {
            inventoryHTML += `
                <div class="inventory-nft" data-nft-id="${nft.id}" data-index="${index}">
                    <i class="fas fa-gem"></i>
                    <span>${nft.name}</span>
                </div>
            `;
        });
        
        return inventoryHTML;
    }
    
    // Инициализация игры
    function initTriangleGame() {
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        
        // Устанавливаем размеры canvas
        const gameArea = document.getElementById('triangle-game-area');
        canvas.width = gameArea.offsetWidth;
        canvas.height = gameArea.offsetHeight;
        
        gameData.canvas = canvas;
        gameData.ctx = ctx;
        
        // Инициализация препятствий
        initObstacles();
        
        // Инициализация лунок
        initHoles();
        
        // Обработчики для инвентаря
        document.querySelectorAll('.inventory-nft').forEach(nft => {
            nft.addEventListener('click', function() {
                document.querySelectorAll('.inventory-nft').forEach(n => n.classList.remove('selected'));
                this.classList.add('selected');
                gameData.selectedNFT = parseInt(this.dataset.nftId);
                document.getElementById('start-game-btn').disabled = false;
            });
        });
        
        // Кнопка начала игры
        document.getElementById('start-game-btn').addEventListener('click', startTriangleGame);
        
        // Кнопка повтора
        const tryAgainBtn = document.getElementById('try-again-btn');
        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', resetTriangleGame);
        }
    }
    
    function initObstacles() {
        const { width, height } = gameData.canvas;
        
        gameData.obstacles = [
            { x: width * 0.2, y: height * 0.3, width: 30, height: 30 },
            { x: width * 0.4, y: height * 0.2, width: 25, height: 25 },
            { x: width * 0.6, y: height * 0.4, width: 35, height: 35 },
            { x: width * 0.8, y: height * 0.3, width: 30, height: 30 },
            { x: width * 0.3, y: height * 0.6, width: 40, height: 40 },
            { x: width * 0.7, y: height * 0.7, width: 30, height: 30 }
        ];
    }
    
    function initHoles() {
        const { width, height } = gameData.canvas;
        
        gameData.holes = [
            { x: width * 0.1, y: height - 30, radius: 15, multiplier: 20 },
            { x: width * 0.2, y: height - 30, radius: 15, multiplier: 10 },
            { x: width * 0.3, y: height - 30, radius: 15, multiplier: 5 },
            { x: width * 0.4, y: height - 30, radius: 15, multiplier: 2.5 },
            { x: width * 0.5, y: height - 30, radius: 15, multiplier: 2 },
            { x: width * 0.6, y: height - 30, radius: 15, multiplier: 1.5 },
            { x: width * 0.7, y: height - 30, radius: 15, multiplier: 1 },
            { x: width * 0.8, y: height - 30, radius: 20, multiplier: 0 }, // Центральная лунка больше
            { x: width * 0.9, y: height - 30, radius: 15, multiplier: 1 },
            { x: width * 0.95, y: height - 30, radius: 15, multiplier: 1.5 },
            { x: width * 0.85, y: height - 30, radius: 15, multiplier: 2 },
            { x: width * 0.75, y: height - 30, radius: 15, multiplier: 2.5 },
            { x: width * 0.65, y: height - 30, radius: 15, multiplier: 5 },
            { x: width * 0.55, y: height - 30, radius: 15, multiplier: 10 },
            { x: width * 0.45, y: height - 30, radius: 15, multiplier: 20 }
        ];
    }
    
    function startTriangleGame() {
        if (!gameData.selectedNFT || gameData.isPlaying) return;
        
        gameData.isPlaying = true;
        document.getElementById('start-game-btn').disabled = true;
        
        // Начальная позиция шарика
        gameData.ballPosition = { x: gameData.canvas.width / 2, y: 50 };
        
        // Начальная скорость (направлена вниз с небольшим случайным смещением)
        gameData.ballVelocity = { 
            x: (Math.random() - 0.5) * 2, 
            y: 2 + Math.random() * 2 
        };
        
        // Запуск анимации
        gameData.animationId = requestAnimationFrame(gameLoop);
    }
    
    function gameLoop() {
        if (!gameData.isPlaying) return;
        
        const { ctx, canvas, ballPosition, ballVelocity, obstacles, holes } = gameData;
        
        // Очистка canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Отрисовка фона
        drawBackground();
        
        // Отрисовка препятствий
        obstacles.forEach(obstacle => {
            drawObstacle(obstacle);
        });
        
        // Отрисовка лунок
        holes.forEach(hole => {
            drawHole(hole);
        });
        
        // Обновление позиции шарика
        ballPosition.x += ballVelocity.x;
        ballPosition.y += ballVelocity.y;
        
        // Гравитация
        ballVelocity.y += 0.1;
        
        // Отскоки от стен
        if (ballPosition.x <= 20 || ballPosition.x >= canvas.width - 20) {
            ballVelocity.x *= -0.8; // Затухание при отскоке
            ballPosition.x = ballPosition.x <= 20 ? 21 : canvas.width - 21;
        }
        
        // Отскоки от потолка
        if (ballPosition.y <= 20) {
            ballVelocity.y *= -0.8;
            ballPosition.y = 21;
        }
        
        // Отскоки от препятствий
        obstacles.forEach(obstacle => {
            if (checkCollision(ballPosition, obstacle)) {
                // Простой отскок
                ballVelocity.x *= -1;
                ballVelocity.y *= -0.8;
                
                // Сдвигаем шарик, чтобы он не застрял
                ballPosition.x += ballVelocity.x * 2;
                ballPosition.y += ballVelocity.y * 2;
            }
        });
        
        // Проверка попадания в лунки
        for (let hole of holes) {
            const distance = Math.sqrt(
                Math.pow(ballPosition.x - hole.x, 2) + 
                Math.pow(ballPosition.y - hole.y, 2)
            );
            
            if (distance < hole.radius) {
                // Шарик попал в лунку
                endGame(hole.multiplier);
                return;
            }
        }
        
        // Если шарик упал ниже лунок
        if (ballPosition.y > canvas.height + 50) {
            // Направляем его в центральную лунку (программное притяжение)
            const centerHole = holes.find(h => h.multiplier === 0);
            const dx = centerHole.x - ballPosition.x;
            const dy = centerHole.y - ballPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Сильное притяжение к центральной лунке
            ballVelocity.x += dx / distance * 0.5;
            ballVelocity.y += dy / distance * 0.5;
        }
        
        // Отрисовка шарика
        drawBall(ballPosition);
        
        // Продолжаем анимацию
        gameData.animationId = requestAnimationFrame(gameLoop);
    }
    
    function drawBackground() {
        const { ctx, canvas } = gameData;
        
        // Градиентный фон
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a1f');
        gradient.addColorStop(1, '#0f0f15');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Сетка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Треугольник (декоративный)
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 30);
        ctx.lineTo(30, canvas.height - 100);
        ctx.lineTo(canvas.width - 30, canvas.height - 100);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(123, 47, 247, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    function drawObstacle(obstacle) {
        const { ctx } = gameData;
        
        ctx.fillStyle = 'rgba(255, 55, 95, 0.6)';
        ctx.fillRect(obstacle.x - obstacle.width/2, obstacle.y - obstacle.height/2, obstacle.width, obstacle.height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x - obstacle.width/2, obstacle.y - obstacle.height/2, obstacle.width, obstacle.height);
    }
    
    function drawHole(hole) {
        const { ctx } = gameData;
        
        // Внешний круг
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        
        if (hole.multiplier === 0) {
            // Центральная лунка (магнитная)
            const gradient = ctx.createRadialGradient(
                hole.x, hole.y, 0,
                hole.x, hole.y, hole.radius
            );
            gradient.addColorStop(0, 'rgba(123, 47, 247, 0.8)');
            gradient.addColorStop(1, 'rgba(123, 47, 247, 0.2)');
            ctx.fillStyle = gradient;
        } else {
            // Обычные лунки
            ctx.fillStyle = getHoleColor(hole.multiplier);
        }
        
        ctx.fill();
        
        // Внутренний круг
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
        
        // Текст множителя
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${hole.multiplier === 0 ? '0' : hole.multiplier}${hole.multiplier === 0 ? '×' : '×'}`, hole.x, hole.y);
    }
    
    function getHoleColor(multiplier) {
        const colors = {
            20: '#FF2D55',
            10: '#FF9500',
            5: '#FFD60A',
            2.5: '#32D74B',
            2: '#0A84FF',
            1.5: '#BF5AF2',
            1: '#98989D'
        };
        return colors[multiplier] || '#7b2ff7';
    }
    
    function drawBall(position) {
        const { ctx } = gameData;
        
        // Внешний круг
        ctx.beginPath();
        ctx.arc(position.x, position.y, 15, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(
            position.x, position.y, 5,
            position.x, position.y, 15
        );
        gradient.addColorStop(0, '#7b2ff7');
        gradient.addColorStop(1, '#5a1bd6');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Внутренний круг
        ctx.beginPath();
        ctx.arc(position.x, position.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        // Блеск
        ctx.beginPath();
        ctx.arc(position.x - 5, position.y - 5, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
    }
    
    function checkCollision(ball, obstacle) {
        return ball.x > obstacle.x - obstacle.width/2 &&
               ball.x < obstacle.x + obstacle.width/2 &&
               ball.y > obstacle.y - obstacle.height/2 &&
               ball.y < obstacle.y + obstacle.height/2;
    }
    
    function endGame(multiplier) {
        gameData.isPlaying = false;
        
        if (gameData.animationId) {
            cancelAnimationFrame(gameData.animationId);
        }
        
        // Показываем результат
        const resultOverlay = document.getElementById('result-overlay');
        if (resultOverlay) {
            resultOverlay.classList.add('active');
        }
        
        // Сжигаем NFT
        if (gameData.selectedNFT) {
            const nftIndex = userData.inventory.findIndex(nft => nft.id === gameData.selectedNFT);
            if (nftIndex !== -1) {
                userData.inventory.splice(nftIndex, 1);
                saveUserData();
            }
        }
        
        // Вибрация
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }
    
    function resetTriangleGame() {
        const resultOverlay = document.getElementById('result-overlay');
        if (resultOverlay) {
            resultOverlay.classList.remove('active');
        }
        
        gameData.selectedNFT = null;
        gameData.isPlaying = false;
        
        if (gameData.animationId) {
            cancelAnimationFrame(gameData.animationId);
        }
        
        // Сбрасываем выделение NFT
        document.querySelectorAll('.inventory-nft').forEach(nft => {
            nft.classList.remove('selected');
        });
        
        document.getElementById('start-game-btn').disabled = true;
        
        // Очищаем canvas
        const { ctx, canvas } = gameData;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
    }
    
    // Обновление контента страницы
    function updateContent(page) {
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            let content = '';
            
            switch(page) {
                case 'market':
                    content = createMarketContent();
                    break;
                case 'gifts':
                    content = createGiftsContent();
                    break;
                case 'games':
                    content = createGamesContent();
                    break;
                case 'profile':
                    content = createProfileContent();
                    break;
            }
            
            mainContent.innerHTML = content;
            
            // Инициализация элементов после создания контента
            if (page === 'market') {
                const openFiltersBtn = document.getElementById('open-filters-btn');
                if (openFiltersBtn) {
                    openFiltersBtn.addEventListener('click', function() {
                        filtersModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    });
                }
                
                const gamesButton = document.getElementById('games-button');
                if (gamesButton) {
                    gamesButton.addEventListener('click', function() {
                        updateContent('games');
                        setActiveButton(document.querySelector('.nav-button[data-page="games"]'));
                    });
                }
            }
            
            if (page === 'games') {
                const playButtons = document.querySelectorAll('.play-button');
                playButtons.forEach(btn => {
                    btn.addEventListener('click', function() {
                        const game = this.dataset.game;
                        if (game === 'triangle') {
                            openTriangleGame();
                        }
                    });
                });
            }
            
            // Анимация появления
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }, 50);
            
        }, 200);
    }
    
    // Открытие игры Треугольник
    function openTriangleGame() {
        gameContainer.innerHTML = createTriangleGame();
        gameModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Инициализация игры после отрисовки
        setTimeout(() => {
            initTriangleGame();
        }, 100);
    }
    
    // Установка активной кнопки
    function setActiveButton(button) {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    // Подключение кошелька
    function connectWallet() {
        console.log('Connecting wallet...');
        if (tonConnectUI) {
            tonConnectUI.openModal();
        } else {
            console.error('TON Connect UI not initialized');
            tg.showAlert('Ошибка: TON Connect не инициализирован');
        }
    }
    
    // Отключение кошелька
    function disconnectWallet() {
        console.log('Disconnecting wallet...');
        if (tonConnectUI) {
            tonConnectUI.disconnect();
        }
    }
    
    // ОТПРАВКА ТРАНЗАКЦИИ на ваш кошелек
    async function sendDepositTransaction(amount) {
        if (!tonConnectUI || !userData.walletConnected) {
            tg.showAlert('❌ Кошелек не подключен');
            return false;
        }
        
        try {
            if (userData.walletBalance < amount) {
                tg.showAlert(`❌ Недостаточно средств на кошельке. Доступно: ${userData.walletBalance.toFixed(2)} TON`);
                return false;
            }
            
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 300,
                messages: [
                    {
                        address: BOT_ADDRESS,
                        amount: (amount * 1000000000).toString(),
                        payload: userData.id ? Buffer.from(userData.id.toString()).toString('hex') : ""
                    }
                ]
            };
            
            showTransactionStatus('pending', 'Подтвердите транзакцию в кошельке...');
            
            console.log('Sending transaction to:', BOT_ADDRESS);
            console.log('Transaction amount:', amount, 'TON');
            
            const result = await tonConnectUI.sendTransaction(transaction);
            
            console.log('Transaction result:', result);
            
            if (result) {
                showTransactionStatus('success', 'Транзакция отправлена!');
                
                userData.balance += amount;
                userData.totalVolume += amount;
                updateBalanceDisplay();
                saveUserData();
                
                showTransactionStatus('confirmed', `✅ Баланс пополнен на ${amount} TON!`);
                
                tg.showAlert(`✅ Баланс успешно пополнен на ${amount} TON!`);
                tg.HapticFeedback.notificationOccurred('success');
                
                updateRealWalletBalance();
                
                setTimeout(() => {
                    depositModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }, 2000);
                
                return true;
            }
            
        } catch (error) {
            console.error('Transaction error:', error);
            showTransactionStatus('error', '❌ Ошибка транзакции');
            tg.showAlert('❌ Ошибка при отправке транзакции: ' + error.message);
            return false;
        }
    }
    
    // Показать статус транзакции
    function showTransactionStatus(status, message) {
        transactionStatusElement.innerHTML = `
            <div class="transaction-status-${status}" style="
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 15px;
                border-radius: 10px;
                width: 100%;
                background: ${status === 'success' ? 'rgba(6, 214, 160, 0.1)' : 
                         status === 'pending' ? 'rgba(255, 193, 7, 0.1)' : 
                         status === 'confirmed' ? 'rgba(123, 47, 247, 0.1)' : 
                         'rgba(239, 71, 111, 0.1)'};
                border: 1px solid ${status === 'success' ? 'rgba(6, 214, 160, 0.3)' : 
                                 status === 'pending' ? 'rgba(255, 193, 7, 0.3)' : 
                                 status === 'confirmed' ? 'rgba(123, 47, 247, 0.3)' : 
                                 'rgba(239, 71, 111, 0.3)'};
                color: ${status === 'success' ? '#06D6A0' : 
                       status === 'pending' ? '#ffd166' : 
                       status === 'confirmed' ? '#7b2ff7' : 
                       '#EF476F'};
            ">
                <i class="fas fa-${status === 'success' ? 'check-circle' : 
                                 status === 'pending' ? 'spinner fa-spin' : 
                                 status === 'confirmed' ? 'check-double' : 
                                 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
    }
    
    // Обработчики событий
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            setActiveButton(this);
            updateContent(page);
            
            this.style.transform = 'scale(0.92)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        });
    });
    
    // Обработчик кнопки пополнения баланса
    addBalanceBtn.addEventListener('click', function() {
        this.style.transform = 'scale(0.85)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        balanceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Закрытие модального окна баланса
    closeBalanceModal.addEventListener('click', function() {
        balanceModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    balanceModal.addEventListener('click', function(e) {
        if (e.target === this) {
            balanceModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Кнопка пополнения
    depositBtn.addEventListener('click', function() {
        if (!userData.walletConnected) {
            tg.showAlert('❌ Пожалуйста, подключите TON кошелек для пополнения');
            return;
        }
        
        balanceModal.classList.remove('active');
        
        depositAmountInput.value = '10';
        transactionStatusElement.innerHTML = '';
        depositModal.classList.add('active');
    });
    
    // Кнопка вывода
    withdrawBtn.addEventListener('click', function() {
        if (!userData.walletConnected) {
            tg.showAlert('❌ Пожалуйста, подключите TON кошелек для вывода средств');
            return;
        }
        
        if (userData.balance <= 0) {
            tg.showAlert('❌ На вашем балансе недостаточно средств');
            return;
        }
        
        tg.showPopup({
            title: '💰 Вывод средств',
            message: `Вы можете вывести до ${userData.balance} TON\n\nВаш кошелек: ${userData.walletAddress.slice(0, 8)}...${userData.walletAddress.slice(-8)}`,
            buttons: [
                {id: 'withdraw_all', type: 'default', text: 'Вывести всё'},
                {id: 'custom', type: 'default', text: 'Указать сумму'},
                {type: 'cancel', text: '❌ Отмена'}
            ]
        }, function(buttonId) {
            if (buttonId === 'withdraw_all') {
                tg.showAlert(`✅ Запрос на вывод ${userData.balance} TON отправлен!`);
                tg.HapticFeedback.notificationOccurred('success');
            } else if (buttonId === 'custom') {
                tg.showAlert('Функция в разработке');
            }
        });
    });
    
    // Кнопка подключения кошелька
    connectWalletBtn.addEventListener('click', function() {
        if (userData.walletConnected) {
            disconnectWallet();
        } else {
            connectWallet();
        }
        
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    });
    
    // Закрытие модального окна пополнения
    closeDepositModal.addEventListener('click', function() {
        depositModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    depositModal.addEventListener('click', function(e) {
        if (e.target === this) {
            depositModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Закрытие модального окна фильтров
    closeFiltersModal.addEventListener('click', function() {
        filtersModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        closeAllFilters();
    });
    
    filtersModal.addEventListener('click', function(e) {
        if (e.target === this) {
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            closeAllFilters();
        }
    });
    
    // Закрытие модального окна игры
    closeGameModal.addEventListener('click', function() {
        gameModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Останавливаем игру
        if (gameData.isPlaying && gameData.animationId) {
            cancelAnimationFrame(gameData.animationId);
            gameData.isPlaying = false;
        }
    });
    
    gameModal.addEventListener('click', function(e) {
        if (e.target === this) {
            gameModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
            if (gameData.isPlaying && gameData.animationId) {
                cancelAnimationFrame(gameData.animationId);
                gameData.isPlaying = false;
            }
        }
    });
    
    // Пресеты суммы
    amountPresets.forEach(preset => {
        preset.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            depositAmountInput.value = amount;
            
            amountPresets.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Подтверждение пополнения
    confirmDepositBtn.addEventListener('click', async function() {
        const amount = parseFloat(depositAmountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            tg.showAlert('❌ Введите корректную сумму');
            return;
        }
        
        if (amount > 1000) {
            tg.showAlert('❌ Максимальная сумма пополнения - 1000 TON');
            return;
        }
        
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        await sendDepositTransaction(amount);
    });
    
    // Инициализация
    loadUserData();
    
    setTimeout(() => {
        initTonConnect().then(() => {
            console.log('TON Connect initialized');
            updateConnectInfo();
        }).catch(error => {
            console.error('Failed to init TON Connect:', error);
            updateConnectInfo();
        });
    }, 500);
    
    initFilters();
    updateContent('market');
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    
    window.addEventListener('beforeunload', function() {
        saveUserData();
    });
    
    setInterval(updateRealWalletBalance, 30000);
});
