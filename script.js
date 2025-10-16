// Global variables
let products = [];
let cart = [];
let isAdminLoggedIn = false;
let currentUser = null;
let searchHistory = [];
let filteredProducts = [];
let socket = null;
let isConnectedToServer = false;

// Initialize WebSocket connection
function initializeWebSocket() {
    console.log('Attempting to initialize WebSocket connection...');
    
    try {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.log('Socket.IO not loaded, running in offline mode');
            isConnectedToServer = false;
            return;
        }
        
        console.log('Socket.IO is available, creating connection...');
        socket = io();
        
        socket.on('connect', () => {
            console.log('✅ Connected to server successfully!');
            isConnectedToServer = true;
            showNotification('Connected to server - Real-time updates enabled!', 'success');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            isConnectedToServer = false;
            showNotification('Disconnected from server', 'warning');
        });
        
        socket.on('connect_error', (error) => {
            console.log('❌ Connection error:', error);
            isConnectedToServer = false;
            showNotification('Server connection failed - Running in offline mode', 'warning');
        });
        
        socket.on('productsUpdated', (serverProducts) => {
            console.log('📦 Products updated from server:', serverProducts.length, 'products');
            products = serverProducts;
            filteredProducts = [...products];
            loadProducts();
            loadAdminProducts();
        });
        
        socket.on('productAdded', (newProduct) => {
            console.log('➕ Product added:', newProduct.name);
            products.push(newProduct);
            filteredProducts = [...products];
            loadProducts();
            loadAdminProducts();
            showNotification('New product added by admin!', 'info');
        });
        
        socket.on('productUpdated', (updatedProduct) => {
            console.log('✏️ Product updated:', updatedProduct.name);
            const index = products.findIndex(p => p.id === updatedProduct.id);
            if (index !== -1) {
                products[index] = updatedProduct;
                filteredProducts = [...products];
                loadProducts();
                loadAdminProducts();
                showNotification('Product updated by admin!', 'info');
            }
        });
        
        socket.on('productDeleted', (productId) => {
            console.log('🗑️ Product deleted:', productId);
            products = products.filter(p => p.id !== productId);
            filteredProducts = [...products];
            loadProducts();
            loadAdminProducts();
            showNotification('Product deleted by admin!', 'info');
        });
        
    } catch (error) {
        console.log('❌ WebSocket initialization failed:', error);
        isConnectedToServer = false;
    }
}

// Sample products data
const sampleProducts = [
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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Try to connect to server first
    initializeWebSocket();
    
    // Load products from server or localStorage
    if (isConnectedToServer) {
        // Products will be loaded via WebSocket
        setTimeout(() => {
            if (products.length === 0) {
                loadProductsFromLocalStorage();
            }
        }, 1000);
    } else {
        loadProductsFromLocalStorage();
    }
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    
    // Load admin login state
    const adminState = localStorage.getItem('isAdminLoggedIn');
    if (adminState === 'true') {
        isAdminLoggedIn = true;
        showAdminPanel();
    }
    
    // Load user data
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showUserDashboard();
    }
    
    // Load search history
    const savedSearchHistory = localStorage.getItem('searchHistory');
    if (savedSearchHistory) {
        searchHistory = JSON.parse(savedSearchHistory);
    }
    
    // Initialize filtered products
    filteredProducts = [...products];
    
    // Initialize the page
    loadProducts();
    updateCartDisplay();
    showSection('products');
});

function loadProductsFromLocalStorage() {
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        products = [...sampleProducts];
        saveProducts();
    }
    filteredProducts = [...products];
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show the selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Special handling for admin section
    if (sectionName === 'admin' && !isAdminLoggedIn) {
        document.getElementById('admin-login').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
    }
    
    // Special handling for account section
    if (sectionName === 'account') {
        if (currentUser) {
            showUserDashboard();
        } else {
            showUserAuth();
        }
    }
}

// Product management functions
function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    const productsToShow = filteredProducts.length > 0 ? filteredProducts : products;
    
    if (productsToShow.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search terms</p>
            </div>
        `;
        return;
    }
    
    productsToShow.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

// Search functionality
function searchProducts() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...products];
        document.querySelector('.search-results-info')?.remove();
    } else {
        filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
        
        // Save search to history if user is logged in
        if (currentUser && searchTerm) {
            saveSearchToHistory(searchTerm);
        }
        
        // Show search results info
        showSearchResultsInfo(filteredProducts.length, searchTerm);
    }
    
    loadProducts();
}

function showSearchResultsInfo(count, searchTerm) {
    // Remove existing search info
    document.querySelector('.search-results-info')?.remove();
    
    const productsGrid = document.getElementById('products-grid');
    const searchInfo = document.createElement('div');
    searchInfo.className = 'search-results-info';
    searchInfo.innerHTML = `Found ${count} product${count !== 1 ? 's' : ''} for "${searchTerm}"`;
    
    productsGrid.parentNode.insertBefore(searchInfo, productsGrid);
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
        </div>
    `;
    return card;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartDisplay();
    
    // Show success message
    showNotification('Product added to cart!', 'success');
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items display
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add some products to get started!</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = '';
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
    }
    
    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartDisplay();
    showNotification('Product removed from cart', 'info');
}

