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

// --- Multer: solo almacena en memoria, no en disco ---
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------
// AGRUPAMIENTO POR CONTENEDOR
// ----------------------------------------

// [POST] /scanner/contenedor/agregar
router.post("/contenedor/agregar", async (req, res) => {
  let { contenedor_id, paquetes } = req.body;
  // Si paquetes viene como undefined, ponlo como array vacío
  if (!contenedor_id) {
    return res.status(400).json({ error: "Se requiere contenedor_id." });
  }
  if (!Array.isArray(paquetes)) paquetes = [];
  try {
    const col = global.db.collection("contenedores");
    const existe = await col.findOne({ contenedor_id });
    if (!existe) {
      await col.insertOne({
        contenedor_id,
        paquetes,
        fecha_creacion: new Date()
      });
    } else {
      await col.updateOne(
        { contenedor_id },
        { $addToSet: { paquetes: { $each: paquetes } } }
      );
    }
    res.json({ message: "Contenedor creado o actualizado correctamente." });
  } catch (err) {
    console.error("Error al asociar paquetes a contenedor:", err);
    res.status(500).json({ error: "Error interno al asociar paquetes a contenedor." });
  }
});

// [PUT] /scanner/contenedor/:id/estado
// Actualiza el estado de todos los paquetes de un contenedor
router.put("/contenedor/:id/estado", async (req, res) => {
  const { nuevo_estado } = req.body;
  if (!nuevo_estado) {
    return res.status(400).json({ error: "El campo 'nuevo_estado' es requerido." });
  }
  try {
    const colCont = global.db.collection("contenedores");
    const colPaq  = global.db.collection("estados");
    const cont = await colCont.findOne({ contenedor_id: req.params.id });
    if (!cont || !Array.isArray(cont.paquetes) || cont.paquetes.length === 0) {
      return res.status(404).json({ error: "Contenedor no encontrado o sin paquetes asociados." });
    }
    const fecha = new Date();
    // Actualiza todos los paquetes asociados
    const result = await colPaq.updateMany(
      { paquete_id: { $in: cont.paquetes } },
      {
        $set: { estado_actual: nuevo_estado },
        $push: { historial: { estado: nuevo_estado, fecha } }
      }
    );
    res.json({
      message: "Estado actualizado para todos los paquetes del contenedor.",
      paquetes_actualizados: result.modifiedCount
    });
  } catch (err) {
    console.error("Error al actualizar estado de contenedor:", err);
    res.status(500).json({ error: "Error interno al actualizar estado de contenedor." });
  }
});

// [GET] /scanner/contenedor/:id/paquetes
// Obtiene los paquetes asociados a un contenedor
router.get("/contenedor/:id/paquetes", async (req, res) => {
  try {
    const col = global.db.collection("contenedores");
    const cont = await col.findOne({ contenedor_id: req.params.id });
    if (!cont) return res.status(404).json({ error: "Contenedor no encontrado." });
    res.json({ paquetes: cont.paquetes || [] });
  } catch (err) {
    console.error("Error al obtener paquetes de contenedor:", err);
    res.status(500).json({ error: "Error interno al obtener paquetes de contenedor." });
  }
});

