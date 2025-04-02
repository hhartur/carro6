// --- Utility Functions ---
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notificationArea.appendChild(notification);

    // Auto-remove notification after a few seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500); // Remove after fade out
    }, 4000); // Display for 4 seconds
}

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// --- Class Definitions ---

class Maintenance {
    constructor(date, type, cost, description = '') {
        this.id = generateUniqueId(); // Unique ID for each record
        this.date = date; // Should be a Date object or ISO string
        this.type = type;
        this.cost = parseFloat(cost);
        this.description = description;
    }

    format() {
        const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        const formattedDate = new Date(this.date).toLocaleString('pt-BR', dateOptions);
        let formattedString = `${this.type} em ${formattedDate}`;
        if (!isNaN(this.cost) && this.cost > 0) {
            formattedString += ` - R$${this.cost.toFixed(2)}`;
        }
        if (this.description) {
             formattedString += ` (${this.description})`;
        }
        return formattedString;
    }

    isValid() {
        const dateObj = new Date(this.date);
        const isValidDate = dateObj instanceof Date && !isNaN(dateObj);
        const isValidCost = !isNaN(this.cost) && this.cost >= 0;
        const isValidType = typeof this.type === 'string' && this.type.trim() !== '';
        return isValidDate && isValidCost && isValidType;
    }

    // Helper for localStorage (returns plain object)
    toJSON() {
        return {
            id: this.id,
            date: this.date, // Store date as ISO string or timestamp for consistency
            type: this.type,
            cost: this.cost,
            description: this.description
        };
    }

    // Helper for localStorage (creates instance from plain object)
    static fromJSON(json) {
        if (!json) return null;
        const maint = new Maintenance(json.date, json.type, json.cost, json.description);
        maint.id = json.id || generateUniqueId(); // Assign existing or new ID
        return maint;
    }
}

class Vehicle {
    constructor(make, model, year, id = generateUniqueId(), status = 'off', speed = 0, maintenanceHistory = []) {
        this.id = id;
        this.make = make;
        this.model = model;
        this.year = year;
        this.status = status; // 'off', 'on', 'moving'
        this.speed = speed; // Current speed
        this.maintenanceHistory = maintenanceHistory.map(m => Maintenance.fromJSON(m)); // Ensure they are Maintenance instances
        this._type = 'Vehicle'; // For deserialization
    }

    start() {
        if (this.status === 'off') {
            this.status = 'on';
            console.log(`${this.make} ${this.model} ligado.`);
            return true;
        }
        console.log(`${this.make} ${this.model} já está ligado.`);
        return false;
    }

    stop() {
        if (this.status !== 'off') {
            if (this.speed > 0) {
                console.warn(`Não pode desligar ${this.make} ${this.model} em movimento! Freie primeiro.`);
                showNotification(`Freie o ${this.model} antes de desligar!`, 'error');
                return false;
            }
            this.status = 'off';
            this.speed = 0; // Ensure speed is 0 when stopped
            console.log(`${this.make} ${this.model} desligado.`);
            return true;
        }
        console.log(`${this.make} ${this.model} já está desligado.`);
        return false;
    }

    accelerate(amount = 10) {
        if (this.status === 'on' || this.status === 'moving') {
            this.status = 'moving';
            this.speed += amount;
            console.log(`${this.make} ${this.model} acelerando para ${this.speed} km/h.`);
            return true;
        } else {
            console.warn(`Ligue o ${this.make} ${this.model} antes de acelerar.`);
            showNotification(`Ligue o ${this.model} para acelerar.`, 'warning');
            return false;
        }
    }

    brake(amount = 15) {
        if (this.status === 'moving') {
            this.speed -= amount;
            if (this.speed <= 0) {
                this.speed = 0;
                this.status = 'on'; // Stopped but engine still on
                console.log(`${this.make} ${this.model} parou.`);
            } else {
                console.log(`${this.make} ${this.model} freando para ${this.speed} km/h.`);
            }
             return true;
        }
         console.log(`${this.make} ${this.model} não está em movimento para frear.`);
         return false;
    }