function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'warning');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    alert(`Thank you for your purchase!\nTotal: $${total.toFixed(2)}\n\nYour order has been processed.`);
    
    cart = [];
    saveCart();
    updateCartDisplay();
    showSection('products');
}

// Admin functions
function adminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'fart' && password === 'Tortel123456789') {
        isAdminLoggedIn = true;
        localStorage.setItem('isAdminLoggedIn', 'true');
        showAdminPanel();
        showNotification('Welcome, Admin!', 'success');
    } else {
        showNotification('Invalid credentials!', 'error');
    }
}

function adminLogout() {
    isAdminLoggedIn = false;
    localStorage.removeItem('isAdminLoggedIn');
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showNotification('Logged out successfully', 'info');
}

function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAdminProducts();
}

function showAddProductForm() {
    document.getElementById('add-product-form').style.display = 'block';
}

function hideAddProductForm() {
    document.getElementById('add-product-form').style.display = 'none';
    // Reset form fields manually
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-image').value = '';
    document.getElementById('product-category').value = 'electronics';
}

function addProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const description = document.getElementById('product-description').value;
    const image = document.getElementById('product-image').value;
    const category = document.getElementById('product-category').value;
    
    const newProduct = {
        name: name,
        price: price,
        description: description,
        image: image,
        category: category
    };
    
    if (isConnectedToServer) {
        // Send to server
        fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newProduct)
        })
        .then(response => response.json())
        .then(product => {
            showNotification('Product added successfully!', 'success');
            hideAddProductForm();
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to add product', 'error');
        });
    } else {
        // Local storage fallback
        newProduct.id = Date.now();
        products.push(newProduct);
        saveProducts();
        loadProducts();
        loadAdminProducts();
        hideAddProductForm();
        showNotification('Product added successfully!', 'success');
    }
}

