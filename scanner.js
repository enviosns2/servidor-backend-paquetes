// routes/scanner.js
const express    = require("express");
const router     = express.Router();
const fs         = require("fs");
const path       = require("path");
const multer     = require("multer");
const { ObjectId } = require("mongodb");

// --- Asegurar carpeta de uploads ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- Configuración de Multer para adjuntos ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ----------------------------------------
// RUTAS DE PAQUETES (lógica existente)
// ----------------------------------------

// [POST] /scanner/recibido
router.post("/recibido", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    if (await col.findOne({ paquete_id })) {
      return res.status(400).json({ error: "El paquete ya existe con estado inicial." });
    }
    const fecha = new Date().toISOString();
    const nuevo = {
      paquete_id,
      estado_actual: "Recibido",
      historial: [{ estado: "Recibido", fecha }]
    };
    const { insertedId } = await col.insertOne(nuevo);
    res.status(201).json({ message: "Paquete creado exitosamente.", id: insertedId });
  } catch (err) {
    console.error("Error al crear paquete:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /scanner/en-transito-nacional-mx
router.put("/en-transito-nacional-mx", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    const p   = await col.findOne({ paquete_id });
    if (!p) return res.status(404).json({ error: "El paquete no existe en la base de datos." });
    const fecha = new Date().toISOString();
    const { modifiedCount } = await col.updateOne(
      { paquete_id },
      {
        $set:  { estado_actual: "En tránsito nacional MX" },
        $push: { historial: { estado: "En tránsito nacional MX", fecha } }
      }
    );
    if (!modifiedCount) return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
    res.json({ message: "Paquete marcado como 'En tránsito nacional MX' correctamente." });
  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /scanner/en-transito-nacional-eu
router.put("/en-transito-nacional-eu", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    const p   = await col.findOne({ paquete_id });
    if (!p) return res.status(404).json({ error: "El paquete no existe en la base de datos." });
    const fecha = new Date().toISOString();
    const { modifiedCount } = await col.updateOne(
      { paquete_id },
      {
        $set:  { estado_actual: "En tránsito nacional EU" },
        $push: { historial: { estado: "En tránsito nacional EU", fecha } }
      }
    );
    if (!modifiedCount) return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
    res.json({ message: "Paquete marcado como 'En tránsito nacional EU' correctamente." });
  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /scanner/en-transito-internacional
router.put("/en-transito-internacional", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    const p   = await col.findOne({ paquete_id });
    if (!p) return res.status(404).json({ error: "El paquete no existe en la base de datos." });
    const fecha = new Date().toISOString();
    const { modifiedCount } = await col.updateOne(
      { paquete_id },
      {
        $set:  { estado_actual: "En tránsito internacional" },
        $push: { historial: { estado: "En tránsito internacional", fecha } }
      }
    );
    if (!modifiedCount) return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
    res.json({ message: "Paquete marcado como 'En tránsito internacional' correctamente." });
  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /scanner/en-almacen-eu
router.put("/en-almacen-eu", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    const p   = await col.findOne({ paquete_id });
    if (!p) return res.status(404).json({ error: "El paquete no existe en la base de datos." });
    const fecha = new Date().toISOString();
    const { modifiedCount } = await col.updateOne(
      { paquete_id },
      {
        $set:  { estado_actual: "En almacén EU" },
        $push: { historial: { estado: "En almacén EU", fecha } }
      }
    );
    if (!modifiedCount) return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
    res.json({ message: "Paquete marcado como 'En almacén EU' correctamente." });
  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /scanner/en-almacen-mx
router.put("/en-almacen-mx", async (req, res) => {
  const { paquete_id } = req.body;
  if (!paquete_id || typeof paquete_id !== "string") {
    return res.status(400).json({ error: "El campo 'paquete_id' es requerido y debe ser un string válido." });
  }
  try {
    const col = global.db.collection("estados");
    const p   = await col.findOne({ paquete_id });
    if (!p) return res.status(404).json({ error: "El paquete no existe en la base de datos." });
    const fecha = new Date().toISOString();
    const { modifiedCount } = await col.updateOne(
      { paquete_id },
      {
        $set:  { estado_actual: "En almacén MX" },
        $push: { historial: { estado: "En almacén MX", fecha } }
      }
    );
    if (!modifiedCount) return res.status(500).json({ error: "No se pudo actualizar el paquete. Intenta nuevamente." });
    res.json({ message: "Paquete marcado como 'En almacén MX' correctamente." });
  } catch (err) {
    console.error("Error en el servidor:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ----------------------------------------
// RUTA MEJORADA PARA HISTORIAL CON PAGINACIÓN Y ORDEN GLOBAL
// ----------------------------------------
/**
 * GET /scanner/all
 * Query params:
 *   - page       (número de página, default 1)
 *   - pageSize   (tamaño de página, default 10)
 *   - sortField  ('time' | 'id', default 'time')
 *   - sortOrder  ('asc' | 'desc', default 'desc')
 *   - state      (filtro por estado_actual)
 */
router.get("/all", async (req, res) => {
  try {
    const estadosCol = global.db.collection("estados");
    const incCol     = global.db.collection("Incidencias");

    // Parámetros
    const page      = Math.max(1, parseInt(req.query.page,     10) || 1);
    const pageSize  = Math.max(1, parseInt(req.query.pageSize, 10) || 10);
    const sortField = req.query.sortField === "id" ? "paquete_id" : "lastFecha";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const match     = {};
    if (req.query.state) match.estado_actual = req.query.state;

    // Pipeline con extracción correcta de última fecha
    const pipeline = [
      { $match: match },
      { $project: {
          paquete_id:    1,
          estado_actual: 1,
          historial:     1,
          // EXTRAEMOS ÚLTIMA FECHA CON $arrayElemAt
          lastFecha:     { $arrayElemAt: ["$historial.fecha", -1] }
      }},
      { $sort: { [sortField]: sortOrder } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    ];

    const [docs, totalItems] = await Promise.all([
      estadosCol.aggregate(pipeline).toArray(),
      estadosCol.countDocuments(match)
    ]);

    const items = await Promise.all(docs.map(async doc => {
      const cnt = await incCol.countDocuments({ paquete_id: doc.paquete_id });
      return {
        paquete_id:        doc.paquete_id,
        estado_actual:     doc.estado_actual,
        historial:         doc.historial,
        incidencias_count: cnt
      };
    }));

    res.json({ totalItems, page, pageSize, items });
  } catch (err) {
    console.error("Error al obtener todos los paquetes:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ----------------------------------------
// RUTAS DE INCIDENCIAS (sin cambios)
// ----------------------------------------
router.post("/incidencias", upload.array("adjuntos"), async (req, res) => {
  const { paquete_id, tipo, descripcion } = req.body;
  if (!paquete_id || !tipo || !descripcion) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  try {
    const collection = global.db.collection("Incidencias");
    const fecha      = new Date().toISOString();
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
});

router.get("/incidencias", async (req, res) => {
  try {
    const collection  = global.db.collection("Incidencias");
    const incidencias = await collection.find({}).toArray();
    res.json(incidencias);
  } catch (err) {
    console.error("Error al obtener incidencias:", err);
    res.status(500).json({ error: "Error interno al obtener incidencias." });
  }
});

router.get("/incidencias/:id", async (req, res) => {
  try {
    const collection = global.db.collection("Incidencias");
    const inc        = await collection.findOne({ _id: req.params.id });
    if (!inc) return res.status(404).json({ error: "Incidencia no encontrada." });
    res.json(inc);
  } catch (err) {
    console.error("Error al obtener incidencia:", err);
    res.status(500).json({ error: "Error interno al obtener incidencia." });
  }
});

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
