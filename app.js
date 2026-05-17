require('dotenv').config(); // Lee las variables ocultas del archivo .env
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
// Railway asigna el puerto 8080 de forma automática en producción
const port = process.env.PORT || 8080; 

// Configuración de acceso a tu cuenta de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configura Multer para procesar las fotos en la memoria de la PC
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta principal por si entras desde el navegador
app.get('/', (req, res) => {
  res.send('¡Hola! El servidor de imágenes está activo y listo para recibir archivos.');
});

// NUEVA RUTA DE SUBIDA: Recibe la imagen y la manda a Cloudinary
app.post('/subir-imagen', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ mensaje: 'No seleccionaste ninguna imagen.' });
    }

    // Convertir el archivo a formato Base64 para que viaje seguro a internet
    const archivoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Subir la imagen a Cloudinary en una carpeta organizada
    const resultado = await cloudinary.uploader.upload(archivoBase64, {
      folder: 'mis_imagenes_node'
    });

    // Tu servidor te responde con el LINK público definitivo de tu foto
    res.status(200).send({
      mensaje: '¡Imagen subida con éxito!',
      url_de_la_imagen: resultado.secure_url
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ mensaje: 'Hubo un error al procesar o subir la imagen.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
