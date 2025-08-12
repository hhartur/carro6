// ARQUIVO COMPLETO: /public/js/utils.js

/**
 * Displays a temporary notification message (toast) on the screen.
 * @param {string} message - The message content to display.
 * @param {string} [type='info'] - Type ('info', 'success', 'warning', 'error').
 * @param {number} [duration=4000] - Duration in milliseconds.
 */
function showNotification(message, type = 'info', duration = 4000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) { console.error("CRITICAL: #notification-area not found!"); alert(`Notify Error: Area missing. Msg: ${message}`); return; }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const messageSpan = document.createElement('span'); messageSpan.textContent = message; notification.appendChild(messageSpan);
    const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.className = 'close-btn'; closeBtn.setAttribute('aria-label', 'Fechar notificação'); closeBtn.title = 'Fechar';
    const closeAction = () => {
        notification.classList.remove('animate-in');
        notification.classList.add('animate-out');
        notification.addEventListener('transitionend', () => { if (notification.parentNode) notification.remove(); }, { once: true });
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 500);
    };
    closeBtn.addEventListener('click', closeAction);
    notification.appendChild(closeBtn);
    notificationArea.appendChild(notification);
    void notification.offsetWidth; // Trigger reflow to apply initial state before animation
    notification.classList.add('animate-in');
    const autoRemoveTimer = setTimeout(closeAction, duration);
    closeBtn.addEventListener('click', () => clearTimeout(autoRemoveTimer), { once: true });
}

/**
 * Displays a modal confirmation dialog.
 * @param {string} message - The confirmation question.
 * @param {function} onConfirm - Callback if user confirms.
 * @param {function} [onCancel] - Optional callback if user cancels.
 */
function showConfirmation(message, onConfirm, onCancel) {
    if (document.getElementById('confirmation-dialog-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'confirmation-dialog-backdrop';
    backdrop.className = 'confirmation-dialog-backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `<p>${message}</p><div class="dialog-buttons"><button class="btn btn-secondary" id="confirm-no">Não</button><button class="btn btn-danger" id="confirm-yes">Sim</button></div>`;
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    const closeDialog = () => {
        backdrop.classList.remove('visible');
        backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
    };

    backdrop.querySelector('#confirm-yes').onclick = () => { closeDialog(); if (onConfirm) onConfirm(); };
    backdrop.querySelector('#confirm-no').onclick = () => { closeDialog(); if (onCancel) onCancel(); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { closeDialog(); if (onCancel) onCancel(); }};
    document.addEventListener('keydown', function handleEsc(e) { if (e.key === 'Escape') { closeDialog(); if (onCancel) onCancel(); document.removeEventListener('keydown', handleEsc); }}, { once: true });

    requestAnimationFrame(() => backdrop.classList.add('visible'));
}

/**
 * Generates a simple pseudo-unique ID string.
 * @returns {string} A unique ID string.
 */
function generateUniqueId() {
    return '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Reconstructs a vehicle object from plain data into its corresponding class instance.
 * @param {object} data - The plain object data for a vehicle.
 * @returns {Vehicle|null} An instance of Car, SportsCar, or Truck, or null if type is invalid.
 */
function reconstructVehicle(data) {
    if (!data || !data._type) return null;
    const vehicleClass = {
        'Car': Car,
        'SportsCar': SportsCar,
        'Truck': Truck
    }[data._type];

    // ATUALIZADO: Passa o 'data.owner' para a função fromJSON da classe.
    if (vehicleClass && typeof vehicleClass.fromJSON === 'function') {
        const vehicle = vehicleClass.fromJSON(data);
        if(vehicle) vehicle.owner = data.owner; // Garante que o owner seja atribuído.
        return vehicle;
    }
    console.warn(`[Reconstruct] Unknown or invalid vehicle type '${data._type}'.`);
    return null;
}

// --- API Communication Layer ---

const API_BASE_URL = '/api';

function getAuthHeaders() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const headers = { 'Content-Type': 'application/json' };
    if (userInfo && userInfo.token) {
        headers['Authorization'] = `Bearer ${userInfo.token}`;
    }
    return headers;
}

async function handleApiResponse(response) {
    if (response.status === 401 && !window.location.pathname.endsWith('auth.html')) {
        showNotification('Sua sessão expirou. Por favor, faça login novamente.', 'error');
        localStorage.removeItem('userInfo');
        setTimeout(() => window.location.reload(), 2000);
    }
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || `Erro HTTP ${response.status}`);
        error.status = response.status;
        error.details = data.details;
        throw error;
    }
    return data;
}

// --- User API ---
async function apiUpdateUserProfile(userData) {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
    });
    return handleApiResponse(response);
}


// --- Vehicle API ---
async function apiGetAllVehicles() {
    const response = await fetch(`${API_BASE_URL}/vehicles`, { headers: getAuthHeaders() });
    return handleApiResponse(response);
}

async function apiGetPublicVehicles() {
    const response = await fetch(`${API_BASE_URL}/public-vehicles`, { headers: { 'Content-Type': 'application/json' }});
    return handleApiResponse(response);
}

async function apiAddVehicle(vehicleData) {
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(vehicleData)
    });
    return handleApiResponse(response);
}

async function apiUpdateVehicle(vehicleId, vehicleData) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(vehicleData)
    });
    return handleApiResponse(response);
}

async function apiToggleVehiclePrivacy(vehicleId, isPublic) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/privacy`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPublic })
    });
    return handleApiResponse(response);
}

async function getVehiclePrivacy(vehicleId) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/privacy`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });
    return handleApiResponse(response);
}

async function apiRemoveVehicle(vehicleId) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleApiResponse(response);
}

// --- Maintenance Sub-resource API ---
async function apiAddMaintenance(vehicleId, maintenanceData) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/maintenance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenanceData)
    });
    return handleApiResponse(response);
}

async function apiUpdateMaintenance(vehicleId, maintId, maintenanceData) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/maintenance/${maintId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenanceData)
    });
    return handleApiResponse(response);
}

async function apiDeleteMaintenance(vehicleId, maintId) {
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/maintenance/${maintId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleApiResponse(response);
}


// --- Weather API ---
async function fetchWeatherForDestination(cityName) {
    const backendUrl = `${API_BASE_URL}/weather`;
    const response = await fetch(backendUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ city: cityName })
    });
    return handleApiResponse(response);
}