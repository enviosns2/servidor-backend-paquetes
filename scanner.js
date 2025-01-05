const express = require("express");
const router = express.Router();

// Escáner para crear un nuevo paquete con estado "Recibido"
router.post("/recibido", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id) {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido." });
    }

    try {
        const collection = global.db.collection("estados");

        // Verifica si el paquete ya existe
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (paqueteExistente) {
            return res.status(400).json({ error: "El paquete ya existe con estado inicial." });
        }

        // Crea un nuevo paquete con estado "Recibido"
        const fechaActual = new Date();
        const nuevoPaquete = {
            paquete_id,
            estado_actual: "Recibido",
            historial: [
                {
                    estado: "Recibido",
                    fecha: fechaActual,
                },
            ],
        };

        const resultado = await collection.insertOne(nuevoPaquete);
        res.status(201).json({ message: "Paquete creado exitosamente.", id: resultado.insertedId });
    } catch (error) {
        console.error("Error al crear paquete:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En Camino"
router.put("/en-camino", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id) {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido." });
    }

    try {
        const collection = global.db.collection("estados");

        // Verifica el estado actual del paquete
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        if (paqueteExistente.estado_actual !== "Recibido") {
            return res.status(400).json({ error: "El paquete no está listo para ser marcado como 'En Camino'." });
        }

        // Actualiza el estado del paquete a "En Camino"
        const fechaActual = new Date();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En Camino" },
                $push: {
                    historial: {
                        estado: "En Camino",
                        fecha: fechaActual,
                    },
                },
            }
        );

        res.json({ message: "Paquete marcado como 'En Camino' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

module.exports = router;
