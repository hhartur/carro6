const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const SharedVehicle = require("../models/SharedVehicle");
const Friendship = require("../models/Friendship");
const Notification = require("../models/Notification");
const { protect } = require('../middleware/auth');
const { sendNotification } = require("../lib/socket");
const multer = require('multer'); // Import multer
const imagekitModule = require('../lib/imagekit'); // Import the entire module
const uploadImage = imagekitModule.uploadImage;
const deleteImage = imagekitModule.deleteImage;

const upload = multer({ storage: multer.memoryStorage() }); // Configure multer for memory storage

// Busca todos os veículos do usuário logado
router.get("/vehicles", protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ make: 1, model: 1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Busca todos os veículos públicos
router.get("/public-vehicles", async (req, res) => {
  try {
    const publicVehicles = await Vehicle.find({ isPublic: true }).sort({ createdAt: -1 }).populate('owner', 'username');
    res.json(publicVehicles);
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Adiciona um novo veículo
router.post("/vehicles", protect, upload.single('image'), async (req, res) => {
  try {
    const vehicleData = { ...req.body, owner: req.user._id };

    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer, req.file.originalname, 'vehicles');
      vehicleData.imageUrl = uploadResult.url;
      vehicleData.imageId = uploadResult.fileId;
    }

    const newVehicle = new Vehicle(vehicleData);
    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  }
});

// Atualiza os dados principais de um veículo
router.put("/vehicles/:id", protect, upload.single('image'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

    // Impede a atualização de campos sensíveis
    delete req.body.owner;
    delete req.body.maintenanceHistory; 

    const updateData = { ...req.body };

    if (req.file) {
      // If a new image is uploaded, delete the old one if it exists
      if (vehicle.imageId) {
        await deleteImage(vehicle.imageId);
      }
      const uploadResult = await uploadImage(req.file.buffer, req.file.originalname, 'vehicles');
      updateData.imageUrl = uploadResult.url;
      updateData.imageId = uploadResult.fileId;
    } else if (req.body.imageUrl === '') { // Allow clearing the image
      // If imageUrl is explicitly set to empty, delete the old image if it exists
      if (vehicle.imageId) {
        await deleteImage(vehicle.imageId);
      }
      updateData.imageUrl = '';
      updateData.imageId = ''; // Clear imageId as well
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicle._id, updateData, { new: true, runValidators: true });
    res.json(updatedVehicle);
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  }
});

// Alterna a privacidade de um veículo
router.put("/vehicles/:id/privacy", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        vehicle.isPublic = !!req.body.isPublic;
        await vehicle.save();
        res.json({ id: vehicle.id, isPublic: vehicle.isPublic });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

router.get("/vehicles/:id/privacy", async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        res.json({ id: vehicle.id, isPublic: vehicle.isPublic });
    } catch (err) { 
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Deleta um veículo
router.delete("/vehicles/:id", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
    if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

    // Delete image from ImageKit if it exists
    if (vehicle.imageId) {
      const imageDeleted = await deleteImage(vehicle.imageId);
      if (!imageDeleted) {
        console.warn(`Falha ao deletar imagem ${vehicle.imageId} do ImageKit, mas o veículo será removido.`);
        // Optionally, you could send a different status or message here
      }
    }

    await Vehicle.findByIdAndDelete(vehicle._id);
    res.status(200).json({ message: "Veículo deletado com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar veículo:", err); // Add specific logging
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- ROTAS CRUD PARA MANUTENÇÃO (SUB-RECURSO) ---

// Busca todos os registros de manutenção de um veículo
router.get("/vehicles/:vehicleId/maintenance", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });
        res.json(vehicle.maintenanceHistory);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Adiciona um novo registro de manutenção
router.post("/vehicles/:vehicleId/maintenance", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });
        
        vehicle.maintenanceHistory.push(req.body);
        vehicle.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const updatedVehicle = await vehicle.save();
        res.status(201).json(updatedVehicle);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Atualiza um registro de manutenção específico
router.put("/vehicles/:vehicleId/maintenance/:maintId", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        const maintenance = vehicle.maintenanceHistory.find(m => m.id === req.params.maintId);
        if (!maintenance) return res.status(404).json({ error: "Registro de manutenção não encontrado." });

        // Atualiza os campos
        maintenance.date = req.body.date || maintenance.date;
        maintenance.type = req.body.type || maintenance.type;
        maintenance.cost = req.body.cost !== undefined ? req.body.cost : maintenance.cost;
        maintenance.description = req.body.description !== undefined ? req.body.description : maintenance.description;

        vehicle.maintenanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        await vehicle.save();
        res.json(maintenance);
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Deleta um registro de manutenção específico
router.delete("/vehicles/:vehicleId/maintenance/:maintId", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.vehicleId, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });
        
        const initialCount = vehicle.maintenanceHistory.length;
        vehicle.maintenanceHistory = vehicle.maintenanceHistory.filter(m => m.id !== req.params.maintId);
        
        if (vehicle.maintenanceHistory.length === initialCount) {
            return res.status(404).json({ error: "Registro de manutenção não encontrado." });
        }

        await vehicle.save();
        res.status(200).json({ message: "Registro de manutenção deletado com sucesso." });
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para compartilhar um veiculo
router.post("/vehicles/:id/share", protect, async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ id: req.params.id, owner: req.user._id });
        if (!vehicle) return res.status(404).json({ error: "Veículo não encontrado ou não autorizado." });

        const { friendId } = req.body;
        const ownerId = req.user._id;

        const friendship = await Friendship.findOne({
            $or: [
                { requester: ownerId, recipient: friendId },
                { requester: friendId, recipient: ownerId },
            ],
            status: "accepted",
        });

        if (!friendship) {
            return res.status(400).json({ error: "Você só pode compartilhar veículos com amigos." });
        }

        const existingShare = await SharedVehicle.findOne({ vehicle: vehicle._id, sharedWith: friendId });
        if (existingShare) {
            return res.status(400).json({ error: "Este veículo já foi compartilhado com este usuário." });
        }

        const newShare = new SharedVehicle({
            vehicle: vehicle._id,
            owner: ownerId,
            sharedWith: friendId,
        });

        await newShare.save();

        // Salvar notificação no banco
        const notification = new Notification({
          user: friendId,
          message: `${req.user.username} compartilhou um veículo com você.`,
          type: 'VEHICLE_SHARED',
          data: {
            vehicleId: vehicle.id,
            vehicleName: `${vehicle.make} ${vehicle.model}`,
            owner: {
              _id: req.user._id,
              username: req.user.username
            }
          }
        });
        await notification.save();

        sendNotification(friendId.toString(), {
            type: 'VEHICLE_SHARED',
            message: `${req.user.username} compartilhou um veículo com você.`,
            data: {
                vehicleId: vehicle.id,
                vehicleName: `${vehicle.make} ${vehicle.model}`,
                owner: {
                    _id: req.user._id,
                    username: req.user.username
                }
            }
        });

        res.status(201).json(newShare);

    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para buscar veiculos compartilhados com o usuario
router.get("/vehicles/shared", protect, async (req, res) => {
    try {
        const sharedVehicles = await SharedVehicle.find({ sharedWith: req.user._id })
            .populate({
                path: 'vehicle',
                populate: { path: 'owner', select: 'username' }
            });

        res.json(sharedVehicles.map(sv => sv.vehicle));
    } catch (err) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});


module.exports = router;