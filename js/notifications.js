// Detecta se o dispositivo é mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.matchMedia('(max-width: 768px)').matches;
}

// Módulo para gerenciar notificações push
export async function initializeNotifications({ userInitiated = false } = {}) {
    // Verifica se o navegador suporta notificações e service workers
    if (!('Notification' in window)) {
        console.log('⚠️ Navegador não suporta notificações');
        return false;
    }

    if (!('serviceWorker' in navigator)) {
        console.log('⚠️ Navegador não suporta service workers');
        return false;
    }

    const isMobile = isMobileDevice();
    console.log('📱 Tipo de dispositivo:', isMobile ? 'Mobile' : 'Desktop/Tablet');

    try {
        // Usa caminho baseado na raiz do site
        const swPath = '/sw.js';
        console.log('📍 Registrando Service Worker em:', swPath);

        // Registra o Service Worker
        const registration = await navigator.serviceWorker.register(swPath, {
            scope: '/'
        });
        console.log('✓ Service Worker registrado:', registration);

        // Se o usuário já permitiu notificações, apenas retorna
        if (Notification.permission === 'granted') {
            console.log('✓ Notificações já permitidas');
            return true;
        }

        // Se a permissão não foi definida
        if (Notification.permission === 'default') {
            // Só pede permissão se for iniciado pelo usuário
            if (!userInitiated) {
                console.log('ℹ️ Permissão de notificação pendente; requer interação do usuário');
                return false;
            }

            console.log('📢 Solicitando permissão via clique do usuário...');
            const permission = await Notification.requestPermission();
            console.log('📢 Resultado da permissão:', permission);
            return permission === 'granted';
        }

        console.log('⚠️ Notificações foram bloqueadas pelo usuário');
        return false;
    } catch (error) {
        console.error('❌ Erro ao inicializar notificações:', error);
        return false;
    }
}

export async function sendLocalNotification(title, options = {}) {
    // Verifica se notificações são suportadas
    if (!('Notification' in window)) {
        console.warn('⚠️ Notificações não são suportadas neste navegador');
        return;
    }

    // Usa notificações locais (não requer backend)
    if (Notification.permission !== 'granted') {
        console.warn('⚠️ Permissão de notificação não foi concedida');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Usa caminhos baseados na raiz do site
        const iconPath = '/assets/images/logo/logo-atelie-white-tooth.svg';
        const badgePath = '/assets/images/logo/logo-atelie-color-tooth.svg';

        registration.showNotification(title, {
            icon: iconPath,
            badge: badgePath,
            tag: 'patient-notification',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Chamar'
                }
            ],
            ...options
        });
        console.log('✓ Notificação enviada:', title);
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
    }
}

export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
            console.log('📢 Permissão de notificação:', permission);
        });
    }
}
