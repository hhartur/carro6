// --- Smart Garage Nexus - Main Application Logic JS v5.7 (Post-Removal Bug Fix) ---

/**
 * @file main.js
 * @description Core logic for Smart Garage Nexus (Simplified). Handles UI, events, state, models.
 * Fixes bug where errors could occur during UI updates immediately after vehicle removal.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init 0.1] DOMContentLoaded event fired. Initializing Smart Garage Nexus v5.7 (Post-Removal Fix)...");

    // --- State & Instance Variables ---
    let garage = null;
    let selectedVehicle = null;
    let currentActiveTab = 'dashboard';
    let engineInterval = null;
    let isContentSwapping = false;
    const defaultTheme = 'dark'; // Mantido caso queira reativar temas

    // --- UI Element Cache ---
    console.log("[Init 0.2] Caching DOM Elements...");
    const getElem = (selector, required = true) => { const elem = document.querySelector(selector); if (!elem && required) console.error(`[Init] CRITICAL: Required element "${selector}" not found!`); else if (!elem) console.warn(`[Init] Optional element "${selector}" not found.`); return elem; };
    const getElemById = (id, required = true) => { const elem = document.getElementById(id); if (!elem && required) console.error(`[Init] CRITICAL: Required element "#${id}" not found!`); else if (!elem) console.warn(`[Init] Optional element "#${id}" not found.`); return elem; };

    const body = document.body;
    const mainNav = getElem('.main-nav');
    const navLinks = mainNav?.querySelectorAll('.nav-link[data-tab-target]') ?? [];
    const tabContents = document.querySelectorAll('.tab-content[data-tab-content]');
    const garageDisplay = getElemById('garage-display');
    const detailsColumn = getElem('.garage-column-details');
    const detailsContentArea = getElemById('details-content-area');
    const vehicleDetailsTemplate = getElemById('vehicle-details-template');
    const futureAppointmentsList = getElemById('future-appointments-list');
    const addVehicleForm = getElemById('add-vehicle-form');
    const vehicleTypeSelect = getElemById('vehicle-type');
    const truckSpecificFields = getElemById('truck-specific-fields');
    const notificationArea = getElemById('notification-area');
    console.log("[Init 0.3] Element caching finished.");

    /** Initializes the application. @function initializeApp */
    function initializeApp() {
        console.log("[Init 1.0] === Starting initializeApp ===");
        // --- Rigorous Element Check ---
        console.log("[Init 1.1] Verifying essential elements...");
        const requiredElementsCheck = { body, mainNav, navLinks: navLinks?.length > 0, tabContents: tabContents?.length > 0, garageDisplay, detailsColumn, detailsContentArea, vehicleDetailsTemplate, notificationArea, addVehicleForm, vehicleTypeSelect, truckSpecificFields, futureAppointmentsList };
        let allElementsFound = true;
        for (const [name, elementOrCheck] of Object.entries(requiredElementsCheck)) { const found = Boolean(elementOrCheck); console.log(`[Init 1.1] Check ${name}: ${found ? 'OK' : 'MISSING!'}`); if (!found) allElementsFound = false; }
        if (!allElementsFound) { console.error("[Init 1.2] CRITICAL: Missing essential elements."); alert("Erro Crítico: Elementos essenciais não encontrados."); return; }
        console.log("[Init 1.3] Essential elements verified.");
        // --- Initialize Garage & Load Data ---
        try { console.log("[Init 1.4] Initializing Garage..."); garage = new Garage(); console.log("[Init 1.5] Loading from LocalStorage..."); garage.loadFromLocalStorage(); } catch (error) { console.error("[Init 1.6] CRITICAL ERROR during Garage init/load:", error); alert("Erro Crítico ao inicializar/carregar dados. Verifique o console."); return; }
        console.log(`[Init 1.7] Garage initialized. ${garage.vehicles.length} vehicles loaded.`);
        // --- Setup ---
        console.log("[Init 1.8] Setting up listeners..."); setupEventListeners(); /* loadTheme(); -- Temas removidos */
        // --- Initial Tab Setup ---
        const initialTab = getTabFromHash() || 'dashboard'; console.log(`[Init 1.9] Setting initial tab: ${initialTab}`); navLinks.forEach(l => l.classList.toggle('active', l.dataset.tabTarget === initialTab)); tabContents.forEach(c => { const cId = c.dataset.tabContent || c.id?.replace('tab-', ''); c.style.display = (cId === initialTab) ? 'block' : 'none'; if (cId === initialTab) c.classList.add('active-tab'); }); currentActiveTab = initialTab;
        // --- Initial Rendering ---
        console.log("[Init 1.10] Performing initial rendering..."); renderGarageList(); renderFutureAppointmentsList(); renderDashboard(); renderStats(); renderDetailsAreaContent(null); // Show placeholder
        // --- Initial Animations ---
        console.log("[Init 1.11] Triggering initial animations..."); triggerRenderForTab(initialTab, true);
        console.log("[Init COMPLETE] === Smart Garage Nexus initialization finished ===");
    }

    // --- Theme Management (Removido) ---
    // function loadTheme() { /* ... */ }
    // function setTheme(themeName) { /* ... */ }

    // --- Tab Management & Navigation ---
    /** Activates a tab. @function setActiveTab */
    function setActiveTab(tabId, isInitialLoad = false) {
        if (!tabId || tabId === currentActiveTab || isContentSwapping) { console.log(`[Tabs] Tab '${tabId}' change skipped.`); return; }
        console.log(`[Tabs] Activating: ${tabId} (Prev: ${currentActiveTab})`);
        const prevTabId = currentActiveTab; currentActiveTab = tabId;
        navLinks.forEach(l => l.classList.toggle('active', l.dataset.tabTarget === tabId));
        tabContents.forEach(c => { const cId = c.dataset.tabContent || c.id?.replace('tab-', ''); const isActive = cId === tabId; if (isActive) { c.style.display = 'block'; requestAnimationFrame(() => { c.classList.add('active-tab'); triggerRenderForTab(tabId, isInitialLoad); }); } else if (c.id === `tab-${prevTabId}`) { c.classList.remove('active-tab'); const hide = () => { if (!c.classList.contains('active-tab')) c.style.display = 'none'; }; c.addEventListener('transitionend', hide, { once: true }); setTimeout(hide, 500); } else { c.style.display = 'none'; c.classList.remove('active-tab'); } });
        if (!isInitialLoad) updateUrlHash(tabId);
    }
    /** Gets tab ID from URL hash. @function getTabFromHash */
    function getTabFromHash() { return window.location.hash.substring(1); }
    /** Updates URL hash. @function updateUrlHash */
    function updateUrlHash(tabId) { try { if (window.history.pushState) window.history.pushState(null, '', `#${tabId}`); else window.location.hash = tabId; console.log(`[Nav] Hash updated: #${tabId}`); } catch(e) { console.error("[Nav] Error updating hash:", e); }}
    /** Handles hash change event. @function handleHashChange */
    function handleHashChange() { console.log("[Nav] Hash change."); const tabId = getTabFromHash(); const isValid = ['dashboard', 'garage', 'stats'].includes(tabId); if (isValid && tabId !== currentActiveTab) { setActiveTab(tabId); } else if (!tabId && currentActiveTab !== 'dashboard') { setActiveTab('dashboard'); } }

    // --- Content Rendering & Updates for Tabs ---
    /** Triggers rendering/animations for a tab's sections. @function triggerRenderForTab */
    function triggerRenderForTab(tabId, skipAnimation = false) { console.log(`[Render] Triggering for tab: ${tabId}`); const el = document.getElementById(`tab-${tabId}`); if (!el) return; const sections = el.querySelectorAll('.card-section:not(.sticky-details)'); applyStaggeredAnimation(sections, 'visible', 0.08, skipAnimation); switch (tabId) { case 'dashboard': renderDashboard(); break; case 'garage': renderFutureAppointmentsList(); break; case 'stats': renderStats(); break; } }
    /** Applies staggered animation class. @function applyStaggeredAnimation */
    function applyStaggeredAnimation(elements, triggerClass, baseDelay = 0.06, skip = false) { if (!elements?.length) return; console.log(`[Animate] Staggering '${triggerClass}' on ${elements.length} elements.`); elements.forEach((el, i) => { const d = skip ? '0s' : `${i * baseDelay}s`; el.style.transitionDelay = d; requestAnimationFrame(() => { el.classList.add(triggerClass); const clean = () => el.style.transitionDelay = ''; el.addEventListener('transitionend', clean, { once: true }); setTimeout(clean, 1200 + (i * baseDelay * 1000)); }); }); }

    // --- Dashboard & Stats Rendering ---
    /** Renders the dashboard stats. @function renderDashboard */
    function renderDashboard() {
        console.log("[Render] Updating Dashboard...");
        if (!garage) { console.error("[Render] Cannot render dashboard, garage not initialized."); return; }
        try {
            const totalVehicles = garage.vehicles.length;
            const typeCounts = countVehicleTypes();
            const appointments = garage.getAllFutureAppointments();
            const totalCost = calculateTotalMaintenanceCost();

            updateStatElement("totalVehicles", totalVehicles);
            updateStatElement("vehicleTypes", `${typeCounts.Car || 0}C / ${typeCounts.SportsCar || 0}S / ${typeCounts.Truck || 0}T`);
            updateStatElement("typeDetails", `Carros: ${typeCounts.Car || 0} | Esportivos: ${typeCounts.SportsCar || 0} | Caminhões: ${typeCounts.Truck || 0}`);

            if (appointments.length > 0) {
                const nextApp = appointments[0];
                let dateStr = 'Data Inválida'; try { dateStr = new Date(nextApp.maintenance.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { console.error("Date format error (Dashboard):", e); }
                updateStatElement("nextAppointment", dateStr);
                updateStatElement("appointmentDetails", `${nextApp.vehicleInfo.split('(')[0].trim()} - ${nextApp.maintenance.type}`);
            } else {
                updateStatElement("nextAppointment", 'Nenhum'); updateStatElement("appointmentDetails", 'Sem agendamentos.');
            }
            updateStatElement("totalMaintCostDash", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        } catch (error) {
            console.error("[Render] Error during renderDashboard:", error);
            // Optionally display error indicators on dashboard stats
        }
    }

    /** Renders the statistics tab content. Includes FIX for post-removal error. @function renderStats */
    function renderStats() {
        console.log("[Render] Updating Stats Tab...");
        if (!garage) { console.error("[Render] Cannot render stats, garage not initialized."); return; }
        try {
            // Calculations based on the CURRENT state of garage.vehicles
            const currentVehicles = garage.vehicles; // Work with a stable copy for this render cycle
            const numVehicles = currentVehicles.length;
            console.log(`[RenderStats] Calculating stats for ${numVehicles} vehicles.`);

            const totalCost = calculateTotalMaintenanceCost(); // Uses garage.vehicles directly, should be fine
            const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;
            const vehicleCosts = calculateMaintenanceCostPerVehicle(); // Uses garage.vehicles, fine
             console.log("[RenderStats] Calculated vehicleCosts:", JSON.stringify(vehicleCosts));

            const typeCounts = countVehicleTypes(); // Uses garage.vehicles, fine
             console.log("[RenderStats] Calculated typeCounts:", JSON.stringify(typeCounts));

            // --- Find Most Expensive Vehicle (using the calculated costs for THIS render) ---
            let mostExpensiveDisplay = { id: null, name: 'N/A', cost: -1 };
            let currentMaxCost = -1;
            for (const id in vehicleCosts) {
                // IMPORTANT: Check if the vehicle with this ID *still exists* in the current snapshot
                if (vehicleCosts.hasOwnProperty(id) && currentVehicles.some(v => v.id === id)) {
                     if (vehicleCosts[id].cost > currentMaxCost) {
                        currentMaxCost = vehicleCosts[id].cost;
                        mostExpensiveDisplay = { id: id, name: vehicleCosts[id].name, cost: vehicleCosts[id].cost };
                    }
                }
            }
             console.log("[RenderStats] Determined most expensive vehicle (in current garage):", JSON.stringify(mostExpensiveDisplay));

            // --- Update UI Elements ---
            updateStatElement("totalCost", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("avgCost", avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

            // Safely update most expensive vehicle info
            updateStatElement("mostExpensiveVehicle", mostExpensiveDisplay.name);
            const costDetailEl = document.querySelector('[data-stat="mostExpensiveCost"]');
            if(costDetailEl) {
                 costDetailEl.textContent = mostExpensiveDisplay.cost >= 0 ? `(R$ ${mostExpensiveDisplay.cost.toFixed(2).replace('.', ',')})` : '';
            }

            updateTypeDistributionChart(typeCounts); // Update chart

        } catch (error) {
            console.error("[Render] Error during renderStats:", error);
            // Optionally display error indicators on stats
        }
    }

    /** Updates a single stat display element (simplified). @function updateStatElement */
    function updateStatElement(statName, value) {
        // console.log(`[Render] Stat ${statName} = ${value}`); // Verbose
        const el = document.querySelector(`[data-stat="${statName}"]`);
        if (el) {
            const newValueText = (value !== null && value !== undefined) ? String(value) : '-';
            if (el.textContent !== newValueText) { // Avoid unnecessary DOM manipulation
                el.textContent = newValueText;
            }
        } else {
             console.warn(`[Render] Stat element [data-stat="${statName}"] not found.`);
        }
    }

    /** Calculates total maintenance cost. @function calculateTotalMaintenanceCost */
    function calculateTotalMaintenanceCost() { return garage.vehicles.reduce((sum, v) => sum + (v.maintenanceHistory || []).reduce((s, m) => s + (m?.cost ?? 0), 0), 0); }
    /** Calculates cost per vehicle. @function calculateMaintenanceCostPerVehicle */
    function calculateMaintenanceCostPerVehicle() { const costs = {}; garage.vehicles.forEach(v => costs[v.id] = { name: `${v.make} ${v.model}`, cost: (v.maintenanceHistory || []).reduce((s, m) => s + (m?.cost ?? 0), 0) }); return costs; }
    /** Counts vehicles by type. @function countVehicleTypes */
    function countVehicleTypes() { const counts = { Car: 0, SportsCar: 0, Truck: 0 }; garage.vehicles.forEach(v => { const type = v._type || 'Vehicle'; if(counts.hasOwnProperty(type)) counts[type]++; else counts[type] = 1;}); return counts; }
    /** Updates the type distribution bar chart. @function updateTypeDistributionChart */
    function updateTypeDistributionChart(typeCounts) { console.log("[Render] Updating Type Chart..."); const chartContainer = document.querySelector('[data-stat="typeDistribution"] .type-bar-chart'); if (!chartContainer) return; const maxCount = Math.max(...Object.values(typeCounts), 1); ['Car', 'SportsCar', 'Truck'].forEach(type => { const item = chartContainer.querySelector(`.bar-item[data-type="${type}"]`); if (item) { const bar = item.querySelector('.bar'); const countSpan = item.querySelector('.bar-count'); const count = typeCounts[type] || 0; const perc = (count / maxCount) * 100; if(bar) requestAnimationFrame(() => { bar.style.height = `${perc}%`; }); if(countSpan) countSpan.textContent = count; } }); }

    // --- Garage List Rendering & Vehicle Cards ---
    /** Renders vehicle cards. @function renderGarageList */
    function renderGarageList() {
        console.log("[Render] === Rendering Garage List START ===");
        if (!garageDisplay || !garage) { console.error("[Render] ABORT: Missing garageDisplay or garage instance."); return; }
        const fragment = document.createDocumentFragment(); let vehicleCount = 0;
        try { const sorted = [...garage.vehicles].sort((a, b) => (a.make + a.model).localeCompare(b.make + b.model)); vehicleCount = sorted.length; console.log(`[Render] ${vehicleCount} vehicles found.`); sorted.forEach((v) => { const card = createVehicleCard(v); if(!card) return; if (selectedVehicle?.id === v.id) card.classList.add('selected'); fragment.appendChild(card); });
        } catch (e) { console.error("[Render] Error creating cards:", e); garageDisplay.innerHTML = '<p class="error-text">Erro ao listar veículos.</p>'; return; }
        garageDisplay.innerHTML = ''; // Clear
        if (vehicleCount > 0) { garageDisplay.appendChild(fragment); applyStaggeredAnimation(garageDisplay.querySelectorAll('.vehicle-card'), 'animate-in', 0.05, false); }
        else { garageDisplay.innerHTML = '<p class="placeholder-text">A garagem está vazia.</p>'; if (selectedVehicle) selectVehicle(null); else renderDetailsAreaContent(null); }
        console.log("[Render] === Rendering Garage List END ===");
    }
    /** Creates a vehicle card element. @function createVehicleCard */
    function createVehicleCard(vehicle) {
        if (!vehicle?.id) { console.error("[Card] Invalid vehicle data:", vehicle); return null; }
        const card = document.createElement('div'); card.className = 'vehicle-card'; card.dataset.id = vehicle.id;
        const statusIcon = document.createElement('span'); statusIcon.className = 'status-icon';
        card.innerHTML = `<h4>${vehicle.make} ${vehicle.model}</h4><p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}</p><div class="card-specific-info"></div><div class="card-footer"></div>`;
        card.querySelector('.card-footer')?.appendChild(statusIcon);
        const specInfo = card.querySelector('.card-specific-info');
        if(specInfo) { if (vehicle instanceof SportsCar) specInfo.innerHTML = `<p class="info-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`; else if (vehicle instanceof Truck) specInfo.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`; }
        updateVehicleCardStatus(card, vehicle);
        card.addEventListener('click', () => { console.log(`[Event] === CARD CLICK === ID: ${vehicle.id}`); if(isContentSwapping) { console.warn("[Event] Click blocked by content swap."); return; } selectVehicle(vehicle.id); });
        return card;
    }
    /** Updates card status visuals. @function updateVehicleCardStatus */
    function updateVehicleCardStatus(cardEl, vehicle) { if (!cardEl || !vehicle) return; const icon = cardEl.querySelector('.status-icon'), tP = cardEl.querySelector('.info-turbo'), lP = cardEl.querySelector('.info-load'); if (!icon) return; icon.classList.remove('on', 'off', 'moving'); icon.style.animation = ''; let pulseVar = '--danger-rgb'; switch (vehicle.status) { case 'on': icon.classList.add('on'); pulseVar = '--warning-rgb'; break; case 'moving': icon.classList.add('moving'); pulseVar = '--success-rgb'; break; default: icon.classList.add('off'); break; } icon.style.setProperty('--rgb-color', `var(${pulseVar})`); cardEl.classList.remove('pulse-turbo', 'pulse-load'); if (vehicle instanceof SportsCar) { if (tP) tP.textContent = `Turbo: ${vehicle.turboOn?'ON':'OFF'}`; if (vehicle.turboOn) { cardEl.classList.add('pulse-turbo'); if (vehicle.status !== 'off') { icon.style.setProperty('--rgb-color', 'var(--accent-3-rgb)'); icon.style.animation = 'pulse 1s infinite alternate'; } } } else if (vehicle instanceof Truck) { if (lP) lP.textContent = `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`; if (vehicle.currentLoad > 0) cardEl.classList.add('pulse-load'); } }
    /** Triggers card animation. @function triggerVehicleCardAnimation */
    function triggerVehicleCardAnimation(vehicleId, animClass) { const card = garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`); if (card) { console.log(`[Animate] Triggering '${animClass}' on card ${vehicleId}`); const actions = ['shake','tilt-forward','tilt-backward','bounce']; card.classList.remove(...actions); requestAnimationFrame(() => { card.classList.add(animClass); card.addEventListener('animationend', () => card.classList.remove(animClass), { once: true }); }); } }

    // --- Vehicle Selection & Details Area Management ---
    /** Handles vehicle selection/deselection. @function selectVehicle */
    function selectVehicle(vehicleId) {
        console.log(`[Select 1.0] === Starting selectVehicle === Target ID: ${vehicleId}, Current: ${selectedVehicle?.id}`);
        if (isContentSwapping) { console.warn("[Select 1.1] Blocked: Content swap."); return; }
        const prevId = selectedVehicle?.id; const isDeselecting = (vehicleId === null || vehicleId === prevId);
        console.log(`[Select 1.2] Is Deselecting: ${isDeselecting}`);
        if (prevId) garageDisplay?.querySelector(`.vehicle-card[data-id="${prevId}"]`)?.classList.remove('selected');
        if (!isDeselecting && vehicleId) garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`)?.classList.add('selected');
        console.log("[Select 1.3] Card classes updated.");
        if (isDeselecting) { if (selectedVehicle) { selectedVehicle = null; renderDetailsAreaContent(null); stopEngineSound(); console.log("[Select 1.4] Deselection complete."); } }
        else { const veh = garage?.findVehicle(vehicleId); if (veh) { selectedVehicle = veh; renderDetailsAreaContent(veh); updateEngineSound(); console.log(`[Select 1.5] Selection complete for ${veh.id}.`); } else { console.error(`[Select 1.6] ERROR: Vehicle ${vehicleId} not found!`); showNotification('Erro: Dados do veículo não encontrados.', 'error'); selectedVehicle = null; renderDetailsAreaContent(null); stopEngineSound(); } }
        console.log(`[Select 2.0] === selectVehicle finished ===`);
    }

    /** Renders content in the fixed details area. @function renderDetailsAreaContent */
    function renderDetailsAreaContent(vehicle) {
        console.log(`[RenderDetails 1.0] === Rendering Details Area === Vehicle: ${vehicle ? vehicle.id : 'Placeholder'}`);
        if (!detailsContentArea) { console.error("[RenderDetails 1.1] ABORT: #details-content-area missing!"); return; }
        if (isContentSwapping) { console.warn("[RenderDetails 1.2] Already swapping."); return; }
        isContentSwapping = true;
        try {
            console.log("[RenderDetails 1.3] Clearing details area..."); detailsContentArea.innerHTML = '';
            if (vehicle) {
                console.log("[RenderDetails 1.4] Rendering details for:", vehicle.id);
                if (!vehicleDetailsTemplate?.content?.firstElementChild) throw new Error("Template invalid!");
                console.log("[RenderDetails 1.5] Cloning template..."); const wrapper = vehicleDetailsTemplate.content.firstElementChild.cloneNode(true); if (!wrapper) throw new Error("Clone failed!");
                console.log("[RenderDetails 1.6] Appending content..."); detailsContentArea.appendChild(wrapper);
                console.log("[RenderDetails 1.7] Populating content..."); populateDetailsPanelContent(wrapper, vehicle);
                console.log("[RenderDetails 1.8] Setting up listeners..."); setupDetailsPanelEventListeners(wrapper);
                console.log("[RenderDetails 1.9] Vehicle details OK.");
            } else {
                console.log("[RenderDetails 1.4] Rendering placeholder...");
                detailsContentArea.innerHTML = `<div class="details-placeholder-content"><span class="placeholder-icon">👈</span><p>Selecione um veículo...</p></div>`;
                console.log("[RenderDetails 1.5] Placeholder OK.");
            }
        } catch (error) { console.error("[RenderDetails 2.0] CRITICAL RENDER ERROR:", error); detailsContentArea.innerHTML = '<p class="error-text">Erro ao renderizar detalhes!</p>'; if(vehicle) renderDetailsAreaContent(null); }
        finally { isContentSwapping = false; console.log("[RenderDetails 3.0] === renderDetailsAreaContent Finished ==="); }
    }

    /** Sets up listeners within the details wrapper. @function setupDetailsPanelEventListeners */
    function setupDetailsPanelEventListeners(wrapper) {
        console.log("[Listeners 1.0] Setting up for wrapper..."); if (!wrapper) { console.error("[Listeners 1.1] ABORT: wrapper null."); return; }
        const addListener = (sel, ev, h) => { const el = wrapper.querySelector(sel); if(el) el.addEventListener(ev, h); else console.error(`[Listeners 1.2] FAILED find: '${sel}'`); };
        addListener('.close-button', 'click', () => selectVehicle(null)); addListener('.btn-start', 'click', handleStartVehicle); addListener('.btn-stop', 'click', handleStopVehicle); addListener('.btn-accelerate', 'click', handleAccelerateVehicle); addListener('.btn-brake', 'click', handleBrakeVehicle); addListener('.btn-toggle-turbo', 'click', handleToggleTurbo); addListener('.btn-load-cargo', 'click', handleLoadCargo); addListener('.btn-unload-cargo', 'click', handleUnloadCargo); addListener('.btn-remove-vehicle', 'click', handleRemoveVehicle); addListener('.schedule-maintenance-form', 'submit', handleScheduleMaintenance);
        initializeFlatpickr(wrapper.querySelector('.maint-date')); console.log("[Listeners 1.3] Setup complete.");
    }

    /** Populates the details wrapper with data. @function populateDetailsPanelContent */
    function populateDetailsPanelContent(wrapper, vehicle) {
        console.log(`[Populate 1.0] Populating wrapper for ${vehicle?.id}`); if (!wrapper || !vehicle) { console.error("[Populate 1.1] ABORT: Missing wrapper/vehicle."); return; }
        const find = (s) => wrapper.querySelector(s); const upTxt = (s, t) => { const e=find(s); if(e) e.textContent = t??''; else console.warn(`[Populate] Elem miss: ${s}`); }; const upHTML = (s, h) => { const e=find(s); if(e) e.innerHTML = h??''; else console.warn(`[Populate] Elem miss: ${s}`); }; const setDisp = (s, d) => { const e=find(s); if(e) e.style.display = d; else console.warn(`[Populate] Elem miss: ${s}`); }; const setDis = (s, b) => { const e=find(s); if(e) e.disabled = b; else console.warn(`[Populate] Elem miss: ${s}`); }; const togCls = (s, c, o) => { const e=find(s); if(e) e.classList.toggle(c, o); else console.warn(`[Populate] Elem miss: ${s}`); }; const setVal = (s, v) => { const e=find(s); if(e) e.value = v??''; else console.warn(`[Populate] Elem miss: ${s}`); };
        upTxt('.details-title', `${vehicle.make} ${vehicle.model}`); upHTML('.vehicle-info', `<strong>Ano:</strong> ${vehicle.year}<br><strong>Tipo:</strong> ${vehicle._type.replace(/([A-Z])/g,' $1').trim()}<br><strong title="${vehicle.id}">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>`); upTxt('.status-indicator', `Status: ${vehicle.status}`); upTxt('.speed-indicator', `Veloc: ${vehicle.speed.toFixed(0)} km/h`);
        const isS = vehicle instanceof SportsCar, isT = vehicle instanceof Truck; setDisp('.turbo-indicator', isS?'inline-flex':'none'); setDisp('.btn-toggle-turbo', isS?'inline-flex':'none'); if(isS){ upTxt('.turbo-indicator',`Turbo: ${vehicle.turboOn?'ON':'OFF'}`); upTxt('.btn-toggle-turbo span:last-child',vehicle.turboOn?'Turbo OFF':'Turbo ON'); togCls('.btn-toggle-turbo','active',vehicle.turboOn); setDis('.btn-toggle-turbo',vehicle.status==='off'); } setDisp('.load-indicator', isT?'inline-flex':'none'); setDisp('.truck-load-controls', isT?'flex':'none'); if(isT){ upTxt('.load-indicator',`Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`); setVal('.cargo-amount',''); }
        setDis('.btn-start', vehicle.status !== 'off'); setDis('.btn-stop', vehicle.status === 'off' || vehicle.speed > 0); setDis('.btn-accelerate', vehicle.status === 'off'); setDis('.btn-brake', vehicle.status !== 'moving');
        const histList = find('.maintenance-list'); if(histList) renderMaintenanceHistory(histList, vehicle); const maintForm = find('.schedule-maintenance-form'); if(maintForm) { maintForm.reset(); const dIn = find('.maint-date'); if (dIn?._flatpickr) dIn._flatpickr.clear(); setVal('.selected-vehicle-id', vehicle.id); }
        updateEngineSound(); console.log("[Populate 1.2] Population finished.");
    }

    // --- Engine Sound/Visualizer ---
    function updateEngineSound() { /* ... */ } function stopEngineSound() { /* ... */ }

    // --- Maintenance & Appointments ---
    function renderMaintenanceHistory(listEl, veh) { /* ... */ } function renderFutureAppointmentsList() { /* ... */ } function handleAppointmentClick(event) { /* ... */ }

     // --- Flatpickr ---
     function initializeFlatpickr(dateInput) { /* ... */ }

    // --- Event Listener Setup ---
    function setupEventListeners() { console.log("[Events] Setting up initial listeners..."); mainNav?.addEventListener('click', (e) => { const l = e.target.closest('.nav-link[data-tab-target]'); if (l) { e.preventDefault(); setActiveTab(l.dataset.tabTarget); } }); /* No theme listener */ vehicleTypeSelect?.addEventListener('change', (e) => { const show = e.target.value === 'Truck'; truckSpecificFields?.classList.toggle('visible', show); const inp = document.getElementById('truck-max-load'); if(inp) inp.required = show; }); addVehicleForm?.addEventListener('submit', handleAddVehicle); window.addEventListener('hashchange', handleHashChange); console.log("[Events] Initial listeners OK."); }

    // --- Event Handlers ---
    /** Handles add vehicle form. @function handleAddVehicle */
    function handleAddVehicle(event) { event.preventDefault(); console.log("[Event] Add vehicle submit."); if (!addVehicleForm || !vehicleTypeSelect || !garage) return; const type = vehicleTypeSelect.value, make = addVehicleForm.querySelector('#vehicle-make')?.value.trim(), model = addVehicleForm.querySelector('#vehicle-model')?.value.trim(), year = addVehicleForm.querySelector('#vehicle-year')?.value, maxLoad = addVehicleForm.querySelector('#truck-max-load')?.value; if (!type || !make || !model || !year) return showNotification('Preencha Tipo, Marca, Modelo e Ano.', 'warning'); if (type === 'Truck' && (!maxLoad || parseInt(maxLoad) <= 0)) return showNotification('Carga Máxima inválida para Caminhão.', 'warning'); let newVeh; const id = generateUniqueId(); try { switch (type) { case 'Car': newVeh = new Car(make, model, year, id); break; case 'SportsCar': newVeh = new SportsCar(make, model, year, id); break; case 'Truck': newVeh = new Truck(make, model, year, maxLoad, id); break; default: throw new Error('Tipo inválido'); } console.log("[Event] Attempting to add vehicle:", newVeh); if (garage.addVehicle(newVeh)) { renderGarageList(); addVehicleForm.reset(); vehicleTypeSelect.value = ""; truckSpecificFields?.classList.remove('visible'); const mlInp = document.getElementById('truck-max-load'); if(mlInp) mlInp.required = false; showNotification(`${type.replace(/([A-Z])/g, ' $1').trim()} ${make} adicionado!`, 'success'); updateAllRelevantData(); } } catch (e) { console.error("Add vehicle error:", e); showNotification(`Erro: ${e.message}`, 'error'); } }

    /** Handles remove vehicle click, including confirmation and updates. @function handleRemoveVehicle */
    function handleRemoveVehicle() {
        console.log("[Event] Remove vehicle click initiated.");
        if (!selectedVehicle) { console.warn("[Event] Remove click ignored: No vehicle selected."); return; }
        if (!garage) { console.error("[Event] Remove click failed: Garage instance missing."); return; }

        // Store details before potentially deselecting
        const vehicleToRemove = selectedVehicle; // Keep reference
        const vehicleId = vehicleToRemove.id;
        const vehicleName = `${vehicleToRemove.make} ${vehicleToRemove.model}`;

        console.log(`[Event] Showing confirmation for removing ${vehicleName} (ID: ${vehicleId})`);
        showConfirmation(`Remover ${vehicleName} (${vehicleId.slice(-4)})?`,
            // --- onConfirm ---
            () => {
                console.log(`[Event] Confirmed removal for ${vehicleId}.`);
                // 1. Visually deselect (clears panel) BEFORE data removal
                selectVehicle(null);

                // 2. Remove from data store
                const removed = garage.removeVehicle(vehicleId); // This also saves to localStorage

                if (removed) {
                    console.log(`[Event] ${vehicleId} removed successfully from garage data.`);
                    showNotification(`${vehicleName} removido.`, 'info');

                    // 3. Update UI (garage list, dashboard, stats etc.) AFTER data removal
                    // Use setTimeout to allow the selectVehicle(null) render to potentially finish first,
                    // reducing chance of race conditions, although ideally not needed now.
                    setTimeout(() => {
                        console.log(`[Event] Updating UI after removing ${vehicleId}`);
                        renderGarageList(); // Re-render list without the removed vehicle
                        updateAllRelevantData(); // Update stats etc. based on new garage state
                    }, 50); // Small delay

                } else {
                    // This case means garage.removeVehicle failed, which is odd if confirmation was based on selectedVehicle
                    console.error(`[Event] ERROR: garage.removeVehicle reported failure for ID ${vehicleId}, though it was selected.`);
                    showNotification(`Erro: Falha ao remover ${vehicleName} dos dados.`, 'error');
                }
            },
            // --- onCancel ---
            () => {
                console.log(`[Event] Removal cancelled for ${vehicleId}.`);
            }
        );
    }

    /** Handles maintenance form submit. @function handleScheduleMaintenance */
    function handleScheduleMaintenance(event) { event.preventDefault(); console.log("[Event] Schedule maintenance submit."); if (!selectedVehicle || !garage) return; const form = event.target; const wrapper = getCurrentDetailsWrapper(); if(!wrapper) return; const dateInput = form.querySelector('.maint-date'), typeInput = form.querySelector('.maint-type'), costInput = form.querySelector('.maint-cost'), descInput = form.querySelector('.maint-desc'), histList = wrapper.querySelector('.maintenance-list'); const dateVal = dateInput?._flatpickr?.selectedDates[0] || dateInput?.value, type = typeInput?.value.trim(), cost = costInput?.value, desc = descInput?.value.trim(); if (!dateVal || !type || cost === '' || cost === null) return showNotification('Data, Tipo e Custo são obrigatórios.', 'warning'); const costF = parseFloat(cost); if (isNaN(costF) || costF < 0) return showNotification('Custo deve ser >= 0.', 'warning'); try { const maint = new Maintenance(dateVal, type, cost, desc); if (maint.isValid() && selectedVehicle.addMaintenance(maint)) { if(histList) renderMaintenanceHistory(histList, selectedVehicle); form.reset(); if (dateInput?._flatpickr) dateInput._flatpickr.clear(); garage.saveToLocalStorage(); showNotification(`Manutenção registrada.`, 'success'); updateAllRelevantData(); } else showNotification('Falha ao adicionar manutenção (dados inválidos?).', 'error'); } catch (e) { console.error("Schedule maint error:", e); showNotification(`Erro: ${e.message}`, 'error'); } }

    // --- Vehicle Action Handlers ---
    function getCurrentDetailsWrapper() { return detailsContentArea?.querySelector('.vehicle-details-content-wrapper'); }
    function handleStartVehicle() { console.log("[Action] Start vehicle."); if(!selectedVehicle) return; if (selectedVehicle.start()) { const w = getCurrentDetailsWrapper(); if(w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'shake'); updateEngineSound(); garage.saveToLocalStorage(); } }
    function handleStopVehicle() { console.log("[Action] Stop vehicle."); if(!selectedVehicle) return; if (selectedVehicle.stop()) { const w = getCurrentDetailsWrapper(); if(w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); stopEngineSound(); garage.saveToLocalStorage(); } }
    function handleAccelerateVehicle() { console.log("[Action] Accelerate vehicle."); if(!selectedVehicle) return; if (selectedVehicle.accelerate()) { const w = getCurrentDetailsWrapper(); if(w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-forward'); updateEngineSound(); garage.saveToLocalStorage(); } }
    function handleBrakeVehicle() { console.log("[Action] Brake vehicle."); if(!selectedVehicle) return; if (selectedVehicle.brake()) { const w = getCurrentDetailsWrapper(); if(w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-backward'); updateEngineSound(); garage.saveToLocalStorage(); } }
    function handleToggleTurbo() { console.log("[Action] Toggle Turbo."); if (!(selectedVehicle instanceof SportsCar)) return; if (selectedVehicle.toggleTurbo()) { const w = getCurrentDetailsWrapper(); if(w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); updateEngineSound(); garage.saveToLocalStorage(); } }
    function handleLoadCargo() { console.log("[Action] Load Cargo."); if (!(selectedVehicle instanceof Truck)) return; const w = getCurrentDetailsWrapper(); const input = w?.querySelector('.cargo-amount'); if (!w || !input) return; if (selectedVehicle.loadCargo(input.value)) { populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'bounce'); garage.saveToLocalStorage(); updateAllRelevantData(); } }
    function handleUnloadCargo() { console.log("[Action] Unload Cargo."); if (!(selectedVehicle instanceof Truck)) return; const w = getCurrentDetailsWrapper(); const input = w?.querySelector('.cargo-amount'); if (!w || !input) return; if (selectedVehicle.unloadCargo(input.value)) { populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'bounce'); garage.saveToLocalStorage(); updateAllRelevantData(); } }

    // --- Helper to Update All Data Displays ---
    function updateAllRelevantData() { console.log("[Update] Cross-tab data..."); try { renderDashboard(); renderStats(); renderFutureAppointmentsList(); } catch(e) { console.error("Error during updateAllRelevantData:", e); } }

    // --- Run Application ---
    try { initializeApp(); } catch (globalError) { console.error("======== GLOBAL INITIALIZATION ERROR ========", globalError); alert("Erro Crítico na inicialização! Verifique o console."); document.body.innerHTML = `<div class="error-text"><h1>Erro Crítico</h1><p>Aplicação falhou.</p><pre>${globalError.stack || globalError.message}</pre></div>`; }

}); // End DOMContentLoaded Listener