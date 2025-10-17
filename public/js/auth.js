// ARQUIVO COMPLETO E ATUALIZADO: /public/js/auth.js
// Comportamento de TELA CHEIA para autenticação restaurado.

// --- CONSTANTES E URLs ---
const API_AUTH_URL = '/api/auth';

// --- CACHE DE ELEMENTOS DO DOM ---
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const verifyForm = document.getElementById('verify-form');
const mainContent = document.querySelector('main.container');
const mainHeader = document.querySelector('.main-header');
const mainFooter = document.querySelector('.main-footer');
const userDisplay = document.getElementById('user-display');
const logoutButton = document.getElementById('logout-button');
const profileForm = document.getElementById('profile-form');
const loginBox = document.querySelector('.login-box');
const registerBox = document.querySelector('.register-box');
const verifyBox = document.querySelector('.verify-box');

// Botão de Login no cabeçalho
const loginButtonHeader = document.createElement('button');
loginButtonHeader.id = 'login-button-header';
loginButtonHeader.className = 'btn btn-primary';
loginButtonHeader.textContent = 'Login / Cadastrar';
loginButtonHeader.style.display = 'none';
if (userDisplay) {
    userDisplay.parentNode.insertBefore(loginButtonHeader, userDisplay);
}

// --- ESTADO GLOBAL DO MÓDULO ---
let emailForVerification = '';

/**
 * Ponto de entrada da autenticação.
 */
function initAuth() {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.token) {
        configureForLoggedInState(userInfo);
    } else {
        // Se não há usuário, verifica se o URL é para autenticação
        // Se não, mostra a tela de autenticação por padrão
        const isAuthPage = window.location.hash.includes('login') || window.location.hash.includes('register');
        if (isAuthPage) {
            showAuthScreen();
        } else {
             // Por padrão, se deslogado, mostra o site. O usuário clica para logar.
            configureForLoggedOutState();
        }
    }
    setupAuthEventListeners();
}


/**
 * Configura todos os ouvintes de eventos de autenticação.
 */
function setupAuthEventListeners() {
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthBox('register');
    });
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthBox('login');
    });
    loginButtonHeader.addEventListener('click', showAuthScreen);
    authOverlay?.addEventListener('click', (e) => {
        // Se o usuário clicar fora, volta para o site (caso ele tenha chegado lá)
        if (e.target === authOverlay) {
            showAppContent();
        }
    });
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    verifyForm?.addEventListener('submit', handleVerify);
    logoutButton?.addEventListener('click', handleLogout);
    document.getElementById('resend-code-link')?.addEventListener('click', handleResendCode);

    // Lógica corrigida do OTP Input
    const otpContainer = document.getElementById('otp-input');
    otpContainer?.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('.otp-digit')) {
            if (target.value.length > 1) target.value = target.value.slice(0, 1);
            const index = parseInt(target.dataset.index, 10);
            if (target.value !== '' && index < 5) {
                const nextInput = target.nextElementSibling;
                if (nextInput) {
                    nextInput.disabled = false;
                    nextInput.focus();
                }
            }
        }
    });
    otpContainer?.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target.matches('.otp-digit')) {
            const index = parseInt(target.dataset.index, 10);
            if (e.key === 'Backspace' && target.value === '' && index > 0) {
                target.previousElementSibling.focus();
            }
        }
    });
}

// --- CONTROLE DA UI (LÓGICA RESTAURADA) ---

/**
 * Esconde o conteúdo principal e exibe a tela de autenticação em tela cheia.
 */
function showAuthScreen() {
    mainHeader.style.display = 'none';
    mainFooter.style.display = 'none';
    mainContent.style.display = 'none';
    authOverlay.style.display = 'flex';
    loginForm.style.display = "block"
    registerForm.style.display = "block"
    verifyForm.style.display = "block"
    showAuthBox('login'); // Sempre começa com a caixa de login
}

