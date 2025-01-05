const express = require("express");
const router = express.Router();

// Middleware para validar datos de entrada
const validateRequestBody = (req, res, next) => {
  const { paquete_id, nuevoEstado } = req.body;
  if (!paquete_id || !nuevoEstado) {
    return res
      .status(400)
      .json({ error: "Faltan datos: 'paquete_id' y 'nuevoEstado' son requeridos." });
  }
  next();
};

// Endpoint para actualizar el estado de un paquete basado en el escáner
router.put("/actualizar-estado", validateRequestBody, async (req, res) => {
  const { paquete_id, nuevoEstado } = req.body;

  try {
    // Verificar que `db` esté definido globalmente
    if (!global.db) {
      return res.status(500).json({ error: "La base de datos no está configurada." });
    }

    const collection = global.db.collection("estados"); // Selecciona la colección en MongoDB
    const fechaActual = new Date(); // Fecha y hora actual

    // Actualiza el estado del paquete y agrega un historial
    const resultado = await collection.updateOne(
      { paquete_id }, // Busca el paquete por su ID
      {
        $set: { estado_actual: nuevoEstado }, // Actualiza el estado actual
        $push: {
          historial: {
            estado: nuevoEstado,
            fecha: fechaActual,
          },
        },
      }
    );

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json({ message: "Estado actualizado correctamente." });
  } catch (error) {
    console.error("Error en la actualización:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

module.exports = router;