    addMaintenance(maintenanceRecord) {
        if (maintenanceRecord instanceof Maintenance && maintenanceRecord.isValid()) {
            this.maintenanceHistory.push(maintenanceRecord);
            // Sort history by date (most recent first)
            this.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log(`Manutenção adicionada para ${this.make} ${this.model}.`);
            return true;
        } else {
            console.error('Registro de manutenção inválido:', maintenanceRecord);
            showNotification('Dados de manutenção inválidos.', 'error');
            return false;
        }
    }

    getFormattedMaintenanceHistory() {
        if (!this.maintenanceHistory || this.maintenanceHistory.length === 0) {
            return ["Nenhum histórico de manutenção registrado."];
        }
        return this.maintenanceHistory.map(maint => maint.format());
    }

    getFutureAppointments() {
        const now = new Date();
        return this.maintenanceHistory
            .filter(maint => new Date(maint.date) > now)
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort upcoming soonest first
    }

    // Prepare for JSON storage
    toJSON() {
        return {
            _type: this._type, // CRUCIAL for knowing which class to recreate
            id: this.id,
            make: this.make,
            model: this.model,
            year: this.year,
            status: this.status,
            speed: this.speed,
            // Convert Maintenance objects back to plain objects for JSON
            maintenanceHistory: this.maintenanceHistory.map(m => m.toJSON())
        };
    }

     // Recreate instance from plain JSON object
    static fromJSON(json) {
         if (!json) return null;
        // Basic Vehicle - subclasses will override this
        const vehicle = new Vehicle(
            json.make,
            json.model,
            json.year,
            json.id,
            json.status,
            json.speed,
            json.maintenanceHistory || [] // Pass plain history objects
        );
        return vehicle;
    }
}

class Car extends Vehicle {
    constructor(make, model, year, id, status, speed, maintenanceHistory) {
        super(make, model, year, id, status, speed, maintenanceHistory);
        this._type = 'Car';
    }

    toJSON() {
        // Start with the base class's JSON representation
        const json = super.toJSON();
        // Add Car-specific properties if any in the future
        // json.numDoors = this.numDoors;
        return json;
    }

     static fromJSON(json) {
         if (!json || json._type !== 'Car') return null;
         const car = new Car(
             json.make,
             json.model,
             json.year,
             json.id,
             json.status,
             json.speed,
             json.maintenanceHistory || []
         );
         // Restore Car-specific properties if any
         // car.numDoors = json.numDoors;
         return car;
    }
}

class SportsCar extends Car {
    constructor(make, model, year, id, status, speed, maintenanceHistory, turboOn = false) {
        super(make, model, year, id, status, speed, maintenanceHistory);
        this.turboOn = turboOn;
        this._type = 'SportsCar';
    }

    toggleTurbo() {
        if (this.status === 'off') {
             showNotification(`Ligue o ${this.model} antes de usar o turbo.`, 'warning');
             return false;
        }
        this.turboOn = !this.turboOn;
        console.log(`${this.make} ${this.model} Turbo: ${this.turboOn ? 'ATIVADO' : 'DESATIVADO'}`);
        showNotification(`Turbo ${this.turboOn ? 'ATIVADO!' : 'DESATIVADO'}.`, 'info');
        return true;
    }

    accelerate(amount = 15) { // Sports car base acceleration is higher
        if (!super.accelerate(0)) return false; // Check if engine is on first

        let effectiveAmount = amount;
        if (this.turboOn) {
            effectiveAmount *= 1.8; // Turbo boost!
            console.log("TURBO BOOST!");
        }
        super.accelerate(effectiveAmount); // Call parent's accelerate with modified amount
        return true;
    }

     toJSON() {
        const json = super.toJSON();
        json.turboOn = this.turboOn; // Add turbo state
        return json;
    }

     static fromJSON(json) {
         if (!json || json._type !== 'SportsCar') return null;
         const sportsCar = new SportsCar(
             json.make,
             json.model,
             json.year,
             json.id,
             json.status,
             json.speed,
             json.maintenanceHistory || [],
             json.turboOn || false // Restore turbo state
         );
         return sportsCar;
    }
}

