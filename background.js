// Глобальные переменные для хранения аутентификационных данных
let authCredentials = null;
let currentProxyType = null;

// Обработчик сообщений от popup.js
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'setProxy') {
        applyProxySettings(message.config, message.auth, message.proxyType);
        sendResponse({ success: true });
    } else if (message.action === 'clearProxy') {
        clearProxySettings();
        sendResponse({ success: true });
    } else if (message.action === 'testProxy') {
        testProxyConnection(message.config, message.auth, message.proxyType, sendResponse);
        return true; // Чтобы sendResponse работал асинхронно
    } else if (message.action === 'getIpInfo') {
        getIpInfo(sendResponse);
        return true; // Чтобы sendResponse работал асинхронно
    }
    return true; // Для асинхронного sendResponse
});

// Обработчик запросов аутентификации
chrome.webRequest.onAuthRequired.addListener(
    function (details, callback) {
        if (authCredentials) {
            callback(authCredentials);
        } else {
            callback();
        }
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"]
);

// Функция для применения настроек прокси
function applyProxySettings(config, auth, proxyType) {
    // Сохраняем тип прокси для использования в других функциях
    currentProxyType = proxyType;

    // Устанавливаем аутентификационные данные
    if (auth) {
        authCredentials = {
            authCredentials: {
                username: auth.username,
                password: auth.password
            }
        };
    } else {
        authCredentials = null;
    }

    // Применяем настройки прокси
    chrome.proxy.settings.set(
        { value: config, scope: 'regular' },
        function () {
            console.log('Proxy settings applied:', config);
        }
    );
}

// Функция для очистки настроек прокси
function clearProxySettings() {
    authCredentials = null;
    currentProxyType = null;
    chrome.proxy.settings.clear(
        { scope: 'regular' },
        function () {
            console.log('Proxy settings cleared');
        }
    );
}

// Функция для тестирования соединения через прокси
function testProxyConnection(config, auth, proxyType, sendResponse) {
    // Временно применяем настройки прокси
    const originalProxyType = currentProxyType;
    const originalAuthCredentials = authCredentials;

    // Применяем тестовые настройки
    applyProxySettings(config, auth, proxyType);

    // Пробуем выполнить запрос к тестовому URL
    fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors',
        timeout: 5000
    })
        .then(() => {
            // Возвращаем оригинальные настройки
            if (originalProxyType) {
                // Если были настройки, возвращаем их
                applyProxySettings(
                    chrome.proxy.settings.get({}, function (details) {
                        return details.value;
                    }),
                    originalAuthCredentials,
                    originalProxyType
                );
            } else {
                // Если не было настроек, очищаем
                clearProxySettings();
            }

            sendResponse({ success: true });
        })
        .catch(error => {
            // Возвращаем оригинальные настройки
            if (originalProxyType) {
                // Если были настройки, возвращаем их
                applyProxySettings(
                    chrome.proxy.settings.get({}, function (details) {
                        return details.value;
                    }),
                    originalAuthCredentials,
                    originalProxyType
                );
            } else {
                // Если не было настроек, очищаем
                clearProxySettings();
            }

            sendResponse({ success: false, error: error.message });
        });
}

// Функция для получения информации о текущем IP-адресе
function getIpInfo(sendResponse) {
    fetch('https://ipinfo.io/json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при получении информации об IP');
            }
            return response.json();
        })
        .then(data => {
            sendResponse({
                ip: data.ip,
                country: data.country,
                city: data.city,
                location: data.loc,
                org: data.org
            });
        })
        .catch(error => {
            console.error('Error fetching IP info:', error);

            // Пробуем альтернативный сервис, если основной не доступен
            fetch('https://api.ipify.org?format=json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Ошибка при получении IP через альтернативный сервис');
                    }
                    return response.json();
                })
                .then(data => {
                    sendResponse({
                        ip: data.ip,
                        country: null,
                        city: null
                    });
                })
                .catch(altError => {
                    console.error('Error fetching IP from alternative service:', altError);
                    sendResponse({ error: 'Не удалось получить информацию об IP' });
                });
        });
} 