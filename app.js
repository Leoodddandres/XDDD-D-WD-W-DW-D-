// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCnD_XUtSavJYXOYQEE4U17obCfMHzYpME",
    authDomain: "webbot-89c07.firebaseapp.com",
    projectId: "webbot-89c07",
    storageBucket: "webbot-89c07.firebasestorage.app",
    messagingSenderId: "158520321153",
    appId: "1:158520321153:web:8548ff79cf6f8c1a175980",
    measurementId: "G-8MPW8TS5VK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let socket = null;
let currentBot = null;

// DOM Elements
const landingPage = document.getElementById('landing-page');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const googleLoginButton = document.getElementById('google-login');
const logoutButton = document.getElementById('logout-button');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const botUploadForm = document.getElementById('bot-upload-form');
const botNameInput = document.getElementById('bot-name');
const botFileInput = document.getElementById('bot-file');
const fileLabel = document.getElementById('file-label');
const uploadZone = document.querySelector('.upload-zone');
const botDescriptionInput = document.getElementById('bot-description');
const botList = document.getElementById('bot-list');
const qrContainer = document.getElementById('qr-container');
const consoleOutput = document.getElementById('console-output');
const startBotButton = document.getElementById('start-bot');
const stopBotButton = document.getElementById('stop-bot');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const showLoginButton = document.getElementById('show-login-button');
const showLoginMobileButton = document.getElementById('show-login-mobile');
const heroLoginButton = document.getElementById('hero-login-button');
const navbar = document.querySelector('nav');
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section-content');

// Handle scroll events for navbar
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add/remove scrolled class based on scroll position
    if (scrollTop > 10) {
        navbar.classList.add('nav-scrolled');
    } else {
        navbar.classList.remove('nav-scrolled');
    }
    
    // Hide/show navbar based on scroll direction
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down & past threshold
        navbar.classList.add('nav-hidden');
    } else {
        // Scrolling up or at top
        navbar.classList.remove('nav-hidden');
    }
    
    lastScrollTop = scrollTop;
});

// Mobile menu toggle with animation
mobileMenuButton.addEventListener('click', () => {
    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        // Add animation to show menu
        mobileMenu.style.opacity = '0';
        mobileMenu.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            mobileMenu.style.opacity = '1';
            mobileMenu.style.transform = 'translateY(0)';
        }, 10);
    } else {
        // Add animation to hide menu
        mobileMenu.style.opacity = '0';
        mobileMenu.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            mobileMenu.classList.add('hidden');
        }, 300);
    }
});

// Show login buttons
showLoginButton.addEventListener('click', showLoginPage);
showLoginMobileButton.addEventListener('click', showLoginPage);
heroLoginButton.addEventListener('click', showLoginPage);

function showLoginPage() {
    landingPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
}

// Login with Google
googleLoginButton.addEventListener('click', () => {
    googleLoginButton.innerHTML = `
        <span class="spinner"></span>
        <span>Conectando...</span>
    `;
    googleLoginButton.disabled = true;
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login successful", result.user);
            logToConsole("Inicio de sesión exitoso", 'success');
            // User is automatically redirected by the auth state change listener
        })
        .catch(error => {
            console.error("Error during sign in:", error);
            logToConsole("Error al iniciar sesión: " + error.message, 'error');
            alert("Error al iniciar sesión: " + error.message);
            
            googleLoginButton.innerHTML = `
                <svg class="h-6 w-6 mr-2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48">
                    <defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs>
                    <clipPath id="b"><use xlink:href="#a" overflow="visible"/></clipPath>
                    <path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/>
                    <path clip-path="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/>
                    <path clip-path="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/>
                    <path clip-path="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/>
                </svg>
                Iniciar sesión con Google
            `;
            googleLoginButton.disabled = false;
        });
});

// Logout handler
logoutButton.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        })
        .catch(error => {
            console.error("Error during sign out:", error);
        });
});

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        console.log("Estado: Usuario conectado. UID:", user.uid);
        // Store user info in localStorage for persistence
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        }));
        
        showDashboard();
        connectSocket();
        loadUserBots();
    } else {
        currentUser = null;
        console.log("Estado: Usuario desconectado.");
        // Clear stored user data
        localStorage.removeItem('user');
        showLanding();
        
        // Reset UI if needed
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }
});

// Show landing page
function showLanding() {
    landingPage.classList.remove('hidden');
    loginPage.classList.add('hidden');
    dashboardPage.classList.add('hidden');
}