class Truck extends Vehicle {
    constructor(make, model, year, maxLoad, id, status, speed, maintenanceHistory, currentLoad = 0) {
        super(make, model, year, id, status, speed, maintenanceHistory);
        this.maxLoad = parseInt(maxLoad) || 1000; // Default max load if not provided
        this.currentLoad = parseInt(currentLoad);
        this._type = 'Truck';
    }

    loadCargo(amount) {
         amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) {
             showNotification("Quantidade de carga inválida.", "error");
             return false;
        }
        if (this.currentLoad + amount <= this.maxLoad) {
            this.currentLoad += amount;
            console.log(`${this.make} ${this.model} carregado com ${amount}kg. Carga total: ${this.currentLoad}kg.`);
            showNotification(`+${amount}kg carregado. Total: ${this.currentLoad}kg.`, 'success');
            return true;
        } else {
            console.warn(`${this.make} ${this.model} não pode carregar ${amount}kg. Excede a carga máxima de ${this.maxLoad}kg.`);
            showNotification(`Carga máxima (${this.maxLoad}kg) excedida!`, 'error');
            return false;
        }
    }

    unloadCargo(amount) {
        amount = parseInt(amount);
        if (isNaN(amount) || amount <= 0) {
             showNotification("Quantidade de carga inválida.", "error");
             return false;
        }
        if (amount <= this.currentLoad) {
            this.currentLoad -= amount;
            console.log(`${this.make} ${this.model} descarregado ${amount}kg. Carga restante: ${this.currentLoad}kg.`);
             showNotification(`-${amount}kg descarregado. Restante: ${this.currentLoad}kg.`, 'success');
            return true;
        } else {
            console.warn(`${this.make} ${this.model} não tem ${amount}kg para descarregar. Carga atual: ${this.currentLoad}kg.`);
            showNotification(`Não há ${amount}kg para descarregar.`, 'error');
            return false;
        }
    }

    accelerate(amount = 8) { // Truck base acceleration is lower
         if (!super.accelerate(0)) return false; // Check if engine is on

        // Reduce acceleration based on load (example formula)
        const loadFactor = Math.max(0.2, 1 - (this.currentLoad / (this.maxLoad * 1.5))); // Never less than 20% power
        const effectiveAmount = amount * loadFactor;
        console.log(`Fator de Carga: ${loadFactor.toFixed(2)}`);
        super.accelerate(effectiveAmount);
        return true;
    }

    brake(amount = 10) { // Truck base braking is weaker
        if (this.status !== 'moving') return false;

        // Reduce braking power based on load (example formula)
        const loadFactor = Math.max(0.3, 1 - (this.currentLoad / (this.maxLoad * 2))); // Heavier loads make braking harder
         const effectiveAmount = amount * loadFactor;
         console.log(`Fator de Frenagem: ${loadFactor.toFixed(2)}`);
         super.brake(effectiveAmount);
         return true;
    }

     toJSON() {
        const json = super.toJSON();
        json.maxLoad = this.maxLoad;
        json.currentLoad = this.currentLoad;
        return json;
    }

     static fromJSON(json) {
         if (!json || json._type !== 'Truck') return null;
         const truck = new Truck(
             json.make,
             json.model,
             json.year,
             json.maxLoad,
             json.id,
             json.status,
             json.speed,
             json.maintenanceHistory || [],
             json.currentLoad || 0
         );
         return truck;
    }
}

class Garage {
    constructor() {
        this.vehicles = [];
        this.localStorageKey = 'smartGarageVehicles_v2'; // Use a versioned key
    }

    addVehicle(vehicle) {
        if (vehicle instanceof Vehicle) {
            // Check for duplicates (optional, based on make/model/year or a unique ID)
             if (!this.vehicles.some(v => v.id === vehicle.id)) {
                 this.vehicles.push(vehicle);
                 console.log(`${vehicle._type} ${vehicle.make} ${vehicle.model} adicionado à garagem.`);
                 this.saveToLocalStorage();
                 return true;
             } else {
                 console.warn(`Veículo com ID ${vehicle.id} já existe.`);
                 showNotification('Este veículo já está na garagem.', 'warning');
                 return false;
             }
        } else {
            console.error("Tentativa de adicionar objeto inválido à garagem:", vehicle);
            return false;
        }
    }

