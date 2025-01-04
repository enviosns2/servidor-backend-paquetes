const express = require("express");
const { MongoClient } = require("mongodb"); // Importa MongoClient una sola vez

const app = express();
const port = 3000;

app.use(express.json()); // Middleware para procesar JSON

// Configuración de MongoDB Atlas
const uri = "mongodb+srv://EnviosNS:NS2025NS@cluster0.vl4vx.mongodb.net/paquetes?retryWrites=true&w=majority"; 
// Nota: Reemplaza 'NS2025NS' con tu contraseña real

const client = new MongoClient(uri); // Configuración moderna

// Ruta para probar el servidor
app.get("/", (req, res) => {
  res.send("¡El servidor está funcionando correctamente!");
});

// Ruta para actualizar el estado de un paquete
app.put("/paquetes/:id", async (req, res) => {
  const paqueteId = req.params.id; // ID del paquete desde la URL
  const { nuevoEstado } = req.body; // Nuevo estado desde el cuerpo de la solicitud

  if (!nuevoEstado) {
    return res.status(400).json({ error: "El campo 'nuevoEstado' es requerido." });
  }

  try {
    await client.connect(); // Conectar a MongoDB
    const database = client.db("paquetes"); // Selecciona la base de datos
    const collection = database.collection("estados"); // Selecciona la colección

    const fechaActual = new Date(); // Fecha y hora actual

    // Actualizar el estado y agregar el historial
    const resultado = await collection.updateOne(
      { paquete_id: paqueteId }, // Busca el paquete por su ID
      {
        $set: { estado_actual: nuevoEstado }, // Actualiza el estado actual
        $push: {
          historial: {
            estado: nuevoEstado,
            fecha: fechaActual
          }
        }
      }
    );

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ error: "Paquete no encontrado." });
    }

    res.json({ message: "Estado actualizado correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  } finally {
    await client.close(); // Cierra la conexión
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

// Probar la conexión a MongoDB
async function testConnection() {
  try {
    await client.connect(); // Conectar al clúster
    console.log("Conexión exitosa a MongoDB");
    await client.db("paquetes").command({ ping: 1 }); // Comando para probar conexión
    console.log("MongoDB está disponible");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  } finally {
    await client.close(); // Cierra la conexión
  }
}

testConnection(); // Llama a la función para probar