// Show dashboard page
function showDashboard() {
    landingPage.classList.add('hidden');
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    
    // Update user info
    userAvatar.src = currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.displayName);
    userName.textContent = currentUser.displayName;
}

// Connect to Socket.io server
function connectSocket() {
    socket = io('http://localhost:8000/ws', {
        auth: {
            token: currentUser.uid
        },
        transports: ['websocket']
    });

    socket.on('connect', () => {
        logToConsole("Conectado al servidor", 'success');
    });

    socket.on('console_output', (data) => {
        logToConsole(data.message, data.type);
    });

    socket.on('qr_code', (data) => {
        displayQRCode(data.qr);
    });

    socket.on('bot_status', (data) => {
        updateBotStatus(data.bot_id, data.status);
    });

    socket.on('connect_error', (error) => {
        console.error("Socket connection error:", error);
        logToConsole("Error de conexión: " + error.message, 'error');
    });
}

// Load user's bots from Firestore
function loadUserBots() {
    db.collection('bots')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            botList.innerHTML = '';
            if (snapshot.empty) {
                logToConsole("No tienes bots configurados", 'info');
                botList.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">
                            No hay bots configurados. ¡Añade tu primer bot!
                        </td>
                    </tr>
                `;
                return;
            }

            snapshot.forEach(doc => {
                const bot = doc.data();
                addBotToList(doc.id, bot);
            });
        })
        .catch(error => {
            console.error("Error loading bots:", error);
            logToConsole("Error al cargar bots: " + error.message, 'error');
        });
}

// Add bot to the UI list
function addBotToList(botId, bot) {
    const tr = document.createElement('tr');
    
    const statusClass = 
        bot.status === 'active' ? 'status-active' : 
        bot.status === 'error' ? 'status-error' : 
        'status-inactive';
    
    const statusText = 
        bot.status === 'active' ? 'Activo' : 
        bot.status === 'error' ? 'Error' : 
        'Inactivo';
    
    tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${bot.name}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500">${bot.description || 'Sin descripción'}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">
                <span class="status-indicator ${statusClass}"></span>
                ${statusText}
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button class="text-green-600 hover:text-green-900 mr-3 select-bot" data-id="${botId}">Seleccionar</button>
            <button class="text-red-600 hover:text-red-900 delete-bot" data-id="${botId}">Eliminar</button>
        </td>
    `;
    
    tr.querySelector('.select-bot').addEventListener('click', () => selectBot(botId));
    tr.querySelector('.delete-bot').addEventListener('click', () => deleteBot(botId));
    
    botList.appendChild(tr);
}

// Select a bot to manage
function selectBot(botId) {
    currentBot = botId;
    
    db.collection('bots').doc(botId).get()
        .then(doc => {
            if (doc.exists) {
                const bot = doc.data();
                botNameInput.value = bot.name;
                botDescriptionInput.value = bot.description || '';
                
                const isActive = bot.status === 'active';
                startBotButton.disabled = isActive;
                stopBotButton.disabled = !isActive;
                
                logToConsole(`Bot "${bot.name}" seleccionado`, 'info');
                
                // Clear QR if bot is not active
                if (!isActive) {
                    qrContainer.innerHTML = '<p class="text-gray-500">El código QR aparecerá aquí cuando inicies un bot</p>';
                }
            }
        })
        .catch(error => {
            console.error("Error selecting bot:", error);
            logToConsole("Error al seleccionar bot: " + error.message, 'error');
        });
}

// Delete a bot
function deleteBot(botId) {
    if (confirm('¿Estás seguro de que quieres eliminar este bot?')) {
        db.collection('bots').doc(botId).delete()
            .then(() => {
                logToConsole("Bot eliminado con éxito", 'success');
                loadUserBots();
                
                if (currentBot === botId) {
                    currentBot = null;
                    botNameInput.value = '';
                    botFileInput.value = '';
                    botDescriptionInput.value = '';
                    startBotButton.disabled = true;
                    stopBotButton.disabled = true;
                    qrContainer.innerHTML = '<p class="text-gray-500">El código QR aparecerá aquí cuando inicies un bot</p>';
                }
            })
            .catch(error => {
                console.error("Error deleting bot:", error);
                logToConsole("Error al eliminar bot: " + error.message, 'error');
            });
    }
}

// Update bot status in UI
function updateBotStatus(botId, status) {
    const botRows = Array.from(botList.querySelectorAll('tr'));
    const botRow = botRows.find(row => {
        const selectButton = row.querySelector('.select-bot');
        return selectButton && selectButton.getAttribute('data-id') === botId;
    });
    
    if (botRow) {
        const statusIndicator = botRow.querySelector('.status-indicator');
        const statusText = statusIndicator.nextSibling;
        
        statusIndicator.classList.remove('status-active', 'status-inactive', 'status-error');
        
        if (status === 'active') {
            statusIndicator.classList.add('status-active');
            statusText.textContent = ' Activo';
        } else if (status === 'error') {
            statusIndicator.classList.add('status-error');
            statusText.textContent = ' Error';
        } else {
            statusIndicator.classList.add('status-inactive');
            statusText.textContent = ' Inactivo';
        }
    }
}

// Display QR code
function displayQRCode(qrData) {
    // Clear previous content
    qrContainer.innerHTML = '';
    
    // Create an image element to display the QR code
    const image = document.createElement('img');
    image.src = qrData;
    image.style.maxWidth = '100%';
    image.style.maxHeight = '100%';
    
    qrContainer.appendChild(image);
    logToConsole("Código QR generado. Escanéalo con WhatsApp para conectar.", 'info');
}

// Function to create QR code has been replaced with a simpler version that uses the direct image
function createQRCode(data) {
    return data;
}

// Log messages to the console UI
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const typeClass = `console-${type}`;
    consoleOutput.innerHTML += `\n<span class="console-timestamp">[${timestamp}]</span> <span class="${typeClass}">${message}</span>`;
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Add file upload handling
uploadZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    uploadZone.classList.add('border-green-500');
});

uploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('border-green-500');
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('border-green-500');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// Handle file input change
botFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
        alert('Por favor selecciona un archivo ZIP');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB max
        alert('El archivo es demasiado grande. Máximo 10MB.');
        return;
    }
    
    fileLabel.textContent = `Archivo seleccionado: ${file.name}`;
    botFileInput.files = new DataTransfer().files;
    const dt = new DataTransfer();
    dt.items.add(file);
    botFileInput.files = dt.files;
}

// Upload a new bot
botUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = botNameInput.value.trim();
    const file = botFileInput.files[0];
    const description = botDescriptionInput.value.trim();
    
    if (!name || !file) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    logToConsole(`Subiendo bot "${name}"...`, 'info');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('bot_file', file);
    formData.append('user_id', currentUser.uid);
    
    try {
        const response = await fetch('http://localhost:8000/upload-bot', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            logToConsole(`Bot "${name}" subido con éxito`, 'success');
            botNameInput.value = '';
            botFileInput.value = '';
            botDescriptionInput.value = '';
            fileLabel.textContent = 'Arrastra un archivo ZIP o haz clic para seleccionar';
            loadUserBots();
            selectBot(data.bot_id);
        } else {
            throw new Error(data.detail || 'Error al subir el bot');
        }
    } catch (error) {
        console.error("Error uploading bot:", error);
        logToConsole("Error al subir bot: " + error.message, 'error');
    }
});

// Add section navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        
        // Hide all sections
        sections.forEach(section => section.classList.add('hidden'));
        
        // Show target section
        document.getElementById(`${targetId}-section`).classList.remove('hidden');
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        e.target.classList.add('active');
    });
});

// Start bot button handler
startBotButton.addEventListener('click', () => {
    if (!currentBot) {
        alert('Por favor selecciona un bot primero');
        return;
    }
    
    logToConsole("Iniciando bot...", 'info');
    startBotButton.disabled = true;
    
    qrContainer.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="spinner"></div>
            <span class="text-gray-600 ml-2">Iniciando bot...</span>
        </div>
    `;
    
    socket.emit('start_bot', { bot_id: currentBot });
});

// Stop bot button handler
stopBotButton.addEventListener('click', () => {
    if (!currentBot) {
        return;
    }
    
    logToConsole("Deteniendo bot...", 'info');
    stopBotButton.disabled = true;
    
    socket.emit('stop_bot', { bot_id: currentBot });
});

// Try to restore session from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    logToConsole("Sistema inicializado. Esperando acciones...", 'info');
    
    // Check if we have a stored user session
    const storedUser = localStorage.getItem('user');
    if (storedUser && !currentUser) {
        const userData = JSON.parse(storedUser);
        logToConsole(`Restaurando sesión de usuario: ${userData.displayName}`, 'info');
    }
});