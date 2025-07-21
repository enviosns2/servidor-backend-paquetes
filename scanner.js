const express = require("express");
const router = express.Router();

// Escáner para crear un nuevo paquete con estado "Recibido"
router.post("/recibido", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");

        // Verifica si el paquete ya existe
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (paqueteExistente) {
            return res.status(400).json({ error: "El paquete ya existe con estado inicial." });
        }

        // Crea un nuevo paquete con estado "Recibido"
        const fechaActual = new Date().toISOString(); // Fecha en formato estándar
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
        console.error("Error al crear paquete:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En tránsito nacional MX"
router.put("/en-transito-nacional-mx", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        const fechaActual = new Date().toISOString();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En tránsito nacional MX" },
                $push: {
                    historial: {
                        estado: "En tránsito nacional MX",
                        fecha: fechaActual,
                    },
                },
            }
        );

        if (resultado.modifiedCount === 0) {
            return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
        }
        res.json({ message: "Paquete marcado como 'En tránsito nacional MX' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En tránsito nacional EU"
router.put("/en-transito-nacional-eu", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        const fechaActual = new Date().toISOString();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En tránsito nacional EU" },
                $push: {
                    historial: {
                        estado: "En tránsito nacional EU",
                        fecha: fechaActual,
                    },
                },
            }
        );

        if (resultado.modifiedCount === 0) {
            return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
        }
        res.json({ message: "Paquete marcado como 'En tránsito nacional EU' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En tránsito internacional"
router.put("/en-transito-internacional", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        const fechaActual = new Date().toISOString();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En tránsito internacional" },
                $push: {
                    historial: {
                        estado: "En tránsito internacional",
                        fecha: fechaActual,
                    },
                },
            }
        );

        if (resultado.modifiedCount === 0) {
            return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
        }
        res.json({ message: "Paquete marcado como 'En tránsito internacional' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En almacén EU"
router.put("/en-almacen-eu", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        const fechaActual = new Date().toISOString();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En almacén EU" },
                $push: {
                    historial: {
                        estado: "En almacén EU",
                        fecha: fechaActual,
                    },
                },
            }
        );

        if (resultado.modifiedCount === 0) {
            return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
        }
        res.json({ message: "Paquete marcado como 'En almacén EU' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// Escáner para marcar como "En almacén MX"
router.put("/en-almacen-mx", async (req, res) => {
    const { paquete_id } = req.body;

    if (!paquete_id || typeof paquete_id !== "string") {
        return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
    }

    try {
        const collection = global.db.collection("estados");
        const paqueteExistente = await collection.findOne({ paquete_id });
        if (!paqueteExistente) {
            return res.status(404).json({ error: "El paquete no existe en la base de datos." });
        }

        const fechaActual = new Date().toISOString();
        const resultado = await collection.updateOne(
            { paquete_id },
            {
                $set: { estado_actual: "En almacén MX" },
                $push: {
                    historial: {
                        estado: "En almacén MX",
                        fecha: fechaActual,
                    },
                },
            }
        );

        if (resultado.modifiedCount === 0) {
            return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
        }
        res.json({ message: "Paquete marcado como 'En almacén MX' correctamente." });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

module.exports = router;
