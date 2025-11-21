// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - ORDER MATTERS!
// 1. Cookie parser MUST come first
app.use(cookieParser());

// 2. CORS configuration
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// app.use(cors({
//     origin: 'https://property.sagarroy.com',
//     credentials: true
// }));



// 3. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Static files
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// 5. Serve HTML files from pages directory
app.use(express.static(path.join(__dirname, '../pages')));

// 6. Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, './uploads')));

// Load API Routes with error handling
console.log('\n🔧 Loading API routes...');

let authRoutes, propertyRoutes, offerRoutes, esignRoutes, preapprovalRoutes, transactionsRoutes, creditCheckRoutes;

try {
    authRoutes = require('./routes/auth');
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading auth routes:', error.message);
    console.error('   Full error:', error);
}

try {
    propertyRoutes = require('./routes/properties');
    console.log('✅ Property routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading property routes:', error.message);
}

try {
    offerRoutes = require('./routes/offers');
    console.log('✅ Offer routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}


try {
    esignRoutes = require('./routes/esign');
    console.log('✅ Esign routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}

try {
    preapprovalRoutes = require('./routes/preApproval');
    console.log('✅ preapproval routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}


try {
    transactionsRoutes = require('./routes/transactions');
    console.log('✅ transactionsRoutes routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}


try {
    creditCheckRoutes = require('./routes/creditCheck');
    console.log('✅ creditCheck routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}






// Mount API routes BEFORE static file handling
console.log('\n🔌 Mounting API routes...');
if (authRoutes) {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes mounted at /api/auth');
} else {
    console.log('❌ Auth routes not mounted');
}

if (propertyRoutes) {
    app.use('/api/properties', propertyRoutes);
    console.log('✅ Property routes mounted at /api/properties');
}

if (offerRoutes) {
    app.use('/api/offers', offerRoutes);
    console.log('✅ Offer routes mounted at /api/offers');
}
if (esignRoutes) {
    app.use('/api/esign', esignRoutes);
    console.log('✅ document routes mounted at /api/esign');
}


if (preapprovalRoutes) {
    app.use('/api/preapproval', preapprovalRoutes);
    console.log('✅ preapproval routes mounted at /api/preapproval');
} else {
    console.log('❌ preapproval routes not mounted');
}

if (transactionsRoutes) {
    app.use('/api/transactions', transactionsRoutes);
    console.log('✅ transactions routes mounted at /api/transactions');
} else {
    console.log('❌ transactions routes not mounted');
}


if (creditCheckRoutes) {
    app.use('/api/applications', creditCheckRoutes);
    console.log('✅ applications routes mounted at /api/applications');
} else {
    console.log('❌ applications routes not mounted');
}

app.use('/api/buyer-rating', require('./routes/buyerRating'));

app.use('/api/contracts', require('./routes/contracts'));

app.use('/api/contingencies', require('./routes/contingencyRoutes'));

app.use('/api/saved-properties', require('./routes/savedProperties'));

app.use('/api/tours', require('./routes/tourRoutes'));

app.use('/api/earnest-money', require('./routes/earnestMoneyRoutes'));


app.use('/api/inspection', require('./routes/inspectionsRoutes'));

app.use('/api/mortgage', require('./routes/mortgageRoutes'));

app.use('/api/insurance', require('./routes/insuranceRoutes'));

app.use('/api/title', require('./routes/titleSearchRoutes'));

app.use('/api/moving-preparations', require('./routes/movingPreparations'));


app.use('/api/underwriting', require('./routes/underwriting'));


app.use('/api/appraisals', require('./routes/appraisals'));

app.use('/api/closing', require('./routes/closingDisclosure'));

app.use('/api/walkthrough', require('./routes/walkThrough'));

app.use('/api/closing-appointments', require('./routes/closingAppointments'));

app.use('/api/documentsign', require('./routes/signingRoutes'));



app.use('/api/funding', require('./routes/fundingRoutes'));







// Test route to verify server is working
// Test route to verify server is working
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running!',
        routes: {
            auth: authRoutes ? 'loaded' : 'failed',
            properties: propertyRoutes ? 'loaded' : 'failed',
            offers: offerRoutes ? 'loaded' : 'failed'
        }
    });
});

// One-time database update route - ADD IT HERE!


// THEN the HTML Page Routes continue...
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/index.html'));
// });

// // HTML Page Routes
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/index.html'));
// });

// app.get('/index.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/index.html'));
// });

// app.get('/listings.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/listings.html'));
// });

// app.get('/property-detail.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/property-detail.html'));
// });

// app.get('/list-property.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/list-property.html'));
// });

// app.get('/sell.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/sell.html'));
// });

// app.get('/seller-dashboard.html', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/seller-dashboard.html'));
// });

// app.get('/listings', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/listings.html'));
// });

// app.get('/property/:id', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/property-detail.html'));
// });

// app.get('/list-property', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/list-property.html'));
// });

// app.get('/sell', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/sell.html'));
// });

// app.get('/dashboard', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/seller-dashboard.html'));
// });

// app.get('/seller-dashboard', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/seller-dashboard.html'));
// });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    console.log(`404 - API route not found: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'API route not found',
        path: req.originalUrl
    });
});

// For all other routes, serve index.html (for single-page app behavior)
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../pages/index.html'));
// });

function showRoutes(app) {
    console.log("Registered routes:");
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // Route directly on app
            const methods = Object.keys(middleware.route.methods)
                .map((m) => m.toUpperCase())
                .join(", ");
            console.log(`${methods} ${middleware.route.path}`);
        } else if (middleware.name === "router") {
            // Routes inside a router
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods)
                        .map((m) => m.toUpperCase())
                        .join(", ");
                    console.log(`${methods} ${handler.route.path}`);
                }
            });
        }
    });
}

// Start server
app.listen(PORT, () => {
    //showRoutes(app);
    console.log('\n🚀 Server started successfully!');
    console.log(`🏠 You're Home server running on http://localhost:${PORT}`);
    console.log('📁 Serving frontend files from parent directory');
    console.log('🔌 API endpoints available at /api/*');
    console.log('\n📍 Test endpoints:');
    console.log(`   http://localhost:${PORT}/api/test`);
    console.log(`   http://localhost:${PORT}/api/auth/test`);
    console.log('\n');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);
});

module.exports = app;

