-- You're Home Real Estate Platform Database Schema
-- Complete init.sql file with property systems

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS property_photos CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('buyer', 'seller', 'both')),
    
    -- Pre-approval fields for buyers
    is_pre_approved BOOLEAN DEFAULT FALSE,
    pre_approval_amount DECIMAL(12,2),
    pre_approval_expires DATE,
    credit_score_range VARCHAR(20),
    
    -- Account status
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create properties table with all system fields
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic property information
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    square_feet INTEGER NOT NULL,
    lot_size DECIMAL(10,2),
    year_built INTEGER,
    
    -- Pricing
    list_price DECIMAL(12,2) NOT NULL,
    minimum_offer DECIMAL(12,2),
    property_tax_annual DECIMAL(10,2),
    hoa_fees_monthly DECIMAL(8,2),
    assessment_value DECIMAL(12,2),
    
    -- Property Systems (NEW FIELDS!)
    -- Roof Information
    roof_year INTEGER,
    roof_material VARCHAR(100), -- asphalt-shingle, metal, tile, slate, flat-rubber, other
    
    -- HVAC System
    hvac_install_year INTEGER,
    hvac_type VARCHAR(100), -- central-air, forced-air, heat-pump, ductless-mini, radiant, baseboard
    hvac_last_service DATE,
    
    -- Water Heater
    water_heater_year INTEGER,
    water_heater_type VARCHAR(50), -- gas, electric, tankless, solar, hybrid
    
    -- Septic System
    has_septic BOOLEAN DEFAULT FALSE,
    septic_type VARCHAR(100),
    septic_last_pumped DATE,
    
    -- Solar System
    has_solar BOOLEAN DEFAULT FALSE,
    solar_type VARCHAR(50), -- leased, owned
    solar_install_year INTEGER,
    solar_monthly_savings DECIMAL(10,2),
    
    -- Property Condition
    property_condition VARCHAR(50) DEFAULT 'move-in-ready', -- as-is, needs-work, move-in-ready
    major_repairs_needed TEXT,
    recent_renovations TEXT,
    
    -- Additional Systems
    electrical_panel_year INTEGER,
    plumbing_updated_year INTEGER,
    windows_replaced_year INTEGER,
    
    -- Features
    garage_spaces INTEGER DEFAULT 0,
    has_pool BOOLEAN DEFAULT FALSE,
    has_fireplace BOOLEAN DEFAULT FALSE,
    has_deck BOOLEAN DEFAULT FALSE,
    has_basement BOOLEAN DEFAULT FALSE,
    basement_finished BOOLEAN DEFAULT FALSE,
    
    -- Warranties
    home_warranty_included BOOLEAN DEFAULT FALSE,
    warranties_transferable TEXT, -- JSON array of warranty details
    
    -- Description and settings
    description TEXT,
    virtual_tour_url VARCHAR(500),
    
    -- Seller preferences
    allow_messages BOOLEAN DEFAULT TRUE,
    minimum_offer_percent INTEGER DEFAULT 50,
    
    -- Listing status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'paused', 'expired')),
    listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_date TIMESTAMP,
    sold_price DECIMAL(12,2),
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create offers table
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Offer details
    offer_amount DECIMAL(12,2) NOT NULL,
    offer_type VARCHAR(50) DEFAULT 'standard', -- standard, cash, contingent
    financing_type VARCHAR(50), -- conventional, fha, va, cash, other
    down_payment_percent DECIMAL(5,2),
    
    -- Contingencies
    inspection_contingency BOOLEAN DEFAULT TRUE,
    financing_contingency BOOLEAN DEFAULT TRUE,
    appraisal_contingency BOOLEAN DEFAULT TRUE,
    sale_contingency BOOLEAN DEFAULT FALSE,
    contingency_details TEXT,
    
    -- Timeline
    proposed_closing_date DATE,
    offer_expires TIMESTAMP,
    
    -- Communication
    buyer_message TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired')),
    counter_amount DECIMAL(12,2),
    counter_message TEXT,
    counter_date TIMESTAMP,
    
    -- Final details
    accepted_date TIMESTAMP,
    rejected_date TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
    
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    parent_message_id INTEGER REFERENCES messages(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create property photos table
CREATE TABLE property_photos (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    
    photo_url VARCHAR(500) NOT NULL,
    photo_order INTEGER DEFAULT 0,
    is_main BOOLEAN DEFAULT FALSE,
    caption VARCHAR(255),
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user sessions table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_properties_seller ON properties(seller_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_price ON properties(list_price);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX idx_properties_condition ON properties(property_condition);

CREATE INDEX idx_offers_property ON offers(property_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_status ON offers(status);

CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_property ON messages(property_id);

CREATE INDEX idx_photos_property ON property_photos(property_id);
--CREATE INDEX idx_photos_order ON property_photos(property_order);

-- Create views for easier querying
CREATE OR REPLACE VIEW active_listings AS
SELECT 
    p.*,
    u.first_name AS seller_first_name,
    u.last_name AS seller_last_name,
    u.email AS seller_email,
    u.phone AS seller_phone,
    COUNT(DISTINCT o.id) AS offer_count,
    MAX(o.offer_amount) AS highest_offer
FROM properties p
JOIN users u ON p.seller_id = u.id
LEFT JOIN offers o ON p.id = o.property_id AND o.status = 'pending'
WHERE p.status = 'active'
GROUP BY p.id, u.id;

-- View for properties with calculated system ages
CREATE OR REPLACE VIEW properties_with_system_status AS
SELECT 
    p.*,
    EXTRACT(YEAR FROM CURRENT_DATE) - roof_year AS roof_age,
    EXTRACT(YEAR FROM CURRENT_DATE) - hvac_install_year AS hvac_age,
    EXTRACT(YEAR FROM CURRENT_DATE) - water_heater_year AS water_heater_age,
    EXTRACT(YEAR FROM CURRENT_DATE) - solar_install_year AS solar_age,
    CASE 
        WHEN roof_year < EXTRACT(YEAR FROM CURRENT_DATE) - 20 THEN 'needs_replacement'
        WHEN roof_year < EXTRACT(YEAR FROM CURRENT_DATE) - 15 THEN 'aging'
        ELSE 'good'
    END AS roof_status,
    CASE 
        WHEN hvac_install_year < EXTRACT(YEAR FROM CURRENT_DATE) - 15 THEN 'needs_replacement'
        WHEN hvac_install_year < EXTRACT(YEAR FROM CURRENT_DATE) - 10 THEN 'aging'
        ELSE 'good'
    END AS hvac_status,
    CASE 
        WHEN water_heater_year < EXTRACT(YEAR FROM CURRENT_DATE) - 12 THEN 'needs_replacement'
        WHEN water_heater_year < EXTRACT(YEAR FROM CURRENT_DATE) - 8 THEN 'aging'
        ELSE 'good'
    END AS water_heater_status
FROM properties p;

-- Add triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample data for testing (optional)
-- INSERT INTO users (email, password_hash, first_name, last_name, user_type) VALUES
-- ('seller@test.com', '$2b$12$dummy_hash', 'Test', 'Seller', 'seller'),
-- ('buyer@test.com', '$2b$12$dummy_hash', 'Test', 'Buyer', 'buyer');

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;