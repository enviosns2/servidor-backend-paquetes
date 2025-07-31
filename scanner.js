
// routes/scanner.js
const express      = require("express");
const router       = express.Router();
const fs           = require("fs");
const path         = require("path");
const multer       = require("multer");
const { ObjectId } = require("mongodb");
const { Storage }  = require("@google-cloud/storage");

// --- Google Cloud Storage config ---
const GCP_BUCKET = process.env.GCP_BUCKET_NAME || "mi-app-incidencias-2025";
let gcpCreds = process.env.GCP_SERVICE_ACCOUNT_JSON;
if (gcpCreds && typeof gcpCreds === "string") {
  try { gcpCreds = JSON.parse(gcpCreds); } catch (e) { gcpCreds = undefined; }
}
const storageGCS = new Storage({ credentials: gcpCreds });
const bucket = storageGCS.bucket(GCP_BUCKET);

// Actualizar estado y/o comentario de una incidencia en un solo request (debe ir después de inicializar router)
router.put("/incidencias/:id", async (req, res) => {
  const { nuevo_estado, comentario } = req.body;
  if (!nuevo_estado && (!comentario || !comentario.trim())) {
    return res.status(400).json({ error: "Se requiere al menos un campo a actualizar (nuevo_estado o comentario)." });
  }
  try {
    const col = global.db.collection("Incidencias");
    const fecha = new Date();
    const update = {};
    if (nuevo_estado) {
      update.$set = { estado: nuevo_estado };
      update.$push = { historial: { estado: nuevo_estado, fecha } };
    }
    if (comentario && comentario.trim()) {
      if (!update.$push) update.$push = {};
      update.$push.historial = update.$push.historial
        ? { $each: [update.$push.historial, { comentario: comentario.trim(), fecha }] }
        : { comentario: comentario.trim(), fecha };
    }
    const result = await col.updateOne(
      { _id: req.params.id },
      update
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Incidencia no encontrada." });
    }
    const updated = await col.findOne({ _id: req.params.id });
    res.json({ message: "Incidencia actualizada.", incidencia: updated });
  } catch (err) {
    console.error("Error al actualizar incidencia:", err);
    res.status(500).json({ error: "Error interno al actualizar incidencia." });
  }
});

