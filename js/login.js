const SITE_PASSWORD = 'ADMIN@2026';

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const messageEl = document.getElementById('modalMessage');
    messageEl.textContent = message;
    modal.classList.add('active');
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // fechar modal ao clicar no botão OK
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeErrorModal);
    }

    // fechar modal ao clicar fora dela
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeErrorModal();
            }
        });
    }

    // mostrar/ocultar senha
    const toggle = document.querySelector('.toggle-password');
    const pwdInput = document.getElementById('password');
    if (toggle && pwdInput) {
        const icon = toggle.querySelector('img');
        const showSrc = '../assets/images/password/smileclose-password.svg';
        const hideSrc = '../assets/images/password/smile-password.svg';
        toggle.addEventListener('click', () => {
            const isPassword = pwdInput.getAttribute('type') === 'password';
            pwdInput.setAttribute('type', isPassword ? 'text' : 'password');
            toggle.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
            if (icon) {
                icon.src = isPassword ? hideSrc : showSrc;
            }
        });
    }

    const form = document.querySelector('.login-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = form.password.value || '';
        if (pw === SITE_PASSWORD) {
            localStorage.setItem('authed', '1');
            // redireciona para a página inicial do painel
            window.location.href = '../index.html';
        } else {
            showErrorModal('Senha incorreta');
            form.password.value = '';
            form.password.focus();
        }
    });
});
