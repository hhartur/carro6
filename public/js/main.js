// --- Smart Garage Nexus - Main Application Logic JS v9.0 (Create/Update UI) ---

/**
 * @file main.js
 * @description Core logic for Smart Garage Nexus. Handles UI, events, state, models, and API calls to the refactored backend.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init 0.1] DOMContentLoaded event fired. Initializing Smart Garage Nexus v9.0 (Create/Update UI)...");

    // --- State & Instance Variables ---
    let garage = null;
    let selectedVehicle = null;
    let currentActiveTab = 'dashboard';
    let isContentSwapping = false;

    // --- Configuration (can be moved to a config object or constants file) ---
    const OPENWEATHERMAP_ICON_URL_PREFIX = 'https://openweathermap.org/img/wn/';


    // --- UI Element Cache ---
    console.log("[Init 0.2] Caching DOM Elements...");
    const getElem = (selector, required = true) => {
        const elem = document.querySelector(selector);
        if (!elem && required) console.error(`[Init] CRITICAL: Required element "${selector}" not found!`);
        else if (!elem) console.warn(`[Init] Optional element "${selector}" not found.`);
        return elem;
    };
    const getElemById = (id, required = true) => {
        const elem = document.getElementById(id);
        if (!elem && required) console.error(`[Init] CRITICAL: Required element "#${id}" not found!`);
        else if (!elem) console.warn(`[Init] Optional element "#${id}" not found.`);
        return elem;
    };

    const body = document.body;
    const mainNav = getElem('.main-nav');
    const navLinks = mainNav?.querySelectorAll('.nav-link[data-tab-target]') ?? [];
    const tabContents = document.querySelectorAll('.tab-content[data-tab-content]');
    const garageDisplay = getElemById('garage-display');
    const detailsContentArea = getElemById('details-content-area');
    const vehicleDetailsTemplate = getElemById('vehicle-details-template');
    const futureAppointmentsList = getElemById('future-appointments-list');
    const addVehicleForm = getElemById('add-vehicle-form');
    const vehicleTypeSelect = getElemById('vehicle-type');
    const truckSpecificFields = getElemById('truck-specific-fields');
    const notificationArea = getElemById('notification-area');
    console.log("[Init 0.3] Element caching finished.");

    // --- Initialization ---
    function initializeApp() {
        console.log("[Init 1.0] === Starting initializeApp ===");
        const requiredElementsCheck = {
            body, mainNav, navLinks: navLinks?.length > 0, tabContents: tabContents?.length > 0,
            garageDisplay, detailsContentArea, vehicleDetailsTemplate,
            notificationArea, addVehicleForm, vehicleTypeSelect, truckSpecificFields, futureAppointmentsList
        };
        let allElementsFound = true;
        for (const [name, elementOrCheck] of Object.entries(requiredElementsCheck)) {
            const found = Boolean(elementOrCheck);
            console.log(`[Init 1.1] Check ${name}: ${found ? 'OK' : 'MISSING!'}`);
            if (!found) allElementsFound = false;
        }
        if (!allElementsFound) {
            console.error("[Init 1.2] CRITICAL: Missing essential elements. Application cannot start.");
            alert("Erro Crítico: Elementos essenciais da interface não foram encontrados. Verifique o console.");
            return;
        }
        console.log("[Init 1.3] Essential elements verified.");

        try {
            console.log("[Init 1.4] Initializing Garage...");
            garage = new Garage();
            console.log("[Init 1.5] Loading from LocalStorage...");
            garage.loadFromLocalStorage();
        } catch (error) {
            console.error("[Init 1.6] CRITICAL ERROR during Garage initialization or loading:", error);
            alert("Erro Crítico ao inicializar ou carregar dados da garagem. Verifique o console.");
            return;
        }
        console.log(`[Init 1.7] Garage initialized. ${garage.vehicles.length} vehicles loaded.`);

        console.log("[Init 1.8] Setting up global event listeners...");
        setupEventListeners();

        const initialTab = getTabFromHash() || 'dashboard';
        console.log(`[Init 1.9] Setting initial tab: ${initialTab}`);
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.tabTarget === initialTab));
        tabContents.forEach(content => {
            const contentId = content.dataset.tabContent || content.id?.replace('tab-', '');
            const isActive = contentId === initialTab;
            content.style.display = isActive ? 'block' : 'none';
            content.classList.toggle('active-tab', isActive);
        });
        currentActiveTab = initialTab;

        console.log("[Init 1.10] Performing initial rendering...");
        renderGarageList();
        renderFutureAppointmentsList();
        renderDashboard();
        renderStats();
        renderDetailsAreaContent(null);

        console.log("[Init 1.11] Triggering initial animations...");
        triggerRenderForTab(initialTab, true);

        console.log("[Init COMPLETE] === Smart Garage Nexus initialization finished successfully ===");
    }

    // --- Tab Management & Navigation ---
    function setActiveTab(tabId, isInitialLoad = false) {
        if (!tabId || tabId === currentActiveTab || isContentSwapping) {
            console.log(`[Tabs] Tab '${tabId}' change skipped.`);
            return;
        }
        console.log(`[Tabs] Activating tab: ${tabId} (Previous: ${currentActiveTab})`);
        const prevTabId = currentActiveTab;
        currentActiveTab = tabId;
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.tabTarget === tabId));
        tabContents.forEach(content => {
            const contentId = content.dataset.tabContent || content.id?.replace('tab-', '');
            const isActive = contentId === tabId;
            if (isActive) {
                content.style.display = 'block';
                requestAnimationFrame(() => {
                    content.classList.add('active-tab');
                    triggerRenderForTab(tabId, isInitialLoad);
                });
            } else if (content.id === `tab-${prevTabId}`) {
                content.classList.remove('active-tab');
                const hideAfterTransition = () => {
                    if (!content.classList.contains('active-tab')) content.style.display = 'none';
                };
                content.addEventListener('transitionend', hideAfterTransition, { once: true });
                setTimeout(hideAfterTransition, 500);
            } else {
                content.style.display = 'none';
                content.classList.remove('active-tab');
            }
        });
        if (!isInitialLoad) updateUrlHash(tabId);
    }
    function getTabFromHash() { return window.location.hash.substring(1); }
    function updateUrlHash(tabId) {
        if (!tabId) return;
        try {
            if (window.history.pushState && getTabFromHash() !== tabId) {
                window.history.pushState(null, '', `#${tabId}`);
            } else if (getTabFromHash() !== tabId) {
                window.location.hash = tabId;
            }
        } catch (e) { console.error("[Nav] Error updating URL hash:", e); window.location.hash = tabId; }
    }
    function handleHashChange() {
        console.log("[Nav] Hash change detected.");
        const tabIdFromHash = getTabFromHash();
        const validTabs = ['dashboard', 'garage', 'stats'];
        if (validTabs.includes(tabIdFromHash) && tabIdFromHash !== currentActiveTab) {
            setActiveTab(tabIdFromHash);
        } else if (!tabIdFromHash && currentActiveTab !== 'dashboard') {
            setActiveTab('dashboard');
        }
    }

    // --- Content Rendering & Updates for Tabs ---
    function triggerRenderForTab(tabId, skipAnimation = false) {
        console.log(`[Render] Triggering content for tab: ${tabId}`);
        const tabElement = document.getElementById(`tab-${tabId}`);
        if (!tabElement) return;
        const sections = tabElement.querySelectorAll('.card-section:not(.sticky-details), .stat-card');
        applyStaggeredAnimation(sections, 'visible', 0.08, skipAnimation);
        switch (tabId) {
            case 'dashboard': renderDashboard(); break;
            case 'garage': renderFutureAppointmentsList(); break;
            case 'stats': renderStats(); break;
        }
    }
    function applyStaggeredAnimation(elements, triggerClass, baseDelay = 0.06, skip = false) {
        if (!elements || elements.length === 0) return;
        elements.forEach((el, index) => {
            const delay = skip ? '0s' : `${index * baseDelay}s`;
            el.style.transitionDelay = delay;
            requestAnimationFrame(() => {
                el.classList.add(triggerClass);
                const cleanup = () => { el.style.transitionDelay = ''; };
                el.addEventListener('transitionend', cleanup, { once: true });
                setTimeout(cleanup, 1200 + (index * baseDelay * 1000));
            });
        });
    }

    // --- Dashboard & Stats Rendering ---
    function renderDashboard() {
        console.log("[Render] Updating Dashboard statistics...");
        if (!garage) return;
        try {
            const totalVehicles = garage.vehicles.length;
            const typeCounts = countVehicleTypes();
            const appointments = garage.getAllFutureAppointments();
            const totalCost = calculateTotalMaintenanceCost();
            updateStatElement("totalVehicles", totalVehicles);
            const typeSummary = `${typeCounts.Car || 0}C / ${typeCounts.SportsCar || 0}S / ${typeCounts.Truck || 0}T`;
            updateStatElement("vehicleTypes", typeSummary);
            updateStatElement("typeDetails", `Carros: ${typeCounts.Car || 0} | Esportivos: ${typeCounts.SportsCar || 0} | Caminhões: ${typeCounts.Truck || 0}`);
            if (appointments.length > 0) {
                const nextApp = appointments[0];
                let fDate = 'Data Inválida';
                try { fDate = new Date(nextApp.maintenance.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { console.error("Date format error (Dash):", e); }
                updateStatElement("nextAppointment", fDate);
                updateStatElement("appointmentDetails", `${nextApp.vehicleInfo.split('(')[0].trim()} - ${nextApp.maintenance.type}`);
            } else {
                updateStatElement("nextAppointment", 'Nenhum');
                updateStatElement("appointmentDetails", 'Sem agendamentos futuros.');
            }
            updateStatElement("totalMaintCostDash", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        } catch (error) { console.error("[Render] Error renderDashboard:", error); showNotification("Erro ao atualizar dashboard.", "error"); }
    }
    function renderStats() {
        console.log("[Render] Updating Statistics Tab...");
        if (!garage) return;
        try {
            const currentVehicles = garage.vehicles;
            const numVehicles = currentVehicles.length;
            const totalCost = calculateTotalMaintenanceCost();
            const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;
            const vehicleCosts = calculateMaintenanceCostPerVehicle();
            const typeCounts = countVehicleTypes();
            let mostExpensiveInfo = { id: null, name: 'N/A', cost: -1 };
            let maxCostFound = -1;
            for (const vehicleId in vehicleCosts) {
                if (vehicleCosts.hasOwnProperty(vehicleId) && currentVehicles.some(v => v.id === vehicleId)) {
                    const currentVehicleCost = vehicleCosts[vehicleId].cost;
                    if (currentVehicleCost > maxCostFound) {
                        maxCostFound = currentVehicleCost;
                        mostExpensiveInfo = { id: vehicleId, name: vehicleCosts[vehicleId].name, cost: currentVehicleCost };
                    }
                }
            }
            updateStatElement("totalCost", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("avgCost", avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("mostExpensiveVehicle", mostExpensiveInfo.name);
            const costDetailEl = document.querySelector('[data-stat="mostExpensiveCost"]');
            if (costDetailEl) costDetailEl.textContent = mostExpensiveInfo.cost >= 0 ? `(R$ ${mostExpensiveInfo.cost.toFixed(2).replace('.', ',')})` : '';
            updateTypeDistributionChart(typeCounts);
        } catch (error) { console.error("[Render] Error renderStats:", error); showNotification("Erro ao atualizar estatísticas.", "error"); }
    }
    function updateStatElement(statName, value) {
        const elements = document.querySelectorAll(`[data-stat="${statName}"]`);
        if (elements.length > 0) {
            const newVal = (value !== null && value !== undefined) ? String(value) : '-';
            elements.forEach(el => { if (el.textContent !== newVal) el.textContent = newVal; });
        } else { console.warn(`[Render] Stat element [data-stat="${statName}"] not found.`); }
    }
    function calculateTotalMaintenanceCost() {
        if (!garage) return 0;
        return garage.vehicles.reduce((sum, v) => sum + (v.maintenanceHistory || []).reduce((mSum, m) => mSum + (m?.cost ?? 0), 0), 0);
    }
    function calculateMaintenanceCostPerVehicle() {
        const costs = {}; if (!garage) return costs;
        garage.vehicles.forEach(v => {
            costs[v.id] = { name: `${v.make} ${v.model}`, cost: (v.maintenanceHistory || []).reduce((mSum, m) => mSum + (m?.cost ?? 0), 0) };
        });
        return costs;
    }
    function countVehicleTypes() {
        const counts = { Car: 0, SportsCar: 0, Truck: 0, Vehicle: 0 }; if (!garage) return counts;
        garage.vehicles.forEach(v => {
            const type = v._type || 'Vehicle';
            if (counts.hasOwnProperty(type)) counts[type]++;
            else { console.warn(`[Stats] Unexpected vehicle type: ${type}`); counts[type] = 1; }
        });
        if (counts.Vehicle === 0) delete counts.Vehicle;
        return counts;
    }
    function updateTypeDistributionChart(typeCounts) {
        const chartContainer = document.querySelector('[data-stat="typeDistribution"] .type-bar-chart');
        if (!chartContainer) return;
        const allCounts = Object.values(typeCounts);
        const maxCount = allCounts.length > 0 ? Math.max(...allCounts, 1) : 1;
        ['Car', 'SportsCar', 'Truck'].forEach(type => {
            const barItem = chartContainer.querySelector(`.bar-item[data-type="${type}"]`);
            if (barItem) {
                const barEl = barItem.querySelector('.bar');
                const countSpan = barItem.querySelector('.bar-count');
                const count = typeCounts[type] || 0;
                const percHeight = (count / maxCount) * 100;
                if (barEl) requestAnimationFrame(() => { barEl.style.height = `${percHeight}%`; });
                if (countSpan) countSpan.textContent = count;
            }
        });
    }

    // --- Garage List Rendering & Vehicle Cards ---
    function renderGarageList() {
        console.log("[Render] === Rendering Garage List START ===");
        if (!garageDisplay || !garage) {
            if (garageDisplay) garageDisplay.innerHTML = '<p class="error-text">Erro ao carregar lista.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        let vehicleCount = 0;
        try {
            const sortedVehicles = [...garage.vehicles].sort((a, b) => `${a.make} ${a.model}`.toLowerCase().localeCompare(`${b.make} ${b.model}`.toLowerCase(), 'pt-BR'));
            vehicleCount = sortedVehicles.length;
            sortedVehicles.forEach(v => {
                const card = createVehicleCard(v);
                if (!card) return;
                if (selectedVehicle?.id === v.id) card.classList.add('selected');
                fragment.appendChild(card);
            });
        } catch (error) {
            console.error("[Render] Error creating vehicle cards:", error);
            garageDisplay.innerHTML = '<p class="error-text">Erro ao exibir veículos.</p>';
            return;
        }
        garageDisplay.innerHTML = '';
        if (vehicleCount > 0) {
            garageDisplay.appendChild(fragment);
            applyStaggeredAnimation(garageDisplay.querySelectorAll('.vehicle-card'), 'animate-in', 0.05, false);
        } else {
            garageDisplay.innerHTML = '<p class="placeholder-text">A garagem está vazia.</p>';
            if (selectedVehicle) selectVehicle(null);
            else renderDetailsAreaContent(null);
        }
        console.log("[Render] === Rendering Garage List END ===");
    }
    function createVehicleCard(vehicle) {
        if (!vehicle || typeof vehicle !== 'object' || !vehicle.id) return null;
        const card = document.createElement('div');
        card.className = 'vehicle-card'; card.dataset.id = vehicle.id;
        card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Selecionar ${vehicle.make} ${vehicle.model} ${vehicle.year}`);
        const statusIcon = document.createElement('span'); statusIcon.className = 'status-icon'; statusIcon.setAttribute('aria-hidden', 'true');
        card.innerHTML = `<h4>${vehicle.make} ${vehicle.model}</h4><p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}</p><div class="card-specific-info"></div><div class="card-footer"></div>`;
        card.querySelector('.card-footer')?.appendChild(statusIcon);
        const specificInfoContainer = card.querySelector('.card-specific-info');
        if (specificInfoContainer) {
            if (vehicle instanceof SportsCar) specificInfoContainer.innerHTML = `<p class="info-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`;
            else if (vehicle instanceof Truck) specificInfoContainer.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
        }
        updateVehicleCardStatus(card, vehicle);
        card.addEventListener('click', () => {
            if (isContentSwapping) return;
            selectVehicle(vehicle.id);
        });
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
        return card;
    }
    function updateVehicleCardStatus(cardElement, vehicle) {
        if (!cardElement || !vehicle) return;
        const statusIcon = cardElement.querySelector('.status-icon');
        const turboInfo = cardElement.querySelector('.info-turbo');
        const loadInfo = cardElement.querySelector('.info-load');
        if (!statusIcon) return;
        statusIcon.classList.remove('on', 'off', 'moving'); statusIcon.style.animation = '';
        cardElement.classList.remove('pulse-turbo', 'pulse-load');
        let statusColorVar = '--danger-rgb';
        switch (vehicle.status) {
            case 'on': statusIcon.classList.add('on'); statusColorVar = '--warning-rgb'; break;
            case 'moving': statusIcon.classList.add('moving'); statusColorVar = '--success-rgb'; break;
            default: statusIcon.classList.add('off'); break;
        }
        statusIcon.style.setProperty('--rgb-color', `var(${statusColorVar})`);
        if (vehicle instanceof SportsCar) {
            if (turboInfo) turboInfo.textContent = `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`;
            if (vehicle.turboOn) cardElement.classList.add('pulse-turbo');
        } else if (vehicle instanceof Truck) {
            if (loadInfo) loadInfo.textContent = `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`;
            if (vehicle.currentLoad > 0) cardElement.classList.add('pulse-load');
        }
    }
    function triggerVehicleCardAnimation(vehicleId, animationClass) {
        const card = garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
        if (card && animationClass) {
            const validAnims = ['shake', 'tilt-forward', 'tilt-backward', 'bounce'];
            if (validAnims.includes(animationClass)) {
                card.classList.remove(...validAnims);
                requestAnimationFrame(() => {
                    card.classList.add(animationClass);
                    card.addEventListener('animationend', () => card.classList.remove(animationClass), { once: true });
                });
            }
        }
    }

    // --- Vehicle Selection & Details Area Management ---
    function selectVehicle(vehicleId) {
        console.log(`[Select 1.0] Target ID: ${vehicleId}, Current: ${selectedVehicle?.id}`);
        if (isContentSwapping) return;
        const prevSelectedId = selectedVehicle?.id;
        const isDeselecting = (vehicleId === null || vehicleId === prevSelectedId);
        if (prevSelectedId) garageDisplay?.querySelector(`.vehicle-card[data-id="${prevSelectedId}"]`)?.classList.remove('selected');
        if (!isDeselecting && vehicleId) garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`)?.classList.add('selected');
        if (isDeselecting) {
            if (selectedVehicle) { selectedVehicle = null; renderDetailsAreaContent(null); }
        } else {
            const vehicleToSelect = garage?.findVehicle(vehicleId);
            if (vehicleToSelect) { selectedVehicle = vehicleToSelect; renderDetailsAreaContent(vehicleToSelect); }
            else { console.error(`[Select 1.6] ERROR: Vehicle ID ${vehicleId} not found!`); showNotification('Erro: Dados do veículo não encontrados.', 'error'); selectedVehicle = null; renderDetailsAreaContent(null); }
        }
    }
    function renderDetailsAreaContent(vehicle) {
        console.log(`[RenderDetails 1.0] Vehicle: ${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Placeholder'}`);
        if (!detailsContentArea) return;
        if (isContentSwapping) return;
        isContentSwapping = true;
        try {
            detailsContentArea.innerHTML = '';
            if (vehicle) {
                if (!vehicleDetailsTemplate?.content?.firstElementChild) throw new Error("Template #vehicle-details-template missing!");
                const detailsWrapper = vehicleDetailsTemplate.content.firstElementChild.cloneNode(true);
                if (!detailsWrapper) throw new Error("Failed to clone template!");
                detailsContentArea.appendChild(detailsWrapper);
                populateDetailsPanelContent(detailsWrapper, vehicle);
                setupDetailsPanelEventListeners(detailsWrapper);
                // Reset API and Trip sections
                resetApiDetailsSection(detailsWrapper);
                resetTripPlannerSection(detailsWrapper);
            } else {
                detailsContentArea.innerHTML = `<div class="details-placeholder-content"><span class="placeholder-icon" aria-hidden="true">👈</span><p>Selecione um veículo para ver os detalhes.</p></div>`;
            }
        } catch (error) {
            console.error("[RenderDetails 2.0] CRITICAL RENDER ERROR:", error);
            detailsContentArea.innerHTML = '<p class="error-text">Erro ao renderizar detalhes!</p>';
            if (vehicle && selectedVehicle?.id === vehicle.id) selectVehicle(null);
        } finally {
            isContentSwapping = false;
        }
    }
    function setupDetailsPanelEventListeners(wrapperElement) {
        if (!wrapperElement) return;
        const addListener = (sel, evt, hnd) => { const el = wrapperElement.querySelector(sel); if (el) el.addEventListener(evt, hnd); else console.warn(`[Listeners] Element not found: '${sel}'`); };
        addListener('.close-button', 'click', () => selectVehicle(null));
        addListener('.btn-start', 'click', handleStartVehicle);
        addListener('.btn-stop', 'click', handleStopVehicle);
        addListener('.btn-accelerate', 'click', handleAccelerateVehicle);
        addListener('.btn-brake', 'click', handleBrakeVehicle);
        addListener('.btn-toggle-turbo', 'click', handleToggleTurbo);
        addListener('.btn-load-cargo', 'click', handleLoadCargo);
        addListener('.btn-unload-cargo', 'click', handleUnloadCargo);
        addListener('.schedule-maintenance-form', 'submit', handleScheduleMaintenance);
        addListener('.btn-remove-vehicle', 'click', handleRemoveVehicle);
        addListener('.trip-form', 'submit', handleCalculateRouteAndWeather);
        addListener('.trip-highlight-rain', 'change', handleHighlightToggle);
        addListener('.trip-highlight-cold', 'change', handleHighlightToggle);
        addListener('.trip-highlight-hot', 'change', handleHighlightToggle);
        
        // [NOVO] Listeners para o painel de edição de API
        addListener('.btn-fetch-api-details', 'click', handleFetchApiDetails);
        addListener('.btn-edit-api-details', 'click', handleEditApiDetails);
        addListener('.btn-cancel-edit-api-details', 'click', handleCancelEditApiDetails);
        addListener('.api-details-edit-form', 'submit', handleSaveApiDetails);
    }
    function populateDetailsPanelContent(wrapper, vehicle) {
        if (!wrapper || !vehicle) return;
        const find = (s) => wrapper.querySelector(s);
        const updTxt = (s, t) => { const el=find(s); if(el)el.textContent=t??''; };
        const updHTML = (s, h) => { const el=find(s); if(el)el.innerHTML=h??''; };
        const setDisp = (s, d) => { const el=find(s); if(el)el.style.display=d; };
        const setDisab = (s, i) => { const el=find(s); if(el)el.disabled=i; };
        const togCls = (s, c, f) => { const el=find(s); if(el)el.classList.toggle(c,f); };
        const setVal = (s, v) => { const el=find(s); if(el)el.value=v??''; };

        updTxt('.details-title', `${vehicle.make} ${vehicle.model}`);
        updHTML('.vehicle-info', `<strong>Ano:</strong> ${vehicle.year}<br><strong>Tipo:</strong> ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}<br><strong title="ID: ${vehicle.id}">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>`);
        updTxt('.status-indicator', `Status: ${vehicle.status}`);
        updTxt('.speed-indicator', `Veloc: ${vehicle.speed.toFixed(0)} km/h`);
        const isSports = vehicle instanceof SportsCar, isTruck = vehicle instanceof Truck;
        setDisp('.turbo-indicator', isSports ? 'inline-flex' : 'none');
        setDisp('.btn-toggle-turbo', isSports ? 'inline-flex' : 'none');
        if (isSports) { updTxt('.turbo-indicator', `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`); updTxt('.btn-toggle-turbo span:last-child', vehicle.turboOn ? 'Turbo OFF' : 'Turbo ON'); togCls('.btn-toggle-turbo', 'active', vehicle.turboOn); setDisab('.btn-toggle-turbo', vehicle.status === 'off'); }
        setDisp('.load-indicator', isTruck ? 'inline-flex' : 'none');
        setDisp('.truck-load-controls', isTruck ? 'flex' : 'none');
        if (isTruck) { updTxt('.load-indicator', `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`); setVal('.cargo-amount', ''); }
        setDisab('.btn-start', vehicle.status !== 'off');
        setDisab('.btn-stop', vehicle.status === 'off' || vehicle.speed > 0);
        setDisab('.btn-accelerate', vehicle.status === 'off');
        setDisab('.btn-brake', vehicle.status !== 'moving');
        const histListEl = find('.maintenance-list'); if (histListEl) renderMaintenanceHistory(histListEl, vehicle);
        const maintForm = find('.schedule-maintenance-form'); if (maintForm) { maintForm.reset(); setVal('.selected-vehicle-id', vehicle.id); }
    }

    // --- Maintenance & Appointments ---
    function renderMaintenanceHistory(listElement, vehicle) {
        if (!listElement || !vehicle) return;
        listElement.innerHTML = '';
        const history = vehicle.maintenanceHistory || [];
        if (history.length === 0) { listElement.innerHTML = '<li class="placeholder-text">Nenhum histórico.</li>'; return; }
        const fragment = document.createDocumentFragment();
        history.forEach(m => { const li = document.createElement('li'); li.textContent = m.format(); li.title = `ID: ${m.id}`; fragment.appendChild(li); });
        listElement.appendChild(fragment);
    }
    function renderFutureAppointmentsList() {
        if (!futureAppointmentsList || !garage) return;
        futureAppointmentsList.innerHTML = '';
        const appointments = garage.getAllFutureAppointments();
        if (appointments.length === 0) { futureAppointmentsList.innerHTML = '<li class="placeholder-text">Sem agendamentos.</li>'; return; }
        const fragment = document.createDocumentFragment();
        appointments.forEach(app => {
            const li = document.createElement('li'); li.dataset.vehicleId = app.vehicleId; li.dataset.maintId = app.maintenance.id;
            let dateStr = 'Data Inválida'; try { dateStr = app.maintenance.date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { console.error("Date format error (Appts List):", e); }
            li.innerHTML = `<strong>${dateStr}</strong>: ${app.vehicleInfo} - ${app.maintenance.type}`;
            if (app.maintenance.cost > 0) li.innerHTML += ` (${app.maintenance.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
            if (app.maintenance.description) li.title = `Descrição: ${app.maintenance.description}`;
            li.addEventListener('click', handleAppointmentClick);
            fragment.appendChild(li);
        });
        futureAppointmentsList.appendChild(fragment);
    }
    function handleAppointmentClick(event) {
        const vehicleId = event.currentTarget.dataset.vehicleId;
        if (vehicleId) {
            if (currentActiveTab !== 'garage') setActiveTab('garage');
            selectVehicle(vehicleId);
            getElemById('details-content-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        mainNav?.addEventListener('click', (e) => { const l = e.target.closest('.nav-link[data-tab-target]'); if (l) { e.preventDefault(); setActiveTab(l.dataset.tabTarget); } });
        vehicleTypeSelect?.addEventListener('change', (e) => {
            const showTruck = e.target.value === 'Truck';
            truckSpecificFields?.classList.toggle('visible', showTruck);
            const maxLoadIn = document.getElementById('truck-max-load');
            if (maxLoadIn) { maxLoadIn.required = showTruck; if (!showTruck) maxLoadIn.value = ''; }
        });
        addVehicleForm?.addEventListener('submit', handleAddVehicle);
        window.addEventListener('hashchange', handleHashChange);
    }

    // --- Event Handlers ---
    function handleAddVehicle(event) {
        event.preventDefault();
        if (!addVehicleForm || !vehicleTypeSelect || !garage) return;
        const type = vehicleTypeSelect.value, make = addVehicleForm.querySelector('#vehicle-make')?.value.trim(), model = addVehicleForm.querySelector('#vehicle-model')?.value.trim(), year = addVehicleForm.querySelector('#vehicle-year')?.value, maxLoad = addVehicleForm.querySelector('#truck-max-load')?.value;
        if (!type || !make || !model || !year) { showNotification('Preencha Tipo, Marca, Modelo e Ano.', 'warning'); return; }
        if (type === 'Truck' && (!maxLoad || parseInt(maxLoad) <= 0)) { showNotification('Carga Máxima inválida para Caminhão.', 'warning'); return; }
        let newVehicle; const newId = generateUniqueId();
        try {
            switch (type) {
                case 'Car': newVehicle = new Car(make, model, year, newId); break;
                case 'SportsCar': newVehicle = new SportsCar(make, model, year, newId); break;
                case 'Truck': newVehicle = new Truck(make, model, year, maxLoad, newId); break;
                default: throw new Error('Tipo de veículo inválido.');
            }
            if (garage.addVehicle(newVehicle)) {
                renderGarageList(); addVehicleForm.reset(); vehicleTypeSelect.value = "";
                truckSpecificFields?.classList.remove('visible'); const maxLIn = document.getElementById('truck-max-load'); if(maxLIn) maxLIn.required = false;
                showNotification(`${type.replace(/([A-Z])/g, ' $1').trim()} ${make} ${model} adicionado!`, 'success');
                updateAllRelevantData();
            }
        } catch (error) { console.error("[Event AddVehicle] Error:", error); showNotification(`Erro: ${error.message}`, 'error'); }
    }
    function handleRemoveVehicle() {
        if (!selectedVehicle || !garage) return;
        const vehicleToRemove = selectedVehicle, vehicleId = vehicleToRemove.id, vehicleName = `${vehicleToRemove.make} ${vehicleToRemove.model}`;
        showConfirmation(`Remover ${vehicleName} (ID: ...${vehicleId.slice(-4)})? Esta ação é irreversível.`,
            () => {
                selectVehicle(null); // Deselect first
                if (garage.removeVehicle(vehicleId)) {
                    showNotification(`${vehicleName} removido.`, 'info');
                    setTimeout(() => { renderGarageList(); updateAllRelevantData(); }, 50);
                } else {
                    showNotification(`Erro ao remover ${vehicleName}.`, 'error');
                    renderGarageList(); updateAllRelevantData();
                }
            },
            () => console.log(`[Event RemoveVehicle] Cancelled for ${vehicleId}.`)
        );
    }
    function handleScheduleMaintenance(event) {
        event.preventDefault();
        if (!selectedVehicle || !garage) { showNotification("Selecione um veículo.", "warning"); return; }
        const form = event.target, wrapper = getCurrentDetailsWrapper(); if (!wrapper) return;
        const dateIn = form.querySelector('.maint-date'), typeIn = form.querySelector('.maint-type'), costIn = form.querySelector('.maint-cost'), descIn = form.querySelector('.maint-desc');
        const histListEl = wrapper.querySelector('.maintenance-list');
        const dateVal = dateIn?.value, typeVal = typeIn?.value.trim(), costVal = costIn?.value, descVal = descIn?.value.trim();
        if (!dateVal || !typeVal || costVal === '' || costVal === null) { showNotification('Data, Tipo e Custo são obrigatórios.', 'warning'); return; }
        const costF = parseFloat(costVal);
        if (isNaN(costF) || costF < 0) { showNotification('Custo deve ser >= 0.', 'warning'); return; }
        try {
            const newMaint = new Maintenance(dateVal, typeVal, costF, descVal);
            if (selectedVehicle.addMaintenance(newMaint)) {
                if (histListEl) renderMaintenanceHistory(histListEl, selectedVehicle);
                form.reset(); garage.saveToLocalStorage();
                showNotification(`Manutenção "${typeVal}" registrada para ${selectedVehicle.model}.`, 'success');
                updateAllRelevantData();
            } else { showNotification('Falha ao adicionar manutenção.', 'error'); }
        } catch (error) { console.error("[Event ScheduleMaint] Error:", error); showNotification(`Erro: ${error.message}`, 'error'); }
    }

    // --- Vehicle Action Handlers ---
    function getCurrentDetailsWrapper() { return detailsContentArea?.querySelector('.vehicle-details-content-wrapper'); }
    function handleStartVehicle() { if (!selectedVehicle) return; if (selectedVehicle.start()) { const w = getCurrentDetailsWrapper(); if (w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'shake'); garage.saveToLocalStorage(); } }
    function handleStopVehicle() { if (!selectedVehicle) return; if (selectedVehicle.stop()) { const w = getCurrentDetailsWrapper(); if (w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); garage.saveToLocalStorage(); } }
    function handleAccelerateVehicle() { if (!selectedVehicle) return; if (selectedVehicle.accelerate()) { const w = getCurrentDetailsWrapper(); if (w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-forward'); garage.saveToLocalStorage(); } }
    function handleBrakeVehicle() { if (!selectedVehicle) return; if (selectedVehicle.brake()) { const w = getCurrentDetailsWrapper(); if (w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-backward'); garage.saveToLocalStorage(); } }
    function handleToggleTurbo() { if (!(selectedVehicle instanceof SportsCar)) return; if (selectedVehicle.toggleTurbo()) { const w = getCurrentDetailsWrapper(); if (w) populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); garage.saveToLocalStorage(); } }
    function handleLoadCargo() { if (!(selectedVehicle instanceof Truck)) return; const w = getCurrentDetailsWrapper(), cIn = w?.querySelector('.cargo-amount'); if (!w || !cIn) return; if (selectedVehicle.loadCargo(cIn.value)) { populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'bounce'); garage.saveToLocalStorage(); updateAllRelevantData(); } }
    function handleUnloadCargo() { if (!(selectedVehicle instanceof Truck)) return; const w = getCurrentDetailsWrapper(), cIn = w?.querySelector('.cargo-amount'); if (!w || !cIn) return; if (selectedVehicle.unloadCargo(cIn.value)) { populateDetailsPanelContent(w, selectedVehicle); updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); triggerVehicleCardAnimation(selectedVehicle.id, 'bounce'); garage.saveToLocalStorage(); updateAllRelevantData(); } }

    
    // --- [NOVO] API Details Handlers (Create/Update Logic) ---

    function resetApiDetailsSection(wrapper) {
        if (!wrapper) wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        const apiContentArea = wrapper.querySelector('.api-details-content');
        const tipSection = wrapper.querySelector('.maintenance-tip-section');
        const fetchButton = wrapper.querySelector('.btn-fetch-api-details');
        const editButton = wrapper.querySelector('.btn-edit-api-details');

        if (apiContentArea) apiContentArea.innerHTML = '<p class="placeholder-text">Clique para buscar ou criar dados para este veículo.</p>';
        if (tipSection) tipSection.style.display = 'none';
        
        toggleApiEditMode(false, wrapper); // Garante que a view de edição está escondida
        
        if (fetchButton) {
            const btnText = fetchButton.querySelector('.btn-text');
            const spinner = fetchButton.querySelector('.spinner');
            fetchButton.disabled = false;
            if (btnText) btnText.textContent = 'Ver Dados Externos';
            if (spinner) spinner.style.display = 'none';
        }
        if (editButton) editButton.style.display = 'none';
    }

    function resetTripPlannerSection(wrapper) {
        if (!wrapper) wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        const tripResults = wrapper.querySelector('.trip-results');
        const tripBtn = wrapper.querySelector('.btn-calculate-trip');
        const tripForm = wrapper.querySelector('.trip-form');

        if (tripResults) tripResults.innerHTML = '<p class="placeholder-text">Insira partida e chegada para detalhes.</p>';
        if (tripForm) tripForm.reset();
        if (tripBtn) {
            tripBtn.disabled = false;
            const btnText = tripBtn.querySelector('.btn-text');
            const spinner = tripBtn.querySelector('.spinner');
            if(btnText) btnText.textContent = 'Calcular Rota e Clima';
            if(spinner) spinner.style.display = 'none';
        }
    }
    
    function toggleApiEditMode(isEditing, wrapper) {
        if (!wrapper) wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;

        const viewPanel = wrapper.querySelector('.api-details-content-view');
        const editForm = wrapper.querySelector('.api-details-edit-form');
        const editButton = wrapper.querySelector('.btn-edit-api-details');
        const fetchButton = wrapper.querySelector('.btn-fetch-api-details');

        if (viewPanel) viewPanel.style.display = isEditing ? 'none' : 'block';
        if (editForm) editForm.style.display = isEditing ? 'block' : 'none';
        if (fetchButton) fetchButton.style.display = isEditing ? 'none' : 'flex';
        if (editButton) editButton.style.display = isEditing ? 'none' : 'flex'; // Botão de editar só aparece quando não estamos editando
    }

    async function handleFetchApiDetails() {
        if (!selectedVehicle) return;
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;

        const apiContentArea = wrapper.querySelector('.api-details-content');
        const fetchButton = wrapper.querySelector('.btn-fetch-api-details');
        const btnText = fetchButton?.querySelector('.btn-text');
        const spinner = fetchButton?.querySelector('.spinner');

        apiContentArea.innerHTML = '<p class="placeholder-text">🔄 Carregando dados...</p>';
        fetchButton.disabled = true;
        if(btnText) btnText.textContent = 'Carregando...';
        if(spinner) spinner.style.display = 'inline-block';

        const vehicleIdentifier = `${selectedVehicle.make}-${selectedVehicle.model}`;

        try {
            const apiData = await buscarDetalhesVeiculoAPI(vehicleIdentifier);
            renderApiDetailsView(apiData, wrapper);
            showNotification("Dados externos carregados.", "success", 2500);
        } catch (error) {
            if (error.status === 404) {
                // MODO CRIAÇÃO: Veículo não encontrado, então abrimos o formulário de edição
                console.log(`[API] Nenhum dado encontrado para ${vehicleIdentifier}. Entrando em modo de criação.`);
                showNotification("Dados não encontrados. Preencha o formulário para criar.", "info");
                populateApiEditForm(null, wrapper); // Popula com valores vazios/padrão
                toggleApiEditMode(true, wrapper);
            } else {
                // Outro tipo de erro (servidor, rede, etc.)
                console.error("[API] Erro ao buscar detalhes do veículo:", error);
                apiContentArea.innerHTML = `<p class="error-text">❌ ${error.message}</p>`;
                showNotification(`Erro ao buscar dados: ${error.message}`, "error");
            }
        } finally {
            fetchButton.disabled = false;
            if(btnText) btnText.textContent = 'Ver Dados Externos';
            if(spinner) spinner.style.display = 'none';
        }
    }

    function renderApiDetailsView(apiData, wrapper) {
        if (!wrapper) return;
        wrapper.dataset.apiData = JSON.stringify(apiData);

        const apiContentArea = wrapper.querySelector('.api-details-content');
        const tipSection = wrapper.querySelector('.maintenance-tip-section');
        const tipContent = wrapper.querySelector('.maintenance-tip-content');

        // [CORRIGIDO] Adiciona a renderização do novo campo na visualização
        apiContentArea.innerHTML = `<dl class="api-data-list">
            <dt>Valor FIPE:</dt><dd>${apiData.valorFipeEstimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/D'}</dd>
            <dt>Revisão Rec. (km):</dt><dd>${apiData.ultimaRevisaoRecomendadaKm?.toLocaleString('pt-BR') ?? 'N/D'} km</dd>
            <dt>Recall Pendente:</dt><dd class="${apiData.recallPendente ? 'recall-warning' : ''}">${apiData.recallPendente ? '⚠️ Sim' : '✅ Não'}</dd>
        </dl>`;
        
        tipContent.textContent = apiData.dicaManutencao || "Nenhuma dica específica disponível.";
        tipSection.style.display = 'block';

        toggleApiEditMode(false, wrapper);
    }

    function populateApiEditForm(apiData, wrapper) {
        if (!wrapper) return;
        const form = wrapper.querySelector('.api-details-edit-form');
        const formTitle = form.querySelector('.edit-form-title');

        const isCreateMode = !apiData;
        formTitle.innerHTML = `<span class="section-icon">${isCreateMode ? '➕' : '✏️'}</span> ${isCreateMode ? 'Criar Novos Dados' : 'Editar Dados Externos'}`;

        // [CORRIGIDO] Adiciona o preenchimento do novo campo no formulário
        form.querySelector('.edit-fipe-value').value = apiData?.valorFipeEstimado ?? '';
        form.querySelector('.edit-revision-km').value = apiData?.ultimaRevisaoRecomendadaKm ?? '';
        form.querySelector('.edit-recall-status').value = String(apiData?.recallPendente ?? 'false');
        form.querySelector('.edit-maintenance-tip').value = apiData?.dicaManutencao ?? '';
    }

    function handleEditApiDetails() {
        // Esta função agora apenas entra no modo de edição. Os dados já foram buscados.
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;

        // Recupera os dados que foram armazenados no painel para popular o form
        const apiData = wrapper.dataset.apiData ? JSON.parse(wrapper.dataset.apiData) : null;
        populateApiEditForm(apiData, wrapper);
        toggleApiEditMode(true, wrapper);
    }

    function handleCancelEditApiDetails() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        
        const apiData = wrapper.dataset.apiData ? JSON.parse(wrapper.dataset.apiData) : null;
        if (apiData) {
            // Se existiam dados antes, volta a exibi-los
            toggleApiEditMode(false, wrapper);
        } else {
            // Se não existiam (modo criação foi cancelado), reseta a seção
            resetApiDetailsSection(wrapper);
        }
    }

    async function handleSaveApiDetails(event) {
        event.preventDefault();
        if (!selectedVehicle) return;
        const wrapper = document.querySelector('.vehicle-details-content-wrapper');
        if (!wrapper) return;
        
        const form = wrapper.querySelector('.api-details-edit-form');
        const saveButton = wrapper.querySelector('.btn-save-api-details');
        
        // [CORRIGIDO] Coleta o valor do novo campo do formulário
        const dataToSave = {
            valorFipeEstimado: parseFloat(form.querySelector('.edit-fipe-value').value) || 0,
            ultimaRevisaoRecomendadaKm: parseInt(form.querySelector('.edit-revision-km').value) || 0,
            recallPendente: form.querySelector('.edit-recall-status').value === 'true',
            dicaManutencao: form.querySelector('.edit-maintenance-tip').value
        };

        const vehicleIdentifier = `${selectedVehicle.make}-${selectedVehicle.model}`;
        setLoadingState(saveButton, true, 'Salvando...');

        try {
            const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicleIdentifier)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Erro ${response.status}`);
            
            showNotification(result.message, 'success');
            renderApiDetailsView(result.vehicle, wrapper);
        } catch (error) {
            showNotification(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setLoadingState(saveButton, false, 'Salvar Alterações');
        }
    }

    function setLoadingState(button, isLoading, loadingText) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        if (!button.dataset.originalText) {
            button.dataset.originalText = btnText.textContent;
        }

        button.disabled = isLoading;
        btnText.textContent = isLoading ? loadingText : button.dataset.originalText;
        spinner.style.display = isLoading ? 'inline-block' : 'none';
    }

    // --- Trip Planner Handlers ---
    async function handleCalculateRouteAndWeather(event) {
        event.preventDefault();
        console.log("[Trip] Calculate Route & Weather initiated.");
        if (!selectedVehicle) {
            showNotification("Selecione um veículo para planejar a viagem.", "warning");
            return;
        }
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) {
            console.error("[Trip] Details panel wrapper not found!");
            return;
        }

        const originInput = wrapper.querySelector('.trip-origin-input');
        const destinationInput = wrapper.querySelector('.trip-destination-input');
        const resultsArea = wrapper.querySelector('.trip-results');
        const calcButton = wrapper.querySelector('.btn-calculate-trip');
        const btnText = calcButton?.querySelector('.btn-text');
        const spinner = calcButton?.querySelector('.spinner');

        if (!originInput || !destinationInput || !resultsArea || !calcButton) {
            console.error("[Trip] Missing form elements for trip planner.");
            showNotification("Erro interno: Elementos do planejador não encontrados.", "error");
            return;
        }

        const originCity = originInput.value.trim();
        const destinationCity = destinationInput.value.trim();

        if (!originCity || !destinationCity) {
            showNotification("Por favor, informe a origem e o destino da viagem.", "warning");
            return;
        }

        // --- Visual Feedback: Loading ---
        resultsArea.innerHTML = '<p class="placeholder-text">🔄 Calculando rota e buscando clima...</p>';
        calcButton.disabled = true;
        if(btnText) btnText.textContent = 'Calculando...';
        if(spinner) spinner.style.display = 'inline-block';

        try {
            const weatherData = await fetchWeatherForDestination(destinationCity);
            if (weatherData.error) throw new Error(weatherData.message);

            let weatherClass = 'weather-moderate';
            let weatherAdvice = "Clima parece bom!";
            if (weatherData.temp < 15) {
                weatherClass = 'weather-cold';
                weatherAdvice = "Está frio! Leve agasalhos. 🥶";
            } else if (weatherData.temp > 28) {
                weatherClass = 'weather-hot';
                weatherAdvice = "Está quente! Hidrate-se. 🥵";
            }

            resultsArea.innerHTML = `
                <ul class="trip-results-list">
                    <li><strong>Origem:</strong> ${originCity}</li>
                    <li><strong>Destino:</strong> ${weatherData.cityFound || destinationCity}</li>
                    <li>
                        <strong>Clima no Destino:</strong>
                        <span class="${weatherClass}">
                            ${weatherData.temp.toFixed(1)}°C (Sensação: ${weatherData.feelsLike?.toFixed(1) ?? 'N/D'}°C)
                        </span>
                        <img src="${OPENWEATHERMAP_ICON_URL_PREFIX}${weatherData.icon}@2x.png" alt="${weatherData.description}" class="weather-icon" title="${weatherData.description}">
                        <span class="weather-description">(${weatherData.description})</span>
                    </li>
                </ul>
            `;
            resultsArea._weatherData = weatherData; // Store weather data on the element
            applyWeatherHighlights(weatherData, resultsArea, wrapper); // Apply initial highlights
            showNotification(`Viagem para ${weatherData.cityFound || destinationCity}: ${weatherAdvice}`, weatherData.temp < 15 ? 'cold' : (weatherData.temp > 28 ? 'hot' : 'info'), 6000);

        } catch (error) {
            console.error("[Trip] Error calculating trip details:", error);
            resultsArea.innerHTML = `<p class="error-text">❌ Erro ao calcular: ${error.message}</p>`;
            showNotification(`Erro ao planejar viagem: ${error.message}`, "error");
        } finally {
            calcButton.disabled = false;
            if(btnText) btnText.textContent = 'Calcular Rota e Clima';
            if(spinner) spinner.style.display = 'none';
        }
    }

    function handleHighlightToggle() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        const resultsArea = wrapper.querySelector('.trip-results');
        if (resultsArea && resultsArea._weatherData) {
            applyWeatherHighlights(resultsArea._weatherData, resultsArea, wrapper);
        } else {
            console.log("[Highlight] No weather data to apply highlights to. Calculate a trip first.");
        }
    }

    function applyWeatherHighlights(weatherData, resultsArea, wrapper) {
        if (!weatherData || !resultsArea || !wrapper) return;

        const highlightRainCheck = wrapper.querySelector('.trip-highlight-rain');
        const highlightColdCheck = wrapper.querySelector('.trip-highlight-cold');
        const highlightHotCheck = wrapper.querySelector('.trip-highlight-hot');

        resultsArea.classList.remove('highlighted-rain', 'highlighted-cold', 'highlighted-hot');

        if (highlightRainCheck?.checked) {
            const rainTerms = /rain|chuva|drizzle|garoa|tempestade|thunderstorm|shower/i;
            if (weatherData.description && rainTerms.test(weatherData.description.toLowerCase())) {
                resultsArea.classList.add('highlighted-rain');
            }
        }
        if (highlightColdCheck?.checked) {
            const coldThreshold = parseFloat(highlightColdCheck.dataset.threshold);
            if (!isNaN(coldThreshold) && weatherData.temp < coldThreshold) resultsArea.classList.add('highlighted-cold');
        }
        if (highlightHotCheck?.checked) {
            const hotThreshold = parseFloat(highlightHotCheck.dataset.threshold);
            if (!isNaN(hotThreshold) && weatherData.temp > hotThreshold) resultsArea.classList.add('highlighted-hot');
        }
    }

    // --- Helper to Update All Data Displays ---
    function updateAllRelevantData() {
        console.log("[Update] Updating cross-tab data (Dashboard, Stats, Appointments)...");
        try { renderDashboard(); renderStats(); renderFutureAppointmentsList(); }
        catch (error) { console.error("Error updateAllRelevantData:", error); showNotification("Erro ao atualizar dados gerais.", "error"); }
    }

    // --- Run Application ---
    try { initializeApp(); }
    catch (globalError) {
        console.error("======== GLOBAL INITIALIZATION ERROR ========", globalError);
        alert("Erro Crítico na inicialização! Verifique o console.");
        document.body.innerHTML = `<div class="error-text" style="padding:2rem;text-align:center;"><h1>Erro Crítico</h1><p>Falha ao iniciar. Ver console (F12).</p><pre style="text-align:left;background:#333;color:#fdd;padding:1rem;border-radius:5px;overflow-x:auto;margin-top:1rem;">${globalError.stack||globalError.message}</pre></div>`;
    }
});