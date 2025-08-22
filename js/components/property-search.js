// Create this file: js/components/property-search.js
// This replaces the hardcoded properties with real database queries

class PropertySearch {
    constructor() {
        this.currentFilters = {
            minPrice: null,
            maxPrice: null,
            minBedrooms: null,
            propertyType: 'all',
            city: null,
            state: 'NJ'
        };
        this.currentPage = 1;
        this.resultsPerPage = 12;
        this.init();
    }

    async init() {
        // Set up filter event listeners
        this.setupFilters();
        // Load initial properties from database
        await this.searchProperties();
    }

    setupFilters() {
        // Price filter dropdown
        const priceDropdown = document.getElementById('priceDropdown');
        if (priceDropdown) {
            // Clear existing onclick handlers and use event delegation
            priceDropdown.innerHTML = `
                <div class="price-inputs">
                    <input type="text" class="price-input" placeholder="Min" id="priceMin">
                    <input type="text" class="price-input" placeholder="Max" id="priceMax">
                    <button onclick="propertySearch.applyPriceFilter()">Apply</button>
                </div>
                <div class="filter-option" data-min="0" data-max="">Any price</div>
                <div class="filter-option" data-min="0" data-max="300000">Under $300K</div>
                <div class="filter-option" data-min="300000" data-max="500000">$300K - $500K</div>
                <div class="filter-option" data-min="500000" data-max="750000">$500K - $750K</div>
                <div class="filter-option" data-min="750000" data-max="1000000">$750K - $1M</div>
                <div class="filter-option" data-min="1000000" data-max="">Over $1M</div>
            `;

            priceDropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-option')) {
                    this.currentFilters.minPrice = e.target.dataset.min || null;
                    this.currentFilters.maxPrice = e.target.dataset.max || null;
                    document.getElementById('priceText').textContent = e.target.textContent;
                    document.getElementById('priceDropdown').style.display = 'none';
                    this.searchProperties();
                }
            });
        }

        // Beds filter
        const bedsDropdown = document.getElementById('bedsDropdown');
        if (bedsDropdown) {
            bedsDropdown.innerHTML = `
                <div class="filter-option" data-beds="">Any</div>
                <div class="filter-option" data-beds="1">1+ bed</div>
                <div class="filter-option" data-beds="2">2+ beds</div>
                <div class="filter-option" data-beds="3">3+ beds</div>
                <div class="filter-option" data-beds="4">4+ beds</div>
                <div class="filter-option" data-beds="5">5+ beds</div>
            `;

            bedsDropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-option')) {
                    this.currentFilters.minBedrooms = e.target.dataset.beds || null;
                    document.getElementById('bedsText').textContent = e.target.textContent;
                    document.getElementById('bedsDropdown').style.display = 'none';
                    this.searchProperties();
                }
            });
        }

        // Property type filter
        const typeDropdown = document.getElementById('typeDropdown');
        if (typeDropdown) {
            typeDropdown.innerHTML = `
                <div class="filter-option" data-type="all">All Types</div>
                <div class="filter-option" data-type="house">Houses</div>
                <div class="filter-option" data-type="condo">Condos</div>
                <div class="filter-option" data-type="townhouse">Townhomes</div>
                <div class="filter-option" data-type="multi-family">Multi-family</div>
                <div class="filter-option" data-type="land">Lots/Land</div>
            `;

            typeDropdown.addEventListener('click', (e) => {
                if (e.target.classList.contains('filter-option')) {
                    this.currentFilters.propertyType = e.target.dataset.type;
                    document.getElementById('typeText').textContent = e.target.textContent;
                    document.getElementById('typeDropdown').style.display = 'none';
                    this.searchProperties();
                }
            });
        }

        // Main search bar
        const searchInput = document.querySelector('.search-input-main');
        const searchBtn = document.querySelector('.search-btn-main');
        
        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchValue = searchInput.value.trim();
                // Parse city from search (simple implementation)
                if (searchValue) {
                    const parts = searchValue.split(',');
                    if (parts.length > 0) {
                        this.currentFilters.city = parts[0].trim();
                    }
                }
                this.searchProperties();
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchBtn.click();
                }
            });
        }
    }

    applyPriceFilter() {
        const minInput = document.getElementById('priceMin');
        const maxInput = document.getElementById('priceMax');
        
        this.currentFilters.minPrice = minInput.value.replace(/[^\d]/g, '') || null;
        this.currentFilters.maxPrice = maxInput.value.replace(/[^\d]/g, '') || null;
        
        let priceText = 'Price';
        if (this.currentFilters.minPrice && this.currentFilters.maxPrice) {
            priceText = `$${parseInt(this.currentFilters.minPrice).toLocaleString()} - $${parseInt(this.currentFilters.maxPrice).toLocaleString()}`;
        } else if (this.currentFilters.minPrice) {
            priceText = `$${parseInt(this.currentFilters.minPrice).toLocaleString()}+`;
        } else if (this.currentFilters.maxPrice) {
            priceText = `Under $${parseInt(this.currentFilters.maxPrice).toLocaleString()}`;
        }
        
        document.getElementById('priceText').textContent = priceText;
        document.getElementById('priceDropdown').style.display = 'none';
        this.searchProperties();
    }

    async searchProperties() {
        try {
            // Show loading state
            const propertyGrid = document.getElementById('propertyGrid');
            if (propertyGrid) {
                propertyGrid.innerHTML = '<div class="loading">Loading properties...</div>';
            }

            // Build query parameters
            const params = new URLSearchParams();
            
            // Add filters
            if (this.currentFilters.city) params.append('city', this.currentFilters.city);
            if (this.currentFilters.state) params.append('state', this.currentFilters.state);
            if (this.currentFilters.minPrice) params.append('minPrice', this.currentFilters.minPrice);
            if (this.currentFilters.maxPrice) params.append('maxPrice', this.currentFilters.maxPrice);
            if (this.currentFilters.minBedrooms) params.append('minBedrooms', this.currentFilters.minBedrooms);
            if (this.currentFilters.propertyType && this.currentFilters.propertyType !== 'all') {
                params.append('propertyType', this.currentFilters.propertyType);
            }
            
            // Add pagination
            params.append('limit', this.resultsPerPage);
            params.append('offset', (this.currentPage - 1) * this.resultsPerPage);

            // Fetch from API
            const response = await fetch(`/api/properties?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                this.displayProperties(result.properties);
                this.updateResultsCount(result.properties.length, result.total);
            } else {
                throw new Error(result.error || 'Failed to load properties');
            }

        } catch (error) {
            console.error('Search error:', error);
            const propertyGrid = document.getElementById('propertyGrid');
            if (propertyGrid) {
                propertyGrid.innerHTML = `
                    <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                        <p>Unable to load properties. Please try again.</p>
                        <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Refresh Page</button>
                    </div>
                `;
            }
        }
    }

    displayProperties(properties) {
        const propertyGrid = document.getElementById('propertyGrid');
        if (!propertyGrid) return;

        if (properties.length === 0) {
            propertyGrid.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3>No properties found</h3>
                    <p>Try adjusting your filters or search in a different area.</p>
                </div>
            `;
            return;
        }

        propertyGrid.innerHTML = properties.map(property => {
            // Calculate buyer fee based on seller's fee structure
            let buyerFee = 0;
            let buyerFeeText = 'Your fee: $0';
            let feeClass = 'zero-fee';
            
            // This is a simplified calculation - you'll need to add fee structure to your database
            // For now, assume 50/50 split as default
            if (!property.seller_covers_all_fees) {
                buyerFee = property.list_price * 0.0125; // 1.25% buyer fee
                buyerFeeText = `Your fee: $${buyerFee.toLocaleString()}`;
                feeClass = '';
            }

            // Get main photo or use placeholder
            const mainPhoto = property.main_photo || property.photos?.[0]?.file_url || '/assets/images/placeholder.jpg';
            
            return `
                <div class="property-card" onclick="window.location.href='/property-detail.html?id=${property.id}'" style="cursor: pointer;">
                    <div class="property-image">
                        <img src="${mainPhoto}" alt="${property.street_address}" onerror="this.src='/assets/images/placeholder.jpg'">
                        <div class="property-badge">You're Home</div>
                        ${property.is_as_is ? '<span class="badge as-is">AS-IS</span>' : ''}
                        ${property.has_solar ? '<span class="badge solar">Solar</span>' : ''}
                    </div>
                    <div class="property-info">
                        <div class="property-price">$${property.list_price.toLocaleString()}</div>
                        <div class="property-details">${property.bedrooms} bed • ${property.bathrooms} bath • ${property.square_feet.toLocaleString()} sqft</div>
                        <div class="property-address">${property.street_address}<br>${property.city}, ${property.state} ${property.zip_code}</div>
                        <div class="property-features">
                            <span class="feature-badge ${feeClass}">${buyerFeeText}</span>
                            <span class="feature-badge">${property.allow_messages ? 'Messages On' : 'No Messages'}</span>
                            ${property.property_condition === 'move-in-ready' ? '<span class="feature-badge">Move-in Ready</span>' : ''}
                            ${property.has_pool ? '<span class="feature-badge">Pool</span>' : ''}
                            ${property.garage_spaces > 0 ? '<span class="feature-badge">Garage</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add hover effects
        const cards = propertyGrid.querySelectorAll('.property-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-4px)';
                this.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                this.style.transition = 'all 0.3s ease';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });
    }

    updateResultsCount(showing, total) {
        const countElement = document.querySelector('.results-count');
        if (countElement) {
            if (total === 0) {
                countElement.innerHTML = '<strong>No homes</strong> found matching your criteria';
            } else {
                countElement.innerHTML = `<strong>${total} homes</strong> available${this.currentFilters.city ? ' in ' + this.currentFilters.city : ''}`;
            }
        }
    }
}

// Initialize when page loads
let propertySearch;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on listings page
    if (document.getElementById('propertyGrid')) {
        propertySearch = new PropertySearch();
    }
});