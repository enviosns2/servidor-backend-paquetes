require("dotenv").config(); // Cargar variables de entorno desde .env
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const path = require("path"); // Importar módulo path para manejo de rutas
const scannerRoutes = require("./scanner"); // Importar rutas del escáner

const app = express();
const port = process.env.PORT || 3000; // Usa el puerto dinámico o 3000 por defecto

// Middleware para habilitar CORS (solución para posibles problemas con frontend)
app.use(cors());

// Middleware para procesar JSON
app.use(express.json());

// Middleware para registrar solicitudes entrantes (útil para depuración)
app.use((req, res, next) => {
  console.log(`Solicitud recibida: ${req.method} ${req.url}`);
  next();
});

// Configuración de MongoDB Atlas usando variables de entorno
const uri = process.env.MONGO_URI; // Obtiene la URI desde el archivo .env
const client = new MongoClient(uri);

// Inicializa la conexión a MongoDB al iniciar el servidor
(async function initializeMongoDB() {
  try {
    await client.connect(); // Conectar al clúster
    global.db = client.db("paquetes"); // Configurar conexión global
    console.log("Conexión inicializada a MongoDB");

    // Evento para cerrar la conexión al detener el servidor
    process.on("SIGINT", async () => {
      await client.close();
      console.log("Conexión a MongoDB cerrada");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error al inicializar MongoDB:", error);
    process.exit(1); // Salir si no se puede conectar
  }
})();

// Middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

// Servir /uploads desde public/uploads (asegura que los adjuntos sean accesibles)
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Ruta de prueba para confirmar que el servidor está funcionando
app.get("/", (req, res) => {
  res.send("¡El servidor está funcionando correctamente!");
});

// Rutas relacionadas con paquetes
app.get("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id;

  try {
    const collection = global.db.collection("estados");
    const paquete = await collection.findOne({ paquete_id: paqueteId });

    if (!paquete) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json(paquete);
  } catch (error) {
    console.error("Error al obtener paquete:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.put("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id;
  const { nuevoEstado } = req.body;

  if (!nuevoEstado) {
    return res.status(400).json({ error: "El campo 'nuevoEstado' es requerido." });
  }

  try {
    const collection = global.db.collection("estados");
    const fechaActual = new Date();

    const resultado = await collection.updateOne(
      { paquete_id: paqueteId },
      {
        $set: { estado_actual: nuevoEstado },
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
    console.error("Error al actualizar paquete:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.post("/paquetes", async (req, res) => {
  const nuevoPaquete = req.body;

  if (!nuevoPaquete || !nuevoPaquete.paquete_id || !nuevoPaquete.estado_actual) {
    return res.status(400).json({ error: "Los datos del paquete son requeridos." });
  }

  try {
    const collection = global.db.collection("estados");
    const resultado = await collection.insertOne(nuevoPaquete);

    res.status(201).json({
      message: "Paquete creado exitosamente.",
      id: resultado.insertedId,
    });
  } catch (error) {
    console.error("Error al crear paquete:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

app.delete("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id;

  try {
    const collection = global.db.collection("estados");
    const resultado = await collection.deleteOne({ paquete_id: paqueteId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json({ message: "Paquete eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar paquete:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Usar las rutas del escáner
app.use("/scanner", scannerRoutes);

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error global:", err.stack);
  res.status(500).json({ error: "Error interno del servidor." });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en https://servidor-backend-paquetes.onrender.com`);
});