    removeVehicle(vehicleId) {
        const index = this.vehicles.findIndex(v => v.id === vehicleId);
        if (index !== -1) {
            const removedVehicle = this.vehicles.splice(index, 1)[0];
            console.log(`${removedVehicle._type} ${removedVehicle.make} removido da garagem.`);
            this.saveToLocalStorage();
            return true;
        }
        console.warn(`Veículo com ID ${vehicleId} não encontrado para remoção.`);
        return false;
    }

    findVehicle(vehicleId) {
        return this.vehicles.find(v => v.id === vehicleId);
    }

    saveToLocalStorage() {
        try {
            // Use the toJSON method we defined on vehicles
            const plainVehicles = this.vehicles.map(vehicle => vehicle.toJSON());
            localStorage.setItem(this.localStorageKey, JSON.stringify(plainVehicles));
            console.log('Garagem salva no LocalStorage.');
        } catch (error) {
            console.error("Erro ao salvar no LocalStorage:", error);
            showNotification('Erro ao salvar dados da garagem.', 'error');
        }
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem(this.localStorageKey);
        if (data) {
            try {
                const plainVehicles = JSON.parse(data);
                this.vehicles = plainVehicles.map(plainVehicle => {
                    // *** The crucial deserialization step ***
                    switch (plainVehicle._type) {
                        case 'Car':       return Car.fromJSON(plainVehicle);
                        case 'SportsCar': return SportsCar.fromJSON(plainVehicle);
                        case 'Truck':     return Truck.fromJSON(plainVehicle);
                        case 'Vehicle':   // Fallback or handle base Vehicle if needed
                        default:          return Vehicle.fromJSON(plainVehicle); // Might return null if unknown
                    }
                }).filter(vehicle => vehicle !== null); // Filter out any nulls from failed deserialization

                console.log('Garagem carregada do LocalStorage.');
            } catch (error) {
                console.error("Erro ao carregar do LocalStorage:", error);
                 showNotification('Erro ao carregar dados salvos. Os dados podem estar corrompidos.', 'error');
                this.vehicles = []; // Reset if loading fails
                localStorage.removeItem(this.localStorageKey); // Clear corrupted data
            }
        } else {
            console.log('Nenhum dado de garagem encontrado no LocalStorage.');
            this.vehicles = [];
        }
    }

     getAllFutureAppointments() {
        let allAppointments = [];
        this.vehicles.forEach(vehicle => {
            const futureMaint = vehicle.getFutureAppointments();
            if (futureMaint.length > 0) {
                allAppointments = allAppointments.concat(
                    futureMaint.map(maint => ({ vehicleInfo: `${vehicle.make} ${vehicle.model}`, maintenance: maint }))
                );
            }
        });
        // Sort all appointments globally by date
        allAppointments.sort((a, b) => new Date(a.maintenance.date) - new Date(b.maintenance.date));
        return allAppointments;
     }
}

// --- DOM Manipulation and Event Handling ---

