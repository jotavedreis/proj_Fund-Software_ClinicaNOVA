// Script para exibir relógio em tempo real
document.addEventListener('DOMContentLoaded', () => {
    const clockElement = document.getElementById('clock');
    
    if (clockElement) {
        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            clockElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
        
        // Atualizar clock imediatamente e depois a cada segundo
        updateClock();
        setInterval(updateClock, 1000);
    }
});
