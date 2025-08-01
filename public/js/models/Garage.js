// ARQUIVO COMPLETO: /public/js/models/Garage.js
// Esta classe agora gerencia a coleção de veículos comunicando-se com a API.

/**
 * @file Garage.js
 * @description Manages the collection of vehicles by fetching and manipulating data
 *              via a backend API, replacing the previous LocalStorage implementation.
 */
class Garage {
  constructor() {
    this.vehicles = []; // Acts as a client-side cache of the vehicles.
    console.log("[Garage] API-driven Garage initialized.");
  }

  /**
   * Fetches all vehicles from the backend API and populates the local cache.
   * This is the new "source of truth" for loading data.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async loadFromAPI() {
    console.log("[Garage] Attempting to load vehicles from API...");
    try {
      const vehiclesData = await apiGetAllVehicles(); // from utils.js

      if (!Array.isArray(vehiclesData)) {
        throw new Error("API did not return a valid array of vehicles.");
      }

      const reconstructedVehicles = vehiclesData.map(data => {
        switch (data._type) {
          case 'Car': return Car.fromJSON(data);
          case 'SportsCar': return SportsCar.fromJSON(data);
          case 'Truck': return Truck.fromJSON(data);
          default:
            console.warn(`[Garage] Unknown vehicle type '${data._type}' received from API.`, data);
            return null;
        }
      }).filter(Boolean); // Filter out any nulls from failed reconstructions

      this.vehicles = reconstructedVehicles;
      console.log(`[Garage] Successfully loaded and reconstructed ${this.vehicles.length} vehicles from API.`);
      return true;

    } catch (error) {
      console.error("CRITICAL: Failed to load vehicles from API.", error);
      showNotification(`Erro fatal ao carregar dados do servidor: ${error.message}`, "error", 8000);
      this.vehicles = []; // Reset to empty on critical error
      return false;
    }
  }

  /**
   * Adds a vehicle to the garage by sending it to the backend API.
   * @param {Vehicle} vehicleObject - The vehicle instance to add.
   * @returns {Promise<object|null>} The saved vehicle data from the API, or null on failure.
   */
  async addVehicle(vehicleObject) {
    if (!(vehicleObject instanceof Vehicle)) {
      console.error("[Garage] Attempted to add an invalid object.", vehicleObject);
      return null;
    }
    try {
      const newVehicleData = await apiAddVehicle(vehicleObject.toJSON());
      console.log(`[Garage] API confirmed addition of ${newVehicleData.model}.`);
      return newVehicleData; // Return the created vehicle data
    } catch (error) {
      console.error(`[Garage] API failed to add vehicle ${vehicleObject.model}.`, error);
      // Notification is handled in the main.js logic
      throw error; // Propagate error to be caught by the handler
    }
  }

  /**
   * Removes a vehicle by its ID via a backend API call.
   * @param {string} vehicleId - The ID of the vehicle to remove.
   * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
   */
  async removeVehicle(vehicleId) {
    try {
      await apiRemoveVehicle(vehicleId);
      console.log(`[Garage] API confirmed removal of vehicle ID ${vehicleId}.`);
      // Also remove from the local cache for immediate UI update
      const index = this.vehicles.findIndex(v => v.id === vehicleId);
      if (index > -1) {
        this.vehicles.splice(index, 1);
      }
      return true;
    } catch (error) {
      console.error(`[Garage] API failed to remove vehicle ID ${vehicleId}.`, error);
      throw error; // Propagate error
    }
  }

  /**
   * Finds a vehicle in the local cache by its ID.
   * @param {string} vehicleId - The ID of the vehicle to find.
   * @returns {Vehicle|undefined} The vehicle instance or undefined if not found.
   */
  findVehicle(vehicleId) {
    return this.vehicles.find(v => v.id === vehicleId);
  }
  
  /**
   * Gets all future maintenance appointments from the locally cached vehicles.
   * @returns {Array<object>} An array of appointment objects, sorted by date.
   */
  getAllFutureAppointments() {
    const appointments = [];
    this.vehicles.forEach(vehicle => {
      vehicle.getFutureAppointments().forEach(maint => {
        appointments.push({
          vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
          vehicleId: vehicle.id,
          maintenance: maint,
        });
      });
    });
    // Sort all appointments by date, soonest first
    appointments.sort((a, b) => a.maintenance.date.getTime() - b.maintenance.date.getTime());
    return appointments;
  }
}