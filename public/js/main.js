document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init 0.1] DOMContentLoaded. Initializing Smart Garage Nexus v11.0 (Profile & Maint-CRUD)...");

    // --- State & Instance Variables ---
    let garage = new Garage();
    let selectedVehicle = null;
    let currentActiveTab = null;
    let isContentSwapping = false;
    let isPublicGarageView = false;
    
    const OPENWEATHERMAP_ICON_URL_PREFIX = 'https://openweathermap.org/img/wn/';

    // --- UI Element Cache ---
    const getElemById = (id) => document.getElementById(id);
    const mainNav = document.querySelector('.main-nav');
    const navLinks = mainNav?.querySelectorAll('.nav-link[data-tab-target]') ?? [];
    const tabContents = document.querySelectorAll('.tab-content[data-tab-content]');
    const garageDisplay = getElemById('garage-display');
    const publicGarageDisplay = getElemById('public-garage-display');
    const detailsContentArea = getElemById('details-content-area');
    const vehicleDetailsTemplate = getElemById('vehicle-details-template');
    const futureAppointmentsList = getElemById('future-appointments-list');
    const addVehicleForm = getElemById('add-vehicle-form');
    const vehicleTypeSelect = getElemById('vehicle-type');
    const truckSpecificFields = getElemById('truck-specific-fields');
    const profileForm = getElemById('profile-form');
    const maintEditModalBackdrop = getElemById('maintenance-edit-modal-backdrop');
    const maintEditForm = getElemById('maintenance-edit-form');


    // --- Initialization ---
    function initializeApp() {
        console.log("[Init 1.0] === Starting initializeApp ===");
        setupEventListeners();
        initAuth(); // from auth.js

        const userInfo = getUserInfo();
        if (userInfo && userInfo.token) {
            loadInitialData();
        } else {
            console.log("[Init 1.2] No user token found. Setting public view.");
            navLinks.forEach(link => {
                if (link.dataset.protected === 'true') {
                    link.setAttribute('disabled', 'true');
                    link.style.cursor = 'not-allowed';
                    link.style.opacity = '0.5';
                }
            });
            const initialTab = getTabFromHash() === 'public-garage' ? 'public-garage' : 'dashboard';
            setActiveTab(initialTab, true);
        }
    }
    
    async function loadInitialData() {
        console.log("[Init 1.4] User authenticated. Loading initial data from API...");
        const loadSuccess = await garage.loadFromAPI();
        if (!loadSuccess) {
            showNotification("Falha ao carregar dados da garagem. Tente recarregar a página.", "error", 10000);
        }
        
        console.log(`[Init 1.7] ${garage.vehicles.length} user vehicles loaded.`);
        const initialTab = getTabFromHash() || 'dashboard';
        setActiveTab(initialTab, true);
        
        console.log("[Init 1.10] Performing initial rendering...");
        renderGarageList();
        updateAllRelevantData();
        renderDetailsAreaContent(null);

        console.log("[Init COMPLETE] === Smart Garage Nexus initialization finished ===");
    }
    
    function setupEventListeners() {
        mainNav?.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link[data-tab-target]');
            if (link) { 
                e.preventDefault();
                if (link.hasAttribute('disabled')) {
                    showNotification('Você precisa fazer login para acessar esta área.', 'warning');
                    return;
                }
                setActiveTab(link.dataset.tabTarget); 
            }
        });
        vehicleTypeSelect?.addEventListener('change', (e) => {
            const showTruck = e.target.value === 'Truck';
            truckSpecificFields?.classList.toggle('visible', showTruck);
            getElemById('truck-max-load').required = showTruck;
        });
        addVehicleForm?.addEventListener('submit', handleAddVehicle);
        profileForm?.addEventListener('submit', handleProfileUpdate);
        window.addEventListener('hashchange', handleHashChange);
        
        maintEditModalBackdrop?.addEventListener('click', (e) => {
            if (e.target === maintEditModalBackdrop) {
                closeMaintenanceEditModal();
            }
        });
        maintEditForm?.addEventListener('submit', handleUpdateMaintenance);
        getElemById('cancel-edit-maint')?.addEventListener('click', closeMaintenanceEditModal);
    }

    async function handleAddVehicle(event) {
        event.preventDefault();
        const type = vehicleTypeSelect.value;
        const make = addVehicleForm.querySelector('#vehicle-make')?.value.trim();
        const model = addVehicleForm.querySelector('#vehicle-model')?.value.trim();
        const year = addVehicleForm.querySelector('#vehicle-year')?.value;
        const maxLoad = addVehicleForm.querySelector('#truck-max-load')?.value;
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
    
    async function handleProfileUpdate(event) {
        event.preventDefault();
        const usernameInput = getElemById('profile-username');
        const newUsername = usernameInput.value.trim();
        const button = profileForm.querySelector('.btn-submit');
        
        if (!newUsername) {
            showNotification('O nome de usuário não pode estar vazio.', 'warning');
            return;
        }

        setLoadingState(button, true, 'Salvando...');

        try {
            const updatedUser = await apiUpdateUserProfile({ username: newUsername });
            
            const userInfo = getUserInfo();
            userInfo.username = updatedUser.username;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            document.querySelector('#user-display .username').textContent = updatedUser.username;
            usernameInput.value = updatedUser.username;
            
            showNotification('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            showNotification(`Erro ao atualizar perfil: ${error.message}`, 'error');
        } finally {
            setLoadingState(button, false, 'Salvar Alterações');
        }
    }

    function handleRemoveVehicle() {
        if (!selectedVehicle || isPublicGarageView) return;
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
        if (!selectedVehicle || isPublicGarageView) return;
        
        const originalState = selectedVehicle.toJSON();
        const actionResult = selectedVehicle[action](...args);
        if (!actionResult) return;

        const wrapper = getCurrentDetailsWrapper();
        if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle, false);
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
            const index = garage.vehicles.findIndex(v => v.id === originalState.id);
            if (index > -1) garage.vehicles[index] = selectedVehicle;
            
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle, false);
            updateVehicleCardStatus(garageDisplay.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
        }
    }

    async function handleScheduleMaintenance(event) {
        event.preventDefault();
        if (!selectedVehicle || isPublicGarageView) return;

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
            populateDetailsPanelContent(getCurrentDetailsWrapper(), selectedVehicle, false);
            showNotification(`Manutenção "${typeVal}" registrada.`, 'success');
            updateAllRelevantData();
        } catch (error) {
            console.error("[Event ScheduleMaint] Error:", error);
            showNotification(`Erro ao registrar manutenção: ${error.message}`, 'error');
        }
    }
    
    function handleDeleteMaintenance(maintId) {
        if (!selectedVehicle || !maintId) return;

        const maintenance = selectedVehicle.maintenanceHistory.find(m => m.id === maintId);
        if (!maintenance) return;

        showConfirmation(`Excluir o registro "${maintenance.type}"?`, async () => {
            try {
                await apiDeleteMaintenance(selectedVehicle.id, maintId);
                const vIndex = garage.vehicles.findIndex(v => v.id === selectedVehicle.id);
                if (vIndex > -1) {
                    const mIndex = garage.vehicles[vIndex].maintenanceHistory.findIndex(m => m.id === maintId);
                    if (mIndex > -1) {
                        garage.vehicles[vIndex].maintenanceHistory.splice(mIndex, 1);
                    }
                }
                showNotification('Registro de manutenção excluído.', 'info');
                populateDetailsPanelContent(getCurrentDetailsWrapper(), selectedVehicle, false);
                updateAllRelevantData();
            } catch (error) {
                 showNotification(`Erro ao excluir: ${error.message}`, 'error');
            }
        });
    }

    function openMaintenanceEditModal(maintId) {
        if (!maintEditModalBackdrop || !maintEditForm) return;

        const maintenance = selectedVehicle.maintenanceHistory.find(m => m.id === maintId);
        if (!maintenance) return;

        maintEditForm.querySelector('#edit-maint-id').value = maintenance.id;
        const dateForInput = new Date(maintenance.date.getTime() - (maintenance.date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        maintEditForm.querySelector('#edit-maint-date').value = dateForInput;
        maintEditForm.querySelector('#edit-maint-type').value = maintenance.type;
        maintEditForm.querySelector('#edit-maint-cost').value = maintenance.cost;
        maintEditForm.querySelector('#edit-maint-desc').value = maintenance.description;

        maintEditModalBackdrop.style.display = 'flex';
        requestAnimationFrame(() => maintEditModalBackdrop.classList.add('visible'));
    }

    function closeMaintenanceEditModal() {
        if (!maintEditModalBackdrop) return;
        maintEditModalBackdrop.classList.remove('visible');
        const onTransitionEnd = () => {
            maintEditModalBackdrop.style.display = 'none';
            maintEditForm.reset();
        };
        maintEditModalBackdrop.addEventListener('transitionend', onTransitionEnd, { once: true });
    }

    async function handleUpdateMaintenance(event) {
        event.preventDefault();
        const maintId = maintEditForm.querySelector('#edit-maint-id').value;
        const updatedData = {
            date: maintEditForm.querySelector('#edit-maint-date').value,
            type: maintEditForm.querySelector('#edit-maint-type').value,
            cost: parseFloat(maintEditForm.querySelector('#edit-maint-cost').value),
            description: maintEditForm.querySelector('#edit-maint-desc').value,
        };

        try {
            await apiUpdateMaintenance(selectedVehicle.id, maintId, updatedData);
            
            const vIndex = garage.vehicles.findIndex(v => v.id === selectedVehicle.id);
            if (vIndex > -1) {
                const mIndex = garage.vehicles[vIndex].maintenanceHistory.findIndex(m => m.id === maintId);
                if (mIndex > -1) {
                    garage.vehicles[vIndex].maintenanceHistory[mIndex] = Maintenance.fromJSON({ ...updatedData, id: maintId });
                    garage.vehicles[vIndex].sortMaintenanceHistory();
                }
            }

            closeMaintenanceEditModal();
            showNotification('Manutenção atualizada!', 'success');
            populateDetailsPanelContent(getCurrentDetailsWrapper(), selectedVehicle, false);
            updateAllRelevantData();

        } catch (error) {
            showNotification(`Erro ao atualizar: ${error.message}`, 'error');
        }
    }


    async function handleTogglePrivacy(event) {
        if (!selectedVehicle || isPublicGarageView) return;
        const checkbox = event.target;
        const isChecked = checkbox.checked;
        const statusSpan = checkbox.closest('.privacy-control').querySelector('.privacy-status');
        const card = garageDisplay.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`);

        checkbox.disabled = true;

        try {
            const result = await apiToggleVehiclePrivacy(selectedVehicle.id, isChecked);
            selectedVehicle.isPublic = result.isPublic;
            statusSpan.textContent = result.isPublic ? 'Público' : 'Privado';
            if (card) {
                const privacyIcon = card.querySelector('.privacy-icon');
                if (privacyIcon) privacyIcon.textContent = result.isPublic ? '🌍' : '🔒';
            }
            showNotification(`Visibilidade de ${selectedVehicle.model} alterada para ${result.isPublic ? 'Público' : 'Privado'}.`, 'success');
        } catch (error) {
            showNotification(`Erro ao alterar visibilidade: ${error.message}`, 'error');
            checkbox.checked = !isChecked;
        } finally {
            checkbox.disabled = false;
        }
    }
    
    function getCurrentDetailsWrapper() { return detailsContentArea?.querySelector('.vehicle-details-content-wrapper'); }

    function setActiveTab(tabId, isInitialLoad = false) {
        if (!tabId || (tabId === currentActiveTab && !isInitialLoad) || isContentSwapping) return;
        
        if (selectedVehicle) selectVehicle(null);

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
    
    async function triggerRenderForTab(tabId, skipAnimation = false) {
        const tabElement = getElemById(`tab-${tabId}`);
        if (!tabElement) return;
        const sections = tabElement.querySelectorAll('.card-section:not(.sticky-details), .stat-card');
        applyStaggeredAnimation(sections, 'visible', 0.08, skipAnimation);
        
        switch (tabId) {
            case 'dashboard': renderDashboard(); break;
            case 'garage': renderFutureAppointmentsList(); break;
            case 'public-garage': await renderPublicGarageList(); break;
            case 'stats': renderStats(); break;
            case 'profile': 
                const userInfo = getUserInfo();
                if (profileForm && userInfo) {
                    profileForm.querySelector('#profile-email').value = userInfo.email;
                    profileForm.querySelector('#profile-username').value = userInfo.username;
                }
                break;
        }
    }

    function applyStaggeredAnimation(elements, triggerClass, baseDelay = 0.06, skip = false) {
        elements.forEach((el, index) => {
            el.style.transitionDelay = skip ? '0s' : `${index * baseDelay}s`;
            requestAnimationFrame(() => {
                el.classList.add(triggerClass);
                const cleanup = () => el.style.transitionDelay = '';
                el.addEventListener('transitionend', cleanup, { once: true });
                setTimeout(cleanup, 1200 + (index * baseDelay * 1000));
            });
        });
    }

    function updateAllRelevantData() {
        renderDashboard();
        renderStats();
        renderFutureAppointmentsList();
    }

    function renderDashboard() {
        if (!garage || !getUserInfo()) {
            updateStatElement("totalVehicles", '-');
            updateStatElement("vehicleTypes", 'Faça login para ver');
            updateStatElement("typeDetails", '');
            updateStatElement("nextAppointment", 'N/A');
            updateStatElement("appointmentDetails", '');
            updateStatElement("totalMaintCostDash", 'R$ --,--');
            return;
        };
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
    }

    function renderStats() {
        if (!garage || !getUserInfo()) {
            updateStatElement("totalCost", 'R$ --,--');
            updateStatElement("avgCost", 'R$ --,--');
            updateStatElement("mostExpensiveVehicle", 'N/A');
            document.querySelector('[data-stat="mostExpensiveCost"]').textContent = '';
            updateTypeDistributionChart({ Car: 0, SportsCar: 0, Truck: 0 });
            return;
        };
        const numVehicles = garage.vehicles.length;
        const totalCost = calculateTotalMaintenanceCost();
        const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;
        const vehicleCosts = calculateMaintenanceCostPerVehicle();
        const typeCounts = countVehicleTypes();
        let mostExpensiveInfo = { name: 'N/A', cost: -1 };
        if (numVehicles > 0) {
             const mostExpensive = Object.values(vehicleCosts).sort((a,b) => b.cost - a.cost)[0];
             if(mostExpensive && mostExpensive.cost > 0) mostExpensiveInfo = mostExpensive;
        }
        updateStatElement("totalCost", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        updateStatElement("avgCost", avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        updateStatElement("mostExpensiveVehicle", mostExpensiveInfo.name);
        const costDetailEl = document.querySelector('[data-stat="mostExpensiveCost"]');
        if (costDetailEl) costDetailEl.textContent = mostExpensiveInfo.cost >= 0 ? `(${mostExpensiveInfo.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` : '';
        updateTypeDistributionChart(typeCounts);
    }
    
    function calculateTotalMaintenanceCost() { return garage.vehicles.reduce((sum, v) => sum + v.maintenanceHistory.reduce((mSum, m) => mSum + (m.cost || 0), 0), 0); }
    function calculateMaintenanceCostPerVehicle() { const costs = {}; garage.vehicles.forEach(v => { costs[v.id] = { name: `${v.make} ${v.model}`, cost: v.maintenanceHistory.reduce((mSum, m) => mSum + (m.cost || 0), 0) }; }); return costs; }
    function countVehicleTypes() { const counts = { Car: 0, SportsCar: 0, Truck: 0 }; garage.vehicles.forEach(v => { if (counts.hasOwnProperty(v._type)) counts[v._type]++; }); return counts; }
    function updateStatElement(statName, value) { document.querySelectorAll(`[data-stat="${statName}"]`).forEach(el => el.textContent = value != null ? String(value) : '-'); }
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

    function renderGarageList() { renderVehicleList(garage.vehicles, garageDisplay, false); }
    async function renderPublicGarageList() { publicGarageDisplay.innerHTML = '<p class="placeholder-text">Carregando...</p>'; await garage.loadPublicVehicles(); renderVehicleList(garage.publicVehicles, publicGarageDisplay, true); }

    function renderVehicleList(vehicleList, displayElement, isPublic) {
        displayElement.innerHTML = '';
        if (vehicleList.length === 0) {
            displayElement.innerHTML = `<p class="placeholder-text">${isPublic ? 'Nenhum veículo público no momento.' : 'Sua garagem está vazia.'}</p>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        vehicleList.forEach(v => {
            const card = createVehicleCard(v, isPublic);
            if (selectedVehicle?.id === v.id) card.classList.add('selected');
            fragment.appendChild(card);
        });
        displayElement.appendChild(fragment);
        applyStaggeredAnimation(displayElement.querySelectorAll('.vehicle-card'), 'animate-in', 0.05, false);
    }

    function createVehicleCard(vehicle, isPublic) {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.dataset.id = vehicle.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        
        const ownerInfo = isPublic ? `<p class="owner-info">Dono: ${vehicle.owner?.username || 'Anônimo'}</p>` : '';
        const privacyIcon = !isPublic ? `<span class="privacy-icon">${vehicle.isPublic ? '🌍' : '🔒'}</span>` : '';

        card.innerHTML = `<h4>${vehicle.make} ${vehicle.model}</h4><p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}</p>${ownerInfo}<div class="card-specific-info"></div><div class="card-footer"><span class="status-icon"></span>${privacyIcon}</div>`;
        
        updateVehicleCardStatus(card, vehicle);
        card.addEventListener('click', () => selectVehicle(vehicle.id, isPublic));
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
        const specificInfo = card.querySelector('.card-specific-info');
        if (vehicle instanceof SportsCar) {
            specificInfo.innerHTML = `<p class="info-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`;
            if (vehicle.turboOn) card.classList.add('pulse-turbo');
        } else if (vehicle instanceof Truck) {
            specificInfo.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
            if (vehicle.currentLoad > 0) card.classList.add('pulse-load');
        } else {
            specificInfo.innerHTML = '';
        }
    }

    function selectVehicle(vehicleId, isPublic = false) {
        document.querySelectorAll('.vehicle-card.selected').forEach(c => c.classList.remove('selected'));
        
        isPublicGarageView = isPublic;

        if (vehicleId) {
            selectedVehicle = garage.findVehicle(vehicleId, isPublic);
            const display = isPublic ? publicGarageDisplay : garageDisplay;
            display.querySelector(`.vehicle-card[data-id="${vehicleId}"]`)?.classList.add('selected');
        } else {
            selectedVehicle = null;
        }
        renderDetailsAreaContent(selectedVehicle, isPublic);
    }

    async function renderDetailsAreaContent(vehicle, isPublic) {
        isContentSwapping = true;
        detailsContentArea.innerHTML = '';
        if (vehicle) {
            const detailsWrapper = vehicleDetailsTemplate.content.firstElementChild.cloneNode(true);
            populateDetailsPanelContent(detailsWrapper, vehicle, isPublic);
            detailsContentArea.appendChild(detailsWrapper);
            if (!isPublic) {
                setupDetailsPanelEventListeners(detailsWrapper);
            }

                        const checkbox = document.getElementById("privacy-toggle")
            const result = await getVehiclePrivacy(vehicleId)
            if(!result.isPublic){
                checkbox.checked = false
            } else{
                checkbox.checked = result.isPublic
            }
        } else {
            detailsContentArea.innerHTML = `<div class="details-placeholder-content"><span class="placeholder-icon" aria-hidden="true">👈</span><p>Selecione um veículo para ver os detalhes.</p></div>`;
        }
        setTimeout(() => { isContentSwapping = false; }, 50);
    }

    function populateDetailsPanelContent(wrapper, vehicle, isPublic) {
        const setTxt = (selector, text) => { const el = wrapper.querySelector(selector); if (el) el.textContent = text; };
        const setHTML = (selector, html) => { const el = wrapper.querySelector(selector); if (el) el.innerHTML = html; };
        const setDisp = (selector, display) => { const el = wrapper.querySelector(selector); if (el) el.style.display = display; };
        const setDisab = (selector, isDisabled) => { const el = wrapper.querySelector(selector); if (el) el.disabled = isDisabled; };

        setTxt('.details-title', `${vehicle.make} ${vehicle.model}`);
        let infoHTML = `<strong>Ano:</strong> ${vehicle.year}<br><strong>Tipo:</strong> ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}`;
        if (isPublic) {
            infoHTML += `<br><strong>Dono:</strong> ${vehicle.owner?.username || 'Anônimo'}`;
        } else {
            infoHTML += `<br><strong title="ID: ${vehicle.id}">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>`;
        }
        setHTML('.vehicle-info', infoHTML);
        
        const interactiveSelectors = ['.vehicle-controls', '.truck-load-controls', '.settings-section', '.maintenance-area', '.btn-remove-vehicle', '.trip-planner-section', '.api-details-section'];
        interactiveSelectors.forEach(sel => {
            const el = wrapper.querySelector(sel);
            if (el) el.style.display = isPublic ? 'none' : '';
        });

        setHTML('.vehicle-status-indicators', `
            <span class="status-tag status-indicator">Status: ${vehicle.status}</span>
            <span class="status-tag speed-indicator">Veloc: ${vehicle.speed.toFixed(0)} km/h</span>
            ${vehicle instanceof SportsCar ? `<span class="status-tag turbo-indicator status-tag-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</span>` : ''}
            ${vehicle instanceof Truck ? `<span class="status-tag load-indicator status-tag-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</span>` : ''}
        `);
        
        if (!isPublic) {
            const privacyToggle = wrapper.querySelector('.privacy-toggle-checkbox');
            const privacyStatus = wrapper.querySelector('.privacy-status');
            privacyToggle.checked = vehicle.isPublic;
            privacyStatus.textContent = vehicle.isPublic ? 'Público' : 'Privado';

            setDisp('.btn-toggle-turbo', vehicle instanceof SportsCar ? 'inline-flex' : 'none');
            setDisp('.truck-load-controls', vehicle instanceof Truck ? 'flex' : 'none');
            
            setDisab('.btn-start', vehicle.status !== 'off');
            setDisab('.btn-stop', vehicle.status === 'off' || vehicle.speed > 0);
            setDisab('.btn-accelerate', vehicle.status === 'off');
            setDisab('.btn-brake', vehicle.status !== 'moving');
            
            populateApiDetailsView(wrapper, vehicle);
            renderMaintenanceHistory(wrapper.querySelector('.maintenance-list'), vehicle);
        }
    }

    function renderMaintenanceHistory(listElement, vehicle) {
        listElement.innerHTML = '';
        if (!vehicle.maintenanceHistory || vehicle.maintenanceHistory.length === 0) {
            listElement.innerHTML = '<li class="placeholder-text">Nenhum histórico.</li>';
            return;
        }
        vehicle.maintenanceHistory.forEach(m => {
            const li = document.createElement('li');
            li.dataset.maintId = m.id;
            li.innerHTML = `
                <span class="maint-info">${m.format()}</span>
                <div class="maint-actions">
                    <button class="btn-edit-maint" title="Editar">✏️</button>
                    <button class="btn-delete-maint" title="Excluir">🗑️</button>
                </div>
            `;
            li.querySelector('.btn-edit-maint').addEventListener('click', () => openMaintenanceEditModal(m.id));
            li.querySelector('.btn-delete-maint').addEventListener('click', () => handleDeleteMaintenance(m.id));
            listElement.appendChild(li);
        });
    }

    function renderFutureAppointmentsList() {
        if (!futureAppointmentsList) return;
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

    function setupDetailsPanelEventListeners(wrapper) {
        const addListener = (sel, evt, hnd) => wrapper.querySelector(sel)?.addEventListener(evt, hnd);
        
        addListener('.close-button', 'click', () => selectVehicle(null));
        addListener('.btn-remove-vehicle', 'click', handleRemoveVehicle);
        addListener('.privacy-toggle-checkbox', 'change', handleTogglePrivacy);

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
        
        wrapper.querySelectorAll('.trip-highlight-controls input').forEach(el => el.addEventListener('change', handleHighlightToggle));
        
        // Listeners for API Details Section
        addListener('.btn-fetch-api-details', 'click', () => toggleApiDetailsView(wrapper, true));
        addListener('.btn-edit-api-details', 'click', () => toggleApiDetailsEditMode(wrapper, true));
        addListener('.btn-cancel-edit-api-details', 'click', () => toggleApiDetailsEditMode(wrapper, false));
        addListener('.api-details-edit-form', 'submit', handleSaveApiDetails);
    }
    
    // --- API DETAILS LOGIC ---
    function toggleApiDetailsView(wrapper, show) {
        const view = wrapper.querySelector('.api-details-content-view');
        const button = wrapper.querySelector('.btn-fetch-api-details');
        if (show) {
            view.style.display = 'block';
            button.style.display = 'none';
            wrapper.querySelector('.btn-edit-api-details').style.display = 'inline-flex';
        }
    }

    function toggleApiDetailsEditMode(wrapper, isEditing) {
        wrapper.querySelector('.api-details-content-view').style.display = isEditing ? 'none' : 'block';
        wrapper.querySelector('.api-details-edit-form').style.display = isEditing ? 'block' : 'none';
        wrapper.querySelector('.btn-edit-api-details').style.display = isEditing ? 'none' : 'inline-flex';
    }

    function populateApiDetailsView(wrapper, vehicle) {
        const fipeValue = vehicle.valorFipeEstimado ? vehicle.valorFipeEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado';
        const recallStatus = `<span class="status-${vehicle.recallPendente}">${vehicle.recallPendente ? 'Sim' : 'Não'}</span>`;
        const revisionKm = vehicle.ultimaRevisaoRecomendadaKm ? `${vehicle.ultimaRevisaoRecomendadaKm.toLocaleString('pt-BR')} km` : 'Não informado';
        const tip = vehicle.dicaManutencao || '';

        const contentView = wrapper.querySelector('.api-details-content');
        contentView.innerHTML = `
            <div class="api-details-grid">
                <div class="api-detail-item"><strong>Valor FIPE (Est.):</strong> <span>${fipeValue}</span></div>
                <div class="api-detail-item"><strong>Recall Pendente:</strong> ${recallStatus}</div>
                <div class="api-detail-item"><strong>Próxima Revisão (km):</strong> <span>${revisionKm}</span></div>
            </div>
        `;

        const tipSection = wrapper.querySelector('.maintenance-tip-section');
        const tipContent = wrapper.querySelector('.maintenance-tip-content');
        if (tip) {
            tipContent.textContent = tip;
            tipSection.style.display = 'block';
        } else {
            tipSection.style.display = 'none';
        }
        
        // Populate edit form as well
        const editForm = wrapper.querySelector('.api-details-edit-form');
        editForm.querySelector('.edit-fipe-value').value = vehicle.valorFipeEstimado || '';
        editForm.querySelector('.edit-revision-km').value = vehicle.ultimaRevisaoRecomendadaKm || '';
        editForm.querySelector('.edit-recall-status').value = vehicle.recallPendente ? 'true' : 'false';
        editForm.querySelector('.edit-maintenance-tip').value = vehicle.dicaManutencao || '';
    }

    async function handleSaveApiDetails(event) {
        event.preventDefault();
        if (!selectedVehicle) return;

        const wrapper = getCurrentDetailsWrapper();
        const form = wrapper.querySelector('.api-details-edit-form');
        const button = form.querySelector('.btn-save-api-details');

        const updatedData = {
            valorFipeEstimado: parseFloat(form.querySelector('.edit-fipe-value').value) || null,
            ultimaRevisaoRecomendadaKm: parseInt(form.querySelector('.edit-revision-km').value) || null,
            recallPendente: form.querySelector('.edit-recall-status').value === 'true',
            dicaManutencao: form.querySelector('.edit-maintenance-tip').value.trim()
        };

        setLoadingState(button, true, 'Salvando...');
        try {
            // Merge new data with existing vehicle data before sending
            const vehiclePayload = { ...selectedVehicle.toJSON(), ...updatedData };
            const savedVehicle = await apiUpdateVehicle(selectedVehicle.id, vehiclePayload);
            
            // Update local state
            const index = garage.vehicles.findIndex(v => v.id === savedVehicle.id);
            if(index > -1) {
                garage.vehicles[index] = reconstructVehicle(savedVehicle);
                selectedVehicle = garage.vehicles[index];
            }

            populateApiDetailsView(wrapper, selectedVehicle);
            toggleApiDetailsEditMode(wrapper, false);
            showNotification('Dados adicionais salvos com sucesso!', 'success');
        } catch (error) {
            showNotification(`Erro ao salvar dados: ${error.message}`, 'error');
        } finally {
            setLoadingState(button, false, 'Salvar');
        }
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

    function setLoadingState(button, isLoading, loadingText) {
        if (!button) return;
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        if (!button.dataset.originalText) {
            button.dataset.originalText = btnText.textContent;
        }
        button.disabled = isLoading;
        if(btnText) btnText.textContent = isLoading ? loadingText : button.dataset.originalText;
        if(spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
    }

    const returnHomeButton = document.querySelectorAll(".return-home");

    returnHomeButton.forEach((btn) => {
        btn.addEventListener("click", () => {
            document.location.href = "/";
        });
    });

    initializeApp();
});