// ARQUIVO COMPLETO E ATUALIZADO: /public/js/auth.js

const API_AUTH_URL = '/api/auth';
const authOverlay = document.getElementById('auth-overlay');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const mainContent = document.querySelector('main.container');
const mainHeader = document.querySelector('.main-header');
const mainFooter = document.querySelector('.main-footer');
const userDisplay = document.getElementById('user-display');
const logoutButton = document.getElementById('logout-button');
const profileForm = document.getElementById('profile-form');

// --- NOVO ELEMENTO ---
// Botão "Login" que aparecerá no cabeçalho para usuários deslogados
const loginButtonHeader = document.createElement('button');
loginButtonHeader.id = 'login-button-header';
loginButtonHeader.className = 'btn btn-primary';
loginButtonHeader.textContent = 'Login / Cadastrar';
loginButtonHeader.style.display = 'none'; // Começa escondido
userDisplay.parentNode.insertBefore(loginButtonHeader, userDisplay);


/**
 * Ponto de entrada principal da autenticação.
 * Determina o estado (logado/deslogado) e configura a UI de acordo.
 */

function showAuth() {
    if (authOverlay) {
        authOverlay.style.display = 'flex';
        authOverlay.classList.add('show-login');
    }
    if(mainContent) mainContent.style.display = 'none';
    if(mainHeader) mainHeader.style.display = 'none';
    if(mainFooter) mainFooter.style.display = 'none';
    if (userDisplay) userDisplay.style.display = 'none';
}

function initAuth() {
    // A estrutura principal da aplicação agora é sempre visível
    mainHeader.style.display = 'block';
    mainFooter.style.display = 'flex';
    mainContent.style.display = 'block';

    const userInfo = getUserInfo();
    if (userInfo && userInfo.token) {
        configureForLoggedInState(userInfo);
    } else {
        configureForLoggedOutState();
    }
    setupAuthEventListeners();
}

/**
 * Configura todos os ouvintes de eventos relacionados à autenticação.
 */
function setupAuthEventListeners() {
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        authOverlay.classList.remove('show-login');
        authOverlay.classList.add('show-register');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        authOverlay.classList.remove('show-register');
        authOverlay.classList.add('show-login');
    });

    // Ouve o clique no novo botão de login do cabeçalho
    loginButtonHeader.addEventListener('click', () => {
        showAuth()
    });
    
    // Permite fechar o modal clicando fora da caixa de formulário
    authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) {
            authOverlay.style.display = 'none';
        }
    });

    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
    logoutButton?.addEventListener('click', handleLogout);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;
    await submitAuthForm(`${API_AUTH_URL}/login`, { email, password }, loginForm);
}

async function handleRegister(e) {
    e.preventDefault();
    const username = registerForm.querySelector('#register-username').value;
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    await submitAuthForm(`${API_AUTH_URL}/register`, { username, email, password }, registerForm);
}

async function submitAuthForm(url, body, formElement) {
    const button = formElement.querySelector('button[type="submit"]');
    const originalButtonText = button.textContent;
    button.disabled = true;
    button.textContent = 'Processando...';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro.');
        }
        
        localStorage.setItem('userInfo', JSON.stringify(data));
        showNotification('Autenticação bem-sucedida!', 'success');
        
        setTimeout(() => {
            window.location.reload(); 
        }, 1000);

    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalButtonText;
    }
}

function handleLogout() {
    localStorage.removeItem('userInfo');
    showNotification('Você foi desconectado.', 'info');
    setTimeout(() => {
        window.location.hash = ''; // Limpa o hash para evitar ir para uma página protegida
        window.location.reload();
    }, 1500);
}

function getUserInfo() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (e) {
        localStorage.removeItem('userInfo');
        return null;
    }
}

/**
 * Configura a interface para um usuário LOGADO.
 * Mostra o nome do usuário, habilita abas e preenche o perfil.
 */
function configureForLoggedInState(userInfo) {
    authOverlay.style.display = 'none';
    userDisplay.querySelector('.username').textContent = userInfo.username;
    userDisplay.style.display = 'flex';
    loginButtonHeader.style.display = 'none';

    // Habilita todas as abas protegidas
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

/**
 * Configura a interface para um usuário DESLOGADO.
 * Mostra o botão de login e desabilita as abas protegidas.
 */
function configureForLoggedOutState() {
    authOverlay.style.display = 'none'; // O overlay agora é um modal, começa escondido
    userDisplay.style.display = 'none';
    loginButtonHeader.style.display = 'flex';

    // Desabilita as abas protegidas
    document.querySelectorAll('.nav-link[data-protected="true"]').forEach(link => {
        link.setAttribute('disabled', 'true');
        link.style.cursor = 'not-allowed';
        link.style.opacity = '0.5';
    });
}

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