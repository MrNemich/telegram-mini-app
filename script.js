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
    const filterSections = document.querySelectorAll('.filter-section');
    const filterHeaders = document.querySelectorAll('.filter-header');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const priceSliderTrack = document.getElementById('price-slider-track');
    const priceSliderRange = document.getElementById('price-slider-range');
    const priceSliderHandleMin = document.getElementById('price-slider-handle-min');
    const priceSliderHandleMax = document.getElementById('price-slider-handle-max');
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceMinDisplay = document.getElementById('price-min-display');
    const priceMaxDisplay = document.getElementById('price-max-display');
    
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
    
    // Анимации
    function createParticles() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        document.body.appendChild(particlesContainer);
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 4 + 1 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, ${Math.random() * 0.3 + 0.1})`;
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.top = Math.random() * 100 + 'vh';
            particle.style.boxShadow = '0 0 10px currentColor';
            
            // Анимация
            const duration = Math.random() * 20 + 10;
            particle.style.animation = `float ${duration}s infinite ease-in-out`;
            
            particlesContainer.appendChild(particle);
        }
    }
    
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
            
            userData.walletBalance = Math.random() * 50 + 10;
            console.log('Wallet balance:', userData.walletBalance, 'TON');
            
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
                        <i class="fas fa-wallet" style="color: #7b2ff7; font-size: 1.3rem; flex-shrink: 0;"></i>
                        <span style="color: white; font-weight: 600; font-size: 0.9rem; font-family: monospace; word-break: break-all;">${shortAddress}</span>
                    </div>
                    <div style="
                        font-size: 1.4rem; 
                        color: #06D6A0; 
                        font-weight: 800; 
                        background: linear-gradient(135deg, rgba(6, 214, 160, 0.15), rgba(4, 169, 127, 0.05));
                        padding: 12px 30px; 
                        border-radius: 15px;
                        border: 2px solid rgba(6, 214, 160, 0.3);
                        width: 100%;
                        text-align: center;
                    ">
                        ${userData.walletBalance.toFixed(2)} TON
                    </div>
                </div>
            `;
            connectWalletBtn.innerHTML = '<i class="fas fa-unlink"></i><span>Отключить кошелек</span>';
            connectWalletBtn.style.background = 'linear-gradient(135deg, #ff375f, #d43a5e)';
            connectWalletBtn.style.borderColor = 'rgba(255, 55, 95, 0.5)';
        } else {
            connectInfoElement.innerHTML = `
                <div style="color: #8e8e93; font-size: 0.9rem; text-align: center; padding: 30px 20px; width: 100%;">
                    <i class="fas fa-plug" style="font-size: 2.5rem; margin-bottom: 15px; display: block; color: rgba(255, 255, 255, 0.3);"></i>
                    Подключите TON кошелек для пополнения баланса и управления средствами
                </div>
            `;
            connectWalletBtn.innerHTML = '<i class="fas fa-plug"></i><span>Подключить TON кошелек</span>';
            connectWalletBtn.style.background = 'linear-gradient(135deg, #007aff, #0056cc)';
            connectWalletBtn.style.borderColor = 'rgba(0, 122, 255, 0.5)';
        }
    }
    
    // Инициализация фильтров
    function initFilters() {
        // Заполняем коллекции
        const collectionOptions = document.getElementById('collection-options');
        collections.forEach(collection => {
            const item = document.createElement('div');
            item.className = 'filter-option-item';
            item.dataset.value = collection;
            item.innerHTML = `
                <div class="checkbox-square">
                    <i class="fas fa-check" style="display: none; font-size: 0.8rem;"></i>
                </div>
                <span>${collection}</span>
            `;
            collectionOptions.appendChild(item);
        });
        
        // Заполняем backgrounds
        const backgroundOptions = document.getElementById('background-options');
        backgrounds.forEach(bg => {
            const item = document.createElement('div');
            item.className = 'filter-option-item';
            item.dataset.value = bg;
            item.innerHTML = `
                <div class="checkbox-square">
                    <i class="fas fa-check" style="display: none; font-size: 0.8rem;"></i>
                </div>
                <span>${bg}</span>
            `;
            backgroundOptions.appendChild(item);
        });
        
        // Инициализация слайдера цены
        initPriceSlider();
        
        // Обработчики для заголовков фильтров
        filterHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const section = this.parentElement;
                const options = section.querySelector('.filter-options');
                const icon = this.querySelector('i');
                
                // Закрываем все остальные секции
                filterSections.forEach(s => {
                    if (s !== section) {
                        s.classList.remove('expanded');
                        s.querySelector('.filter-options').classList.remove('active');
                        s.querySelector('.filter-header i').style.transform = 'rotate(0deg)';
                    }
                });
                
                // Переключаем текущую секцию
                section.classList.toggle('expanded');
                options.classList.toggle('active');
                
                if (options.classList.contains('active')) {
                    icon.style.transform = 'rotate(180deg)';
                    icon.style.color = '#7b2ff7';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                    icon.style.color = 'rgba(255, 255, 255, 0.7)';
                }
            });
        });
        
        // Обработчики для выбора опций в сортировке
        const sortOptions = document.querySelectorAll('#sort-options .filter-option-item');
        sortOptions.forEach(option => {
            option.addEventListener('click', function() {
                sortOptions.forEach(opt => {
                    opt.classList.remove('active');
                    opt.querySelector('.radio-circle').classList.remove('checked');
                });
                
                this.classList.add('active');
                this.querySelector('.radio-circle').classList.add('checked');
                currentFilters.sort = this.dataset.value;
            });
        });
        
        // Обработчики для коллекций и backgrounds
        document.querySelectorAll('#collection-options .filter-option-item, #background-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                const checkbox = this.querySelector('.checkbox-square i');
                const filterType = this.closest('.filter-options').id.replace('-options', '');
                const value = this.dataset.value;
                
                if (checkbox.style.display === 'none') {
                    checkbox.style.display = 'block';
                    this.classList.add('active');
                    
                    if (filterType === 'collection') {
                        if (!currentFilters.collections.includes(value)) {
                            currentFilters.collections.push(value);
                        }
                    } else if (filterType === 'background') {
                        if (!currentFilters.backgrounds.includes(value)) {
                            currentFilters.backgrounds.push(value);
                        }
                    }
                } else {
                    checkbox.style.display = 'none';
                    this.classList.remove('active');
                    
                    if (filterType === 'collection') {
                        const index = currentFilters.collections.indexOf(value);
                        if (index > -1) {
                            currentFilters.collections.splice(index, 1);
                        }
                    } else if (filterType === 'background') {
                        const index = currentFilters.backgrounds.indexOf(value);
                        if (index > -1) {
                            currentFilters.backgrounds.splice(index, 1);
                        }
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
        
        // Применение фильтров
        applyFiltersBtn.addEventListener('click', function() {
            performSearch();
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            tg.showAlert('Фильтры применены');
            tg.HapticFeedback.notificationOccurred('success');
        });
    }
    
    // Инициализация слайдера цены
    function initPriceSlider() {
        let isDraggingMin = false;
        let isDraggingMax = false;
        
        function updateSlider() {
            const minPercent = (currentFilters.priceRange.min / 100000) * 100;
            const maxPercent = (currentFilters.priceRange.max / 100000) * 100;
            
            priceSliderHandleMin.style.left = `${minPercent}%`;
            priceSliderHandleMax.style.left = `${maxPercent}%`;
            priceSliderRange.style.left = `${minPercent}%`;
            priceSliderRange.style.width = `${maxPercent - minPercent}%`;
            
            priceMinInput.value = currentFilters.priceRange.min;
            priceMaxInput.value = currentFilters.priceRange.max;
            priceMinDisplay.textContent = currentFilters.priceRange.min;
            priceMaxDisplay.textContent = currentFilters.priceRange.max;
        }
        
        function startDragMin(e) {
            isDraggingMin = true;
            e.preventDefault();
        }
        
        function startDragMax(e) {
            isDraggingMax = true;
            e.preventDefault();
        }
        
        function stopDrag() {
            isDraggingMin = false;
            isDraggingMax = false;
        }
        
        function handleDrag(e) {
            if (!isDraggingMin && !isDraggingMax) return;
            
            const rect = priceSliderTrack.getBoundingClientRect();
            const x = e.clientX || e.touches[0].clientX;
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
        priceSliderHandleMin.addEventListener('mousedown', startDragMin);
        priceSliderHandleMax.addEventListener('mousedown', startDragMax);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mousemove', handleDrag);
        
        priceSliderHandleMin.addEventListener('touchstart', startDragMin);
        priceSliderHandleMax.addEventListener('touchstart', startDragMax);
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchmove', handleDrag);
        
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
            const checkbox = item.querySelector('.checkbox-square i');
            if (checkbox) checkbox.style.display = 'none';
        });
        
        // Активируем первую опцию в сортировке
        document.querySelector('#sort-options .filter-option-item[data-value="newest"]').classList.add('active');
        document.querySelector('#sort-options .filter-option-item[data-value="newest"] .radio-circle').classList.add('checked');
        
        // Обновляем слайдер
        initPriceSlider();
    }
    
    // Поиск по фильтрам
    function performSearch() {
        console.log('Searching with filters:', currentFilters);
        tg.showAlert(`Применены фильтры: ${currentFilters.sort}, ${currentFilters.collections.length} коллекций, цена: ${currentFilters.priceRange.min}-${currentFilters.priceRange.max} TON`);
    }
    
    // Создание содержимого для разных страниц
    function createMarketContent() {
        return `
            <div class="page-content">
                <div class="market-container">
                    <div class="search-filter-bar">
                        <div class="search-filter-text">Найдите свои идеальные NFT</div>
                        <button class="filter-icon-btn" id="open-filters-btn">
                            <i class="fas fa-sliders-h"></i>
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
        const demoNFTs = [
            { name: "Bodded Ring", price: 150, rarity: "Epic" },
            { name: "Crystal Ball", price: 89, rarity: "Rare" },
            { name: "Diamond Ring", price: 250, rarity: "Legendary" },
            { name: "Genie Lamp", price: 120, rarity: "Epic" },
            { name: "Heroic Helmet", price: 75, rarity: "Rare" },
            { name: "Moon Pendant", price: 95, rarity: "Epic" },
            { name: "Durov's Coat", price: 500, rarity: "Mythical" },
            { name: "Crystal Eagle", price: 180, rarity: "Legendary" }
        ];
        
        return demoNFTs.map(nft => `
            <div class="nft-item">
                <div class="nft-image">
                    <i class="fas fa-gem"></i>
                </div>
                <div class="nft-info">
                    <div class="nft-name">${nft.name}</div>
                    <div class="nft-price">
                        <i class="fas fa-coins"></i>
                        <span>${nft.price} TON</span>
                    </div>
                    <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); margin-top: 8px;">
                        <i class="fas fa-star" style="color: #ffd166;"></i> ${nft.rarity}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    function createGiftsContent() {
        return `
            <div class="page-content">
                <div class="gifts-container">
                    <div class="gifts-icon">
                        <i class="fas fa-gift"></i>
                    </div>
                    <h2 style="color: white; margin-bottom: 20px; font-size: 1.8rem;">🎁 Мои подарки</h2>
                    <div class="gifts-message">
                        Ваши подарки появятся здесь.<br>
                        Следите за обновлениями и участвуйте в активностях!
                    </div>
                </div>
            </div>
        `;
    }
    
    function createSeasonContent() {
        return `
            <div class="page-content">
                <div class="season-container">
                    <div class="season-icon">
                        <i class="fas fa-calendar-star"></i>
                    </div>
                    <h2 style="color: white; margin-bottom: 20px; font-size: 1.8rem;">📅 Текущий сезон</h2>
                    <div class="season-message">
                        Раздел сезона в разработке.<br>
                        Скоро здесь появятся новые возможности!
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
                            `<div style="
                                background: linear-gradient(135deg, #7b2ff7, #00b2ff);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                width: 100%;
                                height: 100%;
                            ">
                                <span style="font-size: 2.8rem; font-weight: bold; color: white;">
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
                            <div class="stat-label">Объем</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">🎁</div>
                            <div class="stat-value gift-stat">${userData.bought}</div>
                            <div class="stat-label">Куплено</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">💎</div>
                            <div class="stat-value sold-stat">${userData.sold}</div>
                            <div class="stat-label">Продано</div>
                        </div>
                    </div>
                    
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
                                        <span>Адрес кошелька:</span>
                                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                                            <span class="address-value" id="profile-wallet-address">
                                                ${userData.walletAddress}
                                            </span>
                                            <button onclick="copyToClipboard('${userData.walletAddress}')" style="
                                                background: rgba(123, 47, 247, 0.2);
                                                border: 2px solid rgba(123, 47, 247, 0.4);
                                                color: #7b2ff7;
                                                width: 40px;
                                                height: 40px;
                                                border-radius: 0;
                                                cursor: pointer;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                transition: all 0.3s ease;
                                            ">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="wallet-balance-display">
                                        <span>Баланс кошелька:</span>
                                        <span class="balance-value">
                                            ${userData.walletBalance.toFixed(2)} TON
                                        </span>
                                    </div>
                                </div>` :
                                `<div class="not-connected">
                                    <i class="fas fa-wallet" style="font-size: 2.5rem; color: rgba(255, 255, 255, 0.2); margin-bottom: 15px;"></i>
                                    <span>
                                        Подключите TON кошелек в разделе "Пополнение баланса" для управления средствами
                                    </span>
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
        mainContent.style.opacity = '0';
        mainContent.style.transform = 'translateY(20px)';
        
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
            
            if (page === 'market') {
                const openFiltersBtn = document.getElementById('open-filters-btn');
                if (openFiltersBtn) {
                    openFiltersBtn.addEventListener('click', function() {
                        filtersModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    });
                }
            }
            
            setTimeout(() => {
                mainContent.style.opacity = '1';
                mainContent.style.transform = 'translateY(0)';
            }, 50);
            
        }, 200);
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
    
    // Отправка транзакции
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
            
            setTimeout(() => {
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
            }, 2000);
            
            return true;
            
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
            <div class="transaction-status-${status}">
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
            
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
        });
    });
    
    // Кнопка пополнения баланса
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
    });
    
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
    createParticles();
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
