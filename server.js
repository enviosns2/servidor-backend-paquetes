require("dotenv").config(); // Cargar variables de entorno desde .env
const express = require("express");
const { MongoClient } = require("mongodb"); // Importa MongoClient

const app = express();
const port = process.env.PORT || 3000; // Usa el puerto dinámico o 3000 por defecto

// Middleware para procesar JSON
app.use(express.json());

// Configuración de MongoDB Atlas usando variables de entorno
const uri = process.env.MONGO_URI; // Obtiene la URI desde el archivo .env
const client = new MongoClient(uri);

let db; // Variable global para la base de datos

// Inicializa la conexión a MongoDB al iniciar el servidor
(async function initializeMongoDB() {
  try {
    await client.connect(); // Conectar al clúster
    db = client.db("paquetes"); // Seleccionar la base de datos
    console.log("Conexión inicializada a MongoDB");
  } catch (error) {
    console.error("Error al inicializar MongoDB:", error);
    process.exit(1); // Salir si no se puede conectar
  }
})();

// Ruta para probar el servidor
app.get("/", (req, res) => {
  res.send("¡El servidor está funcionando correctamente!");
});

// Ruta para obtener un paquete por ID
app.get("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id; // Obtén el ID desde la URL

  try {
    const collection = db.collection("estados"); // Seleccionar la colección
    const paquete = await collection.findOne({ paquete_id: paqueteId });

    if (!paquete) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json(paquete); // Enviar el paquete como respuesta
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Ruta para actualizar el estado de un paquete
app.put("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id; // ID del paquete desde la URL
  const { nuevoEstado } = req.body; // Nuevo estado desde el cuerpo de la solicitud

  if (!nuevoEstado) {
    return res.status(400).json({ error: "El campo 'nuevoEstado' es requerido." });
  }

  try {
    const collection = db.collection("estados"); // Seleccionar la colección
    const fechaActual = new Date(); // Fecha y hora actual

    // Actualizar el estado y agregar el historial
    const resultado = await collection.updateOne(
      { paquete_id: paqueteId }, // Busca el paquete por su ID
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
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Ruta para crear un nuevo paquete
app.post("/paquetes", async (req, res) => {
  const nuevoPaquete = req.body; // Datos enviados desde el cliente

  if (!nuevoPaquete || !nuevoPaquete.paquete_id || !nuevoPaquete.estado_actual) {
    return res.status(400).json({ error: "Los datos del paquete son requeridos." });
  }

  try {
    const collection = db.collection("estados"); // Seleccionar la colección
    const resultado = await collection.insertOne(nuevoPaquete);

    res.status(201).json({
      message: "Paquete creado exitosamente.",
      id: resultado.insertedId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Ruta para eliminar un paquete
app.delete("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id; // ID del paquete desde la URL

  try {
    const collection = db.collection("estados"); // Seleccionar la colección
    const resultado = await collection.deleteOne({ paquete_id: paqueteId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json({ message: "Paquete eliminado correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
