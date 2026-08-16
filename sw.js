// Service Worker para gerenciar notificações push
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'Novo paciente aguardando!',
        icon: '/assets/images/logo/logo-atelie-white-tooth.svg',
        badge: '/assets/images/logo/logo-atelie-color-tooth.svg',
        tag: 'patient-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            {
                action: 'open',
                title: 'Chamar'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Ateliê do Sorriso', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Se clicar no botão "Chamar" ou no corpo da notificação
    const urlToOpen = event.action === 'open' || !event.action 
        ? '/pages/painel-dentista.html' 
        : '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Tenta focar na janela já aberta do painel do dentista
            for (let client of clientList) {
                if (client.url.includes('painel-dentista.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Se não encontrar, abre uma nova janela no painel do dentista
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('notificationclose', (event) => {
    console.log('Notificação fechada:', event.notification.tag);
});
