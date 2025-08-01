// ARQUIVO COMPLETO: /public/js/main.js
// Lógica principal da aplicação, agora totalmente integrada com a API do backend.

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init 0.1] DOMContentLoaded. Initializing Smart Garage Nexus v9.0 (API-driven)...");

    // --- State & Instance Variables ---
    let garage = new Garage(); // Now API-driven
    let selectedVehicle = null;
    let currentActiveTab = 'dashboard';
    let isContentSwapping = false;

    // --- Configuration ---
    const OPENWEATHERMAP_ICON_URL_PREFIX = 'https://openweathermap.org/img/wn/';

    // --- UI Element Cache ---
    const getElemById = (id) => document.getElementById(id);

    const mainNav = document.querySelector('.main-nav');
    const navLinks = mainNav?.querySelectorAll('.nav-link[data-tab-target]') ?? [];
    const tabContents = document.querySelectorAll('.tab-content[data-tab-content]');
    const garageDisplay = getElemById('garage-display');
    const detailsContentArea = getElemById('details-content-area');
    const vehicleDetailsTemplate = getElemById('vehicle-details-template');
    const futureAppointmentsList = getElemById('future-appointments-list');
    const addVehicleForm = getElemById('add-vehicle-form');
    const vehicleTypeSelect = getElemById('vehicle-type');
    const truckSpecificFields = getElemById('truck-specific-fields');

    // --- Initialization ---
    async function initializeApp() {
        console.log("[Init 1.0] === Starting initializeApp ===");
        
        setupEventListeners();

        console.log("[Init 1.4] Initializing Garage and loading from API...");
        const loadSuccess = await garage.loadFromAPI();

        if (!loadSuccess) {
            showNotification("Falha crítica ao carregar dados da garagem. A aplicação pode não funcionar corretamente.", "error", 10000);
        }
        
        console.log(`[Init 1.7] ${garage.vehicles.length} vehicles loaded into local cache.`);

        const initialTab = getTabFromHash() || 'dashboard';
        setActiveTab(initialTab, true);

        console.log("[Init 1.10] Performing initial rendering...");
        renderGarageList();
        updateAllRelevantData();
        renderDetailsAreaContent(null);

        console.log("[Init COMPLETE] === Smart Garage Nexus initialization finished ===");
    }
    
    // --- Event Handlers (CRUD & Actions) ---
    async function handleAddVehicle(event) {
        event.preventDefault();
        const type = vehicleTypeSelect.value, make = addVehicleForm.querySelector('#vehicle-make')?.value.trim(), model = addVehicleForm.querySelector('#vehicle-model')?.value.trim(), year = addVehicleForm.querySelector('#vehicle-year')?.value, maxLoad = addVehicleForm.querySelector('#truck-max-load')?.value;
        if (!type || !make || !model || !year) { showNotification('Preencha Tipo, Marca, Modelo e Ano.', 'warning'); return; }
        
        let newVehicle;
        try {
            switch (type) {
                case 'Car': newVehicle = new Car(make, model, year); break;
                case 'SportsCar': newVehicle = new SportsCar(make, model, year); break;
                case 'Truck': newVehicle = new Truck(make, model, year, maxLoad); break;
                default: throw new Error('Tipo de veículo inválido.');
            }

            const createdVehicleData = await garage.addVehicle(newVehicle);
            if (createdVehicleData) {
                const reconstructed = reconstructVehicle(createdVehicleData);
                if (reconstructed) garage.vehicles.push(reconstructed);
                
                renderGarageList();
                addVehicleForm.reset();
                vehicleTypeSelect.value = "";
                truckSpecificFields?.classList.remove('visible');
                
                showNotification(`${type.replace(/([A-Z])/g, ' $1').trim()} ${make} ${model} adicionado!`, 'success');
                updateAllRelevantData();
                selectVehicle(createdVehicleData.id);
            }
        } catch (error) {
            console.error("[Event AddVehicle] Error:", error);
            showNotification(`Erro ao adicionar: ${error.message}`, 'error');
        }
    }

    function handleRemoveVehicle() {
        if (!selectedVehicle) return;
        const vehicleToRemove = selectedVehicle;
        const vehicleName = `${vehicleToRemove.make} ${vehicleToRemove.model}`;
        
        showConfirmation(`Remover ${vehicleName}? Esta ação é irreversível.`, async () => {
            try {
                await garage.removeVehicle(vehicleToRemove.id);
                showNotification(`${vehicleName} removido com sucesso.`, 'info');
                selectVehicle(null);
                renderGarageList();
                updateAllRelevantData();
            } catch (error) {
                showNotification(`Erro ao remover ${vehicleName}: ${error.message}`, 'error');
            }
        });
    }

    async function handleVehicleAction(action, args = []) {
        if (!selectedVehicle) return;
        const originalState = selectedVehicle.toJSON();
        
        const actionResult = selectedVehicle[action](...args);
        if (!actionResult) return;

        const wrapper = getCurrentDetailsWrapper();
        if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle);
        updateVehicleCardStatus(garageDisplay.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
        
        try {
            const updatedData = await apiUpdateVehicle(selectedVehicle.id, selectedVehicle.toJSON());
            const index = garage.vehicles.findIndex(v => v.id === updatedData.id);
            if(index > -1) garage.vehicles[index] = reconstructVehicle(updatedData);
            console.log(`[API Sync] Action '${action}' successfully synced.`);
        } catch (error) {
            console.error(`[API Sync] Failed to sync action '${action}'. Reverting UI.`, error);
            showNotification(`Erro de sincronização: ${error.message}. Restaurando estado.`, 'error');
            
            selectedVehicle = reconstructVehicle(originalState);
            garage.vehicles[garage.vehicles.findIndex(v => v.id === originalState.id)] = selectedVehicle;
            
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle);
            updateVehicleCardStatus(garageDisplay.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
        }
    }
    
    async function handleScheduleMaintenance(event) {
        event.preventDefault();
        if (!selectedVehicle) { return; }
        const form = event.target;
        const dateVal = form.querySelector('.maint-date').value;
        const typeVal = form.querySelector('.maint-type').value.trim();
        const costVal = form.querySelector('.maint-cost').value;
        const descVal = form.querySelector('.maint-desc').value.trim();

        try {
            const newMaint = new Maintenance(dateVal, typeVal, parseFloat(costVal), descVal);
            if (!newMaint.isValid()) throw new Error("Dados de manutenção inválidos.");

            const updatedVehicle = await apiAddMaintenance(selectedVehicle.id, newMaint.toJSON());
            
            const index = garage.vehicles.findIndex(v => v.id === updatedVehicle.id);
            if(index > -1) {
                garage.vehicles[index] = reconstructVehicle(updatedVehicle);
                selectedVehicle = garage.vehicles[index];
            }
            
            form.reset();
            populateDetailsPanelContent(getCurrentDetailsWrapper(), selectedVehicle);
            showNotification(`Manutenção "${typeVal}" registrada.`, 'success');
            updateAllRelevantData();
        } catch (error) {
            console.error("[Event ScheduleMaint] Error:", error);
            showNotification(`Erro ao registrar manutenção: ${error.message}`, 'error');
        }
    }
    
    function handleFetchApiDetails() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper || !selectedVehicle) return;
        renderApiDetailsView(selectedVehicle.toJSON(), wrapper);
        showNotification("Dados do veículo exibidos.", "info", 2000);
    }
    
    async function handleSaveApiDetails(event) {
        event.preventDefault();
        if (!selectedVehicle) return;

        const wrapper = getCurrentDetailsWrapper();
        const form = wrapper.querySelector('.api-details-edit-form');
        const saveButton = form.querySelector('.btn-save-api-details');
        
        setLoadingState(saveButton, true, 'Salvando...');
        
        selectedVehicle.valorFipeEstimado = parseFloat(form.querySelector('.edit-fipe-value').value) || null;
        selectedVehicle.ultimaRevisaoRecomendadaKm = parseInt(form.querySelector('.edit-revision-km').value) || null;
        selectedVehicle.recallPendente = form.querySelector('.edit-recall-status').value === 'true';
        selectedVehicle.dicaManutencao = form.querySelector('.edit-maintenance-tip').value;

        try {
            const updatedVehicleData = await apiUpdateVehicle(selectedVehicle.id, selectedVehicle.toJSON());
            
            const index = garage.vehicles.findIndex(v => v.id === updatedVehicleData.id);
            if(index > -1) {
                garage.vehicles[index] = reconstructVehicle(updatedVehicleData);
                selectedVehicle = garage.vehicles[index];
            }
            
            showNotification("Dados atualizados com sucesso!", 'success');
            renderApiDetailsView(selectedVehicle.toJSON(), wrapper);
        } catch (error) {
            showNotification(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setLoadingState(saveButton, false, 'Salvar Alterações');
        }
    }

    // --- Helper Functions ---
    function reconstructVehicle(data) {
        if (!data) return null;
        switch (data._type) {
            case 'Car': return Car.fromJSON(data);
            case 'SportsCar': return SportsCar.fromJSON(data);
            case 'Truck': return Truck.fromJSON(data);
            default: return null;
        }
    }
    
    function getCurrentDetailsWrapper() { return detailsContentArea?.querySelector('.vehicle-details-content-wrapper'); }

    // --- Tab Management & Navigation ---
    function setActiveTab(tabId, isInitialLoad = false) {
        if (!tabId || tabId === currentActiveTab || isContentSwapping) return;
        currentActiveTab = tabId;
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.tabTarget === tabId));
        tabContents.forEach(content => {
            const isActive = content.dataset.tabContent === tabId;
            if (isActive) {
                content.style.display = 'block';
                requestAnimationFrame(() => {
                    content.classList.add('active-tab');
                    triggerRenderForTab(tabId, isInitialLoad);
                });
            } else {
                content.classList.remove('active-tab');
                const hide = () => { if (!content.classList.contains('active-tab')) content.style.display = 'none'; };
                content.addEventListener('transitionend', hide, { once: true });
                setTimeout(hide, 500);
            }
        });
        if (!isInitialLoad) updateUrlHash(tabId);
    }
    
    function getTabFromHash() { return window.location.hash.substring(1); }
    function updateUrlHash(tabId) { try { if (window.history.pushState) window.history.pushState(null, '', `#${tabId}`); else window.location.hash = tabId; } catch (e) { window.location.hash = tabId; } }
    function handleHashChange() { const tabId = getTabFromHash() || 'dashboard'; if (tabId !== currentActiveTab) setActiveTab(tabId); }
    
    // --- Content Rendering & Updates for Tabs ---
    function triggerRenderForTab(tabId, skipAnimation = false) {
        const tabElement = getElemById(`tab-${tabId}`);
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
        elements.forEach((el, index) => {
            const delay = skip ? '0s' : `${index * baseDelay}s`;
            el.style.transitionDelay = delay;
            requestAnimationFrame(() => {
                el.classList.add(triggerClass);
                const cleanup = () => el.style.transitionDelay = '';
                el.addEventListener('transitionend', cleanup, { once: true });
                setTimeout(cleanup, 1200 + (index * baseDelay * 1000));
            });
        });
    }

    // --- Dashboard & Stats Rendering ---
    function renderDashboard() {
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
                let fDate = new Date(nextApp.maintenance.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                updateStatElement("nextAppointment", fDate);
                updateStatElement("appointmentDetails", `${nextApp.vehicleInfo.split('(')[0].trim()} - ${nextApp.maintenance.type}`);
            } else {
                updateStatElement("nextAppointment", 'Nenhum');
                updateStatElement("appointmentDetails", 'Sem agendamentos futuros.');
            }
            updateStatElement("totalMaintCostDash", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        } catch (error) { console.error("[Render] Error renderDashboard:", error); }
    }

    function renderStats() {
        if (!garage) return;
        try {
            const numVehicles = garage.vehicles.length;
            const totalCost = calculateTotalMaintenanceCost();
            const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;
            const vehicleCosts = calculateMaintenanceCostPerVehicle();
            const typeCounts = countVehicleTypes();
            let mostExpensiveInfo = { name: 'N/A', cost: -1 };
            if (numVehicles > 0) {
                 const mostExpensive = Object.values(vehicleCosts).sort((a,b) => b.cost - a.cost)[0];
                 if(mostExpensive) mostExpensiveInfo = mostExpensive;
            }
            updateStatElement("totalCost", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("avgCost", avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("mostExpensiveVehicle", mostExpensiveInfo.name);
            const costDetailEl = document.querySelector('[data-stat="mostExpensiveCost"]');
            if (costDetailEl) costDetailEl.textContent = mostExpensiveInfo.cost >= 0 ? `(R$ ${mostExpensiveInfo.cost.toFixed(2).replace('.', ',')})` : '';
            updateTypeDistributionChart(typeCounts);
        } catch (error) { console.error("[Render] Error renderStats:", error); }
    }

    function updateStatElement(statName, value) {
        const elements = document.querySelectorAll(`[data-stat="${statName}"]`);
        elements.forEach(el => el.textContent = (value !== null && value !== undefined) ? String(value) : '-');
    }

    function calculateTotalMaintenanceCost() {
        if (!garage || !garage.vehicles) return 0;
        return garage.vehicles.reduce((sum, v) => sum + (v.maintenanceHistory || []).reduce((mSum, m) => mSum + (m?.cost ?? 0), 0), 0);
    }
    
    function calculateMaintenanceCostPerVehicle() {
        const costs = {};
        if (!garage || !garage.vehicles) return costs;
        garage.vehicles.forEach(v => {
            costs[v.id] = { name: `${v.make} ${v.model}`, cost: (v.maintenanceHistory || []).reduce((mSum, m) => mSum + (m?.cost ?? 0), 0) };
        });
        return costs;
    }
    
    function countVehicleTypes() {
        const counts = { Car: 0, SportsCar: 0, Truck: 0 };
        if (!garage || !garage.vehicles) return counts;
        garage.vehicles.forEach(v => {
            if (counts.hasOwnProperty(v._type)) {
                counts[v._type]++;
            }
        });
        return counts;
    }

    function updateTypeDistributionChart(typeCounts) {
        const chart = document.querySelector('.type-bar-chart');
        if (!chart) return;
        const maxCount = Math.max(...Object.values(typeCounts), 1);
        for (const type in typeCounts) {
            const barItem = chart.querySelector(`.bar-item[data-type="${type}"]`);
            if (barItem) {
                const perc = (typeCounts[type] / maxCount) * 100;
                barItem.querySelector('.bar').style.height = `${perc}%`;
                barItem.querySelector('.bar-count').textContent = typeCounts[type];
            }
        }
    }
    
    // --- Garage List & Vehicle Cards Rendering ---
    
    function renderGarageList() {
        if (!garageDisplay) return;
        garageDisplay.innerHTML = '';
        if (garage.vehicles.length === 0) {
            garageDisplay.innerHTML = '<p class="placeholder-text">A garagem está vazia.</p>';
            if(selectedVehicle) selectVehicle(null);
            return;
        }
        const fragment = document.createDocumentFragment();
        garage.vehicles.forEach(v => {
            const card = createVehicleCard(v);
            if (selectedVehicle?.id === v.id) card.classList.add('selected');
            fragment.appendChild(card);
        });
        garageDisplay.appendChild(fragment);
        applyStaggeredAnimation(garageDisplay.querySelectorAll('.vehicle-card'), 'animate-in', 0.05, false);
    }

    function createVehicleCard(vehicle) {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.dataset.id = vehicle.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        const statusIcon = document.createElement('span');
        statusIcon.className = 'status-icon';
        card.innerHTML = `<h4>${vehicle.make} ${vehicle.model}</h4><p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}</p><div class="card-specific-info"></div><div class="card-footer"></div>`;
        card.querySelector('.card-footer').appendChild(statusIcon);
        const specificInfo = card.querySelector('.card-specific-info');
        if (vehicle instanceof SportsCar) specificInfo.innerHTML = `<p class="info-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`;
        else if (vehicle instanceof Truck) specificInfo.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
        updateVehicleCardStatus(card, vehicle);
        card.addEventListener('click', () => selectVehicle(vehicle.id));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
        return card;
    }

    function updateVehicleCardStatus(card, vehicle) {
        if (!card || !vehicle) return;
        const statusIcon = card.querySelector('.status-icon');
        statusIcon.className = 'status-icon'; // Reset
        card.classList.remove('pulse-turbo', 'pulse-load');
        switch (vehicle.status) {
            case 'on': statusIcon.classList.add('on'); break;
            case 'moving': statusIcon.classList.add('moving'); break;
            default: statusIcon.classList.add('off'); break;
        }
        if (vehicle instanceof SportsCar) {
            card.querySelector('.info-turbo').textContent = `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`;
            if (vehicle.turboOn) card.classList.add('pulse-turbo');
        } else if (vehicle instanceof Truck) {
            card.querySelector('.info-load').textContent = `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`;
            if (vehicle.currentLoad > 0) card.classList.add('pulse-load');
        }
    }

    function triggerVehicleCardAnimation(vehicleId, animationClass) {
        const card = garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
        if (card) {
            card.classList.add(animationClass);
            card.addEventListener('animationend', () => card.classList.remove(animationClass), { once: true });
        }
    }

    // --- Vehicle Selection & Details Area Management ---
    function selectVehicle(vehicleId) {
        const prevSelectedId = selectedVehicle?.id;
        document.querySelector(`.vehicle-card[data-id="${prevSelectedId}"]`)?.classList.remove('selected');
        
        if (vehicleId && vehicleId !== prevSelectedId) {
            selectedVehicle = garage.findVehicle(vehicleId);
            document.querySelector(`.vehicle-card[data-id="${vehicleId}"]`)?.classList.add('selected');
            renderDetailsAreaContent(selectedVehicle);
        } else {
            selectedVehicle = null;
            renderDetailsAreaContent(null);
        }
    }

    function renderDetailsAreaContent(vehicle) {
        isContentSwapping = true;
        detailsContentArea.innerHTML = '';
        if (vehicle) {
            const detailsWrapper = vehicleDetailsTemplate.content.firstElementChild.cloneNode(true);
            detailsContentArea.appendChild(detailsWrapper);
            populateDetailsPanelContent(detailsWrapper, vehicle);
            setupDetailsPanelEventListeners(detailsWrapper);
            resetApiDetailsSection(detailsWrapper);
            resetTripPlannerSection(detailsWrapper);
        } else {
            detailsContentArea.innerHTML = `<div class="details-placeholder-content"><span class="placeholder-icon" aria-hidden="true">👈</span><p>Selecione um veículo para ver os detalhes.</p></div>`;
        }
        setTimeout(() => { isContentSwapping = false; }, 50);
    }
    
    function populateDetailsPanelContent(wrapper, vehicle) {
        const setTxt = (s, t) => { const e = wrapper.querySelector(s); if(e) e.textContent = t; };
        const setHTML = (s, h) => { const e = wrapper.querySelector(s); if(e) e.innerHTML = h; };
        const setDisp = (s, d) => { const e = wrapper.querySelector(s); if(e) e.style.display = d; };
        const setDisab = (s, i) => { const e = wrapper.querySelector(s); if(e) e.disabled = i; };

        setTxt('.details-title', `${vehicle.make} ${vehicle.model}`);
        setHTML('.vehicle-info', `<strong>Ano:</strong> ${vehicle.year}<br><strong>Tipo:</strong> ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}<br><strong title="ID: ${vehicle.id}">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>`);
        setTxt('.status-indicator', `Status: ${vehicle.status}`);
        setTxt('.speed-indicator', `Veloc: ${vehicle.speed.toFixed(0)} km/h`);

        const isSports = vehicle instanceof SportsCar;
        setDisp('.turbo-indicator', isSports ? 'inline-flex' : 'none');
        setDisp('.btn-toggle-turbo', isSports ? 'inline-flex' : 'none');
        if (isSports) {
            setTxt('.turbo-indicator', `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`);
            wrapper.querySelector('.btn-toggle-turbo').classList.toggle('active', vehicle.turboOn);
        }

        const isTruck = vehicle instanceof Truck;
        setDisp('.load-indicator', isTruck ? 'inline-flex' : 'none');
        setDisp('.truck-load-controls', isTruck ? 'flex' : 'none');
        if (isTruck) {
            setTxt('.load-indicator', `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`);
        }
        
        setDisab('.btn-start', vehicle.status !== 'off');
        setDisab('.btn-stop', vehicle.status === 'off' || vehicle.speed > 0);
        setDisab('.btn-accelerate', vehicle.status === 'off');
        setDisab('.btn-brake', vehicle.status !== 'moving');

        renderMaintenanceHistory(wrapper.querySelector('.maintenance-list'), vehicle);
    }
    
    // --- Maintenance & Appointments ---
    function renderMaintenanceHistory(listElement, vehicle) {
        listElement.innerHTML = '';
        if (vehicle.maintenanceHistory.length === 0) {
            listElement.innerHTML = '<li class="placeholder-text">Nenhum histórico.</li>';
            return;
        }
        // A maintenance history now is an array of objects from mongoose, not Maintenance instances
        vehicle.maintenanceHistory.forEach(m => {
            const li = document.createElement('li');
            // We need to create a temporary Maintenance instance to use its format method
            const maintInstance = Maintenance.fromJSON(m);
            li.textContent = maintInstance ? maintInstance.format() : "Registro inválido";
            listElement.appendChild(li);
        });
    }

    function renderFutureAppointmentsList() {
        futureAppointmentsList.innerHTML = '';
        const appointments = garage.getAllFutureAppointments();
        if (appointments.length === 0) {
            futureAppointmentsList.innerHTML = '<li class="placeholder-text">Sem agendamentos.</li>';
            return;
        }
        appointments.forEach(app => {
            const li = document.createElement('li');
            li.dataset.vehicleId = app.vehicleId;
            li.innerHTML = `<strong>${new Date(app.maintenance.date).toLocaleString('pt-BR', {day:'2-digit', month:'short'})}</strong>: ${app.vehicleInfo} - ${app.maintenance.type}`;
            li.addEventListener('click', handleAppointmentClick);
            futureAppointmentsList.appendChild(li);
        });
    }

    function handleAppointmentClick(event) {
        const vehicleId = event.currentTarget.dataset.vehicleId;
        if (vehicleId) {
            setActiveTab('garage');
            selectVehicle(vehicleId);
            detailsContentArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // --- API Details & Trip Planner UI Logic ---
    function resetApiDetailsSection(wrapper) {
        if (!wrapper) return;
        wrapper.querySelector('.api-details-content').innerHTML = '<p class="placeholder-text">Clique para exibir ou editar dados adicionais.</p>';
        wrapper.querySelector('.maintenance-tip-section').style.display = 'none';
        toggleApiEditMode(false, wrapper);
        wrapper.querySelector('.btn-edit-api-details').style.display = 'none';
    }
    
    function toggleApiEditMode(isEditing, wrapper) {
        if (!wrapper) return;
        wrapper.querySelector('.api-details-content-view').style.display = isEditing ? 'none' : 'block';
        wrapper.querySelector('.api-details-edit-form').style.display = isEditing ? 'block' : 'none';
        wrapper.querySelector('.btn-fetch-api-details').style.display = isEditing ? 'none' : 'flex';
    }

    function renderApiDetailsView(vehicleData, wrapper) {
        if (!wrapper) return;
        wrapper.dataset.apiData = JSON.stringify(vehicleData);
        const content = wrapper.querySelector('.api-details-content');
        const tipSection = wrapper.querySelector('.maintenance-tip-section');
        const tipContent = wrapper.querySelector('.maintenance-tip-content');
        content.innerHTML = `<dl class="api-data-list">
            <dt>Valor FIPE:</dt><dd>${vehicleData.valorFipeEstimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/D'}</dd>
            <dt>Revisão Rec. (km):</dt><dd>${vehicleData.ultimaRevisaoRecomendadaKm?.toLocaleString('pt-BR') ?? 'N/D'} km</dd>
            <dt>Recall Pendente:</dt><dd class="${vehicleData.recallPendente ? 'recall-warning' : ''}">${vehicleData.recallPendente ? '⚠️ Sim' : '✅ Não'}</dd>
        </dl>`;
        tipContent.textContent = vehicleData.dicaManutencao || "Nenhuma dica específica disponível.";
        tipSection.style.display = 'block'; // Always show the section, even if the tip is default
        toggleApiEditMode(false, wrapper);
        wrapper.querySelector('.btn-edit-api-details').style.display = 'flex';
    }

    function populateApiEditForm(vehicleData, wrapper) {
        if (!wrapper) return;
        const form = wrapper.querySelector('.api-details-edit-form');
        form.querySelector('.edit-fipe-value').value = vehicleData?.valorFipeEstimado ?? '';
        form.querySelector('.edit-revision-km').value = vehicleData?.ultimaRevisaoRecomendadaKm ?? '';
        form.querySelector('.edit-recall-status').value = String(vehicleData?.recallPendente ?? 'false');
        form.querySelector('.edit-maintenance-tip').value = vehicleData?.dicaManutencao ?? '';
    }
    
    function handleEditApiDetails() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper || !selectedVehicle) return;
        populateApiEditForm(selectedVehicle.toJSON(), wrapper);
        toggleApiEditMode(true, wrapper);
    }
    
    function handleCancelEditApiDetails() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        renderApiDetailsView(selectedVehicle.toJSON(), wrapper);
    }
    
    async function handleCalculateRouteAndWeather(event) {
        event.preventDefault();
        if (!selectedVehicle) return;
        const wrapper = getCurrentDetailsWrapper();
        const destInput = wrapper.querySelector('.trip-destination-input');
        const resultsArea = wrapper.querySelector('.trip-results');
        const calcButton = wrapper.querySelector('.btn-calculate-trip');
        const destCity = destInput.value.trim();
        if (!destCity) { showNotification("Informe a cidade de chegada.", "warning"); return; }
        
        setLoadingState(calcButton, true, "Buscando...");
        resultsArea.innerHTML = '<p class="placeholder-text">Buscando clima...</p>';
        try {
            const weatherData = await fetchWeatherForDestination(destCity);
            resultsArea.innerHTML = `<ul class="trip-results-list">
                <li><strong>Destino:</strong> ${weatherData.cityFound}</li>
                <li><strong>Clima:</strong> <span class="weather-description">${weatherData.description}</span> <img src="${OPENWEATHERMAP_ICON_URL_PREFIX}${weatherData.icon}.png" class="weather-icon"></li>
                <li><strong>Temperatura:</strong> ${weatherData.temp.toFixed(1)}°C (Sensação: ${weatherData.feelsLike.toFixed(1)}°C)</li>
            </ul>`;
            resultsArea._weatherData = weatherData;
            applyWeatherHighlights(weatherData, resultsArea, wrapper);
        } catch (error) {
            resultsArea.innerHTML = `<p class="error-text">❌ ${error.message}</p>`;
        } finally {
            setLoadingState(calcButton, false, "Calcular Rota e Clima");
        }
    }

    function handleHighlightToggle() {
        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) return;
        const resultsArea = wrapper.querySelector('.trip-results');
        if (resultsArea && resultsArea._weatherData) {
            applyWeatherHighlights(resultsArea._weatherData, resultsArea, wrapper);
        }
    }

    function applyWeatherHighlights(weatherData, resultsArea, wrapper) {
        const rainCheck = wrapper.querySelector('.trip-highlight-rain');
        const coldCheck = wrapper.querySelector('.trip-highlight-cold');
        const hotCheck = wrapper.querySelector('.trip-highlight-hot');
        
        resultsArea.classList.remove('highlighted-rain', 'highlighted-cold', 'highlighted-hot');

        if (rainCheck?.checked && /rain|chuva|drizzle|garoa|tempestade|thunderstorm|shower/i.test(weatherData.description)) {
            resultsArea.classList.add('highlighted-rain');
        }
        if (coldCheck?.checked && weatherData.temp < parseFloat(coldCheck.dataset.threshold)) {
            resultsArea.classList.add('highlighted-cold');
        }
        if (hotCheck?.checked && weatherData.temp > parseFloat(hotCheck.dataset.threshold)) {
            resultsArea.classList.add('highlighted-hot');
        }
    }
    
    function resetTripPlannerSection(wrapper) {
        if (!wrapper) return;
        wrapper.querySelector('.trip-results').innerHTML = '<p class="placeholder-text">Insira partida e chegada para detalhes.</p>';
        wrapper.querySelector('.trip-form').reset();
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
    
    function updateAllRelevantData() {
        renderDashboard();
        renderStats();
        renderFutureAppointmentsList();
    }
    
    function setupEventListeners() {
        mainNav?.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link[data-tab-target]');
            if (link) { e.preventDefault(); setActiveTab(link.dataset.tabTarget); }
        });
        vehicleTypeSelect?.addEventListener('change', (e) => {
            const showTruck = e.target.value === 'Truck';
            truckSpecificFields?.classList.toggle('visible', showTruck);
            getElemById('truck-max-load').required = showTruck;
        });
        addVehicleForm?.addEventListener('submit', handleAddVehicle);
        window.addEventListener('hashchange', handleHashChange);
    }
    
    function setupDetailsPanelEventListeners(wrapper) {
        const addListener = (sel, evt, hnd) => wrapper.querySelector(sel)?.addEventListener(evt, hnd);
        
        addListener('.close-button', 'click', () => selectVehicle(null));
        addListener('.btn-remove-vehicle', 'click', handleRemoveVehicle);
        addListener('.btn-start', 'click', () => handleVehicleAction('start'));
        addListener('.btn-stop', 'click', () => handleVehicleAction('stop'));
        addListener('.btn-accelerate', 'click', () => handleVehicleAction('accelerate'));
        addListener('.btn-brake', 'click', () => handleVehicleAction('brake'));
        addListener('.btn-toggle-turbo', 'click', () => handleVehicleAction('toggleTurbo'));
        const cargoInput = wrapper.querySelector('.cargo-amount');
        addListener('.btn-load-cargo', 'click', () => handleVehicleAction('loadCargo', [cargoInput?.value]));
        addListener('.btn-unload-cargo', 'click', () => handleVehicleAction('unloadCargo', [cargoInput?.value]));
        addListener('.schedule-maintenance-form', 'submit', handleScheduleMaintenance);
        addListener('.trip-form', 'submit', handleCalculateRouteAndWeather);
        addListener('.btn-fetch-api-details', 'click', handleFetchApiDetails);
        addListener('.btn-edit-api-details', 'click', handleEditApiDetails);
        addListener('.btn-cancel-edit-api-details', 'click', handleCancelEditApiDetails);
        addListener('.api-details-edit-form', 'submit', handleSaveApiDetails);
        wrapper.querySelectorAll('.trip-highlight-controls input').forEach(el => el.addEventListener('change', handleHighlightToggle));
    }

    // --- Iniciar a aplicação ---
    initializeApp();
});