function loadAdminProducts() {
    const adminGrid = document.getElementById('admin-products-grid');
    adminGrid.innerHTML = '';
    
    products.forEach(product => {
        const adminCard = document.createElement('div');
        adminCard.className = 'admin-product-card';
        adminCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="admin-product-image" onerror="this.src='https://via.placeholder.com/300x150?text=No+Image'">
            <div class="admin-product-name">${product.name}</div>
            <div class="admin-product-price">$${product.price.toFixed(2)}</div>
            <div class="admin-product-actions">
                <button class="edit-btn" onclick="editProduct(${product.id})">Edit</button>
                <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
            </div>
        `;
        adminGrid.appendChild(adminCard);
    });
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const newName = prompt('Enter new product name:', product.name);
    if (newName === null) return;
    
    const newPrice = prompt('Enter new price:', product.price);
    if (newPrice === null) return;
    
    const newDescription = prompt('Enter new description:', product.description);
    if (newDescription === null) return;
    
    const newImage = prompt('Enter new image URL:', product.image);
    if (newImage === null) return;
    
    const updatedProduct = {
        name: newName,
        price: parseFloat(newPrice) || product.price,
        description: newDescription,
        image: newImage,
        category: product.category
    };
    
    if (isConnectedToServer) {
        // Send to server
        fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProduct)
        })
        .then(response => response.json())
        .then(product => {
            showNotification('Product updated successfully!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to update product', 'error');
        });
    } else {
        // Local storage fallback
        product.name = updatedProduct.name;
        product.price = updatedProduct.price;
        product.description = updatedProduct.description;
        product.image = updatedProduct.image;
        
        saveProducts();
        loadProducts();
        loadAdminProducts();
        showNotification('Product updated successfully!', 'success');
    }
}

function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    if (isConnectedToServer) {
        // Send to server
        fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(product => {
            showNotification('Product deleted successfully!', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to delete product', 'error');
        });
    } else {
        // Local storage fallback
        products = products.filter(p => p.id !== productId);
        saveProducts();
        loadProducts();
        loadAdminProducts();
        showNotification('Product deleted successfully!', 'success');
    }
}

// Utility functions
function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#212529';
            break;
        default:
            notification.style.backgroundColor = '#17a2b8';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// User Account Functions
function showAuthTab(tab) {
    // Hide all auth forms
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected form and tab
    document.getElementById('user-' + tab).classList.add('active');
    event.target.classList.add('active');
}

function userLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    
    if (isConnectedToServer) {
        // Send to server
        fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showUserDashboard();
                showNotification('Welcome back!', 'success');
            } else {
                showNotification('Invalid username or password!', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Login failed', 'error');
        });
    } else {
        // Local storage fallback
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showUserDashboard();
            showNotification('Welcome back!', 'success');
        } else {
            showNotification('Invalid username or password!', 'error');
        }
    }
}

function userRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }
    
    if (isConnectedToServer) {
        // Send to server
        fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.userId) {
                // Create user object for local storage
                const newUser = {
                    id: data.userId,
                    username,
                    email,
                    joinDate: new Date().toISOString(),
                    searchHistory: []
                };
                
                currentUser = newUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showUserDashboard();
                showNotification('Account created successfully!', 'success');
            } else {
                showNotification(data.error || 'Registration failed', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Registration failed', 'error');
        });
    } else {
        // Local storage fallback
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if username already exists
        if (users.find(u => u.username === username)) {
            showNotification('Username already exists!', 'error');
            return;
        }
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            showNotification('Email already exists!', 'error');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now(),
            username: username,
            email: email,
            password: password,
            joinDate: new Date().toISOString(),
            searchHistory: []
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showUserDashboard();
        showNotification('Account created successfully!', 'success');
    }
}

function showUserAuth() {
    document.getElementById('user-auth').style.display = 'block';
    document.getElementById('user-dashboard').style.display = 'none';
}

function showUserDashboard() {
    document.getElementById('user-auth').style.display = 'none';
    document.getElementById('user-dashboard').style.display = 'block';
    
    // Update dashboard info
    document.getElementById('user-name').textContent = currentUser.username;
    document.getElementById('dashboard-username').textContent = currentUser.username;
    document.getElementById('dashboard-email').textContent = currentUser.email;
    document.getElementById('member-since').textContent = new Date(currentUser.joinDate).toLocaleDateString();
    
    // Load search history
    loadSearchHistory();
}

function userLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showUserAuth();
    showNotification('Logged out successfully', 'info');
}

function saveSearchToHistory(searchTerm) {
    if (!currentUser) return;
    
    const searchEntry = {
        term: searchTerm,
        timestamp: new Date().toISOString()
    };
    
    if (isConnectedToServer) {
        // Send to server
        fetch(`/api/users/${currentUser.id}/search-history`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ searchTerm })
        })
        .then(response => response.json())
        .then(data => {
            // Update local user data
            if (!currentUser.searchHistory) {
                currentUser.searchHistory = [];
            }
            currentUser.searchHistory.unshift(searchEntry);
            currentUser.searchHistory = currentUser.searchHistory.slice(0, 20);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        })
        .catch(error => {
            console.error('Error saving search history:', error);
        });
    } else {
        // Local storage fallback
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex !== -1) {
            if (!users[userIndex].searchHistory) {
                users[userIndex].searchHistory = [];
            }
            
            // Add new search (limit to 20 recent searches)
            users[userIndex].searchHistory.unshift(searchEntry);
            users[userIndex].searchHistory = users[userIndex].searchHistory.slice(0, 20);
            
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update current user
            currentUser = users[userIndex];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }
}

function loadSearchHistory() {
    const historyList = document.getElementById('search-history-list');
    historyList.innerHTML = '';
    
    if (!currentUser || !currentUser.searchHistory || currentUser.searchHistory.length === 0) {
        historyList.innerHTML = '<p>No search history yet.</p>';
        return;
    }
    
    currentUser.searchHistory.forEach(search => {
        const historyItem = document.createElement('div');
        historyItem.className = 'search-history-item';
        historyItem.innerHTML = `
            <div>${search.term}</div>
            <div class="search-time">${new Date(search.timestamp).toLocaleString()}</div>
        `;
        historyList.appendChild(historyItem);
    });
}

function clearSearchHistory() {
    if (!currentUser) return;
    
    if (!confirm('Are you sure you want to clear your search history?')) return;
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    
    if (userIndex !== -1) {
        users[userIndex].searchHistory = [];
        localStorage.setItem('users', JSON.stringify(users));
        
        currentUser.searchHistory = [];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        loadSearchHistory();
        showNotification('Search history cleared!', 'success');
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


