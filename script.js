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
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const searchFiltersBtn = document.getElementById('search-filters-btn');
    const priceSliderTrack = document.getElementById('price-slider-track');
    const priceSliderRange = document.getElementById('price-slider-range');
    const priceSliderHandleMin = document.getElementById('price-slider-handle-min');
    const priceSliderHandleMax = document.getElementById('price-slider-handle-max');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    
    // Контейнер фильтров
    const filtersContainer = document.querySelector('.filters-container');
    
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
        totalVolume: 0
    };
    
    // Ваш кошелек для пополнения
    const BOT_ADDRESS = "UQBhcIzPNZJXa1nWLypYIvO-ybYhBSZEGyH-6MDRdaKyzEJV";
    
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
    
    // Флаг для управления анимациями фильтров
    let isFilterAnimating = false;
    
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
            } else if (user.first_name) {
                name = user.first_name;
                if (user.last_name) {
                    name += ' ' + user.last_name;
                }
            }
            
            userData.username = name;
            
            loadUserAvatar(user);
            
            console.log('User data loaded:', userData);
        }
        
        updateBalanceDisplay();
    }
    
    // Сохранение данных пользователя
    function saveUserData() {
        localStorage.setItem('beatclub_user_data', JSON.stringify(userData));
    }
    
    // Загрузка аватарки пользователя
    function loadUserAvatar(user) {
        if (user.photo_url) {
            userData.avatarUrl = user.photo_url;
        }
    }
    
    // Обновление отображения баланса
    function updateBalanceDisplay() {
        balanceAmount.textContent = userData.balance.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        botBalanceElement.textContent = userData.balance.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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
            
            // Используем TON Center API для получения баланса
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
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 20px; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                        <i class="fas fa-wallet" style="color: #7b2ff7; font-size: 1.3rem;"></i>
                        <span style="color: white; font-weight: 600; font-size: 0.95rem; font-family: monospace; flex: 1;">${shortAddress}</span>
                    </div>
                    <div style="
                        font-size: 1.5rem; 
                        color: #06D6A0; 
                        font-weight: 800; 
                        background: linear-gradient(135deg, rgba(6, 214, 160, 0.15), rgba(4, 169, 127, 0.1));
                        padding: 15px 30px; 
                        border-radius: 15px;
                        border: 1px solid rgba(6, 214, 160, 0.3);
                        width: 100%;
                        text-align: center;
                    ">
                        ${userData.walletBalance.toFixed(2)} TON
                    </div>
                    <div style="color: #8e8e93; font-size: 0.85rem; text-align: center; width: 100%; padding: 10px;">
                        <i class="fas fa-check-circle" style="color: #06D6A0; margin-right: 8px;"></i> 
                        Кошелек подключен для пополнения баланса
                    </div>
                </div>
            `;
            connectWalletBtn.innerHTML = '<i class="fas fa-unlink"></i> Отключить';
            connectWalletBtn.style.background = 'linear-gradient(135deg, #ff375f, #d43a5e)';
        } else {
            connectInfoElement.innerHTML = `
                <div style="color: #8e8e93; font-size: 0.9rem; text-align: center; padding: 30px; width: 100%;">
                    <i class="fas fa-plug" style="font-size: 2.2rem; margin-bottom: 20px; display: block; color: #8e8e93;"></i>
                    Подключите TON кошелек для пополнения баланса
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
        
        // Активируем первую опцию в сортировке
        document.querySelector('#sort-dropdown .filter-option-item[data-value="newest"]').classList.add('active');
        
        // Обработчики для фильтров
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                if (isFilterAnimating) return;
                
                const filterType = this.dataset.filter;
                const dropdown = document.getElementById(`${filterType}-dropdown`);
                const filterSection = this.closest('.filter-section');
                
                // Если этот фильтр уже активен, закрываем его
                if (dropdown.classList.contains('active')) {
                    closeFilter(dropdown, filterSection, this);
                } else {
                    // Закрываем все остальные дропдауны
                    closeAllFilters();
                    // Открываем текущий
                    openFilter(dropdown, filterSection, this);
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
        
        // Обработчики для коллекций и backgrounds (множественный выбор)
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
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            tg.showAlert('Поиск выполнен по заданным фильтрам');
            tg.HapticFeedback.notificationOccurred('success');
        });
    }
    
    // Открытие фильтра с анимацией
    function openFilter(dropdown, filterSection, button) {
        isFilterAnimating = true;
        
        // Добавляем класс активного фильтра
        filterSection.classList.add('active');
        dropdown.classList.add('active');
        button.classList.add('active');
        
        // Добавляем класс для скрытия других фильтров
        filtersContainer.classList.add('single-filter-active');
        
        // Обновляем иконку стрелки
        const icon = button.querySelector('i');
        icon.style.transform = 'rotate(180deg)';
        
        setTimeout(() => {
            isFilterAnimating = false;
        }, 400);
    }
    
    // Закрытие фильтра с анимацией
    function closeFilter(dropdown, filterSection, button) {
        isFilterAnimating = true;
        
        // Убираем классы
        dropdown.classList.remove('active');
        button.classList.remove('active');
        filterSection.classList.remove('active');
        
        // Убираем класс для скрытия других фильтров
        filtersContainer.classList.remove('single-filter-active');
        
        // Обновляем иконку стрелки
        const icon = button.querySelector('i');
        icon.style.transform = 'rotate(0deg)';
        
        setTimeout(() => {
            isFilterAnimating = false;
        }, 400);
    }
    
    // Закрытие всех фильтров
    function closeAllFilters() {
        filterDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
        
        filterOptions.forEach(option => {
            option.classList.remove('active');
            const icon = option.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(0deg)';
            }
        });
        
        document.querySelectorAll('.filter-section').forEach(section => {
            section.classList.remove('active');
        });
        
        filtersContainer.classList.remove('single-filter-active');
    }
    
    // Инициализация слайдера цены
    function initPriceSlider() {
        const trackWidth = priceSliderTrack.offsetWidth;
        const minHandle = priceSliderHandleMin;
        const maxHandle = priceSliderHandleMax;
        const range = priceSliderRange;
        
        let isDraggingMin = false;
        let isDraggingMax = false;
        
        // Позиционируем элементы
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
        
        // Обработчики для ползунков
        function startDragMin(e) {
            isDraggingMin = true;
            e.preventDefault();
            tg.HapticFeedback.impactOccurred('light');
        }
        
        function startDragMax(e) {
            isDraggingMax = true;
            e.preventDefault();
            tg.HapticFeedback.impactOccurred('light');
        }
        
        function stopDrag() {
            isDraggingMin = false;
            isDraggingMax = false;
        }
        
        function handleDrag(e) {
            if (!isDraggingMin && !isDraggingMax) return;
            
            const rect = priceSliderTrack.getBoundingClientRect();
            const x = e.clientX - rect.left;
            let percent = (x / rect.width) * 100;
            percent = Math.max(0, Math.min(100, percent));
            const value = Math.round((percent / 100) * 100000);
            
            if (isDraggingMin) {
                if (value < currentFilters.priceRange.max) {
                    currentFilters.priceRange.min = value;
                }
            } else if (isDraggingMax) {
                if (value > currentFilters.priceRange.min) {
                    currentFilters.priceRange.max = value;
                }
            }
            
            updateSlider();
        }
        
        // Обработчики для инпутов
        priceMinInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 0;
            value = Math.max(0, Math.min(100000, value));
            if (value < currentFilters.priceRange.max) {
                currentFilters.priceRange.min = value;
                updateSlider();
            }
        });
        
        priceMaxInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 100000;
            value = Math.max(0, Math.min(100000, value));
            if (value > currentFilters.priceRange.min) {
                currentFilters.priceRange.max = value;
                updateSlider();
            }
        });
        
        // Добавляем обработчики событий
        minHandle.addEventListener('mousedown', startDragMin);
        maxHandle.addEventListener('mousedown', startDragMax);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mousemove', handleDrag);
        
        // Для touch устройств
        minHandle.addEventListener('touchstart', (e) => {
            startDragMin(e.touches[0]);
        });
        maxHandle.addEventListener('touchstart', (e) => {
            startDragMax(e.touches[0]);
        });
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchmove', (e) => {
            handleDrag(e.touches[0]);
        });
        
        // Инициализация
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
        
        // Сброс UI
        document.querySelectorAll('.filter-option-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Активируем первую опцию в сортировке
        document.querySelector('#sort-dropdown .filter-option-item[data-value="newest"]').classList.add('active');
        
        // Обновляем слайдер
        initPriceSlider();
        
        // Закрываем все открытые фильтры
        closeAllFilters();
    }
    
    // Поиск по фильтрам
    function performSearch() {
        console.log('Searching with filters:', currentFilters);
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    // Создание содержимого для разных страниц
    function createMarketContent() {
        return `
            <div class="page-content">
                <div class="market-container">
                    <div class="search-filter-bar">
                        <div class="search-filter-text">Найдите нужные NFT с помощью фильтров</div>
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
                <div class="nft-item" style="animation-delay: ${0.1 * i}s">
                    <div class="nft-image">
                        <i class="fas fa-gem"></i>
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
                    <div class="gifts-icon">🎁</div>
                    <h2 style="color: white; margin-bottom: 15px; font-weight: 800;">Мои подарки</h2>
                    <div class="gifts-message">
                        У вас пока нет подарков.<br>
                        Продолжайте участвовать в активностях!
                    </div>
                </div>
            </div>
        `;
    }
    
    function createSeasonContent() {
        return `
            <div class="page-content">
                <div class="season-container">
                    <div class="season-icon">📅</div>
                    <h2 style="color: white; margin-bottom: 15px; font-weight: 800;">Сезон</h2>
                    <div class="season-message">
                        Раздел в разработке.<br>
                        Следите за обновлениями!
                    </div>
                </div>
            </div>
        `;
    }
    
    function createProfileContent() {
        const walletStatus = userData.walletConnected ? 
            `<span style="color: #06D6A0; font-weight: 700;">✓ Подключен</span>` : 
            `<span style="color: #8e8e93; font-weight: 600;">✗ Не подключен</span>`;
        
        return `
            <div class="page-content">
                <div class="profile-container">
                    <div class="profile-avatar">
                        ${userData.avatarUrl ? 
                            `<img src="${userData.avatarUrl}" alt="${userData.username}">` : 
                            `<div class="avatar-placeholder">
                                <span>${userData.username.charAt(0).toUpperCase()}</span>
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
                    
                    <div class="wallet-info-card">
                        <div class="wallet-info-header">
                            <i class="fas fa-wallet"></i>
                            <span>TON Кошелек</span>
                            ${walletStatus}
                        </div>
                        <div class="wallet-info-content">
                            ${userData.walletConnected ? 
                                `<div class="connected-wallet">
                                    <div class="wallet-address">
                                        <span>Адрес:</span>
                                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                                            <span class="address-value">
                                                ${userData.walletAddress}
                                            </span>
                                            <button class="copy-address-btn" onclick="copyToClipboard('${userData.walletAddress}')">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="wallet-balance-display">
                                        <span>Баланс:</span>
                                        <span class="balance-value">
                                            ${userData.walletBalance.toFixed(2)} TON
                                        </span>
                                    </div>
                                </div>` :
                                `<div class="not-connected">
                                    <i class="fas fa-wallet"></i>
                                    <p>Кошелёк не подключен</p>
                                    <p>Для подключения перейдите в раздел пополнения баланса</p>
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
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
    
    // Обновление контента страницы
    function updateContent(page) {
        // Анимация исчезновения
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
                case 'season':
                    content = createSeasonContent();
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
                        tg.HapticFeedback.impactOccurred('light');
                    });
                }
            }
            
            // Анимация появления
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }, 50);
            
        }, 200);
    }
    
    // Установка активной кнопки
    function setActiveButton(button) {
        navButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
    }
    
    // Подключение кошелька
    function connectWallet() {
        console.log('Connecting wallet...');
        if (tonConnectUI) {
            tonConnectUI.openModal();
            tg.HapticFeedback.impactOccurred('medium');
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
            tg.HapticFeedback.impactOccurred('medium');
        }
    }
    
    // ОТПРАВКА ТРАНЗАКЦИИ на ваш кошелек
    async function sendDepositTransaction(amount) {
        if (!tonConnectUI || !userData.walletConnected) {
            tg.showAlert('❌ Кошелек не подключен');
            return false;
        }
        
        try {
            // Проверяем баланс пользователя
            if (userData.walletBalance < amount) {
                tg.showAlert(`❌ Недостаточно средств на кошельке. Доступно: ${userData.walletBalance.toFixed(2)} TON`);
                return false;
            }
            
            // Создаем транзакцию на ВАШ кошелек
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
            
            // Показываем статус
            showTransactionStatus('pending', 'Подтвердите транзакцию в кошельке...');
            
            // Отправляем транзакцию
            console.log('Sending transaction to:', BOT_ADDRESS);
            console.log('Transaction amount:', amount, 'TON');
            
            const result = await tonConnectUI.sendTransaction(transaction);
            
            console.log('Transaction result:', result);
            
            if (result) {
                // Транзакция отправлена успешно
                showTransactionStatus('success', 'Транзакция отправлена!');
                
                // В демо-версии сразу обновляем баланс
                userData.balance += amount;
                userData.totalVolume += amount;
                updateBalanceDisplay();
                saveUserData();
                
                setTimeout(() => {
                    showTransactionStatus('confirmed', `✅ Баланс пополнен на ${amount} TON!`);
                }, 1000);
                
                tg.showAlert(`✅ Баланс успешно пополнен на ${amount} TON!`);
                tg.HapticFeedback.notificationOccurred('success');
                
                // Обновляем баланс кошелька
                updateRealWalletBalance();
                
                // Закрываем модальное окно через 2 секунды
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
        const icon = status === 'pending' ? 'fa-spinner fa-spin' :
                     status === 'success' ? 'fa-check-circle' :
                     status === 'confirmed' ? 'fa-check-double' :
                     'fa-exclamation-circle';
        
        transactionStatusElement.innerHTML = `
            <div class="transaction-status-${status}">
                <i class="fas ${icon}"></i>
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
            
            // Эффект нажатия
            this.style.transform = 'scale(0.92)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            // Вибрация
            tg.HapticFeedback.impactOccurred('light');
        });
    });
    
    // Обработчик кнопки пополнения баланса
    addBalanceBtn.addEventListener('click', function() {
        // Эффект нажатия
        this.style.transform = 'scale(0.85)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        // Вибрация
        tg.HapticFeedback.impactOccurred('light');
        
        // Показать модальное окно
        balanceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Закрытие модального окна баланса
    closeBalanceModal.addEventListener('click', function() {
        balanceModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        tg.HapticFeedback.impactOccurred('light');
    });
    
    // Клик вне модального окна баланса
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
        
        // Закрываем окно баланса
        balanceModal.classList.remove('active');
        
        // Показываем окно пополнения
        depositAmountInput.value = '10';
        transactionStatusElement.innerHTML = '';
        depositModal.classList.add('active');
        
        tg.HapticFeedback.impactOccurred('light');
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
        
        tg.HapticFeedback.impactOccurred('light');
    });
    
    // Кнопка подключения кошелька
    connectWalletBtn.addEventListener('click', function() {
        if (userData.walletConnected) {
            disconnectWallet();
        } else {
            connectWallet();
        }
        
        // Эффект нажатия
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        tg.HapticFeedback.impactOccurred('light');
    });
    
    // Закрытие модального окна пополнения
    closeDepositModal.addEventListener('click', function() {
        depositModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        tg.HapticFeedback.impactOccurred('light');
    });
    
    // Клик вне модального окна пополнения
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
        tg.HapticFeedback.impactOccurred('light');
    });
    
    // Клик вне модального окна фильтров
    filtersModal.addEventListener('click', function(e) {
        if (e.target === this) {
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Пресеты суммы
    amountPresets.forEach(preset => {
        preset.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            depositAmountInput.value = amount;
            
            // Эффект нажатия
            amountPresets.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            
            tg.HapticFeedback.impactOccurred('light');
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
        
        // Эффект нажатия
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        tg.HapticFeedback.impactOccurred('medium');
        
        // Отправляем транзакцию
        await sendDepositTransaction(amount);
    });
    
    // Инициализация
    loadUserData();
    
    // Инициализируем TON Connect
    setTimeout(() => {
        initTonConnect().then(() => {
            console.log('TON Connect initialized');
            updateConnectInfo();
        }).catch(error => {
            console.error('Failed to init TON Connect:', error);
            updateConnectInfo();
        });
    }, 500);
    
    // Инициализируем фильтры
    setTimeout(() => {
        initFilters();
    }, 300);
    
    // Устанавливаем начальную страницу
    setTimeout(() => {
        updateContent('market');
    }, 200);
    
    // Плавное появление
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.3s ease';
    
    // Сохранение данных при закрытии
    window.addEventListener('beforeunload', function() {
        saveUserData();
    });
    
    // Автоматическое обновление баланса кошелька
    setInterval(updateRealWalletBalance, 30000);
});
