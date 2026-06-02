// ==========================================
// DATABASE SCHEMA: Mock MySQL Community Edition
// ==========================================
const Database = {
    users: [
        { id: 1, email: 'user@zigzag.com', password: 'password123', name: 'John Doe', role: 'customer', address: { street: '123 Main St', city: 'Bengaluru', state: 'Karnataka', zip: '560001' } },
        { id: 2, email: 'admin@zigzag.com', password: 'admin123', name: 'System Admin', role: 'admin' },
        { id: 3, email: 'seller@zigzag.com', password: 'seller123', name: 'Alpha Traders', role: 'seller' }
    ],
    products: [
        { id: 101, name: 'Premium Wireless Headphones', category: 'Electronics', price: 2999, rating: 4.5, reviews: [{user: 'Amit', rating: 5, comment: 'Great bass!'}], stock: 15, sellerId: 3, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
        { id: 102, name: 'Running Sports Shoes', category: 'Fashion', price: 1499, rating: 4.0, reviews: [], stock: 25, sellerId: 3, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500' },
        { id: 103, name: 'Smart Fitness Watch', category: 'Electronics', price: 3999, rating: 4.8, reviews: [], stock: 8, sellerId: 3, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' },
        { id: 104, name: 'Minimalist Leather Wallet', category: 'Accessories', price: 799, rating: 4.2, reviews: [], stock: 50, sellerId: 3, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500' }
    ],
    carts: {}, // Structure: { userId: [ { productId, quantity, savedForLater: false } ] }
    orders: [
        { id: 'ORD-9081', userId: 1, items: [{ productId: 101, quantity: 1, price: 2999 }], total: 2999, status: 'Shipped', paymentMethod: 'UPI', date: '2026-05-28' }
    ],
    categories: ['Electronics', 'Fashion', 'Accessories']
};

// Initialize state containers
if (!localStorage.getItem('zigzag_db')) {
    localStorage.setItem('zigzag_db', JSON.stringify(Database));
}
function getDB() { return JSON.parse(localStorage.getItem('zigzag_db')); }
function saveDB(db) { localStorage.setItem('zigzag_db', JSON.stringify(db)); }

// ==========================================
// APPLICATION STATE (Frontend Router Variable)
// ==========================================
let AppState = {
    currentUser: null,
    currentView: 'home', // home, login, signup, forgot-password, profile, product-detail, cart, checkout, tracking, admin, seller
    selectedProductId: null,
    searchQuery: '',
    selectedCategory: '',
    priceFilter: 5000,
    checkoutCart: [],
    activeTrackingOrder: null
};

// ==========================================
// BACKEND CONTROLLERS: REST API SIMULATION
// ==========================================
const API = {
    // 1. User Module Routes
    register: (name, email, password, role = 'customer') => {
        let db = getDB();
        if (db.users.find(u => u.email === email)) return { status: 400, message: 'Email already exists' };
        const newUser = { id: Date.now(), name, email, password, role, address: null };
        db.users.push(newUser);
        saveDB(db);
        return { status: 201, data: newUser };
    },
    login: (email, password) => {
        let db = getDB();
        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) return { status: 401, message: 'Invalid credentials' };
        return { status: 200, data: user };
    },
    updateProfile: (userId, name, password) => {
        let db = getDB();
        let user = db.users.find(u => u.id === userId);
        if (user) {
            user.name = name;
            if (password) user.password = password;
            saveDB(db);
            return { status: 200, data: user };
        }
        return { status: 444, message: 'User not found' };
    },
    updateAddress: (userId, addressObj) => {
        let db = getDB();
        let user = db.users.find(u => u.id === userId);
        if (user) {
            user.address = addressObj;
            saveDB(db);
            return { status: 200, data: user };
        }
        return { status: 444, message: 'User not found' };
    },

    // 2. Product Module Routes
    getProducts: (search = '', category = '', maxPrice = 10000) => {
        let db = getDB();
        return db.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = category === '' || p.category === category;
            const matchesPrice = p.price <= maxPrice;
            return matchesSearch && matchesCategory && matchesPrice;
        });
    },
    addProductReview: (productId, userName, rating, comment) => {
        let db = getDB();
        let prod = db.products.find(p => p.id === productId);
        if (prod) {
            if (!prod.reviews) prod.reviews = [];
            prod.reviews.push({ user: userName, rating: parseInt(rating), comment });
            const totalRating = prod.reviews.reduce((acc, r) => acc + r.rating, 0);
            prod.rating = parseFloat((totalRating / prod.reviews.length).toFixed(1));
            saveDB(db);
        }
    },

    // 3. Shopping Cart Routes
    getCart: (userId) => {
        let db = getDB();
        return db.carts[userId] || [];
    },
    updateCart: (userId, cartArray) => {
        let db = getDB();
        db.carts[userId] = cartArray;
        saveDB(db);
    },

    // 4. Order Management Routes
    placeOrder: (userId, items, total, paymentMethod) => {
        let db = getDB();
        const newOrder = {
            id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
            userId, items, total, status: 'Placed', paymentMethod, date: new Date().toISOString().split('T')[0]
        };
        db.orders.push(newOrder);
        // Deduct stock levels
        items.forEach(item => {
            let prod = db.products.find(p => p.id === item.productId);
            if (prod) prod.stock = Math.max(0, prod.stock - item.quantity);
        });
        db.carts[userId] = []; // Clear active items
        saveDB(db);
        return newOrder;
    },
    updateOrderStatus: (orderId, status) => {
        let db = getDB();
        let order = db.orders.find(o => o.id === orderId);
        if (order) { order.status = status; saveDB(db); }
    },

    // 6 & 7. Admin & Seller Controls
    saveProduct: (productObj) => {
        let db = getDB();
        if (productObj.id) {
            let idx = db.products.findIndex(p => p.id === productObj.id);
            if (idx !== -1) db.products[idx] = { ...db.products[idx], ...productObj };
        } else {
            productObj.id = Date.now();
            productObj.rating = 5.0;
            productObj.reviews = [];
            db.products.push(productObj);
        }
        saveDB(db);
    },
    deleteProduct: (productId) => {
        let db = getDB();
        db.products = db.products.filter(p => p.id !== productId);
        saveDB(db);
    }
};

// ==========================================
// FRONTEND VIEW RENDERING SYSTEM
// ==========================================
function navigate(view, id = null) {
    AppState.currentView = view;
    if (id) {
        if (view === 'product-detail') AppState.selectedProductId = id;
        if (view === 'tracking') AppState.activeTrackingOrder = id;
    }
    render();
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    
    // Build layout parts
    app.appendChild(createNavbar());
    
    const mainContent = document.createElement('main');
    mainContent.className = "flex-grow container mx-auto px-4 py-6";

    switch(AppState.currentView) {
        case 'home': mainContent.appendChild(renderHome()); break;
        case 'login': mainContent.appendChild(renderLogin()); break;
        case 'signup': mainContent.appendChild(renderSignup()); break;
        case 'forgot-password': mainContent.appendChild(renderForgotPassword()); break;
        case 'profile': mainContent.appendChild(renderProfile()); break;
        case 'product-detail': mainContent.appendChild(renderProductDetail()); break;
        case 'cart': mainContent.appendChild(renderCart()); break;
        case 'checkout': mainContent.appendChild(renderCheckout()); break;
        case 'tracking': mainContent.appendChild(renderTracking()); break;
        case 'admin': mainContent.appendChild(renderAdminPanel()); break;
        case 'seller': mainContent.appendChild(renderSellerPortal()); break;
    }

    app.appendChild(mainContent);
    app.appendChild(createFooter());
}

// --- Layout Building Blocks ---
// Defining functions globally so click handlers embedded in strings work seamlessly
window.executeSearch = function() {
    const val = document.getElementById('navSearch')?.value || '';
    AppState.searchQuery = val;
    navigate('home');
}

window.logout = function() {
    AppState.currentUser = null;
    AppState.currentView = 'home';
    render();
}

window.navigate = navigate;

function createNavbar() {
    const nav = document.createElement('nav');
    nav.className = "bg-indigo-900 text-white shadow-md px-6 py-4 flex flex-wrap justify-between items-center";
    
    let cartCount = 0;
    if (AppState.currentUser) {
        cartCount = API.getCart(AppState.currentUser.id).filter(i => !i.savedForLater).reduce((acc, i) => acc + i.quantity, 0);
    }

    nav.innerHTML = `
        <div class="flex items-center space-x-6">
            <span class="text-2xl font-black tracking-wider cursor-pointer text-yellow-400" onclick="navigate('home')">ZigZag</span>
            <div class="hidden md:flex items-center bg-white text-gray-800 rounded px-2 py-1 w-80">
                <input type="text" id="navSearch" placeholder="Search products..." class="outline-none w-full px-2 py-1 text-sm" value="${AppState.searchQuery}">
                <button onclick="executeSearch()" class="text-indigo-900"><i class="fa fa-search"></i></button>
            </div>
        </div>
        <div class="flex items-center space-x-6 font-medium mt-2 sm:mt-0">
            <span class="cursor-pointer hover:text-yellow-400" onclick="navigate('home')"><i class="fa fa-home"></i> Home</span>
            ${AppState.currentUser ? `
                <span class="cursor-pointer hover:text-yellow-400" onclick="navigate('profile')"><i class="fa fa-user"></i> ${AppState.currentUser.name}</span>
                <span class="cursor-pointer hover:text-yellow-400 relative" onclick="navigate('cart')">
                    <i class="fa fa-shopping-cart"></i> Cart
                    ${cartCount > 0 ? `<span class="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full px-1.5">${cartCount}</span>` : ''}
                </span>
                ${AppState.currentUser.role === 'admin' ? `<span class="cursor-pointer text-red-300 hover:text-white" onclick="navigate('admin')"><i class="fa fa-lock"></i> Admin</span>` : ''}
                ${AppState.currentUser.role === 'seller' ? `<span class="cursor-pointer text-green-300 hover:text-white" onclick="navigate('seller')"><i class="fa fa-store"></i> Seller</span>` : ''}
                <span class="cursor-pointer text-gray-300 hover:text-white" onclick="logout()"><i class="fa fa-sign-out-alt"></i> Logout</span>
            ` : `
                <span class="cursor-pointer hover:text-yellow-400" onclick="navigate('login')">Login</span>
                <span class="cursor-pointer bg-yellow-400 text-indigo-900 px-3 py-1.5 rounded font-bold hover:bg-yellow-300" onclick="navigate('signup')">Signin</span>
            `}
        </div>
    `;
    return nav;
}

function createFooter() {
    const footer = document.createElement('footer');
    footer.className = "bg-gray-900 text-gray-400 text-center py-6 text-sm mt-12 border-t border-gray-800";
    footer.innerHTML = `&copy; 2026 <span class="text-yellow-400 font-bold">ZigZag</span> Digital Marketplace System. Built to requested roadmap metrics.`;
    return footer;
}

// ==========================================
// MODULE 1: USER MODULE VIEWS
// ==========================================
window.handleLogin = function(e) {
    e.preventDefault();
    const res = API.login(document.getElementById('loginEmail').value, document.getElementById('loginPass').value);
    if(res.status === 200) {
        AppState.currentUser = res.data;
        navigate('home');
    } else {
        const err = document.getElementById('loginErr');
        err.innerText = res.message; err.classList.remove('hidden');
    }
}

window.handleSignup = function(e) {
    e.preventDefault();
    const res = API.register(
        document.getElementById('regName').value,
        document.getElementById('regEmail').value,
        document.getElementById('regPass').value,
        document.getElementById('regRole').value
    );
    if(res.status === 201) {
        alert('Account generated via role based access configuration! Please log in.');
        navigate('login');
    } else {
        const err = document.getElementById('regErr');
        err.innerText = res.message; err.classList.remove('hidden');
    }
}

window.handleProfileUpdate = function(e) {
    e.preventDefault();
    const res = API.updateProfile(AppState.currentUser.id, document.getElementById('profName').value, document.getElementById('profPass').value);
    if(res.status === 200) { AppState.currentUser = res.data; alert('Account data optimized.'); render(); }
}

window.handleAddressUpdate = function(e) {
    e.preventDefault();
    const addrObj = {
        street: document.getElementById('addrStreet').value,
        city: document.getElementById('addrCity').value,
        state: document.getElementById('addrState').value,
        zip: document.getElementById('addrZip').value
    };
    const res = API.updateAddress(AppState.currentUser.id, addrObj);
    if(res.status === 200) { AppState.currentUser = res.data; alert('Address registration updated successfully.'); render(); }
}

window.cancelUserOrder = function(orderId) {
    if(confirm("Confirm instant pipeline cancellation for order: " + orderId)) {
        API.updateOrderStatus(orderId, 'Cancelled');
        render();
    }
}

function renderLogin() {
    const div = document.createElement('div');
    div.className = "max-w-md mx-auto bg-white p-8 rounded-lg shadow-md my-12";
    div.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-center text-indigo-950">Login to ZigZag</h2>
        <div id="loginErr" class="text-red-500 text-sm mb-4 hidden"></div>
        <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold mb-1">Email Address</label>
                <input type="email" id="loginEmail" required class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">Password</label>
                <input type="password" id="loginPass" required class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
            </div>
            <div class="text-right">
                <span onclick="navigate('forgot-password')" class="text-sm text-indigo-600 hover:underline cursor-pointer">Forgot Password?</span>
            </div>
            <button class="w-full bg-indigo-900 text-white py-2 rounded font-bold hover:bg-indigo-800 transition">Sign In</button>
        </form>
        <p class="text-sm text-center mt-4">New to ZigZag? <span onclick="navigate('signup')" class="text-indigo-600 hover:underline cursor-pointer font-medium">Create account (Signin)</span></p>
    `;
    return div;
}

function renderSignup() {
    const div = document.createElement('div');
    div.className = "max-w-md mx-auto bg-white p-8 rounded-lg shadow-md my-8";
    div.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-center text-indigo-950">Signin to ZigZag Account Setup</h2>
        <div id="regErr" class="text-red-500 text-sm mb-4 hidden"></div>
        <form onsubmit="handleSignup(event)" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold mb-1">Full Name</label>
                <input type="text" id="regName" required class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">Email Address</label>
                <input type="email" id="regEmail" required class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">Password</label>
                <input type="password" id="regPass" required class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">Role Based Access</label>
                <select id="regRole" class="w-full border p-2 rounded focus:ring focus:ring-indigo-300 outline-none">
                    <option value="customer">Customer</option>
                    <option value="seller">Seller Marketplace Account</option>
                </select>
            </div>
            <button class="w-full bg-indigo-900 text-white py-2 rounded font-bold hover:bg-indigo-800 transition">Signin</button>
        </form>
    `;
    return div;
}

function renderForgotPassword() {
    const div = document.createElement('div');
    div.className = "max-w-md mx-auto bg-white p-8 rounded-lg shadow-md my-12 text-center";
    div.innerHTML = `
        <h2 class="text-2xl font-bold mb-4 text-indigo-950">Reset Password</h2>
        <p class="text-sm text-gray-600 mb-6">Enter your account email directory to process verification.</p>
        <input type="email" id="fpEmail" placeholder="Enter registration email" class="w-full border p-2 rounded mb-4 outline-none">
        <button onclick="alert('Password reset confirmation token pushed to email system logs.'); navigate('login');" class="w-full bg-indigo-900 text-white py-2 rounded font-bold">Verify & Send Reset Route</button>
    `;
    return div;
}

function renderProfile() {
    const div = document.createElement('div');
    div.className = "grid grid-cols-1 md:grid-cols-3 gap-6 my-6";
    
    let db = getDB();
    let orders = db.orders.filter(o => o.userId === AppState.currentUser.id);
    let addr = AppState.currentUser.address || { street: '', city: '', state: '', zip: '' };

    div.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md md:col-span-1 space-y-6">
            <div>
                <h3 class="text-lg font-bold border-b pb-2 mb-4 text-indigo-950"><i class="fa fa-user-cog"></i> Account Details</h3>
                <form onsubmit="handleProfileUpdate(event)" class="space-y-3">
                    <div>
                        <label class="text-xs font-bold block">Name</label>
                        <input type="text" id="profName" value="${AppState.currentUser.name}" class="w-full border p-1.5 rounded text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold block">New Password (Optional)</label>
                        <input type="password" id="profPass" placeholder="Leave blank to retain" class="w-full border p-1.5 rounded text-sm">
                    </div>
                    <button class="bg-indigo-900 text-white px-3 py-1.5 text-xs font-bold rounded">Update Account</button>
                </form>
            </div>

            <div>
                <h3 class="text-lg font-bold border-b pb-2 mb-4 text-indigo-950"><i class="fa fa-map-marker-alt"></i> Address Setup</h3>
                <form onsubmit="handleAddressUpdate(event)" class="space-y-3">
                    <div>
                        <label class="text-xs font-bold block">Street Address</label>
                        <input type="text" id="addrStreet" value="${addr.street}" class="w-full border p-1.5 rounded text-sm" required>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-xs font-bold block">City</label>
                            <input type="text" id="addrCity" value="${addr.city}" class="w-full border p-1.5 rounded text-sm" required>
                        </div>
                        <div>
                            <label class="text-xs font-bold block">State</label>
                            <input type="text" id="addrState" value="${addr.state}" class="w-full border p-1.5 rounded text-sm" required>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold block">Postal ZIP</label>
                        <input type="text" id="addrZip" value="${addr.zip}" class="w-full border p-1.5 rounded text-sm" required>
                    </div>
                    <button class="bg-indigo-900 text-white px-3 py-1.5 text-xs font-bold rounded">Save Address Matrix</button>
                </form>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md md:col-span-2">
            <h3 class="text-xl font-bold border-b pb-2 mb-4 text-indigo-950"><i class="fa fa-history"></i> Customer Order History</h3>
            ${orders.length === 0 ? '<p class="text-gray-500 text-sm">No transaction records found inside MySQL instance.</p>' : `
                <div class="space-y-4">
                    ${orders.map(o => `
                        <div class="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
                            <div>
                                <div class="text-sm font-bold text-indigo-900">${o.id}</div>
                                <div class="text-xs text-gray-500">Placed on: ${o.date} | Payment: ${o.paymentMethod}</div>
                                <div class="text-sm mt-1 font-semibold">Total Invoice Amount: ₹${o.total}</div>
                                <div class="text-xs text-gray-500">Status: <span class="px-2 py-0.5 rounded text-xs bg-yellow-100 border border-yellow-300 font-bold">${o.status}</span></div>
                            </div>
                            <div class="space-y-2 text-right">
                                <button onclick="navigate('tracking', '${o.id}')" class="block bg-indigo-900 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-indigo-800">Track Order</button>
                                ${o.status === 'Placed' ? `<button onclick="cancelUserOrder('${o.id}')" class="block bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-semibold border border-red-300 hover:bg-red-200">Cancel Order</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
    return div;
}

// ==========================================
// MODULE 2: PRODUCT MODULE VIEWS
// ==========================================
window.setCategoryFilter = function(cat) { AppState.selectedCategory = cat; render(); }
window.setPriceFilter = function(val) { AppState.priceFilter = parseInt(val); render(); }

window.handleReviewSubmit = function(e, prodId) {
    e.preventDefault();
    if (!AppState.currentUser) { alert("Authentication token context missing. Please log in first."); navigate('login'); return; }
    const rating = document.getElementById('revRating').value;
    const comment = document.getElementById('revComment').value;
    API.addProductReview(prodId, AppState.currentUser.name, rating, comment);
    alert("Review ledger updated within MySQL product object registry.");
    render();
}

function renderHome() {
    const container = document.createElement('div');
    container.className = "grid grid-cols-1 lg:grid-cols-4 gap-6";

    // Sidebar Filter UI
    const sidebar = document.createElement('div');
    sidebar.className = "bg-white p-4 rounded-lg shadow-sm h-fit space-y-6";
    let db = getDB();
    sidebar.innerHTML = `
        <div>
            <h4 class="font-bold text-sm text-indigo-950 uppercase tracking-wider mb-2">Product Categories</h4>
            <div class="space-y-1">
                <div class="cursor-pointer text-sm ${AppState.selectedCategory === '' ? 'font-bold text-indigo-700' : 'text-gray-600'}" onclick="setCategoryFilter('')">All Categories</div>
                ${db.categories.map(c => `
                    <div class="cursor-pointer text-sm ${AppState.selectedCategory === c ? 'font-bold text-indigo-700' : 'text-gray-600'}" onclick="setCategoryFilter('${c}')">${c}</div>
                `).join('')}
            </div>
        </div>
        <div>
            <h4 class="font-bold text-sm text-indigo-950 uppercase tracking-wider mb-2">Max Price Matrix</h4>
            <input type="range" min="500" max="10000" step="500" value="${AppState.priceFilter}" onchange="setPriceFilter(this.value)" class="w-full accent-indigo-900">
            <div class="text-xs text-gray-500 mt-1 flex justify-between"><span>₹500</span><span class="font-bold text-indigo-900">Up to ₹${AppState.priceFilter}</span></div>
        </div>
    `;
    container.appendChild(sidebar);

    // Product Grid Area
    const mainGrid = document.createElement('div');
    mainGrid.className = "lg:col-span-3";

    const filteredProds = API.getProducts(AppState.searchQuery, AppState.selectedCategory, AppState.priceFilter);
    
    if(filteredProds.length === 0) {
        mainGrid.innerHTML = `<div class="bg-white p-12 rounded-lg text-center text-gray-500 shadow-sm font-medium">No catalog records match parameters inside relational index.</div>`;
    } else {
        const grid = document.createElement('div');
        grid.className = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6";
        filteredProds.forEach(p => {
            const card = document.createElement('div');
            card.className = "bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between";
            card.innerHTML = `
                <div class="cursor-pointer" onclick="navigate('product-detail', ${p.id})">
                    <img src="${p.image}" alt="${p.name}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <span class="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded font-medium">${p.category}</span>
                        <h3 class="font-bold text-base mt-2 text-gray-900 line-clamp-2 h-12">${p.name}</h3>
                        <div class="flex items-center text-yellow-500 space-x-1 mt-1 text-sm">
                            <i class="fa fa-star"></i> <span class="text-gray-800 font-bold text-xs">${p.rating || 'New'}</span>
                        </div>
                    </div>
                </div>
                <div class="p-4 pt-0 border-t mt-2 flex justify-between items-center bg-gray-50">
                    <span class="text-lg font-black text-indigo-950">₹${p.price}</span>
                    <button onclick="quickAddToCart(${p.id})" class="bg-indigo-900 text-white text-xs font-bold px-3 py-2 rounded shadow hover:bg-indigo-800"><i class="fa fa-cart-plus"></i> Add To Cart</button>
                </div>
            `;
            grid.appendChild(card);
        });
        mainGrid.appendChild(grid);
    }
    container.appendChild(mainGrid);
    return container;
}

function renderProductDetail() {
    let db = getDB();
    const p = db.products.find(prod => prod.id === AppState.selectedProductId);
    const div = document.createElement('div');
    div.className = "bg-white p-6 rounded-lg shadow-sm my-4";

    if(!p) { div.innerText = "Product index item missing."; return div; }

    div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div><img src="${p.image}" class="w-full rounded-lg object-cover max-h-96 shadow-inner"></div>
            <div class="flex flex-col justify-between">
                <div>
                    <span class="text-xs uppercase tracking-widest text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded">${p.category}</span>
                    <h2 class="text-3xl font-bold text-indigo-950 mt-3 mb-2">${p.name}</h2>
                    <div class="flex items-center space-x-2 text-yellow-500 my-2">
                        <i class="fa fa-star text-xl"></i> <span class="text-gray-900 font-black text-lg">${p.rating}</span>
                        <span class="text-xs text-gray-500">(${p.reviews ? p.reviews.length : 0} validated user audits)</span>
                    </div>
                    <div class="text-2xl font-black text-gray-900 my-4">₹${p.price}</div>
                    <p class="text-sm text-gray-600 leading-relaxed border-t pt-4">Standard ZigZag premium tier distribution object. Sourced via high fidelity logistics paths under verified seller supervision protocols.</p>
                    <div class="mt-4 text-xs font-semibold ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                        <i class="fa ${p.stock > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> Inventory Stock: ${p.stock} units available
                    </div>
                </div>
                <div class="pt-6 border-t mt-6">
                    <button onclick="quickAddToCart(${p.id})" class="bg-indigo-900 text-white font-bold px-6 py-3 rounded-lg shadow w-full sm:w-auto hover:bg-indigo-800 transition"><i class="fa fa-shopping-cart"></i> Commit To Shopping Cart</button>
                </div>
            </div>
        </div>

        <div class="mt-12 border-t pt-8">
            <h3 class="text-xl font-bold mb-6 text-indigo-950"><i class="fa fa-comments"></i> Ratings & Verified Reviews</h3>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="space-y-4 lg:col-span-2">
                    ${!p.reviews || p.reviews.length === 0 ? '<p class="text-gray-500 text-sm">No localized customer log metrics submitted for this product index yet.</p>' : p.reviews.map(r => `
                        <div class="bg-gray-50 p-4 rounded border">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-bold text-sm text-indigo-950">${r.user}</span>
                                <div class="text-yellow-500 text-xs"><i class="fa fa-star"></i> ${r.rating}/5</div>
                            </div>
                            <p class="text-xs text-gray-600">${r.comment}</p>
                        </div>
                    `).join('')}
                </div>
                <div class="bg-gray-50 p-4 rounded border h-fit">
                    <h4 class="font-bold text-sm text-indigo-950 mb-3">Submit Review Log</h4>
                    <form onsubmit="handleReviewSubmit(event, ${p.id})" class="space-y-3">
                        <div>
                            <label class="text-xs font-bold block">Rating Selection</label>
                            <select id="revRating" class="w-full border p-1 rounded text-xs outline-none">
                                <option value="5">5 Stars - Perfect Matrix</option>
                                <option value="4">4 Stars - Operational</option>
                                <option value="3">3 Stars - Nominal</option>
                                <option value="2">2 Stars - Suboptimal</option>
                                <option value="1">1 Star - Failure</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold block">User Experience Notes</label>
                            <textarea id="revComment" rows="3" required class="w-full border p-1.5 rounded text-xs outline-none" placeholder="Provide performance critique..."></textarea>
                        </div>
                        <button class="w-full bg-indigo-900 text-white text-xs py-1.5 rounded font-bold">Write to DB</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    return div;
}

// ==========================================
// MODULE 3: SHOPPING CART VIEWS
// ==========================================
window.quickAddToCart = function(productId) {
    if (!AppState.currentUser) { alert("Active user session context missing. Please login."); navigate('login'); return; }
    let cart = API.getCart(AppState.currentUser.id);
    let match = cart.find(i => i.productId === productId && !i.savedForLater);
    if(match) { match.quantity += 1; } else { cart.push({ productId, quantity: 1, savedForLater: false }); }
    API.updateCart(AppState.currentUser.id, cart);
    alert("Shopping cart manifest state tracking variable modified +1 unit.");
    render();
}

window.changeQty = function(prodId, delta) {
    let cart = API.getCart(AppState.currentUser.id);
    let item = cart.find(i => i.productId === prodId && !i.savedForLater);
    if(item) {
        item.quantity += delta;
        if(item.quantity <= 0) cart = cart.filter(i => !(i.productId === prodId && !i.savedForLater));
        API.updateCart(AppState.currentUser.id, cart);
        render();
    }
}

window.toggleSaveLater = function(prodId, targetStatus) {
    let cart = API.getCart(AppState.currentUser.id);
    let item = cart.find(i => i.productId === prodId && i.savedForLater === !targetStatus);
    if(item) { item.savedForLater = targetStatus; API.updateCart(AppState.currentUser.id, cart); render(); }
}

window.removeFromCart = function(prodId, isSaved) {
    let cart = API.getCart(AppState.currentUser.id);
    cart = cart.filter(i => !(i.productId === prodId && i.savedForLater === isSaved));
    API.updateCart(AppState.currentUser.id, cart);
    render();
}

window.proceedToCheckout = function() {
    let cart = API.getCart(AppState.currentUser.id);
    AppState.checkoutCart = cart.filter(i => !i.savedForLater);
    navigate('checkout');
}

function renderCart() {
    const div = document.createElement('div');
    div.className = "bg-white p-6 rounded-lg shadow-sm my-4";
    if (!AppState.currentUser) { div.innerText = "Please authenticate to view active cart structures."; return div; }

    const cart = API.getCart(AppState.currentUser.id);
    const activeItems = cart.filter(i => !i.savedForLater);
    const savedItems = cart.filter(i => i.savedForLater);
    let db = getDB();

    let subtotal = 0;

    div.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-indigo-950 border-b pb-2"><i class="fa fa-shopping-basket"></i> Active Shopping Cart Allocation</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                ${activeItems.length === 0 ? '<p class="text-gray-500 text-sm">Active relational cart manifest empty.</p>' : activeItems.map(item => {
                    const p = db.products.find(prod => prod.id === item.productId);
                    if(!p) return '';
                    subtotal += (p.price * item.quantity);
                    return `
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg bg-gray-50 gap-4">
                            <div class="flex items-center space-x-4">
                                <img src="${p.image}" class="w-16 h-16 object-cover rounded">
                                <div>
                                    <h4 class="font-bold text-sm text-gray-900 cursor-pointer hover:underline" onclick="navigate('product-detail', ${p.id})">${p.name}</h4>
                                    <div class="text-xs text-indigo-900 font-extrabold mt-1">Unit Value: ₹${p.price}</div>
                                </div>
                            </div>
                            <div class="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div class="flex items-center space-x-1 border bg-white rounded">
                                    <button onclick="changeQty(${p.id}, -1)" class="px-2 py-0.5 text-sm font-bold bg-gray-100 hover:bg-gray-200">-</button>
                                    <span class="px-3 text-xs font-bold">${item.quantity}</span>
                                    <button onclick="changeQty(${p.id}, 1)" class="px-2 py-0.5 text-sm font-bold bg-gray-100 hover:bg-gray-200">+</button>
                                </div>
                                <div class="text-right space-y-1">
                                    <div class="text-sm font-black text-indigo-950">₹${p.price * item.quantity}</div>
                                    <div class="space-x-2 text-xs">
                                        <span onclick="toggleSaveLater(${p.id}, true)" class="text-indigo-600 hover:underline cursor-pointer">Save For Later</span>
                                        <span onclick="removeFromCart(${p.id}, false)" class="text-red-600 hover:underline cursor-pointer"><i class="fa fa-trash"></i> Drop</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}

                <div class="pt-6 border-t mt-12">
                    <h3 class="text-lg font-bold mb-4 text-gray-700"><i class="fa fa-bookmark"></i> Repository: Saved For Later</h3>
                    ${savedItems.length === 0 ? '<p class="text-xs text-gray-400 italic">No inventory references stored here.</p>' : savedItems.map(item => {
                        const p = db.products.find(prod => prod.id === item.productId);
                        if(!p) return '';
                        return `
                            <div class="flex justify-between items-center p-3 border border-dashed rounded bg-white mb-2 text-xs">
                                <div class="flex items-center space-x-3">
                                    <img src="${p.image}" class="w-10 h-10 object-cover rounded">
                                    <span class="font-semibold text-gray-800">${p.name} (₹${p.price})</span>
                                </div>
                                <div class="space-x-3 font-bold">
                                    <span onclick="toggleSaveLater(${p.id}, false)" class="text-green-600 hover:underline cursor-pointer">Move to Active Cart</span>
                                    <span onclick="removeFromCart(${p.id}, true)" class="text-red-600 hover:underline cursor-pointer">Purge</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="bg-gray-50 p-6 rounded-lg border h-fit space-y-4">
                <h3 class="font-bold text-lg text-indigo-950 border-b pb-2">Cart Calculations</h3>
                <div class="flex justify-between text-sm"><span>Operational Subtotal:</span><span class="font-bold">₹${subtotal}</span></div>
                <div class="flex justify-between text-sm"><span>Logistics Routing (Shipping):</span><span class="text-green-600 font-bold">FREE</span></div>
                <div class="border-t pt-2 flex justify-between font-black text-base text-indigo-950"><span>Total Outlay:</span><span>₹${subtotal}</span></div>
                ${activeItems.length > 0 ? `
                    <button onclick="proceedToCheckout()" class="w-full bg-indigo-900 text-white font-bold py-2.5 rounded-md shadow uppercase tracking-wide hover:bg-indigo-800 text-center text-sm">Proceed to Checkout Gate</button>
                ` : '<button disabled class="w-full bg-gray-300 text-gray-500 font-bold py-2 rounded text-sm cursor-not-allowed">Cart Allocation Required</button>'}
            </div>
        </div>
    `;
    return div;
}

// ==========================================
// MODULE 4 & 5: ORDER MANAGEMENT & PAYMENT GATEWAY VIEWS
// ==========================================
window.executePlaceOrder = function(total) {
    const checkedRadio = document.querySelector('input[name="payMethod"]:checked');
    const method = checkedRadio ? checkedRadio.value : 'UPI';
    
    // Mock transaction execution based on payment choice selection
    alert(`Contacting external payment gateway engine for processing securely.\nRemittance Network selected: ${method}\nTotal processed: ₹${total}`);
    
    const order = API.placeOrder(AppState.currentUser.id, AppState.checkoutCart, total, method);
    alert("Transaction verified by core logic container. Order generated successfully inside MySQL layer.");
    navigate('tracking', order.id);
}

function renderCheckout() {
    const div = document.createElement('div');
    div.className = "bg-white p-6 rounded-lg shadow-sm my-4 max-w-4xl mx-auto";
    if (!AppState.currentUser) return div;

    let db = getDB();
    let total = 0;
    AppState.checkoutCart.forEach(i => {
        let p = db.products.find(pr => pr.id === i.productId);
        if(p) total += (p.price * i.quantity);
    });

    let addr = AppState.currentUser.address;

    div.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-indigo-950 border-b pb-2"><i class="fa fa-cash-register"></i> Secure Order Fulfillment Pipeline</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-6">
                <div class="bg-gray-50 p-4 rounded border">
                    <h3 class="font-bold text-sm text-indigo-950 mb-2 uppercase tracking-wider"><i class="fa fa-truck"></i> Destination Validation Address</h3>
                    ${!addr ? `
                        <p class="text-xs text-red-500 font-bold mb-2">No functional destination array map linked to profile.</p>
                        <button onclick="navigate('profile')" class="bg-indigo-950 text-white text-xs px-2 py-1 rounded">Initialize Address</button>
                    ` : `
                        <p class="text-xs text-gray-700 font-medium">${addr.street}, ${addr.city}, ${addr.state} - ${addr.zip}</p>
                    `}
                </div>

                <div class="bg-gray-50 p-4 rounded border">
                    <h3 class="font-bold text-sm text-indigo-950 mb-4 uppercase tracking-wider"><i class="fa fa-shield-alt"></i> Selected Payment Processing Node</h3>
                    <form id="paymentForm" class="space-y-3">
                        <label class="flex items-center space-x-3 border bg-white p-2.5 rounded cursor-pointer hover:bg-indigo-50">
                            <input type="radio" name="payMethod" value="UPI" checked class="accent-indigo-900">
                            <div class="text-xs">
                                <span class="font-bold block">UPI Instant Route (Razorpay Layer)</span>
                                <span class="text-gray-500">Instant routing protocol via VPA alias handles.</span>
                            </div>
                        </label>
                        <label class="flex items-center space-x-3 border bg-white p-2.5 rounded cursor-pointer hover:bg-indigo-50">
                            <input type="radio" name="payMethod" value="Card" class="accent-indigo-900">
                            <div class="text-xs">
                                <span class="font-bold block">Credit / Debit Transaction Engine (Stripe Integration)</span>
                                <span class="text-gray-500">Fully encrypted tokenized network handshake handshake.</span>
                            </div>
                        </label>
                        <label class="flex items-center space-x-3 border bg-white p-2.5 rounded cursor-pointer hover:bg-indigo-50">
                            <input type="radio" name="payMethod" value="NetBanking" class="accent-indigo-900">
                            <div class="text-xs">
                                <span class="font-bold block">Net Banking Portals (PayU Hub)</span>
                                <span class="text-gray-500">Direct operational callback routing to primary bank assets.</span>
                            </div>
                        </label>
                        <label class="flex items-center space-x-3 border bg-white p-2.5 rounded cursor-pointer hover:bg-indigo-50">
                            <input type="radio" name="payMethod" value="COD" class="accent-indigo-900">
                            <div class="text-xs">
                                <span class="font-bold block">Cash On Delivery (COD Logistics Loop)</span>
                                <span class="text-gray-500">Physical liquidity validation at execution point.</span>
                            </div>
                        </label>
                    </form>
                </div>
            </div>

            <div class="bg-gray-50 p-4 rounded border h-fit flex flex-col justify-between space-y-4">
                <div>
                    <h3 class="font-bold text-sm text-indigo-950 mb-3 uppercase tracking-wider">Checkout Ledger Summary</h3>
                    <div class="max-h-40 overflow-y-auto space-y-1 pr-1 border-b pb-3 mb-3">
                        ${AppState.checkoutCart.map(i => {
                            let p = db.products.find(pr => pr.id === i.productId);
                            return p ? `<div class="text-xs flex justify-between"><span>${p.name} (x${i.quantity})</span><span class="font-bold">₹${p.price * i.quantity}</span></div>` : '';
                        }).join('')}
                    </div>
                    <div class="flex justify-between font-black text-lg text-indigo-950"><span>Grand Total Outlay:</span><span>₹${total}</span></div>
                </div>
                ${!addr ? `
                    <button disabled class="w-full bg-gray-300 text-gray-500 font-bold py-2.5 rounded text-xs cursor-not-allowed">Resolve Address Incompatibilities</button>
                ` : `
                    <button onclick="executePlaceOrder(${total})" class="w-full bg-yellow-400 hover:bg-yellow-500 text-indigo-950 font-black py-3 rounded-lg shadow uppercase text-xs tracking-wider transition">Authorize Secure Remittance & Place Order</button>
                `}
            </div>
        </div>
    `;
    return div;
}

function renderTracking() {
    const div = document.createElement('div');
    div.className = "bg-white p-6 rounded-lg shadow-sm my-4 max-w-2xl mx-auto text-center";
    
    let db = getDB();
    let order = db.orders.find(o => o.id === AppState.activeTrackingOrder);
    if(!order) { div.innerText = "Tracking vector missing contextual reference."; return div; }

    const states = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
    let currentIdx = states.indexOf(order.status);

    div.innerHTML = `
        <h2 class="text-2xl font-bold text-indigo-950 mb-2"><i class="fa fa-satellite-dish"></i> Live Logistics Telemetry Pipeline</h2>
        <div class="text-sm font-semibold text-gray-500 mb-6">Tracking Manifest Reference: <span class="text-indigo-900">${order.id}</span></div>
        
        <div class="flex items-center justify-between max-w-md mx-auto my-12 relative">
            ${order.status === 'Cancelled' ? `
                <div class="w-full bg-red-100 border border-red-400 p-4 rounded-lg text-red-700 font-bold text-sm">
                    <i class="fa fa-exclamation-triangle"></i> This delivery transaction sequence has been forcefully terminated (Cancelled).
                </div>
            ` : states.slice(0, 4).map((st, idx) => `
                <div class="flex flex-col items-center relative z-10">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx <= currentIdx ? 'bg-indigo-900 text-white' : 'bg-gray-200 text-gray-400'}">
                        ${idx + 1}
                    </div>
                    <span class="text-[10px] mt-2 font-bold ${idx <= currentIdx ? 'text-indigo-950' : 'text-gray-400'}">${st}</span>
                </div>
            `).join('')}
        </div>

        <div class="border-t pt-4 mt-6 text-xs text-gray-500 flex justify-between max-w-md mx-auto">
            <span>Payment Mode: <b>${order.paymentMethod}</b></span>
            <span>Total Valuation: <b>₹${order.total}</b></span>
        </div>
        <button onclick="navigate('profile')" class="mt-8 bg-gray-100 border text-gray-700 px-4 py-2 rounded font-bold text-xs hover:bg-gray-200">Return to Profile Hub</button>
    `;
    return div;
}

// ==========================================
// MODULE 6: ADMIN PANEL VIEW
// ==========================================
window.showProductModal = function(id = null) {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    modal.classList.replace('hidden', 'flex');
    if(id) {
        let p = getDB().products.find(prod => prod.id === id);
        document.getElementById('modalTitle').innerText = "Edit Catalog Entry";
        document.getElementById('modalId').value = p.id;
        document.getElementById('modalName').value = p.name;
        document.getElementById('modalCategory').value = p.category;
        document.getElementById('modalPrice').value = p.price;
        document.getElementById('modalStock').value = p.stock;
        document.getElementById('modalImage').value = p.image;
    } else {
        document.getElementById('modalTitle').innerText = "Inject New Product Catalog Entry";
        document.getElementById('modalId').value = '';
        document.getElementById('modalName').value = '';
        document.getElementById('modalPrice').value = '';
        document.getElementById('modalStock').value = '';
        document.getElementById('modalImage').value = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
    }
}

window.saveModalProduct = function() {
    const id = document.getElementById('modalId').value;
    const obj = {
        name: document.getElementById('modalName').value,
        category: document.getElementById('modalCategory').value,
        price: parseInt(document.getElementById('modalPrice').value),
        stock: parseInt(document.getElementById('modalStock').value),
        image: document.getElementById('modalImage').value,
        sellerId: AppState.currentUser.id
    };
    if(id) obj.id = parseInt(id);
    API.saveProduct(obj);
    document.getElementById('productModal').classList.replace('flex', 'hidden');
    render();
}

window.deleteProductEntry = function(id) {
    if(confirm("Confirm destructive catalog deletion algorithm on entity item ID: " + id)) {
        API.deleteProduct(id);
        render();
    }
}

window.updateStatusFromAdmin = function(orderId, statusValue) {
    if(!statusValue) return;
    API.updateOrderStatus(orderId, statusValue); 
    render();
}

function renderAdminPanel() {
    const div = document.createElement('div');
    div.className = "space-y-8";
    if (!AppState.currentUser || AppState.currentUser.role !== 'admin') { div.innerText = "Access denied."; return div; }

    let db = getDB();
    
    // Analytics Calculation
    let grossSales = db.orders.filter(o => o.status !== 'Cancelled').reduce((acc, o) => acc + o.total, 0);
    let activeUserCount = db.users.length;
    let totalProductsCount = db.products.length;

    div.innerHTML = `
        <div class="bg-indigo-950 text-white p-6 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 class="text-2xl font-black tracking-wide"><i class="fa fa-crown text-yellow-400"></i> Corporate Operations Dashboard</h2>
                <p class="text-xs text-indigo-200 mt-1">ZigZag Unified Executive Data Node</p>
            </div>
            <button onclick="showProductModal()" class="bg-yellow-400 text-indigo-950 font-bold px-3 py-1.5 rounded text-xs hover:bg-yellow-300"><i class="fa fa-plus"></i> Inject New Product Catalog Entry</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-green-500">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Gross System Liquidity</div>
                <div class="text-2xl font-black text-gray-900 mt-1">₹${grossSales}</div>
                <div class="text-[10px] text-green-600 mt-1 font-semibold"><i class="fa fa-chart-line"></i> Relational logs processing optimal</div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-blue-500">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Total User Profiles</div>
                <div class="text-2xl font-black text-gray-900 mt-1">${activeUserCount} Entities</div>
                <div class="text-[10px] text-gray-500 mt-1">Customers, Sellers, and Root administrators</div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-purple-500">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Catalog Matrix Count</div>
                <div class="text-2xl font-black text-gray-900 mt-1">${totalProductsCount} Records</div>
                <div class="text-[10px] text-gray-500 mt-1">Sourced through multi-channel networks</div>
            </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-sm border">
                <h3 class="font-bold text-base text-indigo-950 mb-4 border-b pb-2"><i class="fa fa-boxes"></i> Inventory Management Ledger</h3>
                <div class="overflow-x-auto text-xs max-h-80 overflow-y-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-100 text-gray-600 uppercase text-[10px] font-black tracking-wider"><th class="p-2">ID</th><th class="p-2">Name</th><th class="p-2">Price</th><th class="p-2">Stock</th><th class="p-2 text-center">Actions</th></tr>
                        </thead>
                        <tbody>
                            ${db.products.map(p => `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="p-2 font-mono text-gray-500">${p.id}</td>
                                    <td class="p-2 font-semibold text-gray-900 truncate max-w-xs">${p.name}</td>
                                    <td class="p-2 font-bold text-indigo-900">₹${p.price}</td>
                                    <td class="p-2 font-bold ${p.stock < 10 ? 'text-red-600' : 'text-gray-700'}">${p.stock}</td>
                                    <td class="p-2 text-center space-x-2">
                                        <button onclick="showProductModal(${p.id})" class="text-blue-600 hover:underline"><i class="fa fa-edit"></i></button>
                                        <button onclick="deleteProductEntry(${p.id})" class="text-red-600 hover:underline"><i class="fa fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm border">
                <h3 class="font-bold text-base text-indigo-950 mb-4 border-b pb-2"><i class="fa fa-sliders-h"></i> System Orders Processing Center</h3>
                <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
                    ${db.orders.map(o => `
                        <div class="p-3 border rounded text-xs bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <div class="font-bold text-indigo-950">${o.id} (Valuation: ₹${o.total})</div>
                                <div class="text-gray-500 font-medium">Method: ${o.paymentMethod} | Date: ${o.date}</div>
                                <div class="mt-1">Current Log Status Flag: <span class="font-bold uppercase text-yellow-700">${o.status}</span></div>
                            </div>
                            <div>
                                <select onchange="updateStatusFromAdmin('${o.id}', this.value)" class="border p-1 rounded font-bold text-indigo-950 outline-none">
                                    <option value="">Update State Matrix</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border">
            <h3 class="font-bold text-base text-indigo-950 mb-4 border-b pb-2"><i class="fa fa-users-cog"></i> System User Management Registry</h3>
            <div class="overflow-x-auto text-xs">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 uppercase text-[10px] font-black tracking-wider"><th class="p-2">User ID</th><th class="p-2">Name</th><th class="p-2">Email Identity Address</th><th class="p-2">Authorized System Role</th></tr>
                    </thead>
                    <tbody>
                        ${db.users.map(u => `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="p-2 font-mono text-gray-500">${u.id}</td>
                                <td class="p-2 font-bold text-gray-900">${u.name}</td>
                                <td class="p-2 font-mono">${u.email}</td>
                                <td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'seller' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${u.role}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="productModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center p-4 z-50">
            <div class="bg-white p-6 rounded-lg max-w-md w-full space-y-4">
                <h4 id="modalTitle" class="font-bold text-lg text-indigo-950 border-b pb-2">Modify Catalog Vector</h4>
                <input type="hidden" id="modalId">
                <div class="space-y-2 text-xs">
                    <div><label class="font-bold block mb-1">Product Title</label><input type="text" id="modalName" class="w-full border p-2 rounded outline-none"></div>
                    <div><label class="font-bold block mb-1">Market Category</label><select id="modalCategory" class="w-full border p-2 rounded outline-none">${db.categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-bold block mb-1">Price (₹)</label><input type="number" id="modalPrice" class="w-full border p-2 rounded outline-none"></div>
                        <div><label class="font-bold block mb-1">Stock Count</label><input type="number" id="modalStock" class="w-full border p-2 rounded outline-none"></div>
                    </div>
                    <div><label class="font-bold block mb-1">Visual Asset URL Link</label><input type="text" id="modalImage" class="w-full border p-2 rounded outline-none"></div>
                </div>
                <div class="flex justify-end space-x-2 text-xs font-bold pt-2">
                    <button onclick="document.getElementById('productModal').classList.replace('flex','hidden')" class="px-4 py-2 border rounded hover:bg-gray-100">Abort</button>
                    <button onclick="saveModalProduct()" class="px-4 py-2 bg-indigo-900 text-white rounded hover:bg-indigo-800">Commit to Engine</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

// ==========================================
// MODULE 7: SELLER PORTAL VIEW
// ==========================================
function renderSellerPortal() {
    const div = document.createElement('div');
    div.className = "space-y-8";
    if (!AppState.currentUser || AppState.currentUser.role !== 'seller') { div.innerText = "Seller clearance context missing."; return div; }

    let db = getDB();
    let sellerProds = db.products.filter(p => p.sellerId === AppState.currentUser.id);
    
    // Metrics analysis metrics
    let totalVolumeUnits = sellerProds.reduce((acc, p) => acc + p.stock, 0);

    div.innerHTML = `
        <div class="bg-emerald-950 text-white p-6 rounded-lg shadow-sm flex justify-between items-center flex-wrap gap-4">
            <div>
                <h2 class="text-2xl font-black tracking-wide"><i class="fa fa-store text-emerald-400"></i> Amazon-like Seller Marketplace Center</h2>
                <p class="text-xs text-emerald-200 mt-1">Merchant node processing engine: ${AppState.currentUser.name}</p>
            </div>
            <button onclick="showProductModal()" class="bg-emerald-400 text-emerald-950 font-bold px-3 py-1.5 rounded text-xs hover:bg-emerald-300"><i class="fa fa-upload"></i> Upload Product Asset</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-emerald-500">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Listed SKU Vectors</div>
                <div class="text-2xl font-black text-gray-900 mt-1">${sellerProds.length} System Nodes</div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-l-4 border-l-teal-500">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Storefront Aggregate Inventory</div>
                <div class="text-2xl font-black text-gray-900 mt-1">${totalVolumeUnits} Total Units</div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border">
            <h3 class="font-bold text-base text-indigo-950 mb-4 border-b pb-2"><i class="fa fa-boxes"></i> Merchant Tracking Hub (Product Upload & Tracking)</h3>
            <div class="overflow-x-auto text-xs">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-100 text-gray-600 uppercase text-[10px] font-black tracking-wider"><th class="p-2">Item ID Reference</th><th class="p-2">Display Title</th><th class="p-2">Price Allocation</th><th class="p-2">Stock Metric Status</th><th class="p-2 text-center">Action Handlers</th></tr>
                    </thead>
                    <tbody>
                        ${sellerProds.map(p => `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="p-2 font-mono text-gray-500 text-[10px]">${p.id}</td>
                                <td class="p-2 font-bold text-gray-900">${p.name}</td>
                                <td class="p-2 font-bold text-emerald-700">₹${p.price}</td>
                                <td class="p-2 font-semibold ${p.stock === 0 ? 'text-red-500' : 'text-gray-700'}">${p.stock} remaining</td>
                                <td class="p-2 text-center space-x-2">
                                    <button onclick="showProductModal(${p.id})" class="text-blue-600 font-bold hover:underline">Edit Entry</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="productModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center p-4 z-50">
            <div class="bg-white p-6 rounded-lg max-w-md w-full space-y-4">
                <h4 id="modalTitle" class="font-bold text-lg text-indigo-950 border-b pb-2">Upload Product Asset</h4>
                <input type="hidden" id="modalId">
                <div class="space-y-2 text-xs">
                    <div><label class="font-bold block mb-1">Product Title</label><input type="text" id="modalName" class="w-full border p-2 rounded outline-none"></div>
                    <div><label class="font-bold block mb-1">Market Category</label><select id="modalCategory" class="w-full border p-2 rounded outline-none">${db.categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-bold block mb-1">Price (₹)</label><input type="number" id="modalPrice" class="w-full border p-2 rounded outline-none"></div>
                        <div><label class="font-bold block mb-1">Stock Count</label><input type="number" id="modalStock" class="w-full border p-2 rounded outline-none"></div>
                    </div>
                    <div><label class="font-bold block mb-1">Visual Asset URL Link</label><input type="text" id="modalImage" class="w-full border p-2 rounded outline-none"></div>
                </div>
                <div class="flex justify-end space-x-2 text-xs font-bold pt-2">
                    <button onclick="document.getElementById('productModal').classList.replace('flex','hidden')" class="px-4 py-2 border rounded hover:bg-gray-100">Abort</button>
                    <button onclick="saveModalProduct()" class="px-4 py-2 bg-emerald-900 text-white rounded hover:bg-emerald-800">Commit to Engine</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

// Initialize App Main Execution Setup
window.onload = function() {
    render();
};