/**
 * Esconde a tela de autenticação e exibe o conteúdo principal da aplicação.
 */
function showAppContent() {
    mainHeader.style.display = 'block';
    mainFooter.style.display = 'flex';
    mainContent.style.display = 'block';
    authOverlay.style.display = 'none';
}

/**
 * Controla qual "caixa" (login, registro, verificação) é exibida.
 * @param {'login' | 'register' | 'verify'} boxToShow
 */
function showAuthBox(boxToShow) {
    loginBox.style.display = 'none';
    registerBox.style.display = 'none';
    verifyBox.style.display = 'none';
    
    if (boxToShow === 'login') {
        loginBox.style.display = 'block';
        authOverlay.className = 'show-login';
    } else if (boxToShow === 'register') {
        registerBox.style.display = 'block';
        authOverlay.className = 'show-register';
    } else if (boxToShow === 'verify') {
        verifyBox.style.display = 'block';
        authOverlay.className = '';
        document.querySelector('.otp-digit')?.focus();
    }
}

// --- MANIPULADORES DE EVENTOS (HANDLERS) ---
// (Esta seção permanece a mesma, pois a lógica de API está correta)

async function handleLogin(e) {
    e.preventDefault();
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;
    const button = loginForm.querySelector('button[type="submit"]');
    setLoadingState(button, true, 'Entrando...');

    try {
        const response = await fetch(`${API_AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) {
            if (data.needsVerification) {
                showNotification(data.error, 'warning');
                emailForVerification = data.email;
                document.getElementById('verify-email-display').textContent = emailForVerification;
                showAuthBox('verify');
            } else {
                throw new Error(data.error || 'Ocorreu um erro.');
            }
        } else {
            localStorage.setItem('userInfo', JSON.stringify(data));
            showNotification('Login bem-sucedido!', 'success');
            setTimeout(() => window.location.reload(), 1000);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        setLoadingState(button, false, 'Entrar');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = registerForm.querySelector('#register-username').value;
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    const button = registerForm.querySelector('button[type="submit"]');
    setLoadingState(button, true, 'Registrando...');

    try {
        const response = await fetch(`${API_AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        showNotification(data.message, 'success');
        emailForVerification = data.email;
        document.getElementById('verify-email-display').textContent = emailForVerification;
        showAuthBox('verify');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        setLoadingState(button, false, 'Registrar');
    }
}

async function handleVerify(e) {
    e.preventDefault();
    const otpInputs = Array.from(document.querySelectorAll('.otp-digit'));
    const code = otpInputs.map(input => input.value).join('');
    if (code.length !== 6) {
        showNotification('Por favor, insira o código de 6 dígitos.', 'warning');
        return;
    }
    const button = verifyForm.querySelector('button[type="submit"]');
    setLoadingState(button, true, 'Verificando...');

    try {
        const response = await fetch(`${API_AUTH_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailForVerification, code })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        showNotification(data.message, 'success');
        setTimeout(() => {
            showAuthBox('login');
            loginForm.querySelector('#login-email').value = emailForVerification;
            loginForm.querySelector('#login-password').focus();
            otpInputs.forEach(input => { input.value = ''; input.disabled = true; });
            otpInputs[0].disabled = false;
        }, 1500);
    } catch (error) {
        showNotification(error.message, 'error');
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
    } finally {
        setLoadingState(button, false, 'Verificar Conta');
    }
}

async function handleResendCode(e) {
    e.preventDefault();
    if (!emailForVerification) {
        showNotification('Erro: e-mail não encontrado.', 'error');
        return;
    }
    const link = e.target;
    if (link.dataset.disabled === 'true') return;
    link.style.pointerEvents = 'none';
    link.dataset.disabled = 'true';
    link.textContent = 'Enviando...';

    try {
        const response = await fetch(`${API_AUTH_URL}/resend-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailForVerification })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        showNotification(data.message, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        link.style.pointerEvents = 'auto';
        link.dataset.disabled = 'false';
        link.textContent = 'Reenviar código';
    }
}

function handleLogout() {
    localStorage.removeItem('userInfo');
    showNotification('Você foi desconectado.', 'info');
    setTimeout(() => {
        window.location.hash = '';
        window.location.reload();
    }, 1500);
}

// --- FUNÇÕES UTILITÁRIAS ---

function getUserInfo() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (e) {
        localStorage.removeItem('userInfo');
        return null;
    }
}

function setLoadingState(button, isLoading, loadingText) {
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
    }
    button.disabled = isLoading;
    button.textContent = isLoading ? loadingText : button.dataset.originalText;
}

