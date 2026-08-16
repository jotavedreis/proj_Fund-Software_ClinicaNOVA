// Script para aplicar fundo gradiente aleatório
document.addEventListener('DOMContentLoaded', () => {
    const backgroundImages = [
        '../public/images/background/background1.png',
        '../public/images/background/background2.png',
        '../public/images/background/background3.png',
        '../public/images/background/background4.png',
        '../public/images/background/background5.png',
        '../public/images/background/background6.png',
    ];

    // Escolhe um gradiente aleatório
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const selectedGradient = backgroundImages[randomIndex];

    // Aplica ao fundo
    document.body.style.backgroundImage = `url('${selectedGradient}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.minHeight = '100vh';
});
