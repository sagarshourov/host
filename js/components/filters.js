// Global state for filters
const filterState = {
    price: 'Price',
    beds: 'Beds & Baths',
    type: 'Home Type',
    more: 'More',
    sort: 'Sort: Newest'
};

// Toggle dropdown visibility
function toggleDropdown(filterId) {
    // Close all other dropdowns first
    const allDropdowns = document.querySelectorAll('.filter-dropdown-content');
    const allButtons = document.querySelectorAll('.filter-btn');
    
    allDropdowns.forEach(dropdown => {
        if (dropdown.id !== filterId + 'Dropdown') {
            dropdown.classList.remove('show');
        }
    });
    
    allButtons.forEach(btn => {
        if (!btn.onclick.toString().includes(filterId)) {
            btn.classList.remove('active');
        }
    });

    // Toggle the selected dropdown
    const dropdown = document.getElementById(filterId + 'Dropdown');
    const button = event.target.closest('.filter-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Select filter option
function selectFilter(filterId, value) {
    // Update the filter state
    filterState[filterId] = value;
    
    // Update the button text
    const textElement = document.getElementById(filterId + 'Text');
    textElement.textContent = value;
    
    // Update selected state in dropdown
    const dropdown = document.getElementById(filterId + 'Dropdown');
    const options = dropdown.querySelectorAll('.filter-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent === value) {
            option.classList.add('selected');
        }
    });
    
    // Close the dropdown
    dropdown.classList.remove('show');
    const button = document.querySelector(`[onclick="toggleDropdown('${filterId}')"]`);
    button.classList.remove('active');
    
    // Apply filters
    applyFilters();
}

// Reset price filter specifically
function resetPriceFilter() {
    // Reset price filter state
    filterState.price = 'Price';
    
    // Update button text
    document.getElementById('priceText').textContent = 'Price';
    
    // Clear price inputs
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    
    // Update selected state in dropdown
    const dropdown = document.getElementById('priceDropdown');
    const options = dropdown.querySelectorAll('.filter-option');
    options.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Close the dropdown
    dropdown.classList.remove('show');
    const button = document.querySelector(`[onclick="toggleDropdown('price')"]`);
    button.classList.remove('active');
    
    // Apply filters
    applyFilters();
}

// Select sort option
function selectSort(value) {
    selectFilter('sort', 'Sort: ' + value);
}

// Apply filters - basic filtering for demo
function applyFilters() {
    const cards = document.querySelectorAll('.property-card');
    let visibleCount = 0;
    
    cards.forEach(card => {
        let isVisible = true;
        
        // Price filter
        if (filterState.price !== 'Price') {
            const price = parseInt(card.dataset.price);
            if (filterState.price === 'Under $300K' && price >= 300000) isVisible = false;
            if (filterState.price === '$300K - $500K' && (price < 300000 || price > 500000)) isVisible = false;
            if (filterState.price === '$500K - $750K' && (price < 500000 || price > 750000)) isVisible = false;
            if (filterState.price === '$750K - $1M' && (price < 750000 || price > 1000000)) isVisible = false;
            if (filterState.price === 'Over $1M' && price <= 1000000) isVisible = false;
        }
        
        // Beds filter
        if (filterState.beds !== 'Beds & Baths' && filterState.beds !== 'Any') {
            const beds = parseInt(card.dataset.beds);
            const requiredBeds = parseInt(filterState.beds.replace(/[^0-9]/g, ''));
            if (beds < requiredBeds) isVisible = false;
        }
        
        // Type filter
        if (filterState.type !== 'Home Type' && filterState.type !== 'All Types') {
            const type = card.dataset.type;
            if (type !== filterState.type) isVisible = false;
        }
        
        // Show/hide the card
        if (isVisible) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Update results count
    const resultsCount = document.querySelector('.results-count');
    resultsCount.innerHTML = `<strong>${visibleCount} homes</strong> available in Atlantic County, NJ`;
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.filter-dropdown')) {
        const allDropdowns = document.querySelectorAll('.filter-dropdown-content');
        const allButtons = document.querySelectorAll('.filter-btn');
        
        allDropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
        
        allButtons.forEach(btn => {
            btn.classList.remove('active');
        });
    }
});