// --- FUNÇÕES DE CONFIGURAÇÃO DE ESTADO ---

function configureForLoggedInState(userInfo) {
    showAppContent(); // Garante que o app esteja visível
    userDisplay.querySelector('.username').textContent = userInfo.username;
    userDisplay.style.display = 'flex';
    loginButtonHeader.style.display = 'none';
    document.querySelectorAll('.nav-link[data-protected="true"]').forEach(link => {
        link.removeAttribute('disabled');
        link.style.cursor = 'pointer';
        link.style.opacity = '1';
    });
    if (profileForm) {
        profileForm.querySelector('#profile-email').value = userInfo.email;
        profileForm.querySelector('#profile-username').value = userInfo.username;
    }
}

function configureForLoggedOutState() {
    showAppContent(); // Mostra o conteúdo público do app
    userDisplay.style.display = 'none';
    loginButtonHeader.style.display = 'flex';
    document.querySelectorAll('.nav-link[data-protected="true"]').forEach(link => {
        link.setAttribute('disabled', 'true');
        link.style.cursor = 'not-allowed';
        link.style.opacity = '0.5';
    });
}

<<<<<<< HEAD
// --- INICIALIZAÇÃO ---
// Ligeira modificação para garantir que a tela de auth apareça primeiro se não houver usuário
document.addEventListener('DOMContentLoaded', () => {
    const userInfo = getUserInfo();
    if (!userInfo) {
        showAuthScreen();
    } else {
        initAuth();
    }
});
=======
// --- API Functions ---

async function apiGetUserByUsername(username) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/user/find/${username}`, {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar usuário.");
    }

    return await response.json();
}

async function apiSendFriendRequest(recipientId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch("/api/friends/request", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ recipientId })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao enviar pedido de amizade.");
    }

    return await response.json();
}

async function apiGetFriendRequests() {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch("/api/friends/requests", {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar pedidos de amizade.");
    }

    return await response.json();
}

async function apiAcceptFriendRequest(requestId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/friends/request/${requestId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ status: 'accepted' })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao aceitar pedido de amizade.");
    }

    return await response.json();
}

async function apiDeclineFriendRequest(requestId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/friends/request/${requestId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ status: 'declined' })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao recusar pedido de amizade.");
    }

    return await response.json();
}

async function apiGetFriends() {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch("/api/friends", {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar amigos.");
    }

    return await response.json();
}

async function apiGetSharedVehicles() {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch("/api/vehicles/shared", {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar veículos compartilhados.");
    }

    return await response.json();
}

async function apiShareVehicle(vehicleId, friendId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/vehicles/${vehicleId}/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ friendId })
    });

    return await response.json();
}

async function apiRemoveFriend(friendId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao remover amigo.");
    }

    return await response.json();
}

async function apiUpdateNickname(friendId, nickname) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/friends/${friendId}/nickname`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
        },
        body: JSON.stringify({ nickname })
    });

    return await response.json();
}

async function apiGetMessages(friendId) {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) throw new Error("Usuário não autenticado.");

    const response = await fetch(`/api/messages/${friendId}`, {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao buscar mensagens.");
    }

    return await response.json();
}
>>>>>>> ac4e9a5 (teste)
