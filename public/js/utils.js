// ARQUIVO COMPLETO: /public/js/utils.js
// Contém as funções de utilidade, incluindo a camada de comunicação com a API.

/**
 * Displays a temporary notification message (toast) on the screen.
 * @param {string} message - The message content to display.
 * @param {string} [type='info'] - Type ('info', 'success', 'warning', 'error', 'cold', 'hot').
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
    void notification.offsetWidth;
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
    if (document.getElementById('confirmation-dialog-backdrop')) {
        console.warn("Confirmation dialog already open.");
        return;
    }
    const backdrop = document.createElement('div');
    backdrop.id = 'confirmation-dialog-backdrop';
    backdrop.className = 'confirmation-dialog-backdrop';
    const dialog = document.createElement('div');
    dialog.id = 'confirmation-dialog';
    dialog.className = 'confirmation-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirmation-message');
    const msgElement = document.createElement('p');
    msgElement.id = 'confirmation-message';
    msgElement.textContent = message;
    dialog.appendChild(msgElement);
    const btnContainer = document.createElement('div');
    btnContainer.className = 'dialog-buttons';
    const btnYes = document.createElement('button');
    btnYes.id = 'confirm-yes';
    btnYes.className = 'btn btn-danger';
    btnYes.textContent = 'Sim';
    const btnNo = document.createElement('button');
    btnNo.id = 'confirm-no';
    btnNo.className = 'btn';
    btnNo.textContent = 'Não';
    const closeDialog = () => {
        backdrop.classList.remove('visible');
        backdrop.addEventListener('transitionend', () => { if (backdrop.parentNode) backdrop.remove(); }, { once: true });
        setTimeout(() => { if (backdrop.parentNode) backdrop.remove(); }, 400);
    };
    btnYes.onclick = () => {
        closeDialog();
        if (typeof onConfirm === 'function') onConfirm();
    };
    btnNo.onclick = () => {
        closeDialog();
        if (typeof onCancel === 'function') onCancel();
    };
    btnContainer.appendChild(btnNo);
    btnContainer.appendChild(btnYes);
    dialog.appendChild(btnContainer);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => {
        backdrop.classList.add('visible');
        btnNo.focus();
    });
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            closeDialog();
            if (typeof onCancel === 'function') onCancel();
        }
    });
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            closeDialog();
            if (typeof onCancel === 'function') onCancel();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    backdrop.addEventListener('transitionend', () => {
         if (!backdrop.classList.contains('visible')) {
             document.removeEventListener('keydown', handleEsc);
         }
    }, { once: true });
}

/**
 * Generates a simple pseudo-unique ID string.
 * @returns {string} A unique ID string, e.g., "_a1b2c3d4e".
 */
function generateUniqueId() {
    return '_' + Math.random().toString(36).substring(2, 11);
}

// --- API Communication Layer ---

const API_BASE_URL = '/api';

/**
 * Handles API responses, parsing JSON and creating a structured error on failure.
 * @param {Response} response - The raw response from a fetch call.
 * @returns {Promise<any>} The parsed JSON data.
 * @throws {Error} A custom error with status and message properties.
 */
async function handleApiResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || `Erro HTTP ${response.status}`);
        error.status = response.status;
        error.details = data.details;
        throw error;
    }
    return data;
}

/**
 * Fetches all vehicles from the backend.
 * @returns {Promise<Array>} A promise that resolves with the array of vehicles.
 */
async function apiGetAllVehicles() {
    console.log(`[API] GET ${API_BASE_URL}/vehicles`);
    const response = await fetch(`${API_BASE_URL}/vehicles`);
    return handleApiResponse(response);
}

/**
 * Creates a new vehicle on the backend.
 * @param {object} vehicleData - The vehicle data object (from vehicle.toJSON()).
 * @returns {Promise<object>} The newly created vehicle data from the server.
 */
async function apiAddVehicle(vehicleData) {
    console.log(`[API] POST ${API_BASE_URL}/vehicles`, vehicleData);
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
    });
    return handleApiResponse(response);
}

/**
 * Updates a full vehicle object on the backend.
 * @param {string} vehicleId - The ID of the vehicle to update.
 * @param {object} vehicleData - The complete, updated vehicle data object.
 * @returns {Promise<object>} The updated vehicle data from the server.
 */
async function apiUpdateVehicle(vehicleId, vehicleData) {
    console.log(`[API] PUT ${API_BASE_URL}/vehicles/${vehicleId}`, vehicleData);
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
    });
    return handleApiResponse(response);
}

/**
 * Deletes a vehicle on the backend.
 * @param {string} vehicleId - The ID of the vehicle to delete.
 * @returns {Promise<object>} The success message from the server.
 */
async function apiRemoveVehicle(vehicleId) {
    console.log(`[API] DELETE ${API_BASE_URL}/vehicles/${vehicleId}`);
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE'
    });
    return handleApiResponse(response);
}

/**
 * Adds a new maintenance record to a vehicle on the backend.
 * @param {string} vehicleId - The ID of the vehicle receiving the record.
 * @param {object} maintenanceData - The maintenance data object (from maintenance.toJSON()).
 * @returns {Promise<object>} The full vehicle object with the updated maintenance history.
 */
async function apiAddMaintenance(vehicleId, maintenanceData) {
    console.log(`[API] POST ${API_BASE_URL}/vehicles/${vehicleId}/maintenance`, maintenanceData);
    const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData)
    });
    return handleApiResponse(response);
}


/**
 * Fetches weather data for a given city from the local backend API.
 * @param {string} cityName - The name of the city.
 * @returns {Promise<object>} Weather data object.
 */
async function fetchWeatherForDestination(cityName) {
    const backendUrl = `${API_BASE_URL}/weather`; // Rota via POST
    console.log(`[API Clima] POST to ${backendUrl} for city: "${cityName}"`);
    const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName })
    });
    return handleApiResponse(response);
}