// Actualizar estado y/o comentario de una incidencia en un solo request (debe ir después de inicializar router)
router.put("/incidencias/:id", upload.array("adjuntos"), async (req, res) => {
  const { nuevo_estado, comentario } = req.body;
  if (!nuevo_estado && (!comentario || !comentario.trim()) && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: "Se requiere al menos un campo a actualizar (nuevo_estado, comentario o adjuntos)." });
  }
  try {
    const col = global.db.collection("Incidencias");
    const fecha = new Date();
    let update = {};
    let historialPush = [];

    if (nuevo_estado) {
      update.$set = { estado: nuevo_estado };
      historialPush.push({ estado: nuevo_estado, fecha });
    }
    if (comentario && comentario.trim()) {
      historialPush.push({ comentario: comentario.trim(), fecha });
    }

    // Adjuntar archivos nuevos si existen
    let nuevosAdjuntos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const gcsFileName = `incidencias/${req.params.id}/${name}-${Date.now()}${ext}`;
        const blob = bucket.file(gcsFileName);
        await blob.save(file.buffer, { contentType: file.mimetype });
        nuevosAdjuntos.push({
          url: `https://storage.googleapis.com/${GCP_BUCKET}/${gcsFileName}`,
          nombre: file.originalname,
          fecha
        });
      }
      if (!update.$push) update.$push = {};
      update.$push.adjuntos = { $each: nuevosAdjuntos };
      nuevosAdjuntos.forEach(adj => {
        historialPush.push({ adjuntos: [adj], fecha: adj.fecha });
      });
    }

    if (historialPush.length > 0) {
      if (!update.$push) update.$push = {};
      update.$push.historial = { $each: historialPush };
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
        adjuntos.push({
          url: `https://storage.googleapis.com/${GCP_BUCKET}/${gcsFileName}`,
          nombre: file.originalname,
          fecha
        });
      }
    }
    // Guardar la descripción como comentario en el historial
    const incidencia = {
      _id:           incId,
      paquete_id,
      tipo,
      descripcion,
      estado:        "Abierta",
      fecha_creacion: fecha,
      historial: [
        { estado: "Abierta", fecha },
        { comentario: descripcion, fecha }
      ],
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

// Eliminar paquete (físico) con contraseña
// Eliminar paquete (físico) con contraseña y eliminar incidencia vinculada
router.delete("/paquetes/:id", async (req, res) => {
  const { password } = req.body;
  if (password !== "2003") return res.status(403).json({ error: "Contraseña incorrecta." });
  try {
    const col = global.db.collection("estados");
    const result = await col.deleteOne({ paquete_id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Paquete no encontrado." });

    // Buscar y eliminar incidencia vinculada (por paquete_id)
    const incCol = global.db.collection("Incidencias");
    const inc = await incCol.findOne({ paquete_id: req.params.id });
    if (inc) {
      // Borrar adjuntos de GCS si existen
      if (inc.adjuntos && Array.isArray(inc.adjuntos)) {
        for (const adj of inc.adjuntos) {
          if (adj.url) {
            try {
              const url = new URL(adj.url);
              const path = url.pathname.replace(/^\/[\w-]+\//, "");
              await bucket.file(path).delete({ ignoreNotFound: true });
            } catch (e) { /* ignorar error de borrado individual */ }
          }
        }
      }
      await incCol.deleteOne({ _id: inc._id });
    }

    res.json({ message: "Paquete e incidencia vinculada eliminados correctamente." });
  } catch (err) {
    console.error("Error al eliminar paquete:", err);
    res.status(500).json({ error: "Error interno al eliminar paquete." });
  }
});

// Eliminar incidencia (físico) con contraseña y borrar adjuntos de GCS
router.delete("/incidencias/:id", async (req, res) => {
  const { password } = req.body;
  if (password !== "2003") return res.status(403).json({ error: "Contraseña incorrecta." });
  try {
    const col = global.db.collection("Incidencias");
    const inc = await col.findOne({ _id: req.params.id });
    if (!inc) return res.status(404).json({ error: "Incidencia no encontrada." });
    // Borrar adjuntos de GCS si existen
    if (inc.adjuntos && Array.isArray(inc.adjuntos)) {
      for (const adj of inc.adjuntos) {
        if (adj.url) {
          try {
            const url = new URL(adj.url);
            // url.pathname: /mi-app-incidencias-2025/incidencias/...
            const path = url.pathname.replace(/^\/[\w-]+\//, "");
            await bucket.file(path).delete({ ignoreNotFound: true });
          } catch (e) { /* ignorar error de borrado individual */ }
        }
      }
    }
    await col.deleteOne({ _id: req.params.id });
    res.json({ message: "Incidencia eliminada correctamente." });
  } catch (err) {
    console.error("Error al eliminar incidencia:", err);
    res.status(500).json({ error: "Error interno al eliminar incidencia." });
  }
});

// Obtener todos los contenedores (para reportes)
router.get("/contenedor/all", async (req, res) => {
  try {
    const col = global.db.collection("contenedores");
    const conts = await col.find({}).toArray();
    // Siempre retorna un array
    res.json(Array.isArray(conts) ? conts : []);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener contenedores." });
  }
});

// Obtener detalles de varios paquetes (para reportes)
router.post("/paquetes/detalles", async (req, res) => {
  const { paquetes } = req.body;
  if (!Array.isArray(paquetes) || paquetes.length === 0) {
    return res.json([]);
  }
  try {
    const colPaq = global.db.collection("estados");
    const colInc = global.db.collection("Incidencias");
    const docs = await colPaq.find({ paquete_id: { $in: paquetes } }).toArray();
    // Para cada paquete, contar incidencias y obtener fecha de creación
    const result = await Promise.all(docs.map(async p => {
      const incCount = await colInc.countDocuments({ paquete_id: p.paquete_id });
      let fecha_creacion = null;
      if (Array.isArray(p.historial) && p.historial.length > 0) {
        fecha_creacion = p.historial[0].fecha;
      }
      return {
        paquete_id: p.paquete_id,
        incidencias_count: incCount,
        fecha_creacion,
        historial: p.historial
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json([]);
  }
});

// Eliminar contenedor (físico) con contraseña
router.delete("/contenedor/:id", async (req, res) => {
  const { password } = req.body;
  if (password !== "2003") return res.status(403).json({ error: "Contraseña incorrecta." });
  try {
    const col = global.db.collection("contenedores");
    const result = await col.deleteOne({ contenedor_id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Contenedor no encontrado." });
    res.json({ message: "Contenedor eliminado correctamente." });
  } catch (err) {
    console.error("Error al eliminar contenedor:", err);
    res.status(500).json({ error: "Error interno al eliminar contenedor." });
  }
});

module.exports = router;
module.exports = router;
