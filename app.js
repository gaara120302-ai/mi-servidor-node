const express = require('express');
const app = express();

// Render asignará un puerto automáticamente en internet; si no, usa el 3000 local
const port = process.env.PORT || 3000; 

// Esta es la ruta principal que se abrirá en el navegador
app.get('/', (req, res) => {
  res.send('¡Hola Mundo! Mi servidor en Windows funciona correctamente.');
});

app.listen(port, () => {
  console.log(`Servidor corriendo localmente en http://localhost:${port}`);
});
