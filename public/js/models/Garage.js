class Garage {
  constructor() {
    this.vehicles = [];
    this.publicVehicles = [];
    console.log("[Garage] API-driven Garage initialized.");
  }

  async loadFromAPI() {
    console.log("[Garage] Attempting to load user vehicles from API...");
    try {
      const vehiclesData = await apiGetAllVehicles(); 
      if (!Array.isArray(vehiclesData)) {
        throw new Error("API did not return a valid array of vehicles.");
      }
      this.vehicles = vehiclesData.map(data => reconstructVehicle(data)).filter(Boolean);
      console.log(`[Garage] Successfully loaded ${this.vehicles.length} user vehicles from API.`);
      return true;
    } catch (error) {
      console.error("CRITICAL: Failed to load vehicles from API.", error);
      this.vehicles = [];
      return false;
    }
  }

  async loadPublicVehicles() {
      console.log("[Garage] Attempting to load public vehicles from API...");
      try {
          const publicData = await apiGetPublicVehicles();
          if (!Array.isArray(publicData)) {
              throw new Error("API did not return a valid array for public vehicles.");
          }
          this.publicVehicles = publicData.map(data => reconstructVehicle(data)).filter(Boolean);
          console.log(`[Garage] Successfully loaded ${this.publicVehicles.length} public vehicles.`);
          return true;
      } catch (error) {
          console.error("Failed to load public vehicles:", error);
          this.publicVehicles = [];
          showNotification(`Erro ao carregar garagem pública: ${error.message}`, "error");
          return false;
      }
  }

  async addVehicle(vehicleObject) {
    if (!(vehicleObject instanceof Vehicle)) {
      console.error("[Garage] Attempted to add an invalid object.", vehicleObject);
      return null;
    }
    try {
      const newVehicleData = await apiAddVehicle(vehicleObject.toJSON());
      const reconstructed = reconstructVehicle(newVehicleData);
      if (reconstructed) {
        this.vehicles.push(reconstructed);
      }
      console.log(`[Garage] API confirmed addition of ${newVehicleData.model}.`);
      return newVehicleData;
    } catch (error) {
      console.error(`[Garage] API failed to add vehicle ${vehicleObject.model}.`, error);
      throw error;
    }
  }

  async removeVehicle(vehicleId) {
    try {
      await apiRemoveVehicle(vehicleId);
      const index = this.vehicles.findIndex(v => v.id === vehicleId);
      if (index > -1) {
        this.vehicles.splice(index, 1);
      }
      return true;
    } catch (error) {
      console.error(`[Garage] API failed to remove vehicle ID ${vehicleId}.`, error);
      throw error;
    }
  }

  findVehicle(vehicleId, isPublicList = false) {
      const list = isPublicList ? this.publicVehicles : this.vehicles;
      return list.find(v => v.id === vehicleId);
  }
  
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
    appointments.sort((a, b) => a.maintenance.date.getTime() - b.maintenance.date.getTime());
    return appointments;
  }
}