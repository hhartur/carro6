// --- START OF FILE utils.js ---

// --- Smart Garage Nexus - Utility Functions ---

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
    notification.className = `notification ${type}`; // type pode ser 'cold' ou 'hot' também
    const messageSpan = document.createElement('span'); messageSpan.textContent = message; notification.appendChild(messageSpan);
    const closeBtn = document.createElement('button'); closeBtn.innerHTML = '×'; closeBtn.className = 'close-btn'; closeBtn.setAttribute('aria-label', 'Fechar notificação'); closeBtn.title = 'Fechar';
    const closeAction = () => {
        notification.classList.remove('animate-in');
        notification.classList.add('animate-out');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) notification.remove();
        }, { once: true });
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 500);
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
        backdrop.addEventListener('transitionend', () => {
            if (backdrop.parentNode) backdrop.remove();
        }, { once: true });
        setTimeout(() => {
            if (backdrop.parentNode) backdrop.remove();
        }, 400);
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

/**
 * [ATUALIZADO] Fetches additional vehicle details from the backend API.
 * Throws a custom error with a status code on failure.
 * @param {string} identificadorVeiculo - The unique identifier (e.g., "Make-Model") to search for.
 * @returns {Promise<object>} A promise that resolves with the vehicle data object.
 * @throws {Error} Throws a custom error with a .status property on HTTP error.
 */
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    console.log(`[API Veiculo] Buscando detalhes para: ${identificadorVeiculo}`);
    const apiUrl = `/api/vehicles/${encodeURIComponent(identificadorVeiculo)}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || `Erro HTTP ${response.status}`);
        error.status = response.status; // Attach status code to the error
        throw error;
    }
    
    console.log(`[API Veiculo] Dados encontrados para ${identificadorVeiculo}:`, data);
    return data;
}


/**
 * Fetches weather data for a given city from the local backend API.
 * @param {string} cityName - The name of the city.
 * @returns {Promise<object|{error: boolean, message: string}>} Weather data or error object.
 */
async function fetchWeatherForDestination(cityName) {
    const backendUrl = `/api/weather`;
    console.log(`[API Clima] Enviando POST para "${cityName}" em: ${backendUrl}`);

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city: cityName })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`[API Clima] Erro ${response.status} para "${cityName}":`, data.error || response.statusText);
            throw new Error(data.error || `Erro ${response.status} ao buscar clima.`);
        }

        console.log(`[API Clima] Dados recebidos para "${cityName}":`, data);
        if (!data || typeof data.temp !== 'number' || !data.description) {
            console.error(`[API Clima] Dados de clima inválidos ou incompletos para "${cityName}":`, data);
            throw new Error(`Dados de clima inválidos recebidos para ${cityName}.`);
        }

        return data;
    } catch (error) {
        console.error(`[API Clima] Falha ao buscar clima para "${cityName}":`, error);
        return { error: true, message: error.message || `Não foi possível obter o clima para ${cityName}.` };
    }
}

// --- END OF FILE utils.js ---