document.addEventListener('DOMContentLoaded', () => {
    const garage = new Garage();

    // --- Get DOM Elements ---
    const btnRemoveVehicle = document.getElementById('btn-remove-vehicle'); // *** ADD THIS LINE ***
    const addVehicleForm = document.getElementById('add-vehicle-form');
    const vehicleTypeSelect = document.getElementById('vehicle-type');
    const truckSpecificFields = document.getElementById('truck-specific-fields');
    const garageDisplay = document.getElementById('garage-display');
    const selectedVehicleSection = document.getElementById('selected-vehicle-details');
    const vehicleInfoDiv = document.getElementById('vehicle-info');
    const vehicleControlsDiv = document.getElementById('vehicle-controls');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnAccelerate = document.getElementById('btn-accelerate');
    const btnBrake = document.getElementById('btn-brake');
    const btnToggleTurbo = document.getElementById('btn-toggle-turbo');
    const truckLoadControls = document.getElementById('truck-load-controls');
    const btnLoadCargo = document.getElementById('btn-load-cargo');
    const btnUnloadCargo = document.getElementById('btn-unload-cargo');
    const cargoAmountInput = document.getElementById('cargo-amount');
    const statusIndicator = document.getElementById('status-indicator');
    const speedIndicator = document.getElementById('speed-indicator');
    const turboIndicator = document.getElementById('turbo-indicator');
    const loadIndicator = document.getElementById('load-indicator');
    const maintenanceHistoryList = document.getElementById('maintenance-history-list');
    const scheduleMaintenanceForm = document.getElementById('schedule-maintenance-form');
    const selectedVehicleIdInput = document.getElementById('selected-vehicle-id');
    const maintDateInput = document.getElementById('maint-date');
    const futureAppointmentsList = document.getElementById('future-appointments-list');

    let selectedVehicle = null; // Keep track of the currently selected vehicle object

     // Optional: Initialize Flatpickr date/time picker
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#maint-date", {
            enableTime: true,
            dateFormat: "Y-m-d H:i", // Matches datetime-local format and ISO standard
            locale: "pt", // Use Portuguese locale if loaded
            time_24hr: true
        });
    }

    // --- Functions ---

    function renderGarage() {
        garageDisplay.innerHTML = ''; // Clear existing display
        if (garage.vehicles.length === 0) {
            garageDisplay.innerHTML = '<p>A garagem está vazia.</p>';
            return;
        }

        garage.vehicles.forEach(vehicle => {
            const card = document.createElement('div');
            card.className = 'vehicle-card';
            card.dataset.id = vehicle.id; // Store ID for easy lookup

            let specificInfo = '';
            if (vehicle instanceof SportsCar) {
                specificInfo = `<p>Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`;
            } else if (vehicle instanceof Truck) {
                specificInfo = `<p>Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
            }

             const statusIcon = document.createElement('span');
             statusIcon.className = 'status-icon';

            card.innerHTML = `
                <h4>${vehicle.make} ${vehicle.model}</h4>
                <p>${vehicle.year} - ${vehicle._type}</p>
                ${specificInfo}
            `;
            card.appendChild(statusIcon); // Add status icon
             updateVehicleCardStatus(card, vehicle); // Set initial visual status


            card.addEventListener('click', () => {
                selectVehicle(vehicle.id);
            });
            garageDisplay.appendChild(card);
        });
         renderFutureAppointments(); // Update future appointments when garage changes
    }

    function updateVehicleCardStatus(cardElement, vehicle) {
        if (!cardElement || !vehicle) return;

        const statusIcon = cardElement.querySelector('.status-icon');
        cardElement.classList.remove('engine-start', 'accelerating', 'braking', 'turbo-active', 'loading'); // Clear animations
        statusIcon.classList.remove('on', 'off', 'moving');

        switch (vehicle.status) {
            case 'on':
                statusIcon.classList.add('on');
                break;
            case 'moving':
                statusIcon.classList.add('moving');
                break;
            case 'off':
            default:
                statusIcon.classList.add('off');
                break;
        }

         // Update specific info if needed (e.g., load, turbo status) - Optional here, main display is below
         const specificP = cardElement.querySelector('p:last-of-type'); // Assumes specific info is the last p
          if (vehicle instanceof SportsCar && specificP) {
              specificP.textContent = `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`;
              if (vehicle.turboOn) cardElement.classList.add('turbo-active');
          } else if (vehicle instanceof Truck && specificP) {
               specificP.textContent = `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`;
          }
    }

    function triggerAnimation(vehicleId, animationClass) {
        const card = garageDisplay.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
        if (card) {
            card.classList.add(animationClass);
            // Remove the class after animation ends to allow re-triggering
            setTimeout(() => card.classList.remove(animationClass), 500); // Match animation duration
        }
    }

    function selectVehicle(vehicleId) {
        selectedVehicle = garage.findVehicle(vehicleId);

        // Remove 'selected' class from all cards
        document.querySelectorAll('.vehicle-card').forEach(card => card.classList.remove('selected'));

        if (selectedVehicle) {
            selectedVehicleSection.style.display = 'block';
            selectedVehicleIdInput.value = selectedVehicle.id; // Set hidden input for maintenance form

            // Add 'selected' class to the clicked card
            const selectedCard = garageDisplay.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }

            updateSelectedVehicleDetails();
        } else {
            selectedVehicleSection.style.display = 'none';
            selectedVehicleIdInput.value = '';
            selectedVehicle = null;
        }
    }

    function updateSelectedVehicleDetails() {
        if (!selectedVehicle) {
            selectedVehicleSection.style.display = 'none';
            return;
        }

        selectedVehicleSection.style.display = 'block';

        // Update Info
        vehicleInfoDiv.innerHTML = `
            <strong>ID:</strong> ${selectedVehicle.id}<br>
            <strong>Tipo:</strong> ${selectedVehicle._type}<br>
            <strong>Marca:</strong> ${selectedVehicle.make}<br>
            <strong>Modelo:</strong> ${selectedVehicle.model}<br>
            <strong>Ano:</strong> ${selectedVehicle.year}<br>
        `;

        // Update Status Indicators
        statusIndicator.textContent = `Status: ${selectedVehicle.status}`;
        speedIndicator.textContent = `Velocidade: ${selectedVehicle.speed.toFixed(0)} km/h`; // Show integer speed

        // Update Controls Visibility and State
        btnToggleTurbo.style.display = (selectedVehicle instanceof SportsCar) ? 'inline-block' : 'none';
        truckLoadControls.style.display = (selectedVehicle instanceof Truck) ? 'inline-block' : 'none';

        if (selectedVehicle instanceof SportsCar) {
            turboIndicator.style.display = 'block';
            turboIndicator.textContent = `Turbo: ${selectedVehicle.turboOn ? 'ATIVADO' : 'OFF'}`;
             btnToggleTurbo.classList.toggle('active', selectedVehicle.turboOn);
             btnToggleTurbo.textContent = selectedVehicle.turboOn ? 'Desligar Turbo' : 'Ligar Turbo';
        } else {
             turboIndicator.style.display = 'none';
        }

        if (selectedVehicle instanceof Truck) {
            loadIndicator.style.display = 'block';
            loadIndicator.textContent = `Carga: ${selectedVehicle.currentLoad} / ${selectedVehicle.maxLoad} kg`;
        } else {
             loadIndicator.style.display = 'none';
        }

        // Update Maintenance History
        renderMaintenanceHistory();

        // Update status on the card in the garage view as well
        const card = garageDisplay.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`);
        if (card) {
             updateVehicleCardStatus(card, selectedVehicle);
        }
    }

    function renderMaintenanceHistory() {
        maintenanceHistoryList.innerHTML = ''; // Clear list
        if (!selectedVehicle) return;

        const history = selectedVehicle.getFormattedMaintenanceHistory();
        if (history.length === 0 || history[0].startsWith("Nenhum")) {
            maintenanceHistoryList.innerHTML = '<li>Nenhum histórico de manutenção.</li>';
        } else {
            history.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                maintenanceHistoryList.appendChild(li);
            });
        }
         renderFutureAppointments(); // Update global list too
    }

     function renderFutureAppointments() {
        futureAppointmentsList.innerHTML = ''; // Clear the list
        const appointments = garage.getAllFutureAppointments();

         if (appointments.length === 0) {
            futureAppointmentsList.innerHTML = '<li>Nenhum agendamento futuro.</li>';
             return;
         }

        appointments.forEach(app => {
             const li = document.createElement('li');
             li.innerHTML = `<strong>${app.vehicleInfo}:</strong> ${app.maintenance.format()}`;
             // Optional: Add click to select the vehicle
             li.style.cursor = 'pointer';
             li.title = `Clique para ver ${app.vehicleInfo}`;
             li.addEventListener('click', () => {
                const vehicle = garage.findVehicle(app.maintenance.id ? garage.vehicles.find(v => v.maintenanceHistory.some(m=> m.id === app.maintenance.id))?.id : null ); // Bit complex to find vehicle by maintenance ID, easier to store vehicle ID on click or find by info
                // Simpler: Find by make/model if unique enough for this example
                const targetVehicle = garage.vehicles.find(v => `${v.make} ${v.model}` === app.vehicleInfo);
                if(targetVehicle) {
                    selectVehicle(targetVehicle.id);
                    // Scroll to the details section (optional)
                    selectedVehicleSection.scrollIntoView({ behavior: 'smooth' });
                }

             });
             futureAppointmentsList.appendChild(li);
        });

         // Simple reminder for the next appointment (can be expanded)
         const now = new Date();
         const nextAppointment = appointments[0]; // They are sorted
         if (nextAppointment) {
             const timeDiff = new Date(nextAppointment.maintenance.date) - now;
             const daysUntil = timeDiff / (1000 * 60 * 60 * 24);
             if (daysUntil < 2 && daysUntil >= 0) { // Within next 48 hours
                 showNotification(`Lembrete: ${nextAppointment.vehicleInfo} - ${nextAppointment.maintenance.type} agendado para breve!`, 'info');
             }
         }
     }

    // --- Event Listeners ---

    // Show/Hide Truck fields based on selected type
    vehicleTypeSelect.addEventListener('change', (e) => {
        truckSpecificFields.style.display = (e.target.value === 'Truck') ? 'block' : 'none';
    });

    // Add Vehicle Form Submission
    addVehicleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('vehicle-type').value;
        const make = document.getElementById('vehicle-make').value.trim();
        const model = document.getElementById('vehicle-model').value.trim();
        const year = document.getElementById('vehicle-year').value;
        const maxLoad = document.getElementById('truck-max-load').value;

        if (!make || !model || !year) {
             showNotification('Por favor, preencha Marca, Modelo e Ano.', 'error');
             return;
        }

        let newVehicle;
        const id = generateUniqueId(); // Generate ID before creating instance

        try {
             switch (type) {
                 case 'Car':
                     newVehicle = new Car(make, model, year, id);
                     break;
                 case 'SportsCar':
                     newVehicle = new SportsCar(make, model, year, id);
                     break;
                 case 'Truck':
                     if (!maxLoad || parseInt(maxLoad) <= 0) {
                         showNotification('Por favor, insira uma Carga Máxima válida para o Caminhão.', 'error');
                         return;
                     }
                     newVehicle = new Truck(make, model, year, maxLoad, id);
                     break;
                 default:
                     showNotification('Tipo de veículo inválido.', 'error');
                     return;
             }

             if (garage.addVehicle(newVehicle)) {
                 renderGarage();
                 addVehicleForm.reset(); // Clear form
                 truckSpecificFields.style.display = 'none'; // Hide truck fields again
                 showNotification(`${type} ${make} ${model} adicionado com sucesso!`, 'success');
             }
        } catch (error) {
             console.error("Erro ao criar veículo:", error);
             showNotification('Erro ao criar veículo. Verifique os dados.', 'error');
        }
    });

    // Vehicle Control Buttons
    btnStart.addEventListener('click', () => {
        if (selectedVehicle && selectedVehicle.start()) {
             triggerAnimation(selectedVehicle.id, 'engine-start');
            updateSelectedVehicleDetails();
            garage.saveToLocalStorage(); // Save status change
        }
    });

    btnStop.addEventListener('click', () => {
        if (selectedVehicle && selectedVehicle.stop()) {
             updateSelectedVehicleDetails();
             garage.saveToLocalStorage(); // Save status change
        }
    });

    btnAccelerate.addEventListener('click', () => {
        if (selectedVehicle && selectedVehicle.accelerate()) {
             triggerAnimation(selectedVehicle.id, 'accelerating');
             updateSelectedVehicleDetails();
             garage.saveToLocalStorage(); // Save status/speed change
        }
    });

    btnBrake.addEventListener('click', () => {
        if (selectedVehicle && selectedVehicle.brake()) {
            triggerAnimation(selectedVehicle.id, 'braking');
             updateSelectedVehicleDetails();
             garage.saveToLocalStorage(); // Save status/speed change
        }
    });

    btnToggleTurbo.addEventListener('click', () => {
        if (selectedVehicle instanceof SportsCar && selectedVehicle.toggleTurbo()) {
             triggerAnimation(selectedVehicle.id, 'turbo-active'); // Re-apply visual state
            updateSelectedVehicleDetails();
            garage.saveToLocalStorage(); // Save turbo state
        }
    });

    btnLoadCargo.addEventListener('click', () => {
        const amount = cargoAmountInput.value;
        if (selectedVehicle instanceof Truck && selectedVehicle.loadCargo(amount)) {
             triggerAnimation(selectedVehicle.id, 'loading');
             updateSelectedVehicleDetails();
             cargoAmountInput.value = ''; // Clear input
             garage.saveToLocalStorage(); // Save load state
        }
    });

    btnUnloadCargo.addEventListener('click', () => {
        const amount = cargoAmountInput.value;
        if (selectedVehicle instanceof Truck && selectedVehicle.unloadCargo(amount)) {
            triggerAnimation(selectedVehicle.id, 'loading'); // Can use same animation or different one
             updateSelectedVehicleDetails();
             cargoAmountInput.value = ''; // Clear input
             garage.saveToLocalStorage(); // Save load state
        }
    });


     // Schedule Maintenance Form Submission
    scheduleMaintenanceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const vehicleId = selectedVehicleIdInput.value;
        const vehicle = garage.findVehicle(vehicleId);

        if (!vehicle) {
            showNotification('Nenhum veículo selecionado para agendar manutenção.', 'error');
            return;
        }

        const date = maintDateInput.value;
        const type = document.getElementById('maint-type').value.trim();
        const cost = document.getElementById('maint-cost').value;
        const desc = document.getElementById('maint-desc').value.trim();

         // Basic validation before creating Maintenance object
         if (!date || !type || cost === '' || parseFloat(cost) < 0) {
             showNotification('Data, Tipo e Custo (>= 0) são obrigatórios.', 'error');
             return;
         }

         try {
            const newMaintenance = new Maintenance(date, type, cost, desc);

            if (newMaintenance.isValid()) {
                if (vehicle.addMaintenance(newMaintenance)) {
                    renderMaintenanceHistory(); // Update display
                    scheduleMaintenanceForm.reset(); // Clear form
                    garage.saveToLocalStorage(); // Save updated history
                     showNotification(`Manutenção "${type}" ${new Date(date) > new Date() ? 'agendada' : 'registrada'} para ${vehicle.make} ${vehicle.model}.`, 'success');
                }
            } else {
                 showNotification('Dados de manutenção inválidos. Verifique a data e o tipo.', 'error');
            }
         } catch (error) {
              console.error("Erro ao criar/adicionar manutenção:", error);
              showNotification('Erro ao processar manutenção.', 'error');
         }

    });

    btnRemoveVehicle.addEventListener('click', () => {
        if (!selectedVehicle) {
            showNotification("Nenhum veículo selecionado para remover.", "warning");
            return;
        }

        // Confirmation dialog
        if (confirm(`Tem certeza que deseja remover o ${selectedVehicle.make} ${selectedVehicle.model} da garagem? Esta ação não pode ser desfeita.`)) {
            const vehicleIdToRemove = selectedVehicle.id;
            const vehicleMakeModel = `${selectedVehicle.make} ${selectedVehicle.model}`; // Store info before it's potentially cleared

            if (garage.removeVehicle(vehicleIdToRemove)) {
                showNotification(`${vehicleMakeModel} removido com sucesso!`, 'success');
                selectVehicle(null); // Deselect the vehicle (which hides the details pane)
                renderGarage();      // Re-render the garage display without the removed vehicle
                // Note: garage.saveToLocalStorage() is already called inside garage.removeVehicle()
            } else {
                // This case shouldn't normally happen if selectedVehicle is valid, but good to have
                showNotification(`Erro ao tentar remover ${vehicleMakeModel}.`, 'error');
            }
        }
    });


    // --- Initial Load ---
    garage.loadFromLocalStorage();
    renderGarage(); // Display vehicles loaded from storage
     renderFutureAppointments(); // Display any future appointments loaded

}); // End DOMContentLoaded