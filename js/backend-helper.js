// Arquivo com funções auxiliares apenas para LocalStorage.

const useFirebase = false;
const listenerMap = new Map();
const lastSnapshotByKey = new Map();
let pollingStarted = false;

function getDefaultValue(key) {
    return key.includes('patients') || key.includes('history') || key.includes('notifications')
        ? []
        : null;
}

function parseStoredValue(raw, key) {
    if (raw === null || raw === undefined) {
        return getDefaultValue(key);
    }

    try {
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`Valor inválido em localStorage para a chave "${key}".`, e);
        return getDefaultValue(key);
    }
}

function readKey(key) {
    return parseStoredValue(localStorage.getItem(key), key);
}

function notifyKey(key) {
    const listeners = listenerMap.get(key);
    if (!listeners || listeners.size === 0) {
        return;
    }

    const value = readKey(key);
    listeners.forEach((callback) => callback(value));
}

function notifyIfChanged(key) {
    const raw = localStorage.getItem(key);
    if (raw === lastSnapshotByKey.get(key)) {
        return;
    }

    lastSnapshotByKey.set(key, raw);
    notifyKey(key);
}

function startPollingIfNeeded() {
    if (pollingStarted) {
        return;
    }

    pollingStarted = true;

    setInterval(() => {
        listenerMap.forEach((_, key) => notifyIfChanged(key));
    }, 1000);

    window.addEventListener('storage', (event) => {
        if (!event.key) {
            return;
        }
        notifyIfChanged(event.key);
    });
}

// Salva dados
async function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    notifyIfChanged(key);
}

// Carrega dados
async function loadData(key) {
    return readKey(key);
}

// Listener para mudanças de dados por chave
async function onDataChange(key, callback) {
    startPollingIfNeeded();

    if (!listenerMap.has(key)) {
        listenerMap.set(key, new Set());
    }

    const listeners = listenerMap.get(key);
    listeners.add(callback);

    // Emite valor atual imediatamente
    callback(readKey(key));

    return () => {
        const keyListeners = listenerMap.get(key);
        if (!keyListeners) {
            return;
        }

        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
            listenerMap.delete(key);
            lastSnapshotByKey.delete(key);
        }
    };
}

// Listener para chamadas (retrocompatibilidade)
function onCallsChange(callback) {
    return onDataChange('call-notifications', callback);
}

// Adiciona item a um array
async function pushToArray(key, newItem) {
    const arr = await loadData(key);
    const nextArr = Array.isArray(arr) ? [...arr, newItem] : [newItem];
    await saveData(key, nextArr);
}

// Remove item de um array
async function removeFromArray(key, filterFn) {
    const arr = await loadData(key);
    const baseArr = Array.isArray(arr) ? arr : [];
    const updated = baseArr.filter(filterFn);
    await saveData(key, updated);
}

// Adiciona item no início de um array
async function unshiftToArray(key, newItem) {
    const arr = await loadData(key);
    const nextArr = Array.isArray(arr) ? [newItem, ...arr] : [newItem];
    await saveData(key, nextArr);
}

export { saveData, loadData, onDataChange, onCallsChange, pushToArray, removeFromArray, unshiftToArray, useFirebase };

// Também expõe globalmente para fallback nomodule
try {
    window.BackendHelper = {
        saveData,
        loadData,
        onDataChange,
        onCallsChange,
        pushToArray,
        removeFromArray,
        unshiftToArray,
        useFirebase
    };
} catch (e) {
    // ambiente sem window
}
