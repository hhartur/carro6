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
    const closeAction = () => { notification.classList.remove('animate-in'); notification.classList.add('animate-out'); notification.addEventListener('transitionend', () => notification.remove(), { once: true }); setTimeout(() => { if (notification.parentNode) notification.remove(); }, 500); };
    closeBtn.addEventListener('click', closeAction); notification.appendChild(closeBtn);
    notificationArea.appendChild(notification);
    void notification.offsetWidth; notification.classList.add('animate-in');
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
    if (document.getElementById('confirmation-dialog-backdrop')) { console.warn("Confirmation dialog already open."); return; }
    const backdrop = document.createElement('div'); backdrop.id = 'confirmation-dialog-backdrop'; backdrop.className = 'confirmation-dialog-backdrop';
    const dialog = document.createElement('div'); dialog.id = 'confirmation-dialog'; dialog.className = 'confirmation-dialog';
    const msgElement = document.createElement('p'); msgElement.id = 'confirmation-message'; msgElement.textContent = message; dialog.appendChild(msgElement);
    const btnContainer = document.createElement('div'); btnContainer.className = 'dialog-buttons';
    const btnYes = document.createElement('button'); btnYes.id = 'confirm-yes'; btnYes.className = 'btn btn-danger'; btnYes.textContent = 'Sim';
    const closeDialog = () => { backdrop.classList.remove('visible'); backdrop.addEventListener('transitionend', () => { if (backdrop.parentNode) backdrop.remove(); }, { once: true }); setTimeout(() => { if (backdrop.parentNode) backdrop.remove(); }, 400); };
    btnYes.onclick = () => { closeDialog(); if (typeof onConfirm === 'function') onConfirm(); }; btnContainer.appendChild(btnYes);
    const btnNo = document.createElement('button'); btnNo.id = 'confirm-no'; btnNo.className = 'btn'; btnNo.textContent = 'Não';
    btnNo.onclick = () => { closeDialog(); if (typeof onCancel === 'function') onCancel(); }; btnContainer.appendChild(btnNo);
    dialog.appendChild(btnContainer); backdrop.appendChild(dialog); document.body.appendChild(backdrop);
    requestAnimationFrame(() => { backdrop.classList.add('visible'); });
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) { closeDialog(); if (typeof onCancel === 'function') onCancel(); } });
}

/**
 * Generates a simple pseudo-unique ID string.
 * @returns {string} A unique ID string, e.g., "_a1b2c3d4e".
 */
function generateUniqueId() { return '_' + Math.random().toString(36).substring(2, 11); }