# WhatsApp Bot Manager

Una plataforma completa para crear, administrar y ejecutar bots de WhatsApp con una interfaz intuitiva.

## Características

- 🤖 Interfaz para subir y administrar bots de WhatsApp
- 🔐 Autenticación con Google
- 📱 Panel de control con consola en vivo
- 📊 Monitoreo de estado de bots
- 🔄 Iniciar/detener bots desde la interfaz

## Tecnologías Utilizadas

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Socket.IO
- **WhatsApp API**: whatsapp-web.js
- **Autenticación**: Firebase Auth
- **Base de datos**: Firebase Firestore

## Requisitos Previos

- Node.js 16 o superior
- Cuenta de Firebase
- Navegador basado en Chromium para ejecutar los bots

## Configuración

1. **Configurar Firebase**

   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilita la autenticación con Google
   - Crea una base de datos Firestore
   - Genera una clave privada para tu aplicación (para el backend)
   - Copia la configuración de Firebase para el cliente

2. **Configurar el Proyecto**

   - Clona este repositorio
   - Copia el archivo JSON de la clave privada de Firebase a la raíz del proyecto y nómbralo `serviceAccountKey.json`
   - Actualiza el archivo `app.js` con tu configuración de Firebase para el cliente
   - Instala las dependencias:

   ```bash
   npm install

