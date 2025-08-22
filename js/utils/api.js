// js/utils/api.js
// This file connects your existing frontend forms to the real backend
// Add this to your project and include it in your HTML pages

class YoureHomeAPI {
    constructor() {
        this.baseURL = '/api';  // Changed from 'http://localhost:3000/api'
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Skip auth check on login/signup pages to prevent redirect loops
        const currentPath = window.location.pathname;
        const authPages = ['/login.html', '/pages/login.html', '/signup.html', '/pages/signup.html'];
        
        if (!authPages.includes(currentPath)) {
            // Only check auth status on non-auth pages
            await this.checkAuthStatus();
        } else {
            console.log('Skipping auth check on login page');
            // Clear any stale auth state
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
        }
        
        this.setupFormHandlers();
    }

    // Authentication Methods
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.baseURL}/auth/verify`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForLoggedInUser();
                
            } else {
                this.currentUser = null;
                this.updateUIForLoggedOutUser();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForLoggedInUser();
                this.showNotification('Account created successfully!', 'success');
                
                // Redirect based on user type
                if (result.user.userType === 'seller') {
                    window.location.replace('/list-property.html');
                } else {
                    window.location.replace('/listings.html');
                }
            } else {
                this.showNotification(result.error || 'Registration failed', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Network error. Please try again.', 'error');
            return { success: false, error: 'Network error' };
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.currentUser = result.user;
                this.updateUIForLoggedInUser();
                this.showNotification('Welcome back!', 'success');
                
                // Redirect based on user type
                setTimeout(() => {
                    if (result.user.userType === 'seller' || result.user.userType === 'both') {
                        window.location.replace('/seller-dashboard.html');
                    } else {
                        window.location.replace('/listings.html');
                    }
                }, 1000);
            } else {
                this.showNotification(result.error || 'Invalid email or password', 'error');
            }
            
            return result;
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Network error. Please try again.', 'error');
            return { success: false, error: 'Network error' };
        }
    }

    async logout() {
        try {
            await fetch(`${this.baseURL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            this.showNotification('Logged out successfully', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.replace('/');
            }, 500);
        } catch (error) {
            console.error('Logout error:', error);
            // Even if logout fails, clear local state and redirect
            this.currentUser = null;
            window.location.replace('/');
        }
    }

    // Property Methods
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    // Fix the createProperty method to use correct endpoint:
    async createProperty(propertyData, photos) {
        try {
            // First check if logged in
            if (!this.isLoggedIn()) {
                window.location.href = '/login.html';
                return { success: false, error: 'Not logged in' };
            }
    
            const response = await fetch(`${this.baseURL}/properties`, {  // CHANGED from /properties/create
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(propertyData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Property listed successfully!', 'success');
            }
            
            return result;
        } catch (error) {
            console.error('Property creation error:', error);
            return { success: false, error: error.message };
        }
    }
    

    async updateProperty(propertyId, updates) {
        try {
            const response = await fetch(`${this.baseURL}/properties/${propertyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Property update error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async searchProperties(filters = {}) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.baseURL}/properties/search?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Property search error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async getProperty(propertyId) {
        try {
            const response = await fetch(`${this.baseURL}/properties/${propertyId}`);
            return await response.json();
        } catch (error) {
            console.error('Get property error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async getComparables(propertyId) {
        try {
            const response = await fetch(`${this.baseURL}/properties/${propertyId}/comps`);
            return await response.json();
        } catch (error) {
            console.error('Get comps error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Offer Methods
    async submitOffer(offerData) {
        try {
            const response = await fetch(`${this.baseURL}/offers/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(offerData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Offer submitted successfully!', 'success');
            }
            
            return result;
        } catch (error) {
            console.error('Offer submission error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async getSellerOffers() {
        try {
            const response = await fetch(`${this.baseURL}/offers/seller`, {
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error('Get offers error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    async respondToOffer(offerId, action, data = {}) {
        try {
            const response = await fetch(`${this.baseURL}/offers/${offerId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Offer response error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Pre-Approval Methods
    async submitPreApproval(financialData) {
        try {
            const formData = new FormData();
            
            // Add financial data
            Object.keys(financialData).forEach(key => {
                if (financialData[key] !== null && financialData[key] !== undefined) {
                    formData.append(key, financialData[key]);
                }
            });
            
            const response = await fetch(`${this.baseURL}/auth/pre-approval`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            return await response.json();
        } catch (error) {
            console.error('Pre-approval error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Form Handler Setup
    setupFormHandlers() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Property listing form
        const listPropertyForm = document.getElementById('listPropertyForm');
        if (listPropertyForm) {
            listPropertyForm.addEventListener('submit', (e) => this.handleListProperty(e));
        }

        // Offer submission form
        const offerForm = document.getElementById('submitOfferForm');
        if (offerForm) {
            offerForm.addEventListener('submit', (e) => this.handleSubmitOffer(e));
        }

        // Pre-approval form
        const preApprovalForm = document.getElementById('preApprovalForm');
        if (preApprovalForm) {
            preApprovalForm.addEventListener('submit', (e) => this.handlePreApproval(e));
        }

        // Property search
        const searchForm = document.getElementById('propertySearchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handlePropertySearch(e));
        }
    }

    // Form Handlers
    async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.showNotification('Please enter email and password', 'error');
            return;
        }

        this.showLoading('Signing in...');
        const result = await this.login(email, password);
        this.hideLoading();

        if (!result.success) {
            this.showNotification(result.error || 'Login failed', 'error');
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const userData = {
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone'),
            userType: formData.get('userType') || 'buyer'
        };

        // Validate passwords match
        const confirmPassword = formData.get('confirmPassword');
        if (userData.password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        this.showLoading('Creating account...');
        const result = await this.register(userData);
        this.hideLoading();

        if (!result.success) {
            this.showNotification(result.error || 'Registration failed', 'error');
        }
    }

    async handleListProperty(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // Extract all property data including new system fields
        const propertyData = {
            // Basic info
            streetAddress: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zip'),
            propertyType: formData.get('propertyType'),
            bedrooms: parseInt(formData.get('bedrooms')),
            bathrooms: parseFloat(formData.get('bathrooms')),
            squareFeet: parseInt(formData.get('sqft')),
            lotSize: parseFloat(formData.get('lotSize')),
            yearBuilt: parseInt(formData.get('yearBuilt')),
            
            // Pricing
            listPrice: parseFloat(formData.get('listPrice')?.replace(/[$,]/g, '')),
            propertyTaxAnnual: parseFloat(formData.get('propertyTax')?.replace(/[$,]/g, '')),
            hoaFeesMonthly: parseFloat(formData.get('hoaFees')?.replace(/[$,]/g, '')) || 0,
            
            // System details
            roofYear: parseInt(formData.get('roofYear')) || null,
            roofMaterial: formData.get('roofMaterial'),
            hvacInstallYear: parseInt(formData.get('hvacYear')) || null,
            hvacType: formData.get('hvacType'),
            waterHeaterYear: parseInt(formData.get('waterHeaterYear')) || null,
            waterHeaterType: formData.get('waterHeaterType'),
            
            // Septic
            hasSeptic: formData.get('hasSeptic') === 'true',
            septicType: formData.get('septicType'),
            septicLastPumped: formData.get('septicLastPumped'),
            
            // Solar
            hasSolar: formData.get('hasSolar') === 'true',
            solarType: formData.get('solarType'), // leased, owned
            solarInstallYear: parseInt(formData.get('solarYear')) || null,
            solarMonthlySavings: parseFloat(formData.get('solarSavings')) || null,
            
            // Condition
            propertyCondition: formData.get('propertyCondition') || 'move-in-ready',
            majorRepairsNeeded: formData.get('majorRepairs'),
            recentRenovations: formData.get('renovations'),
            
            // Other
            description: formData.get('description'),
            allowMessages: formData.get('allowMessages') === 'true',
            minimumOfferPercent: parseInt(formData.get('minimumOfferPercent')) || 50
        };

        // Get photos
        const photoFiles = formData.getAll('photos');

        this.showLoading('Creating your listing...');
        const result = await this.createProperty(propertyData, photoFiles);
        this.hideLoading();

        if (result.success) {
            this.showNotification('Property listed successfully!', 'success');
            setTimeout(() => {
                window.location.replace('/seller-dashboard.html');
            }, 2000);
        } else {
            this.showNotification(result.error || 'Failed to create listing', 'error');
        }
    }

    async handleSubmitOffer(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const offerData = {
            propertyId: formData.get('propertyId'),
            offerAmount: parseFloat(formData.get('offerAmount')?.replace(/[$,]/g, '')),
            message: formData.get('message'),
            proposedClosingDate: formData.get('closingDate'),
            contingencies: {
                inspection: formData.get('inspectionContingency') === 'true',
                financing: formData.get('financingContingency') === 'true',
                appraisal: formData.get('appraisalContingency') === 'true'
            }
        };

        this.showLoading('Submitting offer...');
        const result = await this.submitOffer(offerData);
        this.hideLoading();

        if (!result.success) {
            this.showNotification(result.error || 'Failed to submit offer', 'error');
        }
    }

    async handlePropertySearch(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const filters = {
            minPrice: formData.get('minPrice')?.replace(/[$,]/g, ''),
            maxPrice: formData.get('maxPrice')?.replace(/[$,]/g, ''),
            bedrooms: formData.get('bedrooms'),
            bathrooms: formData.get('bathrooms'),
            propertyType: formData.get('propertyType'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode')
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        this.showLoading('Searching properties...');
        const result = await this.searchProperties(filters);
        this.hideLoading();

        if (result.success) {
            this.displaySearchResults(result.properties);
        } else {
            this.showNotification('Search failed', 'error');
        }
    }

    // UI Helper Methods
    updateUIForLoggedInUser() {
        // Hide login/signup buttons
        document.querySelectorAll('.login-btn, .signup-btn').forEach(btn => {
            btn.style.display = 'none';
        });

        // Show user menu
        document.querySelectorAll('.user-menu').forEach(menu => {
            menu.style.display = 'block';
        });

        // Update user name displays
        if (this.currentUser) {
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            });
        }

        // Enable protected actions
        document.querySelectorAll('.requires-auth').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
    }

    updateUIForLoggedOutUser() {
        // Show login/signup buttons
        document.querySelectorAll('.login-btn, .signup-btn').forEach(btn => {
            btn.style.display = 'inline-block';
        });

        // Hide user menu
        document.querySelectorAll('.user-menu').forEach(menu => {
            menu.style.display = 'none';
        });

        // Disable protected actions
        document.querySelectorAll('.requires-auth').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    showLoading(message = 'Loading...') {
        const loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.remove();
    }

    displaySearchResults(properties) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (properties.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">No properties found matching your criteria.</p>';
            return;
        }

        resultsContainer.innerHTML = properties.map(property => `
            <div class="property-card">
                <img src="${property.photos[0]?.url || '/assets/images/placeholder.jpg'}" alt="${property.streetAddress}">
                <div class="property-info">
                    <h3>$${property.listPrice.toLocaleString()}</h3>
                    <p>${property.streetAddress}, ${property.city}, ${property.state}</p>
                    <p>${property.bedrooms} bed • ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sqft</p>
                    <a href="/property/${property.id}" class="btn-primary">View Details</a>
                </div>
            </div>
        `).join('');
    }

    // Initialize when DOM is ready
    static init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.youreHomeAPI = new YoureHomeAPI();
            });
        } else {
            window.youreHomeAPI = new YoureHomeAPI();
        }
    }
}

// Auto-initialize
YoureHomeAPI.init();