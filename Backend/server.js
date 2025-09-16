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

let authRoutes, propertyRoutes, offerRoutes, documentRoutes , preApprovalRoutes , transectionsRoutes;

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
    documentRoutes = require('./routes/documents');
    console.log('✅ Documnets routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading offer routes:', error.message);
}

try {
    preApprovalRoutes = require('./routes/preApproval');
    console.log('✅ preApprovalRoutes routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading preapproval routes:', error.message);
}

try {
    transectionsRoutes = require('./routes/transactions');
    console.log('✅ TransectionsRoutes routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading transectionsRoutes routes:', error.message);
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
if (documentRoutes) {
    app.use('/api/documents', documentRoutes);
    console.log('✅ Documents routes mounted at /api/documents');
}

if (preApprovalRoutes) {
    app.use('/api/pre-approval', preApprovalRoutes);
    console.log('✅ Pre Approvals routes mounted at /api/preApproval');
}else{
     console.log('❌ PreApproval routes not mounted');
}

if (transectionsRoutes) {
    app.use('/api/transactions', transectionsRoutes);
    console.log('✅ TransectionsRoutes routes mounted at /api/preApproval');
}else{
     console.log('❌ transectionsRoutes routes not mounted');
}





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
// app.get('/api/update-database', async (req, res) => {
//     const { Pool } = require('pg');

//     const pool = new Pool({
//         host: process.env.DB_HOST,
//         port: process.env.DB_PORT,
//         database: process.env.DB_NAME,
//         user: process.env.DB_USER,
//         password: process.env.DB_PASSWORD,
//     });

//     try {
//         console.log('Starting database update...');

//         // Add new columns to properties table
//         const alterTableQueries = [
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS hvac_install_date DATE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS hvac_type VARCHAR(100)`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_heater_date DATE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_heater_type VARCHAR(100)`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS roof_replacement_date DATE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS roof_type VARCHAR(100)`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_septic BOOLEAN DEFAULT FALSE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS septic_last_serviced DATE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS septic_notes TEXT`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_solar BOOLEAN DEFAULT FALSE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS solar_ownership VARCHAR(20)`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS solar_monthly_payment DECIMAL(10,2)`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_as_is BOOLEAN DEFAULT FALSE`,
//             `ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_disclosures TEXT`
//         ];

//         // Execute each ALTER TABLE query
//         for (const query of alterTableQueries) {
//             await pool.query(query);
//             console.log(`✅ Executed: ${query.substring(0, 50)}...`);
//         }

//         // Create property_improvements table
//         await pool.query(`
//             CREATE TABLE IF NOT EXISTS property_improvements (
//                 id SERIAL PRIMARY KEY,
//                 property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
//                 improvement_type VARCHAR(100),
//                 improvement_date DATE,
//                 improvement_cost DECIMAL(10,2),
//                 improvement_description TEXT,
//                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//             )
//         `);
//         console.log('✅ Created property_improvements table');

//         // Create index
//         await pool.query(`
//             CREATE INDEX IF NOT EXISTS idx_property_improvements_property_id 
//             ON property_improvements(property_id)
//         `);
//         console.log('✅ Created index on property_improvements');

//         // Get list of columns to verify
//         const result = await pool.query(`
//             SELECT column_name, data_type 
//             FROM information_schema.columns 
//             WHERE table_name = 'properties' 
//             AND column_name IN (
//                 'hvac_type', 'roof_type', 'has_solar', 
//                 'water_heater_type', 'is_as_is'
//             )
//             ORDER BY column_name
//         `);

//         res.json({
//             success: true,
//             message: 'Database updated successfully!',
//             newColumns: result.rows,
//             tablesUpdated: ['properties', 'property_improvements']
//         });

//     } catch (error) {
//         console.error('Database update error:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message,
//             detail: error.detail
//         });
//     } finally {
//         await pool.end();
//     }
// });

// // THEN the HTML Page Routes continue...
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
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/index.html'));
});

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
    showRoutes(app);
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








