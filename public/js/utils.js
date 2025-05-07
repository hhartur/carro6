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
 * Fetches additional vehicle details from the simulated API (local JSON file).
 * @param {string} identificadorVeiculo - The unique identifier (e.g., "Make-Model") to search for.
 * @returns {Promise<object|null|{error: boolean, message: string}>} A promise that resolves with:
 *   - The vehicle data object if found.
 *   - `null` if the identifier is not found in the data.
 *   - An object `{ error: true, message: string }` if an HTTP or processing error occurs.
 */
async function buscarDetalhesVeiculoAPI(identificadorVeiculo) {
    console.log(`[API Veiculo] Buscando detalhes para: ${identificadorVeiculo}`);
    const apiUrl = './dados_veiculos_api.json';

    try {
        const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.error(`[API Veiculo] Erro HTTP: ${response.status} - ${response.statusText} ao buscar ${apiUrl}`);
            let errorMessage = `Falha ao buscar dados do veículo (${response.status}).`;
            if (response.status === 404) errorMessage = "Arquivo de dados de veículos não encontrado.";
            return { error: true, message: errorMessage };
        }
        const todosOsDados = await response.json();
        if (!Array.isArray(todosOsDados)) {
             console.error("[API Veiculo] Erro: O arquivo JSON de veículos não contém um array válido.");
             return { error: true, message: "Formato de dados de veículos inválido." };
        }
        const dadosVeiculo = todosOsDados.find(
            (data) => data.identificador && data.identificador.toLowerCase() === identificadorVeiculo.toLowerCase()
        );
        if (dadosVeiculo) {
            console.log(`[API Veiculo] Dados encontrados para ${identificadorVeiculo}:`, dadosVeiculo);
            return dadosVeiculo;
        } else {
            console.log(`[API Veiculo] Nenhum dado encontrado para o identificador: ${identificadorVeiculo}`);
            return null;
        }
    } catch (error) {
        console.error("[API Veiculo] Erro durante a busca ou processamento JSON:", error);
        let errorMessage = "Erro de rede ou ao processar dados de veículos.";
        if (error instanceof SyntaxError) errorMessage = "Erro: O arquivo JSON de veículos está mal formatado.";
        return { error: true, message: errorMessage };
    }
}


/**
 * Fetches weather data for a given city from the backend API.
 * @param {string} cityName - The name of the city.
 * @returns {Promise<object|{error: boolean, message: string}>} Weather data or error object.
 */
async function fetchWeatherForDestination(cityName) {
    const a = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${'2868f6366988cc5b344d939c4e89ae96'}}`
    const backendUrl = `https://carro6222.vercel.app/api/weather?q=${encodeURIComponent(cityName)}`;
    console.log(`[API Clima] Requesting weather for "${cityName}" from: ${backendUrl}`);

    try {
        const response = await fetch(a);
        const data = await response.json(); // Tenta parsear JSON mesmo se não for OK, para pegar msg de erro da API

        if (!response.ok) {
            console.error(`[API Clima] Erro ${response.status} para "${cityName}":`, data.error || response.statusText);
            throw new Error(data.error || `Erro ${response.status} ao buscar clima para ${cityName}.`);
        }

        console.log(`[API Clima] Dados recebidos para "${cityName}":`, data);
        if (!data || typeof data.temp !== 'number' || !data.description) {
            console.error(`[API Clima] Dados de clima inválidos ou incompletos para "${cityName}":`, data);
            throw new Error(`Dados de clima inválidos recebidos para ${cityName}.`);
        }
        return data; // { temp, description, feelsLike, icon, cityFound }
    } catch (error) {
        console.error(`[API Clima] Falha ao buscar clima para "${cityName}":`, error);
        // Retorna um objeto de erro padronizado para o handler principal
        return { error: true, message: error.message || `Não foi possível obter o clima para ${cityName}.` };
    }
}

/**
 * Fetches (simulated) distance between two locations from the backend API.
 * @param {string} originCity - The name of the origin city.
 * @param {string} destinationCity - The name of the destination city.
 * @returns {Promise<object|{error: boolean, message: string}>} Distance data or error object.
 */
async function fetchDistanceBetweenCities(originCity, destinationCity) {/*
    const backendUrl = `https://carro6222.vercel.app/api/distance/${encodeURIComponent(originCity)}/${encodeURIComponent(destinationCity)}`;
    console.log(`[API Distância] Requesting distance between "${originCity}" and "${destinationCity}" from: ${backendUrl}`);

    try {
        const response = await fetch(backendUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error(`[API Distância] Erro ${response.status} para rota ${originCity}-${destinationCity}:`, data.error || response.statusText);
            throw new Error(data.error || `Erro ${response.status} ao buscar distância.`);
        }

        console.log(`[API Distância] Dados recebidos para rota ${originCity}-${destinationCity}:`, data);
        if (!data || typeof data.distance !== 'number') {
            console.error(`[API Distância] Dados de distância inválidos ou incompletos:`, data);
            throw new Error(`Dados de distância inválidos recebidos.`);
        }
        return data; // { distance, unit }
    } catch (error) {
        console.error(`[API Distância] Falha ao buscar distância:`, error);
        return { error: true, message: error.message || `Não foi possível obter a distância.` };
    }*/
}

// --- END OF FILE utils.js ---