// --- START OF FILE utils.js ---

// --- Smart Garage Nexus - Utility Functions ---

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
        // Use transitionend for smoother removal, with a fallback timeout
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
        setTimeout(() => {
            // Ensure removal even if transitionend doesn't fire (e.g., element already removed)
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500); // 500ms should be longer than the CSS transition
    };
    closeBtn.addEventListener('click', closeAction);
    notification.appendChild(closeBtn);
    notificationArea.appendChild(notification);
    // Trigger reflow before adding class to ensure animation plays
    void notification.offsetWidth;
    notification.classList.add('animate-in');
    // Set timer for automatic removal
    const autoRemoveTimer = setTimeout(closeAction, duration);
    // If closed manually, clear the auto-remove timer
    closeBtn.addEventListener('click', () => clearTimeout(autoRemoveTimer), { once: true });
}

/**
 * Displays a modal confirmation dialog.
 * @param {string} message - The confirmation question.
 * @param {function} onConfirm - Callback if user confirms.
 * @param {function} [onCancel] - Optional callback if user cancels.
 */
function showConfirmation(message, onConfirm, onCancel) {
    // Prevent multiple dialogs
    if (document.getElementById('confirmation-dialog-backdrop')) {
        console.warn("Confirmation dialog already open.");
        return;
    }

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'confirmation-dialog-backdrop';
    backdrop.className = 'confirmation-dialog-backdrop';

    // Create dialog box
    const dialog = document.createElement('div');
    dialog.id = 'confirmation-dialog';
    dialog.className = 'confirmation-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirmation-message');

    // Message
    const msgElement = document.createElement('p');
    msgElement.id = 'confirmation-message';
    msgElement.textContent = message;
    dialog.appendChild(msgElement);

    // Button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'dialog-buttons';

    // Confirm button
    const btnYes = document.createElement('button');
    btnYes.id = 'confirm-yes';
    btnYes.className = 'btn btn-danger'; // Or btn-primary depending on context
    btnYes.textContent = 'Sim';

    // Cancel button
    const btnNo = document.createElement('button');
    btnNo.id = 'confirm-no';
    btnNo.className = 'btn'; // Default button style
    btnNo.textContent = 'Não';

    // Close dialog function
    const closeDialog = () => {
        backdrop.classList.remove('visible');
        backdrop.addEventListener('transitionend', () => {
            if (backdrop.parentNode) {
                backdrop.remove();
            }
        }, { once: true });
        // Fallback removal
        setTimeout(() => {
            if (backdrop.parentNode) {
                backdrop.remove();
            }
        }, 400); // Should be longer than CSS transition
    };

    // Button actions
    btnYes.onclick = () => {
        closeDialog();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };
    btnNo.onclick = () => {
        closeDialog();
        if (typeof onCancel === 'function') {
            onCancel();
        }
    };

    // Add buttons to container
    btnContainer.appendChild(btnNo); // Often cancel is first visually
    btnContainer.appendChild(btnYes);
    dialog.appendChild(btnContainer);

    // Add dialog to backdrop, backdrop to body
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Trigger transition
    requestAnimationFrame(() => {
        backdrop.classList.add('visible');
        btnNo.focus(); // Focus the cancel button by default
    });

    // Close on backdrop click
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            closeDialog();
            if (typeof onCancel === 'function') {
                onCancel();
            }
        }
    });

    // Close on Escape key
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            closeDialog();
            if (typeof onCancel === 'function') {
                onCancel();
            }
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    // Ensure listener is removed if dialog closed otherwise
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
    console.log(`[API] Buscando detalhes para: ${identificadorVeiculo}`);
    const apiUrl = './dados_veiculos_api.json'; // Path relative to index.html

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json' // Explicitly accept JSON
            }
        });

        // Check for HTTP errors (e.g., 404 Not Found, 500 Server Error)
        if (!response.ok) {
            console.error(`[API] Erro HTTP: ${response.status} - ${response.statusText} ao buscar ${apiUrl}`);
            // Provide a user-friendly message based on status
            let errorMessage = `Falha ao buscar dados (${response.status}).`;
            if (response.status === 404) {
                errorMessage = "Arquivo de dados da API não encontrado.";
            } else if (response.status >= 500) {
                errorMessage = "Erro no servidor (simulado) ao buscar dados.";
            }
            return { error: true, message: errorMessage };
        }

        // Attempt to parse the response as JSON
        const todosOsDados = await response.json();

        // Validate that the parsed data is an array
        if (!Array.isArray(todosOsDados)) {
             console.error("[API] Erro: O arquivo JSON não contém um array válido.");
             return { error: true, message: "Formato de dados da API inválido." };
        }

        // Find the vehicle data by the identifier (case-insensitive comparison might be safer)
        const dadosVeiculo = todosOsDados.find(
            (data) => data.identificador && data.identificador.toLowerCase() === identificadorVeiculo.toLowerCase()
        );

        if (dadosVeiculo) {
            console.log(`[API] Dados encontrados para ${identificadorVeiculo}:`, dadosVeiculo);
            return dadosVeiculo; // Return the found object
        } else {
            console.log(`[API] Nenhum dado encontrado para o identificador: ${identificadorVeiculo}`);
            return null; // Not found, return null to indicate this specific case
        }

    } catch (error) {
        // Handle network errors (fetch promise rejected) or JSON parsing errors
        console.error("[API] Erro durante a busca ou processamento JSON:", error);
        let errorMessage = "Erro de rede ou ao processar dados da API.";
        if (error instanceof SyntaxError) {
            errorMessage = "Erro: O arquivo JSON da API está mal formatado.";
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
             errorMessage = "Erro de rede ao tentar buscar dados.";
        }
        return { error: true, message: errorMessage };
    }
}

// --- END OF FILE utils.js ---