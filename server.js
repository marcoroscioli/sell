const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Data storage (in production, use a database)
let products = [];
let users = [];

// Load initial data
function loadInitialData() {
    try {
        const productsData = fs.readFileSync('data/products.json', 'utf8');
        products = JSON.parse(productsData);
    } catch (error) {
        // Create default products if file doesn't exist
        products = [
            {
                id: 1,
                name: "Wireless Bluetooth Headphones",
                price: 79.99,
                description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                category: "electronics"
            },
            {
                id: 2,
                name: "Smart Fitness Watch",
                price: 199.99,
                description: "Track your fitness goals with heart rate monitoring, GPS, and water resistance.",
                image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
                category: "electronics"
            },
            {
                id: 3,
                name: "Premium Coffee Maker",
                price: 149.99,
                description: "Professional-grade coffee maker with programmable settings and thermal carafe.",
                image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
                category: "home"
            },
            {
                id: 4,
                name: "Yoga Mat Premium",
                price: 39.99,
                description: "Non-slip yoga mat with extra cushioning and carrying strap included.",
                image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
                category: "sports"
            },
            {
                id: 5,
                name: "Designer Backpack",
                price: 89.99,
                description: "Stylish and functional backpack with laptop compartment and multiple pockets.",
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
                category: "clothing"
            },
            {
                id: 6,
                name: "Programming Book Collection",
                price: 59.99,
                description: "Complete set of programming books covering JavaScript, Python, and web development.",
                image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
                category: "books"
            }
        ];
        saveProducts();
    }

    try {
        const usersData = fs.readFileSync('data/users.json', 'utf8');
        users = JSON.parse(usersData);
    } catch (error) {
        users = [];
        saveUsers();
    }
}

// Save data functions
function saveProducts() {
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }
    fs.writeFileSync('data/products.json', JSON.stringify(products, null, 2));
}

function saveUsers() {
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }
    fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
}

// API Routes
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.post('/api/products', (req, res) => {
    const newProduct = {
        id: Date.now(),
        ...req.body
    };
    products.push(newProduct);
    saveProducts();
    
    // Broadcast to all connected clients
    io.emit('productAdded', newProduct);
    
    res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    products[productIndex] = { ...products[productIndex], ...req.body };
    saveProducts();
    
    // Broadcast to all connected clients
    io.emit('productUpdated', products[productIndex]);
    
    res.json(products[productIndex]);
});

app.delete('/api/products/:id', (req, res) => {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    const deletedProduct = products.splice(productIndex, 1)[0];
    saveProducts();
    
    // Broadcast to all connected clients
    io.emit('productDeleted', productId);
    
    res.json(deletedProduct);
});

// User routes
app.post('/api/users/register', (req, res) => {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    if (users.find(u => u.username === username || u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }
    
    const newUser = {
        id: Date.now(),
        username,
        email,
        password, // In production, hash this password
        joinDate: new Date().toISOString(),
        searchHistory: []
    };
    
    users.push(newUser);
    saveUsers();
    
    res.json({ message: 'User created successfully', userId: newUser.id });
});

app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ message: 'Login successful', user: { ...user, password: undefined } });
});

app.put('/api/users/:id/search-history', (req, res) => {
    const userId = parseInt(req.params.id);
    const { searchTerm } = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const searchEntry = {
        term: searchTerm,
        timestamp: new Date().toISOString()
    };
    
    if (!users[userIndex].searchHistory) {
        users[userIndex].searchHistory = [];
    }
    
    users[userIndex].searchHistory.unshift(searchEntry);
    users[userIndex].searchHistory = users[userIndex].searchHistory.slice(0, 20);
    
    saveUsers();
    
    res.json({ message: 'Search history updated' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current products to newly connected client
    socket.emit('productsUpdated', products);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
loadInitialData();

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('WebSocket server is ready for real-time updates');
});

module.exports = { app, server, io };