// --- Multer: solo almacena en memoria, no en disco ---
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------
// RUTAS DE PAQUETES
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
    const fecha = new Date();
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
    const fecha = new Date();
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
    const fecha = new Date();
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
    const fecha = new Date();
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
    const fecha = new Date();
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
    const fecha = new Date();
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
// GET /scanner/all - HISTORIAL CON ORDEN FIJO Y PAGINACIÓN
// ----------------------------------------
router.get("/all", async (req, res) => {
  try {
    const estadosCol = global.db.collection("estados");
    const incCol     = global.db.collection("Incidencias");

    const page     = Math.max(1, parseInt(req.query.page,     10) || 1);
    const pageSize = Math.max(1, parseInt(req.query.pageSize, 10) || 10);

    const match = {};
    if (req.query.state) {
      match.estado_actual = req.query.state;
    }

    const pipeline = [
      { $match: match },
      { $addFields: {
          historial: {
            $map: {
              input: "$historial",
              as:   "h",
              in: {
                estado: "$$h.estado",
                fecha: {
                  $cond: [
                    { $eq: [{ $type: "$$h.fecha" }, "string"] },
                    { $toDate: "$$h.fecha" },
                    "$$h.fecha"
                  ]
                }
              }
            }
          }
        }
      },
      { $addFields: {
          lastFecha: { $max: "$historial.fecha" }
        }
      },
      { $sort: { lastFecha: -1, _id: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $project: {
          paquete_id:     1,
          estado_actual:  1,
          historial:      1
        }
      }
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
// RUTAS DE INCIDENCIAS
// ----------------------------------------

// Crear incidencia con adjuntos iniciales (sube a GCS)
router.post("/incidencias", upload.array("adjuntos"), async (req, res) => {
  const { paquete_id, tipo, descripcion } = req.body;
  if (!paquete_id || !tipo || !descripcion) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  try {
    const collection = global.db.collection("Incidencias");
    const fecha      = new Date();
    const incId      = `${paquete_id}-IN`;
    let adjuntos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const gcsFileName = `incidencias/${incId}/${name}-${Date.now()}${ext}`;
        const blob = bucket.file(gcsFileName);
        await blob.save(file.buffer, { contentType: file.mimetype });
        await blob.makePublic();
        adjuntos.push({
          url: `https://storage.googleapis.com/${GCP_BUCKET}/${gcsFileName}`,
          nombre: file.originalname,
          fecha
        });
      }
    }
    const incidencia = {
      _id:           incId,
      paquete_id,
      tipo,
      descripcion,
      estado:        "Abierta",
      fecha_creacion: fecha,
      historial:     [{ estado: "Abierta", fecha }],
      adjuntos
    };
    await collection.insertOne(incidencia);
    res.status(201).json({ message: "Incidencia creada.", id: incId });
  } catch (err) {
    console.error("Error al crear incidencia:", err);
    res.status(500).json({ error: "Error interno al crear incidencia." });
  }
});

// Listar todas las incidencias
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

// Obtener detalle de una incidencia
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

// Cambiar estado de una incidencia
router.put("/incidencias/:id/estado", async (req, res) => {
  const posibles = ["Abierta","En proceso","Resuelta","Cerrada","Rechazada"];
  const { nuevo_estado } = req.body;
  if (!nuevo_estado || !posibles.includes(nuevo_estado)) {
    return res.status(400).json({ error: "Estado inválido." });
  }
  try {
    const col   = global.db.collection("Incidencias");
    const fecha = new Date();
    const result = await col.updateOne(
      { _id: req.params.id },
      {
        $set:  { estado: nuevo_estado },
        $push: { historial: { estado: nuevo_estado, fecha } }
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Incidencia no encontrada." });
    }
    res.json({ message: "Estado de incidencia actualizado." });
  } catch (err) {
    console.error("Error al cambiar estado de incidencia:", err);
    res.status(500).json({ error: "Error interno al actualizar incidencia." });
  }
});

// Añadir comentario a una incidencia
router.post("/incidencias/:id/comentarios", async (req, res) => {
  const { comentario } = req.body;
  if (!comentario || !comentario.trim()) {
    return res.status(400).json({ error: "Comentario vacío." });
  }
  try {
    const col   = global.db.collection("Incidencias");
    const fecha = new Date();
    const result = await col.updateOne(
      { _id: req.params.id },
      { $push: { historial: { comentario: comentario.trim(), fecha } } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Incidencia no encontrada." });
    }
    res.json({ message: "Comentario agregado a incidencia." });
  } catch (err) {
    console.error("Error al agregar comentario:", err);
    res.status(500).json({ error: "Error interno al actualizar incidencia." });
  }
});

// Subir adjuntos a una incidencia existente (sube a GCS)
router.post(
  "/incidencias/:id/adjuntos",
  upload.array("adjuntos", 10),
  async (req, res) => {
    try {
      const col = global.db.collection("Incidencias");
      const incId = req.params.id;
      const inc = await col.findOne({ _id: incId });
      if (!inc) return res.status(404).json({ error: "Incidencia no encontrada." });
      const fecha = new Date();
      let nuevosAdjuntos = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          const gcsFileName = `incidencias/${incId}/${name}-${Date.now()}${ext}`;
          const blob = bucket.file(gcsFileName);
          await blob.save(file.buffer, { contentType: file.mimetype });
          await blob.makePublic();
          nuevosAdjuntos.push({
            url: `https://storage.googleapis.com/${GCP_BUCKET}/${gcsFileName}`,
            nombre: file.originalname,
            fecha
          });
        }
        await col.updateOne(
          { _id: incId },
          { $push: { adjuntos: { $each: nuevosAdjuntos }, historial: { $each: nuevosAdjuntos.map(a => ({ adjuntos: [a.url], fecha: a.fecha })) } } }
        );
      }
      // Devolver la incidencia actualizada
      const updated = await col.findOne({ _id: incId });
      res.json({ message: "Adjuntos subidos y registrados en historial.", incidencia: updated });
    } catch (err) {
      console.error("Error al subir adjuntos:", err);
      res.status(500).json({ error: "Error interno al subir adjuntos." });
    }
  }
);

module.exports = router;