// Handle price input changes
document.getElementById('priceMin').addEventListener('input', function() {
    updateCustomPriceFilter();
});

document.getElementById('priceMax').addEventListener('input', function() {
    updateCustomPriceFilter();
});

function updateCustomPriceFilter() {
    const minInput = document.getElementById('priceMin');
    const maxInput = document.getElementById('priceMax');
    const min = minInput.value;
    const max = maxInput.value;
    
    if (min || max) {
        let customText = 'Price: ';
        if (min && max) {
            customText += `$${min} - $${max}`;
        } else if (min) {
            customText += `$${min}+`;
        } else {
            customText += `Under $${max}`;
        }
        document.getElementById('priceText').textContent = customText;
        filterState.price = customText;
        applyFilters();
    }
}

// View toggle functions
function showGrid() {
    document.getElementById('propertyGrid').style.display = 'grid';
    document.getElementById('mapContainer').classList.remove('active');
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showMap() {
    document.getElementById('propertyGrid').style.display = 'none';
    document.getElementById('mapContainer').classList.add('active');
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Map Controls
function zoomIn() {
    const mapBg = document.querySelector('.map-background');
    const currentScale = mapBg.style.transform || 'scale(1)';
    const scale = parseFloat(currentScale.match(/scale\(([^)]+)\)/)?.[1] || 1);
    const newScale = Math.min(scale * 1.2, 3);
    mapBg.style.transform = `scale(${newScale})`;
    mapBg.style.transformOrigin = 'center center';
}

function zoomOut() {
    const mapBg = document.querySelector('.map-background');
    const currentScale = mapBg.style.transform || 'scale(1)';
    const scale = parseFloat(currentScale.match(/scale\(([^)]+)\)/)?.[1] || 1);
    const newScale = Math.max(scale / 1.2, 0.5);
    mapBg.style.transform = `scale(${newScale})`;
    mapBg.style.transformOrigin = 'center center';
}

function resetView() {
    const mapBg = document.querySelector('.map-background');
    mapBg.style.transform = 'scale(1)';
}

// Property interactions - FIXED WITH PROPER TIMING
document.addEventListener('DOMContentLoaded', function() {
    // Add a small delay to ensure all elements are loaded
    setTimeout(() => {
        const propertyCards = document.querySelectorAll('.property-card');
        console.log(`Found ${propertyCards.length} property cards`); // Debug line
        
        propertyCards.forEach(card => {
            card.addEventListener('click', function(e) {
                // Don't trigger if clicking on a button
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                
                console.log('Property card clicked!'); // Debug line
                
                // Navigate to property detail page
                window.location.href = 'property-detail.html';
            });
        });
    }, 100);
});

// Property pin clicks
document.querySelectorAll('.property-pin').forEach(pin => {
    pin.addEventListener('click', function() {
        const tooltip = this.querySelector('.pin-tooltip');
        if (tooltip) {
            const address = tooltip.querySelector('strong').textContent;
            alert(`Opening property details for:\n${address}`);
        } else {
            alert(`Opening property details for this ${this.textContent} home`);
        }
    });
});

// Save search functionality
document.querySelector('.save-search-btn').addEventListener('click', function() {
    alert('Search saved! You\'ll receive notifications when new properties match your criteria.');
});

// Search functionality
document.querySelector('.search-btn-main').addEventListener('click', function() {
    const searchInput = document.querySelector('.search-input-main');
    const searchTerm = searchInput.value;
    alert(`Searching for properties in: ${searchTerm}`);
});

// Enter key support for search
document.querySelector('.search-input-main').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.querySelector('.search-btn-main').click();
    }
});