// --- START OF FILE main.js ---

// --- Smart Garage Nexus - Main Application Logic JS v6.0 (API Integration) ---

/**
 * @file main.js
 * @description Core logic for Smart Garage Nexus. Handles UI, events, state, models, and simulated API calls.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init 0.1] DOMContentLoaded event fired. Initializing Smart Garage Nexus v6.0 (API Integration)...");

    // --- State & Instance Variables ---
    let garage = null;
    let selectedVehicle = null;
    let currentActiveTab = 'dashboard';
    // let engineInterval = null; // Engine sound/visualizer logic can be added back if needed
    let isContentSwapping = false; // Flag to prevent race conditions during details panel updates

    // --- UI Element Cache ---
    console.log("[Init 0.2] Caching DOM Elements...");
    const getElem = (selector, required = true) => {
        const elem = document.querySelector(selector);
        if (!elem && required) {
            console.error(`[Init] CRITICAL: Required element "${selector}" not found!`);
        } else if (!elem) {
            console.warn(`[Init] Optional element "${selector}" not found.`);
        }
        return elem;
    };
    const getElemById = (id, required = true) => {
        const elem = document.getElementById(id);
        if (!elem && required) {
            console.error(`[Init] CRITICAL: Required element "#${id}" not found!`);
        } else if (!elem) {
            console.warn(`[Init] Optional element "#${id}" not found.`);
        }
        return elem;
    };

    const body = document.body;
    const mainNav = getElem('.main-nav');
    const navLinks = mainNav?.querySelectorAll('.nav-link[data-tab-target]') ?? [];
    const tabContents = document.querySelectorAll('.tab-content[data-tab-content]');
    const garageDisplay = getElemById('garage-display');
    const detailsColumn = getElem('.garage-column-details'); // The container column
    const detailsContentArea = getElemById('details-content-area'); // The direct child where content is injected
    const vehicleDetailsTemplate = getElemById('vehicle-details-template');
    const futureAppointmentsList = getElemById('future-appointments-list');
    const addVehicleForm = getElemById('add-vehicle-form');
    const vehicleTypeSelect = getElemById('vehicle-type');
    const truckSpecificFields = getElemById('truck-specific-fields');
    const notificationArea = getElemById('notification-area'); // Ensure this exists for notifications
    console.log("[Init 0.3] Element caching finished.");

    // --- Initialization ---
    /** Initializes the application. @function initializeApp */
    function initializeApp() {
        console.log("[Init 1.0] === Starting initializeApp ===");
        // --- Rigorous Element Check ---
        console.log("[Init 1.1] Verifying essential elements...");
        const requiredElementsCheck = {
            body, mainNav, navLinks: navLinks?.length > 0, tabContents: tabContents?.length > 0,
            garageDisplay, detailsColumn, detailsContentArea, vehicleDetailsTemplate,
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
            return; // Stop initialization
        }
        console.log("[Init 1.3] Essential elements verified.");

        // --- Initialize Garage & Load Data ---
        try {
            console.log("[Init 1.4] Initializing Garage...");
            garage = new Garage(); // Instantiate the Garage class
            console.log("[Init 1.5] Loading from LocalStorage...");
            garage.loadFromLocalStorage(); // Load saved data
        } catch (error) {
            console.error("[Init 1.6] CRITICAL ERROR during Garage initialization or loading:", error);
            alert("Erro Crítico ao inicializar ou carregar dados da garagem. Verifique o console.");
            // Potentially clear corrupted storage or offer reset option here
            // localStorage.removeItem(garage?.localStorageKey || 'smartGarageVehicles_v3'); // Example reset
            return; // Stop initialization
        }
        console.log(`[Init 1.7] Garage initialized. ${garage.vehicles.length} vehicles loaded.`);

        // --- Setup Event Listeners ---
        console.log("[Init 1.8] Setting up global event listeners...");
        setupEventListeners(); // Setup navigation, forms, etc.

        // --- Initial Tab Setup ---
        const initialTab = getTabFromHash() || 'dashboard'; // Default to dashboard if no hash
        console.log(`[Init 1.9] Setting initial tab based on hash or default: ${initialTab}`);
        // Set active link and show correct tab content
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.tabTarget === initialTab));
        tabContents.forEach(content => {
            const contentId = content.dataset.tabContent || content.id?.replace('tab-', '');
            const isActive = contentId === initialTab;
            content.style.display = isActive ? 'block' : 'none'; // Show only the active tab
            content.classList.toggle('active-tab', isActive);
        });
        currentActiveTab = initialTab;

        // --- Initial Rendering ---
        console.log("[Init 1.10] Performing initial rendering of dynamic content...");
        renderGarageList(); // Display vehicles in the garage tab
        renderFutureAppointmentsList(); // Show upcoming appointments
        renderDashboard(); // Update dashboard stats
        renderStats(); // Update statistics tab
        renderDetailsAreaContent(null); // Show the placeholder in the details area initially

        // --- Initial Animations (Optional) ---
        console.log("[Init 1.11] Triggering initial animations for the active tab...");
        triggerRenderForTab(initialTab, true); // Apply entry animations without delay

        console.log("[Init COMPLETE] === Smart Garage Nexus initialization finished successfully ===");
    }

    // --- Tab Management & Navigation ---
    /** Activates a specific tab, updating UI and URL hash. @function setActiveTab */
    function setActiveTab(tabId, isInitialLoad = false) {
        if (!tabId || tabId === currentActiveTab || isContentSwapping) {
            console.log(`[Tabs] Tab '${tabId}' change skipped (already active, invalid, or swapping content).`);
            return;
        }
        console.log(`[Tabs] Activating tab: ${tabId} (Previous: ${currentActiveTab})`);

        const prevTabId = currentActiveTab;
        currentActiveTab = tabId;

        // Update navigation link styles
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.tabTarget === tabId);
        });

        // Show/hide tab content with transitions
        tabContents.forEach(content => {
            const contentId = content.dataset.tabContent || content.id?.replace('tab-', '');
            const isActive = contentId === tabId;

            if (isActive) {
                content.style.display = 'block'; // Make it visible first
                // Use requestAnimationFrame to ensure display:block is applied before adding class
                requestAnimationFrame(() => {
                    content.classList.add('active-tab'); // Trigger fade-in/slide-in animation
                    triggerRenderForTab(tabId, isInitialLoad); // Trigger animations within the tab
                });
            } else if (content.id === `tab-${prevTabId}`) {
                // Handle the previously active tab's fade-out
                content.classList.remove('active-tab');
                // Hide after transition ends (or timeout as fallback)
                const hideAfterTransition = () => {
                    // Double-check it shouldn't be active before hiding
                    if (!content.classList.contains('active-tab')) {
                        content.style.display = 'none';
                    }
                };
                content.addEventListener('transitionend', hideAfterTransition, { once: true });
                // Fallback timeout in case transitionend doesn't fire
                setTimeout(hideAfterTransition, 500); // Match CSS transition duration
            } else {
                // Hide other inactive tabs immediately
                content.style.display = 'none';
                content.classList.remove('active-tab');
            }
        });

        // Update URL hash unless it's the initial page load
        if (!isInitialLoad) {
            updateUrlHash(tabId);
        }
    }

    /** Gets the current tab ID from the URL hash. @function getTabFromHash */
    function getTabFromHash() {
        return window.location.hash.substring(1); // Remove the '#'
    }

    /** Updates the URL hash without causing a page reload. @function updateUrlHash */
    function updateUrlHash(tabId) {
        if (!tabId) return;
        try {
            // Use pushState for cleaner URLs if supported
            if (window.history.pushState) {
                // Avoid pushing duplicate states if hash is already correct
                if (getTabFromHash() !== tabId) {
                    window.history.pushState(null, '', `#${tabId}`);
                    console.log(`[Nav] URL hash updated via pushState: #${tabId}`);
                }
            } else {
                // Fallback for older browsers
                window.location.hash = tabId;
                console.log(`[Nav] URL hash updated via location.hash: #${tabId}`);
            }
        } catch (e) {
            console.error("[Nav] Error updating URL hash:", e);
            // Fallback just in case pushState fails unexpectedly
            window.location.hash = tabId;
        }
    }

    /** Handles the browser's hashchange event. @function handleHashChange */
    function handleHashChange() {
        console.log("[Nav] Hash change event detected.");
        const tabIdFromHash = getTabFromHash();
        const validTabs = ['dashboard', 'garage', 'stats']; // Define valid tab IDs

        if (validTabs.includes(tabIdFromHash) && tabIdFromHash !== currentActiveTab) {
            // Activate the tab specified in the hash if it's valid and not already active
            console.log(`[Nav] Hash changed to #${tabIdFromHash}, activating tab.`);
            setActiveTab(tabIdFromHash);
        } else if (!tabIdFromHash && currentActiveTab !== 'dashboard') {
            // If hash is empty (e.g., user removed it), go back to dashboard
            console.log("[Nav] Hash cleared, returning to dashboard.");
            setActiveTab('dashboard');
        }
    }


    // --- Content Rendering & Updates for Tabs ---
    /** Triggers rendering/animations for a tab's sections. @function triggerRenderForTab */
    function triggerRenderForTab(tabId, skipAnimation = false) {
        console.log(`[Render] Triggering content rendering/animations for tab: ${tabId}`);
        const tabElement = document.getElementById(`tab-${tabId}`);
        if (!tabElement) {
            console.warn(`[Render] Tab element #tab-${tabId} not found.`);
            return;
        }

        // Animate card sections within the tab
        const sections = tabElement.querySelectorAll('.card-section:not(.sticky-details)');
        applyStaggeredAnimation(sections, 'visible', 0.08, skipAnimation);

        // Update dynamic data specific to the tab
        switch (tabId) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'garage':
                // Garage list is rendered on load/add/remove.
                // We might want to re-render appointments if they can change dynamically.
                renderFutureAppointmentsList();
                break;
            case 'stats':
                renderStats();
                break;
        }
    }

    /** Applies a CSS class with a staggered delay for animation effects. @function applyStaggeredAnimation */
    function applyStaggeredAnimation(elements, triggerClass, baseDelay = 0.06, skip = false) {
        if (!elements || elements.length === 0) return;
        console.log(`[Animate] Applying staggered '${triggerClass}' to ${elements.length} elements.`);
        elements.forEach((el, index) => {
            const delay = skip ? '0s' : `${index * baseDelay}s`;
            el.style.transitionDelay = delay;
            // Use requestAnimationFrame to ensure the delay is applied before the class
            requestAnimationFrame(() => {
                el.classList.add(triggerClass);
                // Clean up the inline style after the transition might have finished
                const cleanup = () => { el.style.transitionDelay = ''; };
                el.addEventListener('transitionend', cleanup, { once: true });
                // Fallback cleanup in case transitionend doesn't fire
                setTimeout(cleanup, 1200 + (index * baseDelay * 1000)); // Adjust timeout based on longest possible delay + transition
            });
        });
    }


    // --- Dashboard & Stats Rendering ---
    /** Renders the dashboard stats. @function renderDashboard */
    function renderDashboard() {
        console.log("[Render] Updating Dashboard statistics...");
        if (!garage) {
            console.error("[Render] Cannot render dashboard, garage instance not available.");
            // Optionally clear dashboard stats or show error indicators
            updateStatElement("totalVehicles", "Erro");
            // ... clear others
            return;
        }
        try {
            const totalVehicles = garage.vehicles.length;
            const typeCounts = countVehicleTypes();
            const appointments = garage.getAllFutureAppointments(); // Assumes this returns sorted future appointments
            const totalCost = calculateTotalMaintenanceCost();

            // Update total vehicles count
            updateStatElement("totalVehicles", totalVehicles);

            // Update vehicle type distribution summary
            const typeSummary = `${typeCounts.Car || 0}C / ${typeCounts.SportsCar || 0}S / ${typeCounts.Truck || 0}T`;
            updateStatElement("vehicleTypes", typeSummary);
            const typeDetailsText = `Carros: ${typeCounts.Car || 0} | Esportivos: ${typeCounts.SportsCar || 0} | Caminhões: ${typeCounts.Truck || 0}`;
            updateStatElement("typeDetails", typeDetailsText);

            // Update next appointment info
            if (appointments.length > 0) {
                const nextAppointment = appointments[0]; // Get the soonest one
                let formattedDate = 'Data Inválida';
                try {
                    // Format date nicely
                    formattedDate = new Date(nextAppointment.maintenance.date).toLocaleString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                } catch (e) {
                    console.error("Date formatting error for appointment (Dashboard):", e, nextAppointment.maintenance.date);
                }
                updateStatElement("nextAppointment", formattedDate);
                // Show vehicle and maintenance type
                const appointmentDetailsText = `${nextAppointment.vehicleInfo.split('(')[0].trim()} - ${nextAppointment.maintenance.type}`;
                updateStatElement("appointmentDetails", appointmentDetailsText);
            } else {
                updateStatElement("nextAppointment", 'Nenhum');
                updateStatElement("appointmentDetails", 'Sem agendamentos futuros.');
            }

            // Update total maintenance cost
            updateStatElement("totalMaintCostDash", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

        } catch (error) {
            console.error("[Render] Error during renderDashboard:", error);
            // Optionally display error indicators on dashboard stats if specific calculations fail
            showNotification("Erro ao atualizar o dashboard.", "error");
        }
    }

    /** Renders the statistics tab content. Includes FIX for post-removal error. @function renderStats */
    function renderStats() {
        console.log("[Render] Updating Statistics Tab content...");
        if (!garage) {
            console.error("[Render] Cannot render stats, garage instance not available.");
            // Optionally clear stats or show error indicators
            updateStatElement("totalCost", "Erro");
            // ... clear others
            return;
        }
        try {
            // Use the current state of the garage for calculations
            const currentVehicles = garage.vehicles; // Get a snapshot for this render cycle
            const numVehicles = currentVehicles.length;
            console.log(`[RenderStats] Calculating stats for ${numVehicles} vehicles.`);

            // Calculate total and average costs
            const totalCost = calculateTotalMaintenanceCost(); // Uses garage.vehicles directly
            const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;

            // Calculate costs per vehicle (needed for finding the most expensive)
            const vehicleCosts = calculateMaintenanceCostPerVehicle(); // Uses garage.vehicles
            console.log("[RenderStats] Calculated maintenance cost per vehicle:", JSON.stringify(vehicleCosts));

            // Count vehicle types for the distribution chart
            const typeCounts = countVehicleTypes(); // Uses garage.vehicles
            console.log("[RenderStats] Calculated vehicle type counts:", JSON.stringify(typeCounts));

            // --- Find Most Expensive Vehicle (based on calculated costs for THIS render) ---
            let mostExpensiveInfo = { id: null, name: 'N/A', cost: -1 };
            let maxCostFound = -1;

            // Iterate through the calculated costs
            for (const vehicleId in vehicleCosts) {
                // IMPORTANT: Double-check if the vehicle still exists in the *current* garage snapshot
                // This prevents errors if a vehicle was removed just before this render
                if (vehicleCosts.hasOwnProperty(vehicleId) && currentVehicles.some(v => v.id === vehicleId)) {
                    const currentVehicleCost = vehicleCosts[vehicleId].cost;
                    if (currentVehicleCost > maxCostFound) {
                        maxCostFound = currentVehicleCost;
                        mostExpensiveInfo = {
                            id: vehicleId,
                            name: vehicleCosts[vehicleId].name, // Get name from the calculated costs object
                            cost: currentVehicleCost
                        };
                    }
                } else {
                     console.log(`[RenderStats] Skipping cost check for vehicle ID ${vehicleId} as it might have been removed.`);
                }
            }
            console.log("[RenderStats] Determined most expensive vehicle (currently in garage):", JSON.stringify(mostExpensiveInfo));

            // --- Update UI Elements ---
            updateStatElement("totalCost", totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
            updateStatElement("avgCost", avgCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

            // Safely update most expensive vehicle info
            updateStatElement("mostExpensiveVehicle", mostExpensiveInfo.name);
            const costDetailElement = document.querySelector('[data-stat="mostExpensiveCost"]');
            if (costDetailElement) {
                costDetailElement.textContent = mostExpensiveInfo.cost >= 0
                    ? `(R$ ${mostExpensiveInfo.cost.toFixed(2).replace('.', ',')})`
                    : ''; // Show cost only if valid
            }

            // Update the type distribution bar chart
            updateTypeDistributionChart(typeCounts);

        } catch (error) {
            console.error("[Render] Error during renderStats:", error);
            // Optionally display error indicators on stats elements
            showNotification("Erro ao atualizar as estatísticas.", "error");
        }
    }

    /** Updates a single stat display element safely. @function updateStatElement */
    function updateStatElement(statName, value) {
        // Find all elements matching the data-stat attribute (could be multiple, e.g., on dashboard and stats)
        const elements = document.querySelectorAll(`[data-stat="${statName}"]`);
        if (elements.length > 0) {
            const newValueText = (value !== null && value !== undefined) ? String(value) : '-'; // Default to '-' if value is null/undefined
            elements.forEach(el => {
                // Update only if the text content is different to avoid unnecessary DOM manipulation
                if (el.textContent !== newValueText) {
                    el.textContent = newValueText;
                }
            });
        } else {
            // Log a warning if no element is found for a stat, as it might indicate a typo or missing HTML
            console.warn(`[Render] Stat element(s) [data-stat="${statName}"] not found.`);
        }
    }

    /** Calculates total maintenance cost for all vehicles in the garage. @function calculateTotalMaintenanceCost */
    function calculateTotalMaintenanceCost() {
        if (!garage) return 0;
        return garage.vehicles.reduce((totalSum, vehicle) => {
            // Ensure maintenanceHistory exists and is an array
            const history = vehicle.maintenanceHistory || [];
            // Sum costs within the vehicle's history, defaulting cost to 0 if missing or invalid
            const vehicleSum = history.reduce((maintSum, maint) => maintSum + (maint?.cost ?? 0), 0);
            return totalSum + vehicleSum;
        }, 0);
    }

    /** Calculates maintenance cost per vehicle. @function calculateMaintenanceCostPerVehicle */
    function calculateMaintenanceCostPerVehicle() {
        const costs = {};
        if (!garage) return costs;
        garage.vehicles.forEach(vehicle => {
            const history = vehicle.maintenanceHistory || [];
            const vehicleCost = history.reduce((maintSum, maint) => maintSum + (maint?.cost ?? 0), 0);
            costs[vehicle.id] = {
                name: `${vehicle.make} ${vehicle.model}`, // Store name for easy display
                cost: vehicleCost
            };
        });
        return costs;
    }

    /** Counts vehicles by their type. @function countVehicleTypes */
    function countVehicleTypes() {
        const counts = { Car: 0, SportsCar: 0, Truck: 0, Vehicle: 0 }; // Initialize all expected types + base
        if (!garage) return counts;
        garage.vehicles.forEach(vehicle => {
            // Use the internal _type property, default to 'Vehicle' if missing
            const type = vehicle._type || 'Vehicle';
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            } else {
                // If a new, unexpected type appears, log it and count it
                console.warn(`[Stats] Encountered unexpected vehicle type: ${type}`);
                counts[type] = 1;
            }
        });
        // Optionally remove the base 'Vehicle' count if it's always 0 or not needed in the chart
        if (counts.Vehicle === 0) delete counts.Vehicle;
        return counts;
    }

    /** Updates the type distribution bar chart UI. @function updateTypeDistributionChart */
    function updateTypeDistributionChart(typeCounts) {
        console.log("[Render] Updating Type Distribution Chart...");
        const chartContainer = document.querySelector('[data-stat="typeDistribution"] .type-bar-chart');
        if (!chartContainer) {
            console.warn("[Render] Type distribution chart container not found.");
            return;
        }

        // Calculate the maximum count to determine bar heights relative to the max
        const allCounts = Object.values(typeCounts);
        const maxCount = allCounts.length > 0 ? Math.max(...allCounts, 1) : 1; // Ensure maxCount is at least 1 to avoid division by zero

        // Update each bar (Car, SportsCar, Truck)
        ['Car', 'SportsCar', 'Truck'].forEach(type => {
            const barItem = chartContainer.querySelector(`.bar-item[data-type="${type}"]`);
            if (barItem) {
                const barElement = barItem.querySelector('.bar');
                const countSpan = barItem.querySelector('.bar-count');
                const count = typeCounts[type] || 0; // Get count for the type, default to 0
                const percentageHeight = (count / maxCount) * 100; // Calculate percentage height

                // Update bar height using requestAnimationFrame for smooth transition
                if (barElement) {
                    requestAnimationFrame(() => {
                        barElement.style.height = `${percentageHeight}%`;
                    });
                }
                // Update the count display
                if (countSpan) {
                    countSpan.textContent = count;
                }
            } else {
                console.warn(`[Render] Bar item for type "${type}" not found in chart.`);
            }
        });
    }


    // --- Garage List Rendering & Vehicle Cards ---
    /** Renders the list of vehicle cards in the garage display area. @function renderGarageList */
    function renderGarageList() {
        console.log("[Render] === Rendering Garage List START ===");
        if (!garageDisplay || !garage) {
            console.error("[Render] ABORT: Missing garageDisplay element or garage instance.");
            if (garageDisplay) garageDisplay.innerHTML = '<p class="error-text">Erro ao carregar a lista da garagem.</p>';
            return;
        }

        const fragment = document.createDocumentFragment(); // Use fragment for performance
        let vehicleCount = 0;

        try {
            // Sort vehicles alphabetically by make then model for consistent order
            const sortedVehicles = [...garage.vehicles].sort((a, b) => {
                const nameA = `${a.make} ${a.model}`.toLowerCase();
                const nameB = `${b.make} ${b.model}`.toLowerCase();
                return nameA.localeCompare(nameB, 'pt-BR'); // Use localeCompare for proper sorting
            });

            vehicleCount = sortedVehicles.length;
            console.log(`[Render] ${vehicleCount} vehicles found in garage. Creating cards...`);

            // Create a card for each vehicle
            sortedVehicles.forEach((vehicle) => {
                const card = createVehicleCard(vehicle);
                if (!card) return; // Skip if card creation failed

                // Mark the card as selected if it matches the currently selected vehicle
                if (selectedVehicle?.id === vehicle.id) {
                    card.classList.add('selected');
                }
                fragment.appendChild(card); // Add card to the fragment
            });

        } catch (error) {
            console.error("[Render] Error creating vehicle cards:", error);
            garageDisplay.innerHTML = '<p class="error-text">Ocorreu um erro ao exibir os veículos.</p>';
            return; // Stop rendering if card creation fails
        }

        // Clear the existing display and append the new fragment
        garageDisplay.innerHTML = ''; // Clear previous content efficiently

        if (vehicleCount > 0) {
            garageDisplay.appendChild(fragment);
            // Apply staggered animation to the newly added cards
            applyStaggeredAnimation(garageDisplay.querySelectorAll('.vehicle-card'), 'animate-in', 0.05, false);
        } else {
            // Show placeholder if garage is empty
            garageDisplay.innerHTML = '<p class="placeholder-text">A garagem está vazia.</p>';
            // If a vehicle was selected but the list is now empty (e.g., last vehicle removed), deselect it.
            if (selectedVehicle) {
                selectVehicle(null); // This will also update the details panel to placeholder
            } else {
                 renderDetailsAreaContent(null); // Ensure placeholder is shown if garage was initially empty
            }
        }
        console.log("[Render] === Rendering Garage List END ===");
    }

    /** Creates a single vehicle card HTML element. @function createVehicleCard */
    function createVehicleCard(vehicle) {
        if (!vehicle || typeof vehicle !== 'object' || !vehicle.id) {
            console.error("[Card] Invalid vehicle data provided to createVehicleCard:", vehicle);
            return null; // Return null if data is invalid
        }

        const card = document.createElement('div');
        card.className = 'vehicle-card'; // Base class
        card.dataset.id = vehicle.id; // Store ID for later reference
        card.setAttribute('role', 'button'); // Make it behave like a button for accessibility
        card.setAttribute('tabindex', '0'); // Make it focusable
        card.setAttribute('aria-label', `Selecionar ${vehicle.make} ${vehicle.model} ${vehicle.year}`);

        // Status icon (circle indicating on/off/moving)
        const statusIcon = document.createElement('span');
        statusIcon.className = 'status-icon'; // Class for styling the dot
        statusIcon.setAttribute('aria-hidden', 'true'); // Hide decorative icon from screen readers

        // Basic vehicle info
        card.innerHTML = `
            <h4>${vehicle.make} ${vehicle.model}</h4>
            <p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}</p> <!-- Format type nicely -->
            <div class="card-specific-info"></div> <!-- Placeholder for type-specific info -->
            <div class="card-footer"></div> <!-- Footer for status icon -->
        `;

        // Append the status icon to the footer
        card.querySelector('.card-footer')?.appendChild(statusIcon);

        // Add type-specific details (Turbo for SportsCar, Load for Truck)
        const specificInfoContainer = card.querySelector('.card-specific-info');
        if (specificInfoContainer) {
            if (vehicle instanceof SportsCar) {
                specificInfoContainer.innerHTML = `<p class="info-turbo">Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}</p>`;
            } else if (vehicle instanceof Truck) {
                specificInfoContainer.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
            }
            // No specific info needed for base Car
        }

        // Set initial visual status (color, animation)
        updateVehicleCardStatus(card, vehicle);

        // Add click event listener to select the vehicle
        card.addEventListener('click', () => {
            console.log(`[Event] === CARD CLICK === ID: ${vehicle.id}`);
            if (isContentSwapping) {
                console.warn("[Event] Click blocked: Details panel content is currently being swapped.");
                return; // Prevent selection while details are updating
            }
            selectVehicle(vehicle.id); // Call the selection handler
        });

         // Add keyboard accessibility (Enter/Space key)
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); // Prevent default space scroll
                card.click(); // Trigger the click handler
            }
        });


        return card; // Return the created card element
    }

    /** Updates the visual status indicators (icon color, pulse animations) on a vehicle card. @function updateVehicleCardStatus */
    function updateVehicleCardStatus(cardElement, vehicle) {
        if (!cardElement || !vehicle) return; // Exit if elements are missing

        const statusIcon = cardElement.querySelector('.status-icon');
        const turboInfo = cardElement.querySelector('.info-turbo');
        const loadInfo = cardElement.querySelector('.info-load');

        if (!statusIcon) return; // Exit if status icon is missing

        // Reset status classes and animations
        statusIcon.classList.remove('on', 'off', 'moving');
        statusIcon.style.animation = ''; // Clear any previous animation
        cardElement.classList.remove('pulse-turbo', 'pulse-load'); // Remove pulsing borders

        let statusColorVar = '--danger-rgb'; // Default to 'off' color

        // Set status icon class based on vehicle status
        switch (vehicle.status) {
            case 'on':
                statusIcon.classList.add('on');
                statusColorVar = '--warning-rgb'; // Yellowish for 'on'
                break;
            case 'moving':
                statusIcon.classList.add('moving');
                statusColorVar = '--success-rgb'; // Green for 'moving'
                break;
            default: // 'off' or any other status
                statusIcon.classList.add('off');
                // statusColorVar remains '--danger-rgb' (Red for 'off')
                break;
        }
        // Apply the corresponding color variable for the pulse animation
        statusIcon.style.setProperty('--rgb-color', `var(${statusColorVar})`);

        // Handle type-specific updates and pulsing borders
        if (vehicle instanceof SportsCar) {
            // Update Turbo text
            if (turboInfo) turboInfo.textContent = `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`;
            // Add turbo pulse effect if turbo is ON
            if (vehicle.turboOn) {
                cardElement.classList.add('pulse-turbo');
                // Optionally override status icon pulse if turbo is active and engine is not off
                if (vehicle.status !== 'off') {
                    statusIcon.style.setProperty('--rgb-color', 'var(--accent-3-rgb)'); // Use turbo color
                    statusIcon.style.animation = 'pulse 1s infinite alternate'; // Different pulse?
                }
            }
        } else if (vehicle instanceof Truck) {
            // Update Load text
            if (loadInfo) loadInfo.textContent = `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`;
            // Add load pulse effect if carrying cargo
            if (vehicle.currentLoad > 0) {
                cardElement.classList.add('pulse-load');
                 // Optionally override status icon pulse if loaded and engine is not off
                 if (vehicle.status !== 'off') {
                    // statusIcon.style.setProperty('--rgb-color', 'var(--accent-2-rgb)'); // Use load color?
                    // statusIcon.style.animation = 'pulse 1.2s infinite ease-in-out';
                 }
            }
        }
    }

    /** Triggers a brief CSS animation on a specific vehicle card. @function triggerVehicleCardAnimation */
    function triggerVehicleCardAnimation(vehicleId, animationClass) {
        const card = garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
        if (card && animationClass) {
            console.log(`[Animate] Triggering '${animationClass}' animation on card ${vehicleId}`);
            const validAnimations = ['shake', 'tilt-forward', 'tilt-backward', 'bounce']; // Define allowed animations

            if (validAnimations.includes(animationClass)) {
                // Remove any existing animation classes first to allow re-triggering
                card.classList.remove(...validAnimations);

                // Use requestAnimationFrame to ensure the class removal is processed before adding the new one
                requestAnimationFrame(() => {
                    card.classList.add(animationClass);
                    // Remove the animation class after it finishes
                    card.addEventListener('animationend', () => {
                        card.classList.remove(animationClass);
                    }, { once: true });
                });
            } else {
                console.warn(`[Animate] Invalid animation class specified: ${animationClass}`);
            }
        }
    }


    // --- Vehicle Selection & Details Area Management ---
    /** Handles selecting or deselecting a vehicle, updating UI accordingly. @function selectVehicle */
    function selectVehicle(vehicleId) {
        console.log(`[Select 1.0] === Starting selectVehicle === Target ID: ${vehicleId}, Current Selected: ${selectedVehicle?.id}`);

        if (isContentSwapping) {
            console.warn("[Select 1.1] Blocked: Details panel content is currently being updated.");
            return; // Prevent selection changes while the details panel is in transition
        }

        const previouslySelectedId = selectedVehicle?.id;
        const isDeselecting = (vehicleId === null || vehicleId === previouslySelectedId);

        console.log(`[Select 1.2] Action: ${isDeselecting ? 'Deselecting' : 'Selecting'} vehicle. Target ID: ${vehicleId}`);

        // --- Update Visual Selection State on Cards ---
        // Remove 'selected' class from the previously selected card, if any
        if (previouslySelectedId) {
            const prevCard = garageDisplay?.querySelector(`.vehicle-card[data-id="${previouslySelectedId}"]`);
            prevCard?.classList.remove('selected');
        }
        // Add 'selected' class to the newly selected card, if selecting (not deselecting)
        if (!isDeselecting && vehicleId) {
            const newCard = garageDisplay?.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
            newCard?.classList.add('selected');
            // Optional: Scroll the selected card into view if needed
            // newCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        console.log("[Select 1.3] Vehicle card selection classes updated.");

        // --- Update Internal State and Details Panel ---
        if (isDeselecting) {
            // If deselecting (clicked same card again or passed null)
            if (selectedVehicle) { // Only act if something was actually selected
                selectedVehicle = null; // Clear the internal state variable
                renderDetailsAreaContent(null); // Show the placeholder in the details panel
                // stopEngineSound(); // Stop any associated sounds if applicable
                console.log("[Select 1.4] Deselection complete. Details panel cleared.");
            }
        } else {
            // If selecting a new vehicle
            const vehicleToSelect = garage?.findVehicle(vehicleId); // Find the vehicle object in the garage data

            if (vehicleToSelect) {
                selectedVehicle = vehicleToSelect; // Update the internal state variable
                renderDetailsAreaContent(vehicleToSelect); // Render the details for the selected vehicle
                // updateEngineSound(); // Update sounds/visuals if applicable
                console.log(`[Select 1.5] Selection complete for ${vehicleToSelect.make} ${vehicleToSelect.model} (ID: ${vehicleToSelect.id}).`);
            } else {
                // Handle case where the vehicle ID is not found in the garage data (should ideally not happen if ID comes from a card)
                console.error(`[Select 1.6] ERROR: Vehicle with ID ${vehicleId} not found in garage data!`);
                showNotification('Erro: Dados do veículo selecionado não encontrados.', 'error');
                selectedVehicle = null; // Ensure state is cleared
                renderDetailsAreaContent(null); // Show placeholder
                // stopEngineSound();
            }
        }
        console.log(`[Select 2.0] === selectVehicle finished === Current selected ID: ${selectedVehicle?.id}`);
    }

    /** Renders the content (vehicle details or placeholder) in the fixed details area. @function renderDetailsAreaContent */
    function renderDetailsAreaContent(vehicle) {
        console.log(`[RenderDetails 1.0] === Rendering Details Area === Vehicle: ${vehicle ? `${vehicle.make} ${vehicle.model} (ID: ${vehicle.id})` : 'Placeholder'}`);
        if (!detailsContentArea) {
            console.error("[RenderDetails 1.1] ABORT: #details-content-area element is missing!");
            return;
        }
        // Prevent concurrent rendering attempts
        if (isContentSwapping) {
            console.warn("[RenderDetails 1.2] Blocked: Another render operation is already in progress.");
            return;
        }
        isContentSwapping = true; // Set flag

        try {
            console.log("[RenderDetails 1.3] Clearing current details area content...");
            detailsContentArea.innerHTML = ''; // Clear previous content

            if (vehicle) {
                // --- Render Vehicle Details ---
                console.log(`[RenderDetails 1.4] Rendering details for vehicle ID: ${vehicle.id}`);
                if (!vehicleDetailsTemplate?.content?.firstElementChild) {
                    throw new Error("Vehicle details template (#vehicle-details-template) is missing or invalid!");
                }

                console.log("[RenderDetails 1.5] Cloning template content...");
                // Clone the content of the template tag
                const detailsWrapper = vehicleDetailsTemplate.content.firstElementChild.cloneNode(true);
                if (!detailsWrapper) {
                    throw new Error("Failed to clone vehicle details template content!");
                }

                console.log("[RenderDetails 1.6] Appending cloned content to details area...");
                detailsContentArea.appendChild(detailsWrapper); // Add the cloned structure to the DOM

                console.log("[RenderDetails 1.7] Populating details panel with vehicle data...");
                populateDetailsPanelContent(detailsWrapper, vehicle); // Fill in the data

                console.log("[RenderDetails 1.8] Setting up event listeners for the details panel...");
                setupDetailsPanelEventListeners(detailsWrapper); // Attach listeners to buttons etc. inside the panel

                // Reset API details section on initial load of a vehicle's details
                const apiContentArea = detailsWrapper.querySelector('.api-details-content');
                 const apiButton = detailsWrapper.querySelector('.btn-fetch-api-details');
                if (apiContentArea) {
                     apiContentArea.innerHTML = '<p class="placeholder-text">Clique acima para buscar informações adicionais.</p>';
                }
                 if(apiButton) {
                     apiButton.disabled = false;
                     const buttonTextSpan = apiButton.querySelector('span:last-child');
                     if (buttonTextSpan) buttonTextSpan.textContent = 'Ver Dados Externos';
                 }

                console.log("[RenderDetails 1.9] Vehicle details rendering complete.");

            } else {
                // --- Render Placeholder ---
                console.log("[RenderDetails 1.4] Rendering placeholder content...");
                // Create and append the placeholder HTML directly
                detailsContentArea.innerHTML = `
                    <div class="details-placeholder-content">
                        <span class="placeholder-icon" aria-hidden="true">👈</span>
                        <p>Selecione um veículo na lista para ver os detalhes.</p>
                    </div>`;
                console.log("[RenderDetails 1.5] Placeholder rendering complete.");
            }
        } catch (error) {
            // --- Handle Rendering Errors ---
            console.error("[RenderDetails 2.0] CRITICAL RENDER ERROR in details panel:", error);
            // Display an error message within the details panel
            detailsContentArea.innerHTML = '<p class="error-text">Erro ao renderizar os detalhes do veículo!</p>';
            // If an error occurred while trying to render a vehicle, reset selection to null
            if (vehicle && selectedVehicle?.id === vehicle.id) {
                selectVehicle(null); // Attempt to deselect to avoid inconsistent state
            }
        } finally {
            // --- Cleanup ---
            isContentSwapping = false; // Reset the flag regardless of success or failure
            console.log("[RenderDetails 3.0] === renderDetailsAreaContent Finished ===");
        }
    }

    /** Sets up event listeners for controls within the details panel wrapper. @function setupDetailsPanelEventListeners */
    function setupDetailsPanelEventListeners(wrapperElement) {
        console.log("[Listeners 1.0] Setting up event listeners for the details panel wrapper...");
        if (!wrapperElement) {
            console.error("[Listeners 1.1] ABORT: Provided wrapper element is null or invalid.");
            return;
        }

        // Helper to add listeners safely
        const addListener = (selector, eventType, handler) => {
            const element = wrapperElement.querySelector(selector);
            if (element) {
                element.addEventListener(eventType, handler);
            } else {
                // Log a warning instead of an error, as some elements might be optional (e.g., turbo button)
                console.warn(`[Listeners 1.2] Element not found for listener setup: '${selector}'`);
            }
        };

        // --- Attach Listeners ---
        // Close button
        addListener('.close-button', 'click', () => selectVehicle(null)); // Deselect current vehicle

        // Basic vehicle controls
        addListener('.btn-start', 'click', handleStartVehicle);
        addListener('.btn-stop', 'click', handleStopVehicle);
        addListener('.btn-accelerate', 'click', handleAccelerateVehicle);
        addListener('.btn-brake', 'click', handleBrakeVehicle);

        // SportsCar specific
        addListener('.btn-toggle-turbo', 'click', handleToggleTurbo);

        // Truck specific
        addListener('.btn-load-cargo', 'click', handleLoadCargo);
        addListener('.btn-unload-cargo', 'click', handleUnloadCargo);

        // Maintenance form
        addListener('.schedule-maintenance-form', 'submit', handleScheduleMaintenance);

        // Remove vehicle button
        addListener('.btn-remove-vehicle', 'click', handleRemoveVehicle);

        // **** NEW Listener for API Button ****
        addListener('.btn-fetch-api-details', 'click', handleFetchApiDetails);

        // Initialize Flatpickr if used (assuming it's imported/available)
        // const dateInput = wrapperElement.querySelector('.maint-date');
        // if (dateInput && typeof flatpickr === 'function') {
        //     initializeFlatpickr(dateInput);
        // } else if (dateInput) {
        //      console.warn("[Listeners] Flatpickr function not found, using native date input.");
        // }

        console.log("[Listeners 1.3] Event listeners setup complete for the details panel.");
    }

    /** Populates the details panel content based on the selected vehicle's data. @function populateDetailsPanelContent */
    function populateDetailsPanelContent(wrapper, vehicle) {
        console.log(`[Populate 1.0] Populating details wrapper for ${vehicle?.make} ${vehicle?.model} (ID: ${vehicle?.id})`);
        if (!wrapper || !vehicle) {
            console.error("[Populate 1.1] ABORT: Missing wrapper element or vehicle data.");
            return;
        }

        // --- Helper functions for safe DOM manipulation ---
        const find = (selector) => wrapper.querySelector(selector);
        const updateText = (selector, text) => {
            const el = find(selector);
            if (el) el.textContent = text ?? ''; else console.warn(`[Populate] Element not found: ${selector}`);
        };
        const updateHTML = (selector, html) => {
            const el = find(selector);
            if (el) el.innerHTML = html ?? ''; else console.warn(`[Populate] Element not found: ${selector}`);
        };
        const setDisplay = (selector, displayValue) => {
            const el = find(selector);
            if (el) el.style.display = displayValue; else console.warn(`[Populate] Element not found: ${selector}`);
        };
        const setDisabled = (selector, isDisabled) => {
            const el = find(selector);
            if (el) el.disabled = isDisabled; else console.warn(`[Populate] Element not found: ${selector}`);
        };
        const toggleClass = (selector, className, force) => {
            const el = find(selector);
            if (el) el.classList.toggle(className, force); else console.warn(`[Populate] Element not found: ${selector}`);
        };
        const setValue = (selector, value) => {
            const el = find(selector);
            if (el) el.value = value ?? ''; else console.warn(`[Populate] Element not found: ${selector}`);
        };

        // --- Populate Basic Info ---
        updateText('.details-title', `${vehicle.make} ${vehicle.model}`);
        updateHTML('.vehicle-info', `
            <strong>Ano:</strong> ${vehicle.year}<br>
            <strong>Tipo:</strong> ${vehicle._type.replace(/([A-Z])/g, ' $1').trim()}<br>
            <strong title="ID Completo: ${vehicle.id}">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>
        `);

        // --- Populate Status Indicators ---
        updateText('.status-indicator', `Status: ${vehicle.status}`); // TODO: Translate status? ('on' -> 'Ligado')
        updateText('.speed-indicator', `Veloc: ${vehicle.speed.toFixed(0)} km/h`);

        // --- Handle Type-Specific Elements ---
        const isSportsCar = vehicle instanceof SportsCar;
        const isTruck = vehicle instanceof Truck;

        // SportsCar specific UI
        setDisplay('.turbo-indicator', isSportsCar ? 'inline-flex' : 'none');
        setDisplay('.btn-toggle-turbo', isSportsCar ? 'inline-flex' : 'none');
        if (isSportsCar) {
            updateText('.turbo-indicator', `Turbo: ${vehicle.turboOn ? 'ON' : 'OFF'}`);
            updateText('.btn-toggle-turbo span:last-child', vehicle.turboOn ? 'Turbo OFF' : 'Turbo ON');
            toggleClass('.btn-toggle-turbo', 'active', vehicle.turboOn); // Add 'active' class if turbo is on
            setDisabled('.btn-toggle-turbo', vehicle.status === 'off'); // Disable turbo toggle if engine is off
        }

        // Truck specific UI
        setDisplay('.load-indicator', isTruck ? 'inline-flex' : 'none');
        setDisplay('.truck-load-controls', isTruck ? 'flex' : 'none'); // Use flex for input group layout
        if (isTruck) {
            updateText('.load-indicator', `Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg`);
            setValue('.cargo-amount', ''); // Clear cargo input field
            // Optionally disable load/unload if engine is on/moving? (Depends on requirements)
            // setDisabled('.btn-load-cargo', vehicle.status !== 'off');
            // setDisabled('.btn-unload-cargo', vehicle.status !== 'off');
        }

        // --- Update Control Button States ---
        setDisabled('.btn-start', vehicle.status !== 'off'); // Disable start if already on/moving
        setDisabled('.btn-stop', vehicle.status === 'off' || vehicle.speed > 0); // Disable stop if off or moving
        setDisabled('.btn-accelerate', vehicle.status === 'off'); // Disable accelerate if off
        setDisabled('.btn-brake', vehicle.status !== 'moving'); // Disable brake if not moving

        // --- Populate Maintenance History ---
        const historyListElement = find('.maintenance-list');
        if (historyListElement) {
            renderMaintenanceHistory(historyListElement, vehicle); // Call dedicated function
        }

        // --- Reset Maintenance Form ---
        const maintenanceForm = find('.schedule-maintenance-form');
        if (maintenanceForm) {
            maintenanceForm.reset(); // Clear form fields
            // Clear Flatpickr instance if used
            const dateInput = find('.maint-date');
            if (dateInput?._flatpickr) {
                dateInput._flatpickr.clear();
            }
            // Set hidden input with the current vehicle's ID
            setValue('.selected-vehicle-id', vehicle.id);
        }

        // Update engine sound/visualizer if implemented
        // updateEngineSound();

        console.log("[Populate 1.2] Details panel population finished.");
    }


    // --- Engine Sound/Visualizer (Placeholder - Implement if needed) ---
    // function updateEngineSound() { console.log("Updating engine sound/visuals..."); }
    // function stopEngineSound() { console.log("Stopping engine sound/visuals..."); }

    // --- Maintenance & Appointments ---
    /** Renders the maintenance history list for a vehicle. @function renderMaintenanceHistory */
    function renderMaintenanceHistory(listElement, vehicle) {
        if (!listElement || !vehicle) return;
        console.log(`[Render] Updating maintenance history for ${vehicle.make} ${vehicle.model}`);
        listElement.innerHTML = ''; // Clear previous list items

        const history = vehicle.maintenanceHistory || []; // Get sorted history

        if (history.length === 0) {
            listElement.innerHTML = '<li class="placeholder-text">Nenhum histórico registrado.</li>';
            return;
        }

        const fragment = document.createDocumentFragment();
        history.forEach(maint => {
            const li = document.createElement('li');
            li.textContent = maint.format(); // Use the format method from Maintenance class
            li.title = `ID: ${maint.id}`; // Add ID as title for debugging/info
            fragment.appendChild(li);
        });
        listElement.appendChild(fragment);
    }

    /** Renders the global list of future appointments. @function renderFutureAppointmentsList */
    function renderFutureAppointmentsList() {
        if (!futureAppointmentsList || !garage) return;
        console.log("[Render] Updating global future appointments list...");
        futureAppointmentsList.innerHTML = ''; // Clear previous list

        const appointments = garage.getAllFutureAppointments(); // Get sorted future appointments

        if (appointments.length === 0) {
            futureAppointmentsList.innerHTML = '<li class="placeholder-text">Sem agendamentos futuros.</li>';
            return;
        }

        const fragment = document.createDocumentFragment();
        const now = new Date();
        appointments.forEach(app => {
            const li = document.createElement('li');
            li.dataset.vehicleId = app.vehicleId; // Store vehicle ID for potential click action
            li.dataset.maintId = app.maintenance.id; // Store maintenance ID

            let dateStr = 'Data Inválida';
            try {
                dateStr = app.maintenance.date.toLocaleString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            } catch (e) { console.error("Date format error (Appointments List):", e); }

            li.innerHTML = `<strong>${dateStr}</strong>: ${app.vehicleInfo} - ${app.maintenance.type}`;
            if (app.maintenance.cost > 0) {
                 li.innerHTML += ` (${app.maintenance.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
            }
             if (app.maintenance.description) {
                 li.title = `Descrição: ${app.maintenance.description}`; // Show description on hover
             }

            // Add click listener to potentially select the vehicle
            li.addEventListener('click', handleAppointmentClick);
            fragment.appendChild(li);
        });
        futureAppointmentsList.appendChild(fragment);
    }

    /** Handles clicking on an item in the future appointments list. @function handleAppointmentClick */
    function handleAppointmentClick(event) {
        const listItem = event.currentTarget; // The <li> element
        const vehicleId = listItem.dataset.vehicleId;

        if (vehicleId) {
            console.log(`[Event] Appointment clicked, selecting vehicle ID: ${vehicleId}`);
            // Switch to the garage tab if not already there
            if (currentActiveTab !== 'garage') {
                setActiveTab('garage');
            }
            // Select the vehicle
            selectVehicle(vehicleId);
             // Optional: Scroll the details panel into view if needed, especially on mobile
             const detailsPanel = getElemById('details-content-area');
             detailsPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.warn("[Event] Appointment click handler: Missing vehicleId on list item.");
        }
    }


    // --- Flatpickr Initialization (Placeholder - Implement if needed) ---
    // function initializeFlatpickr(dateInput) {
    //     if (!dateInput || typeof flatpickr !== 'function') return;
    //     console.log("[Init] Initializing Flatpickr for:", dateInput.id);
    //     flatpickr(dateInput, {
    //         enableTime: true,
    //         dateFormat: "Y-m-d H:i", // ISO format compatible with new Date()
    //         time_24hr: true,
    //         locale: "pt", // Requires importing the Portuguese locale
    //         // minDate: "today", // Optional: prevent past dates for scheduling
    //     });
    // }


    // --- Event Listener Setup ---
    /** Sets up initial global event listeners. @function setupEventListeners */
    function setupEventListeners() {
        console.log("[Events] Setting up initial global event listeners...");

        // Navigation Link Clicks
        mainNav?.addEventListener('click', (event) => {
            const link = event.target.closest('.nav-link[data-tab-target]');
            if (link) {
                event.preventDefault(); // Prevent default anchor link behavior
                const tabId = link.dataset.tabTarget;
                setActiveTab(tabId); // Activate the clicked tab
            }
        });

        // Vehicle Type Change in Add Form (Show/Hide Truck Fields)
        vehicleTypeSelect?.addEventListener('change', (event) => {
            const selectedType = event.target.value;
            const showTruckFields = selectedType === 'Truck';
            truckSpecificFields?.classList.toggle('visible', showTruckFields);
            // Make max load required only for trucks
            const maxLoadInput = document.getElementById('truck-max-load');
            if (maxLoadInput) {
                maxLoadInput.required = showTruckFields;
                if (!showTruckFields) maxLoadInput.value = ''; // Clear value if not truck
            }
        });

        // Add Vehicle Form Submission
        addVehicleForm?.addEventListener('submit', handleAddVehicle);

        // Browser Hash Change (for back/forward navigation)
        window.addEventListener('hashchange', handleHashChange);

        // Theme Toggle Listener (If themes were implemented)
        // themeToggle?.addEventListener('click', toggleTheme);

        console.log("[Events] Initial global event listeners setup complete.");
    }


    // --- Event Handlers ---
    /** Handles the submission of the add vehicle form. @function handleAddVehicle */
    function handleAddVehicle(event) {
        event.preventDefault(); // Prevent default form submission
        console.log("[Event] Add vehicle form submitted.");
        if (!addVehicleForm || !vehicleTypeSelect || !garage) {
            console.error("[Event AddVehicle] Form, select, or garage instance missing.");
            return;
        }

        // Get form data
        const type = vehicleTypeSelect.value;
        const make = addVehicleForm.querySelector('#vehicle-make')?.value.trim();
        const model = addVehicleForm.querySelector('#vehicle-model')?.value.trim();
        const year = addVehicleForm.querySelector('#vehicle-year')?.value;
        const maxLoad = addVehicleForm.querySelector('#truck-max-load')?.value; // Only relevant for trucks

        // Basic validation
        if (!type || !make || !model || !year) {
            showNotification('Preencha Tipo, Marca, Modelo e Ano obrigatórios.', 'warning');
            return;
        }
        // Truck-specific validation
        if (type === 'Truck' && (!maxLoad || parseInt(maxLoad) <= 0)) {
            showNotification('Carga Máxima inválida ou não informada para Caminhão.', 'warning');
            return;
        }

        let newVehicle;
        const newId = generateUniqueId(); // Generate a unique ID

        try {
            // Instantiate the correct vehicle class based on type
            switch (type) {
                case 'Car':
                    newVehicle = new Car(make, model, year, newId);
                    break;
                case 'SportsCar':
                    newVehicle = new SportsCar(make, model, year, newId);
                    break;
                case 'Truck':
                    newVehicle = new Truck(make, model, year, maxLoad, newId);
                    break;
                default:
                    throw new Error('Tipo de veículo selecionado é inválido.');
            }

            console.log("[Event AddVehicle] Attempting to add vehicle:", newVehicle);

            // Add the vehicle to the garage (this also saves to localStorage)
            if (garage.addVehicle(newVehicle)) {
                renderGarageList(); // Update the UI list
                addVehicleForm.reset(); // Clear the form
                vehicleTypeSelect.value = ""; // Reset dropdown
                truckSpecificFields?.classList.remove('visible'); // Hide truck fields
                const maxLoadInput = document.getElementById('truck-max-load');
                if (maxLoadInput) maxLoadInput.required = false; // Make not required again

                showNotification(`${type.replace(/([A-Z])/g, ' $1').trim()} ${make} ${model} adicionado com sucesso!`, 'success');
                updateAllRelevantData(); // Update dashboard, stats, etc.
            }
            // If addVehicle returned false, it means duplicate ID or invalid object, notification handled inside Garage class

        } catch (error) {
            console.error("[Event AddVehicle] Error creating or adding vehicle:", error);
            showNotification(`Erro ao adicionar veículo: ${error.message}`, 'error');
        }
    }

    /** Handles the click on the remove vehicle button, including confirmation. @function handleRemoveVehicle */
    function handleRemoveVehicle() {
        console.log("[Event] Remove vehicle button clicked.");
        if (!selectedVehicle) {
            console.warn("[Event RemoveVehicle] Ignored: No vehicle is currently selected.");
            showNotification("Nenhum veículo selecionado para remover.", "warning");
            return;
        }
        if (!garage) {
            console.error("[Event RemoveVehicle] Failed: Garage instance is missing.");
            showNotification("Erro interno: Instância da garagem não encontrada.", "error");
            return;
        }

        // Store details before potentially deselecting during confirmation
        const vehicleToRemove = selectedVehicle; // Keep a stable reference
        const vehicleId = vehicleToRemove.id;
        const vehicleName = `${vehicleToRemove.make} ${vehicleToRemove.model}`;

        console.log(`[Event RemoveVehicle] Showing confirmation dialog for removing ${vehicleName} (ID ending: ...${vehicleId.slice(-4)})`);

        // Show confirmation dialog
        showConfirmation(
            `Tem certeza que deseja remover ${vehicleName} (ID: ...${vehicleId.slice(-4)}) da garagem? Esta ação não pode ser desfeita.`,
            // --- onConfirm Callback ---
            () => {
                console.log(`[Event RemoveVehicle] Confirmed removal for ${vehicleId}.`);

                // 1. Visually deselect the vehicle FIRST (clears the details panel)
                // This prevents the user seeing details of a vehicle being removed.
                selectVehicle(null);

                // 2. Remove the vehicle from the data store (Garage instance)
                // This operation should also trigger saving to localStorage within the Garage class.
                const removedSuccessfully = garage.removeVehicle(vehicleId);

                if (removedSuccessfully) {
                    console.log(`[Event RemoveVehicle] Vehicle ${vehicleId} removed successfully from garage data.`);
                    showNotification(`${vehicleName} foi removido da garagem.`, 'info');

                    // 3. Update UI elements that depend on the garage list AFTER data removal
                    // Use a small timeout to ensure the selectVehicle(null) render cycle has likely completed,
                    // reducing potential visual glitches or race conditions.
                    setTimeout(() => {
                        console.log(`[Event RemoveVehicle] Updating UI lists and stats after removing ${vehicleId}`);
                        renderGarageList(); // Re-render the list without the removed vehicle card
                        updateAllRelevantData(); // Update dashboard, stats, appointments list
                    }, 50); // 50ms delay is usually sufficient

                } else {
                    // This case indicates garage.removeVehicle failed, which is unexpected if confirmation was based on selectedVehicle
                    console.error(`[Event RemoveVehicle] ERROR: garage.removeVehicle reported failure for ID ${vehicleId}, even though it was selected.`);
                    showNotification(`Erro: Falha ao remover ${vehicleName} dos dados da garagem.`, 'error');
                    // Re-render list just in case, although the data state might be inconsistent
                    renderGarageList();
                    updateAllRelevantData();
                }
            },
            // --- onCancel Callback ---
            () => {
                console.log(`[Event RemoveVehicle] Removal cancelled by user for ${vehicleId}.`);
                // No action needed, vehicle remains selected and in the garage.
            }
        );
    }

    /** Handles the submission of the schedule/register maintenance form. @function handleScheduleMaintenance */
    function handleScheduleMaintenance(event) {
        event.preventDefault();
        console.log("[Event] Schedule/Register maintenance form submitted.");
        if (!selectedVehicle || !garage) {
            showNotification("Selecione um veículo para registrar manutenção.", "warning");
            return;
        }

        const form = event.target;
        const wrapper = getCurrentDetailsWrapper(); // Get the current details panel wrapper
        if (!wrapper) {
            console.error("[Event ScheduleMaint] Details panel wrapper not found.");
            return;
        }

        // Get form inputs
        const dateInput = form.querySelector('.maint-date');
        const typeInput = form.querySelector('.maint-type');
        const costInput = form.querySelector('.maint-cost');
        const descInput = form.querySelector('.maint-desc');
        const historyListElement = wrapper.querySelector('.maintenance-list'); // Find list within the current panel

        // Get values (handle Flatpickr or native input)
        const dateValue = dateInput?._flatpickr?.selectedDates[0] || dateInput?.value;
        const typeValue = typeInput?.value.trim();
        const costValue = costInput?.value; // Get as string first
        const descValue = descInput?.value.trim();

        // Basic validation
        if (!dateValue || !typeValue || costValue === '' || costValue === null) {
            showNotification('Data, Tipo e Custo da manutenção são obrigatórios.', 'warning');
            return;
        }

        // Validate and parse cost
        const costFloat = parseFloat(costValue);
        if (isNaN(costFloat) || costFloat < 0) {
            showNotification('O Custo da manutenção deve ser um número igual ou maior que zero.', 'warning');
            return;
        }

        try {
            // Create a new Maintenance instance
            const newMaintenance = new Maintenance(dateValue, typeValue, costFloat, descValue);

            // Add maintenance to the selected vehicle (this validates the Maintenance object internally)
            if (selectedVehicle.addMaintenance(newMaintenance)) {
                // Success!
                if (historyListElement) {
                    renderMaintenanceHistory(historyListElement, selectedVehicle); // Update the list in the UI
                }
                form.reset(); // Clear the form
                if (dateInput?._flatpickr) {
                    dateInput._flatpickr.clear(); // Clear Flatpickr instance
                }
                garage.saveToLocalStorage(); // Save the updated vehicle data
                showNotification(`Manutenção "${typeValue}" registrada para ${selectedVehicle.model}.`, 'success');
                updateAllRelevantData(); // Update dashboard, stats, appointments
            } else {
                // addMaintenance returned false (likely validation failed inside Maintenance or Vehicle)
                // Specific error should have been logged/shown by the classes themselves.
                // We might show a generic failure message here if needed.
                showNotification('Falha ao adicionar registro de manutenção. Verifique os dados.', 'error');
            }
        } catch (error) {
            console.error("[Event ScheduleMaint] Error creating or adding maintenance:", error);
            showNotification(`Erro ao registrar manutenção: ${error.message}`, 'error');
        }
    }


    // --- Vehicle Action Handlers ---
    /** Gets the current details panel wrapper element. @function getCurrentDetailsWrapper */
    function getCurrentDetailsWrapper() {
        // Ensure we get the wrapper inside the main details content area
        return detailsContentArea?.querySelector('.vehicle-details-content-wrapper');
    }

    /** Handles the start vehicle button click. @function handleStartVehicle */
    function handleStartVehicle() {
        console.log("[Action] Start vehicle button clicked.");
        if (!selectedVehicle) return;
        if (selectedVehicle.start()) { // Attempt to start the engine
            const wrapper = getCurrentDetailsWrapper();
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle); // Update details panel UI
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); // Update card UI
            triggerVehicleCardAnimation(selectedVehicle.id, 'shake'); // Visual feedback
            // updateEngineSound(); // Update sound/visuals
            garage.saveToLocalStorage(); // Persist state change
        }
        // Notifications for success/failure are usually handled within the Vehicle class methods
    }

    /** Handles the stop vehicle button click. @function handleStopVehicle */
    function handleStopVehicle() {
        console.log("[Action] Stop vehicle button clicked.");
        if (!selectedVehicle) return;
        if (selectedVehicle.stop()) { // Attempt to stop the engine
            const wrapper = getCurrentDetailsWrapper();
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle);
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
            // stopEngineSound();
            garage.saveToLocalStorage();
        }
    }

    /** Handles the accelerate vehicle button click. @function handleAccelerateVehicle */
    function handleAccelerateVehicle() {
        console.log("[Action] Accelerate vehicle button clicked.");
        if (!selectedVehicle) return;
        if (selectedVehicle.accelerate()) { // Attempt to accelerate
            const wrapper = getCurrentDetailsWrapper();
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle);
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
            triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-forward');
            // updateEngineSound();
            garage.saveToLocalStorage();
        }
    }

    /** Handles the brake vehicle button click. @function handleBrakeVehicle */
    function handleBrakeVehicle() {
        console.log("[Action] Brake vehicle button clicked.");
        if (!selectedVehicle) return;
        if (selectedVehicle.brake()) { // Attempt to brake
            const wrapper = getCurrentDetailsWrapper();
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle);
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle);
            triggerVehicleCardAnimation(selectedVehicle.id, 'tilt-backward');
            // updateEngineSound(); // Speed changed, update sound
            garage.saveToLocalStorage();
        }
    }

    /** Handles the toggle turbo button click (SportsCar only). @function handleToggleTurbo */
    function handleToggleTurbo() {
        console.log("[Action] Toggle Turbo button clicked.");
        if (!(selectedVehicle instanceof SportsCar)) {
            console.warn("[Action ToggleTurbo] Ignored: Selected vehicle is not a SportsCar.");
            return;
        }
        if (selectedVehicle.toggleTurbo()) { // Attempt to toggle turbo
            const wrapper = getCurrentDetailsWrapper();
            if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle); // Update button text/state
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); // Update card pulse/info
            // updateEngineSound(); // Turbo might affect sound
            garage.saveToLocalStorage();
        }
    }

    /** Handles the load cargo button click (Truck only). @function handleLoadCargo */
    function handleLoadCargo() {
        console.log("[Action] Load Cargo button clicked.");
        if (!(selectedVehicle instanceof Truck)) {
             console.warn("[Action LoadCargo] Ignored: Selected vehicle is not a Truck.");
            return;
        }
        const wrapper = getCurrentDetailsWrapper();
        const cargoInput = wrapper?.querySelector('.cargo-amount');
        if (!wrapper || !cargoInput) {
             console.error("[Action LoadCargo] Wrapper or cargo input not found.");
            return;
        }
        const amountToLoad = cargoInput.value; // Get value from input

        if (selectedVehicle.loadCargo(amountToLoad)) { // Attempt to load cargo
            populateDetailsPanelContent(wrapper, selectedVehicle); // Update details UI (load indicator, clear input)
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); // Update card UI
            triggerVehicleCardAnimation(selectedVehicle.id, 'bounce'); // Visual feedback
            garage.saveToLocalStorage(); // Persist state
            updateAllRelevantData(); // Update stats if they depend on load (though currently they don't)
        }
         // Notification handled within Truck class
    }

    /** Handles the unload cargo button click (Truck only). @function handleUnloadCargo */
    function handleUnloadCargo() {
        console.log("[Action] Unload Cargo button clicked.");
         if (!(selectedVehicle instanceof Truck)) {
             console.warn("[Action UnloadCargo] Ignored: Selected vehicle is not a Truck.");
            return;
        }
        const wrapper = getCurrentDetailsWrapper();
        const cargoInput = wrapper?.querySelector('.cargo-amount');
         if (!wrapper || !cargoInput) {
             console.error("[Action UnloadCargo] Wrapper or cargo input not found.");
            return;
        }
        const amountToUnload = cargoInput.value; // Get value from input

        if (selectedVehicle.unloadCargo(amountToUnload)) { // Attempt to unload cargo
            populateDetailsPanelContent(wrapper, selectedVehicle); // Update details UI
            updateVehicleCardStatus(garageDisplay?.querySelector(`.vehicle-card[data-id="${selectedVehicle.id}"]`), selectedVehicle); // Update card UI
            triggerVehicleCardAnimation(selectedVehicle.id, 'bounce');
            garage.saveToLocalStorage();
            updateAllRelevantData();
        }
         // Notification handled within Truck class
    }


    // **** NEW: API Details Fetch Handler ****
    /**
     * Handles the click event for fetching external API details.
     * Uses async/await to call the API utility function and updates the UI.
     * @async
     */
    async function handleFetchApiDetails() {
        console.log("[Event] Fetch API Details button clicked.");
        if (!selectedVehicle) {
            console.warn("[API Event] No vehicle selected to fetch details for.");
            showNotification("Selecione um veículo primeiro.", "warning");
            return;
        }

        const wrapper = getCurrentDetailsWrapper();
        if (!wrapper) {
            console.error("[API Event] CRITICAL: Details panel wrapper not found!");
            showNotification("Erro interno: Painel de detalhes não encontrado.", "error");
            return;
        }

        const apiContentArea = wrapper.querySelector('.api-details-content');
        const fetchButton = wrapper.querySelector('.btn-fetch-api-details');

        if (!apiContentArea || !fetchButton) {
            console.error("[API Event] API content area or fetch button element not found in the details wrapper.");
            showNotification("Erro interno: Elementos da interface da API não encontrados.", "error");
            return;
        }

        // --- Provide visual feedback: Loading state ---
        apiContentArea.innerHTML = '<p class="placeholder-text">🔄 Carregando detalhes externos...</p>';
        fetchButton.disabled = true; // Disable button during fetch
        const buttonTextSpan = fetchButton.querySelector('span:last-child'); // Find the text part of the button
        if (buttonTextSpan) buttonTextSpan.textContent = 'Carregando...';

        // --- Construct the identifier for the API ---
        // Using "Make-Model" as defined in the JSON file. Adjust if your identifier logic differs.
        const identificadorApi = `${selectedVehicle.make}-${selectedVehicle.model}`;
        console.log(`[API Event] Constructed API identifier: ${identificadorApi}`);

        try {
            // --- Call the async function from utils.js ---
            // await pauses execution here until the promise resolves or rejects
            const apiData = await buscarDetalhesVeiculoAPI(identificadorApi);

            // --- Process the result ---
            if (apiData && !apiData.error) {
                // Success: Data received and no error flag
                console.log("[API Event] API data successfully received:", apiData);
                // Format and display the data nicely using a definition list (dl)
                apiContentArea.innerHTML = `
                    <dl class="api-data-list">
                        <dt>Valor FIPE (Estimado):</dt>
                        <dd>${apiData.valorFipeEstimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'N/D'}</dd>

                        <dt>Recall Pendente:</dt>
                        <dd class="${apiData.recallPendente ? 'recall-warning' : ''}">${apiData.recallPendente ? '⚠️ Sim' : '✅ Não'}</dd>

                        <dt>Próxima Revisão Rec. (km):</dt>
                        <dd>${apiData.ultimaRevisaoRecomendadaKm?.toLocaleString('pt-BR') ?? 'N/D'} km</dd>

                        <dt>Dica de Manutenção:</dt>
                        <dd>${apiData.dicaManutencao || 'Nenhuma dica específica disponível.'}</dd>
                    </dl>
                `;
                 showNotification("Dados externos carregados com sucesso.", "success", 2500);

            } else if (apiData && apiData.error) {
                 // API function returned an error object (e.g., HTTP error, JSON parse error)
                 console.error("[API Event] Error reported by API fetch function:", apiData.message);
                 apiContentArea.innerHTML = `<p class="error-text">❌ Erro ao buscar dados: ${apiData.message}</p>`;
                 showNotification(`Erro ao buscar dados externos: ${apiData.message}`, "error");

            } else if (apiData === null) {
                // API function returned null, meaning the identifier was not found in the JSON data
                console.log("[API Event] Data not found for this identifier in the API data.");
                apiContentArea.innerHTML = '<p class="placeholder-text">ℹ️ Detalhes externos não encontrados para este modelo de veículo.</p>';
                 showNotification("Dados externos não disponíveis para este modelo.", "info", 3000);

            } else {
                 // Unexpected case: apiData is falsy but not null and not an error object
                 console.error("[API Event] Unexpected response from buscarDetalhesVeiculoAPI:", apiData);
                 apiContentArea.innerHTML = '<p class="error-text">❌ Resposta inesperada da API.</p>';
                 showNotification("Erro inesperado ao processar dados da API.", "error");
            }
        } catch (error) {
            // --- Catch unexpected errors during the await/processing ---
            // This might catch errors if the async function itself throws unexpectedly
            console.error("[API Event] Unexpected error occurred during handleFetchApiDetails:", error);
            apiContentArea.innerHTML = '<p class="error-text">❌ Erro inesperado ao buscar detalhes. Verifique o console.</p>';
            showNotification("Erro inesperado ao buscar dados externos.", "error");
        } finally {
            // --- Always re-enable the button and reset text ---
            fetchButton.disabled = false;
            if (buttonTextSpan) buttonTextSpan.textContent = 'Ver Dados Externos';
            console.log("[API Event] Fetch process finished.");
        }
    }


    // --- Helper to Update All Data Displays ---
    /** Updates data across different tabs (Dashboard, Stats, Appointments). @function updateAllRelevantData */
    function updateAllRelevantData() {
        console.log("[Update] Updating cross-tab data displays (Dashboard, Stats, Appointments)...");
        try {
            renderDashboard();
            renderStats();
            renderFutureAppointmentsList();
        } catch (error) {
            console.error("Error during updateAllRelevantData:", error);
            showNotification("Erro ao atualizar dados gerais da aplicação.", "error");
        }
    }

    // --- Run Application ---
    try {
        initializeApp(); // Start the application initialization process
    } catch (globalError) {
        // Catch any critical errors during the initial setup phase
        console.error("======== GLOBAL INITIALIZATION ERROR ========", globalError);
        alert("Erro Crítico na inicialização da aplicação! A aplicação não pode continuar. Verifique o console para detalhes.");
        // Display a user-friendly error message on the page
        document.body.innerHTML = `
            <div class="error-text" style="padding: 2rem; text-align: center;">
                <h1>Erro Crítico na Inicialização</h1>
                <p>A aplicação falhou ao iniciar. Por favor, verifique o console do navegador (F12) para mais detalhes técnicos.</p>
                <pre style="text-align: left; background: #333; color: #fdd; padding: 1rem; border-radius: 5px; overflow-x: auto; margin-top: 1rem;">${globalError.stack || globalError.message}</pre>
            </div>`;
    }

}); // End DOMContentLoaded Listener
// --- END OF FILE main.js ---