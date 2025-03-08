document.addEventListener('DOMContentLoaded', function () {
    // Получаем элементы DOM для основных настроек
    const proxyToggle = document.getElementById('proxyToggle');
    const statusElement = document.getElementById('status');
    const authToggle = document.getElementById('authToggle');
    const authFields = document.getElementById('authFields');
    const proxyType = document.getElementById('proxyType');
    const proxyHost = document.getElementById('proxyHost');
    const proxyPort = document.getElementById('proxyPort');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const saveButton = document.getElementById('saveButton');
    const clearButton = document.getElementById('clearButton');
    const testButton = document.getElementById('testButton');

    // Элементы для работы с профилями
    const profileName = document.getElementById('profileName');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const profilesList = document.getElementById('profilesList');

    // Элементы для информации и статуса
    const connectionInfo = document.getElementById('connection-info');
    const currentIpElement = document.getElementById('current-ip');
    const connectionStatusElement = document.getElementById('connection-status');
    const infoIpElement = document.getElementById('info-ip');
    const ipLocationElement = document.getElementById('ip-location');
    const infoStatusElement = document.getElementById('info-status');
    const infoProxyTypeElement = document.getElementById('info-proxy-type');
    const infoHostElement = document.getElementById('info-host');
    const infoPortElement = document.getElementById('info-port');
    const infoLatencyElement = document.getElementById('info-latency');
    const refreshInfoButton = document.getElementById('refreshInfoButton');

    // Элементы для вкладок
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Элементы для уведомлений
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');

    // Загружаем сохраненные настройки
    loadSettings();
    // Загружаем профили
    loadProfiles();
    // Получаем информацию о текущем IP
    fetchCurrentIp();

    // Обработчики событий для вкладок
    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');

            // Убираем активный класс у всех кнопок и контента
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Добавляем активный класс выбранной вкладке
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');

            // Если открыта вкладка информации, обновляем данные
            if (tabName === 'info') {
                updateInfoTab();
            }
        });
    });

    // Обработчики событий
    proxyToggle.addEventListener('change', function () {
        statusElement.textContent = proxyToggle.checked ? 'Включен' : 'Выключен';
        statusElement.className = proxyToggle.checked ? 'status-on' : 'status-off';
        connectionInfo.classList.toggle('hidden', !proxyToggle.checked);

        if (proxyToggle.checked) {
            applyProxySettings();
        } else {
            clearProxySettings();
        }
    });

    authToggle.addEventListener('change', function () {
        authFields.classList.toggle('hidden', !authToggle.checked);
    });

    saveButton.addEventListener('click', function () {
        if (!validateInputs()) return;

        saveSettings();
        if (proxyToggle.checked) {
            applyProxySettings();
        }
        showNotification('Настройки успешно сохранены', 'success');
    });

    clearButton.addEventListener('click', function () {
        clearForm();
        clearProxySettings();
        saveSettings();
        showNotification('Настройки очищены', 'info');
    });

    testButton.addEventListener('click', function () {
        if (!validateInputs()) return;

        testProxyConnection();
    });

    saveProfileButton.addEventListener('click', function () {
        saveCurrentAsProfile();
    });

    refreshInfoButton.addEventListener('click', function () {
        updateInfoTab(true);
        fetchCurrentIp();
    });

    notificationClose.addEventListener('click', function () {
        hideNotification();
    });

    // Функция для загрузки настроек
    function loadSettings() {
        chrome.storage.local.get([
            'proxyEnabled',
            'proxyType',
            'proxyHost',
            'proxyPort',
            'authEnabled',
            'username',
            'password'
        ], function (items) {
            proxyToggle.checked = items.proxyEnabled || false;
            proxyType.value = items.proxyType || 'http';
            proxyHost.value = items.proxyHost || '';
            proxyPort.value = items.proxyPort || '';
            authToggle.checked = items.authEnabled || false;
            username.value = items.username || '';
            password.value = items.password || '';

            // Обновляем UI на основе загруженных данных
            statusElement.textContent = proxyToggle.checked ? 'Включен' : 'Выключен';
            statusElement.className = proxyToggle.checked ? 'status-on' : 'status-off';
            authFields.classList.toggle('hidden', !authToggle.checked);
            connectionInfo.classList.toggle('hidden', !proxyToggle.checked);

            // Если прокси включен, применяем настройки
            if (proxyToggle.checked) {
                applyProxySettings();
            }
        });
    }

    // Функция для сохранения настроек
    function saveSettings() {
        chrome.storage.local.set({
            'proxyEnabled': proxyToggle.checked,
            'proxyType': proxyType.value,
            'proxyHost': proxyHost.value,
            'proxyPort': proxyPort.value,
            'authEnabled': authToggle.checked,
            'username': username.value,
            'password': password.value
        });
    }

    // Функция для очистки формы
    function clearForm() {
        proxyToggle.checked = false;
        proxyType.value = 'http';
        proxyHost.value = '';
        proxyPort.value = '';
        authToggle.checked = false;
        username.value = '';
        password.value = '';
        statusElement.textContent = 'Выключен';
        statusElement.className = 'status-off';
        authFields.classList.add('hidden');
        connectionInfo.classList.add('hidden');
    }

    // Функция для применения настроек прокси
    function applyProxySettings() {
        const config = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: proxyType.value,
                    host: proxyHost.value,
                    port: parseInt(proxyPort.value)
                },
                bypassList: ["localhost", "127.0.0.1"]
            }
        };

        // Отправляем сообщение фоновому скрипту для применения настроек
        chrome.runtime.sendMessage({
            action: 'setProxy',
            config: config,
            proxyType: proxyType.value,
            auth: authToggle.checked ? {
                username: username.value,
                password: password.value
            } : null
        }, function (response) {
            if (response && response.success) {
                fetchCurrentIp();
                connectionStatusElement.textContent = 'Подключено';
                connectionStatusElement.style.color = '#00c853';
            } else {
                connectionStatusElement.textContent = 'Ошибка';
                connectionStatusElement.style.color = '#f44336';
                showNotification('Ошибка при применении настроек прокси', 'error');
            }
        });
    }

    // Функция для сброса настроек прокси
    function clearProxySettings() {
        chrome.runtime.sendMessage({ action: 'clearProxy' }, function (response) {
            connectionInfo.classList.add('hidden');
            fetchCurrentIp();
        });
    }

    // Функция для проверки соединения через прокси
    function testProxyConnection() {
        const startTime = Date.now();
        const config = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: proxyType.value,
                    host: proxyHost.value,
                    port: parseInt(proxyPort.value)
                },
                bypassList: ["localhost", "127.0.0.1"]
            }
        };

        showNotification('Проверка соединения...', 'info');

        chrome.runtime.sendMessage({
            action: 'testProxy',
            config: config,
            proxyType: proxyType.value,
            auth: authToggle.checked ? {
                username: username.value,
                password: password.value
            } : null
        }, function (response) {
            const timeElapsed = Date.now() - startTime;

            if (response && response.success) {
                showNotification(`Соединение успешно (${timeElapsed}мс)`, 'success');
                infoLatencyElement.textContent = `${timeElapsed}мс`;
            } else {
                const errorMsg = response && response.error ? response.error : 'неизвестная ошибка';
                showNotification(`Ошибка соединения: ${errorMsg}`, 'error');
            }
        });
    }

    // Функция для получения текущего IP-адреса
    function fetchCurrentIp() {
        chrome.runtime.sendMessage({ action: 'getIpInfo' }, function (response) {
            if (response && response.ip) {
                currentIpElement.textContent = response.ip;
                infoIpElement.textContent = response.ip;

                if (response.country && response.city) {
                    ipLocationElement.textContent = `${response.city}, ${response.country}`;
                } else if (response.country) {
                    ipLocationElement.textContent = response.country;
                } else {
                    ipLocationElement.textContent = 'Неизвестно';
                }
            } else {
                currentIpElement.textContent = 'Недоступно';
                infoIpElement.textContent = 'Недоступно';
                ipLocationElement.textContent = 'Неизвестно';
            }
        });
    }

    // Функция для обновления вкладки с информацией
    function updateInfoTab(forceUpdate = false) {
        // Обновляем информацию об IP если требуется
        if (forceUpdate) {
            infoIpElement.textContent = 'Определение...';
            ipLocationElement.textContent = 'Определение...';
        }

        // Статус прокси
        infoStatusElement.textContent = proxyToggle.checked ? 'Включен' : 'Выключен';

        // Тип прокси
        if (proxyToggle.checked) {
            const proxyTypeLabels = {
                'http': 'HTTP',
                'https': 'HTTPS',
                'socks4': 'SOCKS4',
                'socks5': 'SOCKS5'
            };
            infoProxyTypeElement.textContent = proxyTypeLabels[proxyType.value] || proxyType.value;
            infoHostElement.textContent = proxyHost.value || '-';
            infoPortElement.textContent = proxyPort.value || '-';
        } else {
            infoProxyTypeElement.textContent = 'Не используется';
            infoHostElement.textContent = '-';
            infoPortElement.textContent = '-';
            infoLatencyElement.textContent = '-';
        }
    }

    // Функция для сохранения текущих настроек как профиля
    function saveCurrentAsProfile() {
        if (!proxyHost.value || !proxyPort.value) {
            showNotification('Заполните хост и порт прокси', 'warning');
            return;
        }

        if (!profileName.value) {
            showNotification('Введите имя профиля', 'warning');
            return;
        }

        const profile = {
            name: profileName.value,
            proxyType: proxyType.value,
            proxyHost: proxyHost.value,
            proxyPort: proxyPort.value,
            authEnabled: authToggle.checked,
            username: username.value,
            password: password.value
        };

        chrome.storage.local.get(['proxyProfiles'], function (data) {
            const profiles = data.proxyProfiles || [];

            // Проверяем, есть ли уже профиль с таким именем
            const existingProfileIndex = profiles.findIndex(p => p.name === profile.name);

            if (existingProfileIndex !== -1) {
                // Обновляем существующий профиль
                profiles[existingProfileIndex] = profile;
                showNotification(`Профиль "${profile.name}" обновлен`, 'success');
            } else {
                // Добавляем новый профиль
                profiles.push(profile);
                showNotification(`Профиль "${profile.name}" сохранен`, 'success');
            }

            chrome.storage.local.set({ 'proxyProfiles': profiles }, function () {
                loadProfiles();
                profileName.value = '';
            });
        });
    }

    // Функция для загрузки профилей
    function loadProfiles() {
        chrome.storage.local.get(['proxyProfiles'], function (data) {
            const profiles = data.proxyProfiles || [];

            if (profiles.length === 0) {
                profilesList.innerHTML = '<div class="empty-profiles">Нет сохраненных профилей</div>';
                return;
            }

            profilesList.innerHTML = '';

            profiles.forEach(function (profile) {
                const profileItem = document.createElement('div');
                profileItem.className = 'profile-item';

                const profileNameElem = document.createElement('div');
                profileNameElem.className = 'profile-name';
                profileNameElem.textContent = profile.name;

                const profileButtons = document.createElement('div');
                profileButtons.className = 'profile-buttons';

                const loadButton = document.createElement('button');
                loadButton.className = 'profile-btn load';
                loadButton.textContent = 'Загрузить';
                loadButton.addEventListener('click', function (e) {
                    e.stopPropagation();
                    loadProfile(profile);
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'profile-btn delete';
                deleteButton.textContent = 'Удалить';
                deleteButton.addEventListener('click', function (e) {
                    e.stopPropagation();
                    deleteProfile(profile.name);
                });

                profileButtons.appendChild(loadButton);
                profileButtons.appendChild(deleteButton);

                profileItem.appendChild(profileNameElem);
                profileItem.appendChild(profileButtons);

                profileItem.addEventListener('click', function () {
                    loadProfile(profile);
                });

                profilesList.appendChild(profileItem);
            });
        });
    }

    // Функция для загрузки профиля
    function loadProfile(profile) {
        proxyType.value = profile.proxyType || 'http';
        proxyHost.value = profile.proxyHost || '';
        proxyPort.value = profile.proxyPort || '';
        authToggle.checked = profile.authEnabled || false;
        username.value = profile.username || '';
        password.value = profile.password || '';

        authFields.classList.toggle('hidden', !authToggle.checked);

        // Переключаемся на вкладку настроек
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        document.querySelector('[data-tab="settings"]').classList.add('active');
        document.getElementById('settings-tab').classList.add('active');

        showNotification(`Профиль "${profile.name}" загружен`, 'success');
    }

    // Функция для удаления профиля
    function deleteProfile(profileName) {
        chrome.storage.local.get(['proxyProfiles'], function (data) {
            let profiles = data.proxyProfiles || [];

            profiles = profiles.filter(profile => profile.name !== profileName);

            chrome.storage.local.set({ 'proxyProfiles': profiles }, function () {
                loadProfiles();
                showNotification(`Профиль "${profileName}" удален`, 'success');
            });
        });
    }

    // Функция для проверки введенных значений
    function validateInputs() {
        if (!proxyHost.value) {
            showNotification('Введите хост прокси', 'warning');
            return false;
        }

        if (!proxyPort.value) {
            showNotification('Введите порт прокси', 'warning');
            return false;
        }

        // Проверяем корректность порта
        const port = parseInt(proxyPort.value);
        if (isNaN(port) || port < 1 || port > 65535) {
            showNotification('Порт должен быть числом от 1 до 65535', 'warning');
            return false;
        }

        // Проверяем, что все необходимые поля для аутентификации заполнены
        if (authToggle.checked && (!username.value || !password.value)) {
            showNotification('Заполните имя пользователя и пароль', 'warning');
            return false;
        }

        return true;
    }

    // Функция для отображения уведомлений
    function showNotification(message, type = 'info') {
        notificationMessage.textContent = message;
        notification.className = 'notification ' + type;
        notification.classList.remove('hidden');

        // Автоматически скрываем уведомление через 3 секунды
        setTimeout(hideNotification, 3000);
    }

    // Функция для скрытия уведомления
    function hideNotification() {
        notification.classList.add('hidden');
    }
}); 