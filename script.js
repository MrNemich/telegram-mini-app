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
    const botBalanceElement = document.getElementById('bot-balance');
    
    // Элементы для модалки пополнения
    const depositModal = document.getElementById('deposit-modal');
    const closeDepositModal = document.getElementById('close-deposit-modal');
    const depositAmountInput = document.getElementById('deposit-amount-input');
    const amountPresets = document.querySelectorAll('.amount-preset');
    const confirmDepositBtn = document.getElementById('confirm-deposit-btn');
    const transactionStatusElement = document.getElementById('transaction-status');
    const walletConnectSection = document.getElementById('wallet-connect-section');
    
    // Элементы для фильтров
    const filtersModal = document.getElementById('filters-modal');
    const closeFiltersModal = document.getElementById('close-filters-modal');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const searchFiltersBtn = document.getElementById('search-filters-btn');
    const filtersList = document.getElementById('filters-list');
    const activeFilterContent = document.getElementById('active-filter-content');
    
    // Элементы для профиля
    const walletInfoSection = document.getElementById('wallet-info-section');
    
    // Текущий пользователь
    let userData = {
        id: null,
        balance: 0,
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
    
    // URL для API
    const API_URL = "https://telegram-mini-app-mauve.vercel.app/api";
    
    // Инициализация TON Connect
    let tonConnectUI = null;
    
    // Данные для фильтров
    const filterData = {
        sort: [
            { id: 'newest', name: 'Сначала новые', icon: 'fas fa-clock' },
            { id: 'price-asc', name: 'Цена: по возрастанию', icon: 'fas fa-arrow-up' },
            { id: 'price-desc', name: 'Цена: по убыванию', icon: 'fas fa-arrow-down' }
        ],
        collections: [
            "Bodded Ring", "Candle Lamp", "Boots", "Candy Cane", "Case", "Christmas Tree",
            "Clover Pin", "Crystal Ball", "Diamond Ring", "Durov's Coat", "Coconut",
            "Crystal Eagle", "Dove of Peace", "Durov's Figurine", "Coffin", "Cupid Charm",
            "Durov's Boots", "Durov's Sunglasses", "Cookie Heart", "Desk Calendar",
            "Durov's Cap", "Easter Cake", "Evil Eye", "Faith Amulet", "Flying Broom"
        ],
        backgrounds: [
            "Amber", "Aquamarine", "Azure Blue", "Battleship Grey", "Black", "Burgundy",
            "Deep Cyan", "Desert Sand", "Electric Indigo", "Electric Purple", "Emerald",
            "English Violet", "Fandango", "Navy Blue", "Neon Blue", "Onyx Black", "Old Gold",
            "Orange", "Pacific Cyan", "Pacific Green", "Persimmon", "Pine Green"
        ]
    };
    
    // Текущие фильтры
    let currentFilters = {
        sort: 'newest',
        collections: [],
        priceRange: { min: 0, max: 100000 },
        backgrounds: []
    };
    
    // Активный фильтр (для анимации)
    let activeFilter = null;
    let originalFilterOrder = [];
    
    // Загрузка данных пользователя
    function loadUserData() {
        // Проверяем, есть ли сохраненные данные
        const savedData = localStorage.getItem('beatclub_user_data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            // Проверяем совпадение ID пользователя
            if (tg.initDataUnsafe?.user && parsed.id === tg.initDataUnsafe.user.id) {
                userData = parsed;
            }
        }
        
        // Загружаем данные из Telegram
        if (tg.initDataUnsafe?.user) {
            const user = tg.initDataUnsafe.user;
            userData.id = user.id;
            
            // Формируем имя пользователя
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
            
            // Загружаем аватарку
            loadUserAvatar(user);
        }
        
        // Обновляем отображение
        updateBalanceDisplay();
        updateWalletInfo();
        updateProfileWalletInfo();
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
            // Инициализируем TON Connect UI
            tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifestUrl: 'https://telegram-mini-app-mauve.vercel.app/tonconnect-manifest.json',
                buttonRootId: 'ton-connect-modal'
            });
            
            // Подписываемся на изменения статуса
            tonConnectUI.onStatusChange((wallet) => {
                if (wallet) {
                    // Кошелек подключен
                    userData.walletConnected = true;
                    userData.walletAddress = wallet.account.address;
                    
                    // Получаем баланс
                    updateRealWalletBalance();
                    
                    // Обновляем UI
                    updateWalletInfo();
                    updateProfileWalletInfo();
                    
                    // Сохраняем
                    saveUserData();
                    
                    // Уведомление
                    tg.showAlert('✅ Кошелек подключен!');
                    tg.HapticFeedback.notificationOccurred('success');
                } else {
                    // Кошелек отключен
                    userData.walletConnected = false;
                    userData.walletAddress = null;
                    userData.walletBalance = 0;
                    
                    // Обновляем UI
                    updateWalletInfo();
                    updateProfileWalletInfo();
                    
                    // Сохраняем
                    saveUserData();
                }
            });
            
            // Восстанавливаем соединение если было
            const currentWallet = tonConnectUI.connected;
            if (currentWallet) {
                userData.walletConnected = true;
                userData.walletAddress = currentWallet.account.address;
                updateRealWalletBalance();
                updateWalletInfo();
                updateProfileWalletInfo();
            }
            
        } catch (error) {
            console.error('Error initializing TON Connect:', error);
            tg.showAlert('⚠️ Ошибка TON Connect: ' + error.message);
            
            // Fallback для демо
            updateWalletInfo();
            updateProfileWalletInfo();
        }
    }
    
    // Получение реального баланса кошелька
    async function updateRealWalletBalance() {
        if (!userData.walletConnected || !userData.walletAddress) return;
        
        try {
            // Используем TON Center API для получения баланса
            const response = await fetch(
                `https://toncenter.com/api/v2/getAddressBalance?address=${userData.walletAddress}`
            );
            
            const data = await response.json();
            
            if (data.ok) {
                // Конвертируем наноТоны в TON (1 TON = 1,000,000,000 наноТонов)
                userData.walletBalance = parseInt(data.result) / 1000000000;
            } else {
                // Fallback на случай если API не работает
                userData.walletBalance = 12.5;
            }
            
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            // Fallback значение для демо
            userData.walletBalance = 12.5;
        }
        
        updateWalletInfo();
        updateProfileWalletInfo();
    }
    
    // Обновление информации о кошельке в модалке пополнения
    function updateWalletInfo() {
        if (!walletConnectSection) return;
        
        if (userData.walletConnected && userData.walletAddress) {
            const shortAddress = userData.walletAddress.slice(0, 8) + '...' + userData.walletAddress.slice(-8);
            walletConnectSection.innerHTML = `
                <div class="connect-header">
                    <span><i class="fas fa-wallet"></i> Кошелек подключен</span>
                    <button class="connect-btn" id="disconnect-wallet-btn">
                        <i class="fas fa-unlink"></i> Отключить
                    </button>
                </div>
                <div class="wallet-info">
                    <div class="wallet-address-display">
                        <div class="wallet-address">${shortAddress}</div>
                        <button class="copy-btn" onclick="copyToClipboard('${userData.walletAddress}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="wallet-balance-info">
                        <span class="balance-label">Баланс кошелька:</span>
                        <span class="balance-value">${userData.walletBalance.toFixed(2)} TON</span>
                    </div>
                </div>
            `;
            
            // Добавляем обработчик для отключения кошелька
            const disconnectBtn = document.getElementById('disconnect-wallet-btn');
            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', disconnectWallet);
            }
        } else {
            walletConnectSection.innerHTML = `
                <div class="connect-header">
                    <span><i class="fas fa-wallet"></i> Подключите кошелек</span>
                    <button class="connect-btn" id="connect-wallet-btn">
                        <i class="fas fa-plug"></i> Подключить
                    </button>
                </div>
                <div class="wallet-info">
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; text-align: center; padding: 20px;">
                        Подключите TON кошелек для пополнения баланса
                    </div>
                </div>
            `;
            
            // Добавляем обработчик для подключения кошелька
            const connectBtn = document.getElementById('connect-wallet-btn');
            if (connectBtn) {
                connectBtn.addEventListener('click', connectWallet);
            }
        }
    }
    
    // Обновление информации о кошельке в модалке баланса
    function updateProfileWalletInfo() {
        if (!walletInfoSection) return;
        
        if (userData.walletConnected && userData.walletAddress) {
            const shortAddress = userData.walletAddress.slice(0, 8) + '...' + userData.walletAddress.slice(-8);
            walletInfoSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <i class="fas fa-wallet" style="color: #7b61ff; font-size: 1.2rem;"></i>
                    <span style="color: white; font-weight: 600;">Кошелек подключен</span>
                </div>
                <div style="
                    font-size: 1.4rem; 
                    color: #7b61ff; 
                    font-weight: 800; 
                    background: rgba(123, 97, 255, 0.1); 
                    padding: 16px; 
                    border-radius: 14px;
                    border: 1px solid rgba(123, 97, 255, 0.2);
                    text-align: center;
                    margin-bottom: 12px;
                ">
                    ${userData.walletBalance.toFixed(2)} TON
                </div>
                <div style="
                    color: rgba(255, 255, 255, 0.8); 
                    font-size: 0.85rem; 
                    font-family: monospace;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    word-break: break-all;
                    text-align: center;
                ">
                    ${shortAddress}
                </div>
            `;
        } else {
            walletInfoSection.innerHTML = `
                <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 20px;">
                    <i class="fas fa-wallet" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color: rgba(123, 97, 255, 0.3);"></i>
                    <div style="font-size: 0.95rem; margin-bottom: 16px;">
                        Кошелек не подключен
                    </div>
                    <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.5);">
                        Подключите кошелек для пополнения баланса
                    </div>
                </div>
            `;
        }
    }
    
    // Инициализация фильтров
    function initFilters() {
        // Определяем фильтры
        const filters = [
            { id: 'sort', name: 'Сортировка', icon: 'fas fa-sort-amount-down' },
            { id: 'collection', name: 'Коллекция', icon: 'fas fa-layer-group' },
            { id: 'price', name: 'Цена', icon: 'fas fa-tag' },
            { id: 'background', name: 'Background', icon: 'fas fa-palette' }
        ];
        
        // Сохраняем оригинальный порядок
        originalFilterOrder = [...filters];
        
        // Создаем список фильтров
        filters.forEach(filter => {
            const filterItem = document.createElement('div');
            filterItem.className = 'filter-item';
            filterItem.dataset.filter = filter.id;
            filterItem.innerHTML = `
                <div class="filter-name">
                    <i class="${filter.icon}"></i>
                    <span>${filter.name}</span>
                </div>
                <div class="filter-arrow">
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;
            
            filterItem.addEventListener('click', () => {
                toggleFilter(filter.id);
            });
            
            filtersList.appendChild(filterItem);
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
            tg.showAlert('Фильтры применены');
            tg.HapticFeedback.notificationOccurred('success');
        });
        
        // Инициализируем начальный фильтр
        loadFilterContent('sort');
    }
    
    // Переключение фильтра
    function toggleFilter(filterId) {
        const filterItems = document.querySelectorAll('.filter-item');
        
        if (activeFilter === filterId) {
            // Закрываем активный фильтр
            activeFilter = null;
            filterItems.forEach(item => {
                item.classList.remove('active');
            });
            activeFilterContent.innerHTML = '';
            
            // Восстанавливаем оригинальный порядок
            restoreFilterOrder();
        } else {
            // Закрываем все фильтры и открываем выбранный
            activeFilter = filterId;
            filterItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.filter === filterId) {
                    item.classList.add('active');
                }
            });
            
            // Поднимаем активный фильтр наверх
            moveFilterToTop(filterId);
            
            // Загружаем содержимое фильтра
            loadFilterContent(filterId);
        }
    }
    
    // Поднять фильтр наверх
    function moveFilterToTop(filterId) {
        const filterItems = Array.from(document.querySelectorAll('.filter-item'));
        const activeItem = filterItems.find(item => item.dataset.filter === filterId);
        const otherItems = filterItems.filter(item => item.dataset.filter !== filterId);
        
        // Очищаем список
        filtersList.innerHTML = '';
        
        // Добавляем активный элемент первым
        filtersList.appendChild(activeItem);
        
        // Добавляем остальные элементы
        otherItems.forEach(item => {
            filtersList.appendChild(item);
        });
    }
    
    // Восстановить оригинальный порядок фильтров
    function restoreFilterOrder() {
        filtersList.innerHTML = '';
        originalFilterOrder.forEach(filter => {
            const filterItem = document.querySelector(`.filter-item[data-filter="${filter.id}"]`);
            if (filterItem) {
                filtersList.appendChild(filterItem);
            }
        });
    }
    
    // Загрузка содержимого фильтра
    function loadFilterContent(filterId) {
        switch(filterId) {
            case 'sort':
                loadSortFilter();
                break;
            case 'collection':
                loadCollectionFilter();
                break;
            case 'price':
                loadPriceFilter();
                break;
            case 'background':
                loadBackgroundFilter();
                break;
        }
    }
    
    // Загрузка фильтра сортировки
    function loadSortFilter() {
        activeFilterContent.innerHTML = `
            <div class="filter-options" id="sort-options">
                ${filterData.sort.map(item => `
                    <div class="filter-option-item ${currentFilters.sort === item.id ? 'active' : ''}" 
                         data-value="${item.id}">
                        <div class="checkbox-square"></div>
                        <span>${item.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Добавляем обработчики для опций сортировки
        document.querySelectorAll('#sort-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                // Снимаем выделение со всех опций
                document.querySelectorAll('#sort-options .filter-option-item').forEach(opt => {
                    opt.classList.remove('active');
                });
                // Выделяем выбранную
                this.classList.add('active');
                currentFilters.sort = this.dataset.value;
            });
        });
    }
    
    // Загрузка фильтра коллекций
    function loadCollectionFilter() {
        const displayedCollections = filterData.collections.slice(0, 10); // Показываем только первые 10
        activeFilterContent.innerHTML = `
            <div class="filter-options" id="collection-options">
                ${displayedCollections.map(collection => `
                    <div class="filter-option-item ${currentFilters.collections.includes(collection) ? 'active' : ''}" 
                         data-value="${collection}">
                        <div class="checkbox-square"></div>
                        <span>${collection}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <button class="connect-btn" style="width: 100%; padding: 12px;" id="show-more-collections">
                    Показать все коллекции
                </button>
            </div>
        `;
        
        // Добавляем обработчики для опций коллекций
        document.querySelectorAll('#collection-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('active');
                const value = this.dataset.value;
                const index = currentFilters.collections.indexOf(value);
                if (index > -1) {
                    currentFilters.collections.splice(index, 1);
                } else {
                    currentFilters.collections.push(value);
                }
            });
        });
        
        // Обработчик для кнопки "Показать все"
        const showMoreBtn = document.getElementById('show-more-collections');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                loadAllCollections();
            });
        }
    }
    
    // Загрузка всех коллекций
    function loadAllCollections() {
        activeFilterContent.innerHTML = `
            <div class="filter-options" id="collection-options" style="max-height: 300px; overflow-y: auto;">
                ${filterData.collections.map(collection => `
                    <div class="filter-option-item ${currentFilters.collections.includes(collection) ? 'active' : ''}" 
                         data-value="${collection}">
                        <div class="checkbox-square"></div>
                        <span>${collection}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Добавляем обработчики для опций коллекций
        document.querySelectorAll('#collection-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('active');
                const value = this.dataset.value;
                const index = currentFilters.collections.indexOf(value);
                if (index > -1) {
                    currentFilters.collections.splice(index, 1);
                } else {
                    currentFilters.collections.push(value);
                }
            });
        });
    }
    
    // Загрузка фильтра цены
    function loadPriceFilter() {
        activeFilterContent.innerHTML = `
            <div class="price-slider-container">
                <div class="price-slider" id="price-slider">
                    <div class="price-slider-range" id="price-slider-range" 
                         style="left: ${(currentFilters.priceRange.min / 100000) * 100}%; 
                                right: ${100 - (currentFilters.priceRange.max / 100000) * 100}%"></div>
                    <div class="price-slider-handle" id="price-slider-handle-min" 
                         style="left: ${(currentFilters.priceRange.min / 100000) * 100}%"></div>
                    <div class="price-slider-handle" id="price-slider-handle-max" 
                         style="left: ${(currentFilters.priceRange.max / 100000) * 100}%"></div>
                </div>
                <div class="price-inputs">
                    <div class="price-input-group">
                        <div class="price-label">От (TON)</div>
                        <input type="number" class="price-input" id="price-min" 
                               min="0" max="100000" value="${currentFilters.priceRange.min}">
                    </div>
                    <div class="price-input-group">
                        <div class="price-label">До (TON)</div>
                        <input type="number" class="price-input" id="price-max" 
                               min="0" max="100000" value="${currentFilters.priceRange.max}">
                    </div>
                </div>
            </div>
        `;
        
        initPriceSlider();
    }
    
    // Инициализация слайдера цены
    function initPriceSlider() {
        const priceSlider = document.getElementById('price-slider');
        const priceSliderRange = document.getElementById('price-slider-range');
        const priceSliderHandleMin = document.getElementById('price-slider-handle-min');
        const priceSliderHandleMax = document.getElementById('price-slider-handle-max');
        const priceMinInput = document.getElementById('price-min');
        const priceMaxInput = document.getElementById('price-max');
        
        let isDraggingMin = false;
        let isDraggingMax = false;
        
        // Обновление слайдера
        function updateSlider() {
            const minPercent = (currentFilters.priceRange.min / 100000) * 100;
            const maxPercent = (currentFilters.priceRange.max / 100000) * 100;
            
            priceSliderHandleMin.style.left = `${minPercent}%`;
            priceSliderHandleMax.style.left = `${maxPercent}%`;
            priceSliderRange.style.left = `${minPercent}%`;
            priceSliderRange.style.right = `${100 - maxPercent}%`;
            
            priceMinInput.value = currentFilters.priceRange.min;
            priceMaxInput.value = currentFilters.priceRange.max;
        }
        
        // Обработчики для ползунков
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
            
            const rect = priceSlider.getBoundingClientRect();
            const x = e.clientX - rect.left;
            let percent = (x / rect.width) * 100;
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
        
        // Обработчики для инпутов
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
        
        // Добавляем обработчики событий
        priceSliderHandleMin.addEventListener('mousedown', startDragMin);
        priceSliderHandleMax.addEventListener('mousedown', startDragMax);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('mousemove', handleDrag);
        
        // Для touch устройств
        priceSliderHandleMin.addEventListener('touchstart', startDragMin);
        priceSliderHandleMax.addEventListener('touchstart', startDragMax);
        document.addEventListener('touchend', stopDrag);
        document.addEventListener('touchmove', handleDrag);
    }
    
    // Загрузка фильтра background
    function loadBackgroundFilter() {
        const displayedBackgrounds = filterData.backgrounds.slice(0, 10);
        activeFilterContent.innerHTML = `
            <div class="filter-options" id="background-options">
                ${displayedBackgrounds.map(bg => `
                    <div class="filter-option-item ${currentFilters.backgrounds.includes(bg) ? 'active' : ''}" 
                         data-value="${bg}">
                        <div class="checkbox-square"></div>
                        <span>${bg}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 16px; text-align: center;">
                <button class="connect-btn" style="width: 100%; padding: 12px;" id="show-more-backgrounds">
                    Показать все backgrounds
                </button>
            </div>
        `;
        
        // Добавляем обработчики для опций backgrounds
        document.querySelectorAll('#background-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('active');
                const value = this.dataset.value;
                const index = currentFilters.backgrounds.indexOf(value);
                if (index > -1) {
                    currentFilters.backgrounds.splice(index, 1);
                } else {
                    currentFilters.backgrounds.push(value);
                }
            });
        });
        
        // Обработчик для кнопки "Показать все"
        const showMoreBtn = document.getElementById('show-more-backgrounds');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                loadAllBackgrounds();
            });
        }
    }
    
    // Загрузка всех backgrounds
    function loadAllBackgrounds() {
        activeFilterContent.innerHTML = `
            <div class="filter-options" id="background-options" style="max-height: 300px; overflow-y: auto;">
                ${filterData.backgrounds.map(bg => `
                    <div class="filter-option-item ${currentFilters.backgrounds.includes(bg) ? 'active' : ''}" 
                         data-value="${bg}">
                        <div class="checkbox-square"></div>
                        <span>${bg}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Добавляем обработчики для опций backgrounds
        document.querySelectorAll('#background-options .filter-option-item').forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('active');
                const value = this.dataset.value;
                const index = currentFilters.backgrounds.indexOf(value);
                if (index > -1) {
                    currentFilters.backgrounds.splice(index, 1);
                } else {
                    currentFilters.backgrounds.push(value);
                }
            });
        });
    }
    
    // Сброс всех фильтров
    function resetAllFilters() {
        currentFilters = {
            sort: 'newest',
            collections: [],
            priceRange: { min: 0, max: 100000 },
            backgrounds: []
        };
        
        // Обновляем UI
        if (activeFilter === 'sort') {
            loadSortFilter();
        } else if (activeFilter === 'collection') {
            loadCollectionFilter();
        } else if (activeFilter === 'price') {
            loadPriceFilter();
        } else if (activeFilter === 'background') {
            loadBackgroundFilter();
        }
    }
    
    // Поиск по фильтрам
    function performSearch() {
        console.log('Applying filters:', currentFilters);
        // Здесь будет реальная логика фильтрации
    }
    
    // Создание содержимого для разных страниц
    function createMarketContent() {
        return `
            <div class="page-content">
                <div class="market-container">
                    <div class="search-filter-bar">
                        <div class="search-filter-text">Используйте фильтры для поиска NFT</div>
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
        const demoNFTs = [
            { name: "Bodded Ring", price: 150 },
            { name: "Crystal Ball", price: 89 },
            { name: "Diamond Ring", price: 250 },
            { name: "Genie Lamp", price: 120 },
            { name: "Heroic Helmet", price: 75 },
            { name: "Moon Pendant", price: 95 }
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
                    <div class="season-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="season-message">
                        Раздел в разработке.<br>
                        Следите за обновлениями!
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
                            `<div class="avatar-placeholder">
                                <span>${userData.username.charAt(0).toUpperCase()}</span>
                            </div>`
                        }
                    </div>
                    
                    <h2 class="profile-username">${userData.username}</h2>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <div class="stat-icon">💰</div>
                            <div class="stat-value">${userData.totalVolume}</div>
                            <div class="stat-label">Total volume</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">🎁</div>
                            <div class="stat-value">${userData.bought}</div>
                            <div class="stat-label">Bought</div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-icon">💎</div>
                            <div class="stat-value">${userData.sold}</div>
                            <div class="stat-label">Sold</div>
                        </div>
                    </div>
                    
                    <div class="wallet-info-card">
                        <div class="wallet-info-header">
                            <i class="fas fa-wallet"></i>
                            <span>TON Кошелек</span>
                            <span style="margin-left: auto; font-size: 0.85rem; color: ${userData.walletConnected ? '#7b61ff' : 'rgba(255, 255, 255, 0.6)'};">
                                ${userData.walletConnected ? 'Подключен' : 'Не подключен'}
                            </span>
                        </div>
                        <div class="wallet-info-content">
                            ${userData.walletConnected ? 
                                `<div class="connected-wallet">
                                    <div class="wallet-address-display-profile">
                                        <span class="address-value">${userData.walletAddress}</span>
                                        <button class="copy-btn" onclick="copyToClipboard('${userData.walletAddress}')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="wallet-balance-display-profile">
                                        <span>Баланс:</span>
                                        <span class="balance-value">${userData.walletBalance.toFixed(2)} TON</span>
                                    </div>
                                </div>` :
                                `<div class="not-connected">
                                    <i class="fas fa-wallet"></i>
                                    <span>Подключите кошелек в разделе пополнения баланса</span>
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
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }
    
    // Подключение кошелька
    function connectWallet() {
        if (tonConnectUI) {
            tonConnectUI.openModal();
        } else {
            tg.showAlert('Ошибка: TON Connect не инициализирован');
        }
    }
    
    // Отключение кошелька
    function disconnectWallet() {
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
            const result = await tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                // Транзакция отправлена успешно
                showTransactionStatus('success', 'Транзакция отправлена!');
                
                // Обновляем баланс пользователя
                userData.balance += amount;
                userData.totalVolume += amount;
                updateBalanceDisplay();
                saveUserData();
                
                showTransactionStatus('confirmed', `✅ Баланс пополнен на ${amount} TON!`);
                
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
            
            // Эффект нажатия
            this.style.transform = 'scale(0.92)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
            
            // Вибрация
            if (navigator.vibrate) {
                navigator.vibrate(20);
            }
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
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
        
        // Показать модальное окно
        balanceModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Закрытие модального окна баланса
    closeBalanceModal.addEventListener('click', function() {
        balanceModal.classList.remove('active');
        document.body.style.overflow = 'auto';
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
        // Закрываем окно баланса
        balanceModal.classList.remove('active');
        
        // Показываем окно пополнения
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
    
    // Закрытие модального окна пополнения
    closeDepositModal.addEventListener('click', function() {
        depositModal.classList.remove('active');
        document.body.style.overflow = 'auto';
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
        // Восстанавливаем порядок фильтров при закрытии
        if (activeFilter) {
            restoreFilterOrder();
            activeFilter = null;
            document.querySelectorAll('.filter-item').forEach(item => {
                item.classList.remove('active');
            });
        }
    });
    
    // Клик вне модального окна фильтров
    filtersModal.addEventListener('click', function(e) {
        if (e.target === this) {
            filtersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            // Восстанавливаем порядок фильтров при закрытии
            if (activeFilter) {
                restoreFilterOrder();
                activeFilter = null;
                document.querySelectorAll('.filter-item').forEach(item => {
                    item.classList.remove('active');
                });
            }
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
        
        if (!userData.walletConnected) {
            tg.showAlert('❌ Пожалуйста, подключите TON кошелек для пополнения');
            return;
        }
        
        // Эффект нажатия
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
        
        // Отправляем транзакцию
        await sendDepositTransaction(amount);
    });
    
    // Инициализация
    loadUserData();
    
    // Инициализируем TON Connect
    setTimeout(() => {
        initTonConnect().then(() => {
            console.log('TON Connect initialized');
            updateWalletInfo();
            updateProfileWalletInfo();
        }).catch(error => {
            console.error('Failed to init TON Connect:', error);
            updateWalletInfo();
            updateProfileWalletInfo();
        });
    }, 500);
    
    // Инициализируем фильтры
    initFilters();
    
    // Устанавливаем начальную страницу
    updateContent('market');
    
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

