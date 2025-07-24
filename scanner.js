const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { ObjectId } = require("mongodb");

// --- Asegurar carpeta de uploads ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- Configuración de Multer para adjuntos ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ----------------------------------------
// RUTAS DE PAQUETES (sin cambios en tu lógica)
// ----------------------------------------

// Escáner para crear un nuevo paquete con estado "Recibido"
router.post("/recibido", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const collection = global.db.collection("estados");
    const paqueteExistente = await collection.findOne({ paquete_id });
    if (paqueteExistente) {
      return res.status(400).json({ error: "El paquete ya existe con estado inicial." });
    }
    const fechaActual = new Date().toISOString();
    const nuevoPaquete = {
      paquete_id,
      estado_actual: "Recibido",
      historial: [{ estado: "Recibido", fecha: fechaActual }],
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
        $push: { historial: { estado: "En tránsito nacional MX", fecha: fechaActual } }
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
        $push: { historial: { estado: "En tránsito nacional EU", fecha: fechaActual } }
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
        $push: { historial: { estado: "En tránsito internacional", fecha: fechaActual } }
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
        $push: { historial: { estado: "En almacén EU", fecha: fechaActual } }
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
        $push: { historial: { estado: "En almacén MX", fecha: fechaActual } }
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

// Ruta para devolver todos los paquetes (historial completo) con conteo de incidencias y paginación
router.get("/all", async (req, res) => {
  try {
    const estadosCol = global.db.collection("estados");
    const incCol     = global.db.collection("Incidencias");

    // Parámetros de paginación
    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(req.query.pageSize, 10) || 10);

    // Total de paquetes
    const totalItems = await estadosCol.countDocuments({});

    // Traer sólo la página solicitada
    const paquetes = await estadosCol
      .find({})
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    // Enriquecer cada paquete con el número de incidencias
    const items = await Promise.all(paquetes.map(async p => {
      const cnt = await incCol.countDocuments({ paquete_id: p.paquete_id });
      return { ...p, incidencias_count: cnt };
    }));

    // Respuesta con metadata de paginación
    res.json({
      totalItems,
      page,
      pageSize,
      items
    });
  } catch (error) {
    console.error("Error al obtener todos los paquetes:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ----------------------------------------
// RUTAS DE INCIDENCIAS
// ----------------------------------------

// Crear nueva incidencia (con adjuntos) usando ID personalizado PAQUETE-IN
router.post(
  "/incidencias",
  upload.array("adjuntos"),
  async (req, res) => {
    const { paquete_id, tipo, descripcion } = req.body;
    if (!paquete_id || !tipo || !descripcion) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }
    try {
      const collection = global.db.collection("Incidencias");
      const fecha      = new Date().toISOString();
      // ID basado en código de paquete + sufijo "-IN"
      const incId      = `${paquete_id}-IN`;

      const incidencia = {
        _id: incId,
        paquete_id,
        tipo,
        descripcion,
        estado: "Abierta",
        fecha_creacion: fecha,
        historial: [{ estado: "Abierta", fecha }],
        adjuntos: (req.files || []).map(f => `/uploads/${f.filename}`)
      };

      await collection.insertOne(incidencia);
      res.status(201).json({ message: "Incidencia creada.", id: incId });
    } catch (err) {
      console.error("Error al crear incidencia:", err);
      res.status(500).json({ error: "Error interno al crear incidencia." });
    }
  }
);

// Listar todas las incidencias
router.get("/incidencias", async (req, res) => {
  try {
    const collection   = global.db.collection("Incidencias");
    const incidencias  = await collection.find({}).toArray();
    res.json(incidencias);
  } catch (err) {
    console.error("Error al obtener incidencias:", err);
    res.status(500).json({ error: "Error interno al obtener incidencias." });
  }
});

// Obtener una incidencia por su nuevo ID
router.get("/incidencias/:id", async (req, res) => {
  try {
    const collection = global.db.collection("Incidencias");
    const incidencia = await collection.findOne({ _id: req.params.id });
    if (!incidencia) {
      return res.status(404).json({ error: "Incidencia no encontrada." });
    }
    res.json(incidencia);
  } catch (err) {
    console.error("Error al obtener incidencia:", err);
    res.status(500).json({ error: "Error interno al obtener incidencia." });
  }
});

// Actualizar estado o añadir comentario a una incidencia
router.put("/incidencias/:id", async (req, res) => {
  const { nuevo_estado, comentario } = req.body;
  if (!nuevo_estado && !comentario) {
    return res.status(400).json({ error: "Debe enviar 'nuevo_estado' o 'comentario'." });
  }
  try {
    const collection = global.db.collection("Incidencias");
    const updates    = {};
    const pushOps    = [];
    const fecha      = new Date().toISOString();

    if (nuevo_estado) {
      updates.estado = nuevo_estado;
      pushOps.push({ estado: nuevo_estado, fecha });
    }
    if (comentario) {
      pushOps.push({ comentario, fecha });
    }

    await collection.updateOne(
      { _id: req.params.id },
      {
        $set: updates,
        $push: { historial: { $each: pushOps } }
      }
    );
    res.json({ message: "Incidencia actualizada." });
  } catch (err) {
    console.error("Error al actualizar incidencia:", err);
    res.status(500).json({ error: "Error interno al actualizar incidencia." });
  }
});

module.exports = router;
