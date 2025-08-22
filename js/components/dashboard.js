// js/components/dashboard.js
// Real seller dashboard functionality that replaces the fake data

class SellerDashboard {
    constructor() {
        this.currentProperty = null;
        this.properties = [];
        this.offers = [];
        this.messages = [];
        this.init();
    }

    async init() {
        // Check if API is available
        if (!window.youreHomeAPI) {
            console.error('API not loaded. Make sure api.js is included before dashboard.js');
            return;
        }

        // Check authentication
        if (!window.youreHomeAPI.currentUser) {
            window.location.href = '/pages/index.html';
            return;
        }

        // Check if user can access seller dashboard
        const userType = window.youreHomeAPI.currentUser.userType;
        if (userType !== 'seller' && userType !== 'both') {
            alert('Access denied. Only sellers can access this dashboard.');
            window.location.href = '/pages/listings.html';
            return;
        }

        await this.loadDashboardData();
        this.setupEventHandlers();
        this.startRealTimeUpdates();
    }

    async loadDashboardData() {
        try {
            // Show loading state
            this.showLoading();

            // Load seller's properties
            const propertiesResult = await window.youreHomeAPI.getSellerListings();
            
            if (propertiesResult.success) {
                this.properties = propertiesResult.properties;
                
                // Display properties in dropdown
                this.populatePropertySelector();
                
                // Load data for first active property
                this.currentProperty = this.properties.find(p => p.status === 'active') || this.properties[0];
                
                if (this.currentProperty) {
                    await this.loadPropertyData(this.currentProperty.id);
                } else {
                    this.showNoPropertiesMessage();
                }
            } else {
                this.showError('Failed to load your properties');
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        } finally {
            this.hideLoading();
        }
    }

    async loadPropertyData(propertyId) {
        try {
            // Load offers for this property
            const offersResult = await window.youreHomeAPI.getPropertyOffers(propertyId);
            
            if (offersResult.success) {
                this.offers = offersResult.offers;
                this.updateOffersDisplay();
                this.updateStatsDisplay();
                this.updatePropertyDisplay();
            }

            // Load messages
            const messagesResult = await window.youreHomeAPI.getPropertyMessages(propertyId);
            if (messagesResult.success) {
                this.messages = messagesResult.messages;
                this.updateMessagesDisplay();
            }
        } catch (error) {
            console.error('Error loading property data:', error);
        }
    }

    populatePropertySelector() {
        const selector = document.getElementById('propertySelector');
        if (!selector) return;

        selector.innerHTML = this.properties.map(property => `
            <option value="${property.id}" ${property.id === this.currentProperty?.id ? 'selected' : ''}>
                ${property.street_address} - ${property.status.toUpperCase()}
            </option>
        `).join('');
    }

    updatePropertyDisplay() {
        if (!this.currentProperty) return;

        const property = this.currentProperty;

        // Update property header
        document.querySelector('.property-title').textContent = property.street_address;
        document.querySelector('.property-subtitle').textContent = 
            `${property.city}, ${property.state} • ${property.bedrooms} bed, ${property.bathrooms} bath • ${property.square_feet.toLocaleString()} sqft`;

        // Update pricing info
        document.querySelector('.list-price').textContent = `$${property.list_price.toLocaleString()}`;
        document.querySelector('.minimum-offer').textContent = `$${(property.list_price * property.minimum_offer_percent / 100).toLocaleString()}`;

        // Update listing metrics
        const daysListed = Math.floor((new Date() - new Date(property.listed_date)) / (1000 * 60 * 60 * 24));
        document.querySelector('.days-listed').textContent = `${daysListed} days`;
        document.querySelector('.view-count').textContent = property.view_count || 0;
        document.querySelector('.save-count').textContent = property.save_count || 0;

        // Update system information if available
        this.updateSystemsDisplay();
    }

    updateSystemsDisplay() {
        const property = this.currentProperty;
        if (!property) return;

        const systemsContainer = document.querySelector('.property-systems');
        if (!systemsContainer) return;

        let systemsHTML = '<h3>Property Systems Status</h3><div class="systems-grid">';

        // Roof
        if (property.roof_year) {
            const roofAge = new Date().getFullYear() - property.roof_year;
            const roofStatus = roofAge > 20 ? 'needs-attention' : roofAge > 15 ? 'aging' : 'good';
            systemsHTML += `
                <div class="system-card ${roofStatus}">
                    <span class="system-icon">🏠</span>
                    <span class="system-name">Roof (${property.roof_material || 'Unknown'})</span>
                    <span class="system-age">${roofAge} years old</span>
                </div>
            `;
        }

        // HVAC
        if (property.hvac_install_year) {
            const hvacAge = new Date().getFullYear() - property.hvac_install_year;
            const hvacStatus = hvacAge > 15 ? 'needs-attention' : hvacAge > 10 ? 'aging' : 'good';
            systemsHTML += `
                <div class="system-card ${hvacStatus}">
                    <span class="system-icon">🌡️</span>
                    <span class="system-name">HVAC (${property.hvac_type || 'Unknown'})</span>
                    <span class="system-age">${hvacAge} years old</span>
                </div>
            `;
        }

        // Water Heater
        if (property.water_heater_year) {
            const waterHeaterAge = new Date().getFullYear() - property.water_heater_year;
            const waterHeaterStatus = waterHeaterAge > 12 ? 'needs-attention' : waterHeaterAge > 8 ? 'aging' : 'good';
            systemsHTML += `
                <div class="system-card ${waterHeaterStatus}">
                    <span class="system-icon">💧</span>
                    <span class="system-name">Water Heater (${property.water_heater_type || 'Unknown'})</span>
                    <span class="system-age">${waterHeaterAge} years old</span>
                </div>
            `;
        }

        // Solar
        if (property.has_solar && property.solar_install_year) {
            const solarAge = new Date().getFullYear() - property.solar_install_year;
            systemsHTML += `
                <div class="system-card good">
                    <span class="system-icon">☀️</span>
                    <span class="system-name">Solar (${property.solar_type})</span>
                    <span class="system-age">${solarAge} years old</span>
                    ${property.solar_monthly_savings ? `<span class="solar-savings">Saves ~$${property.solar_monthly_savings}/mo</span>` : ''}
                </div>
            `;
        }

        systemsHTML += '</div>';
        systemsContainer.innerHTML = systemsHTML;
    }

    updateStatsDisplay() {
        // Update key metrics
        document.querySelector('.stat-views .stat-number').textContent = this.currentProperty?.view_count || 0;
        document.querySelector('.stat-offers .stat-number').textContent = this.offers.length;
        
        // Calculate average offer
        const avgOffer = this.offers.length > 0 
            ? this.offers.reduce((sum, offer) => sum + offer.offer_amount, 0) / this.offers.length
            : 0;
        document.querySelector('.stat-avg-offer .stat-number').textContent = 
            avgOffer > 0 ? `$${Math.round(avgOffer).toLocaleString()}` : '-';
        
        // Messages count
        const unreadCount = this.messages.filter(m => !m.is_read && m.recipient_id === window.youreHomeAPI.currentUser.id).length;
        document.querySelector('.stat-messages .stat-number').textContent = unreadCount;
    }

    updateOffersDisplay() {
        const offersContainer = document.querySelector('.offers-list');
        if (!offersContainer) return;

        if (this.offers.length === 0) {
            offersContainer.innerHTML = '<p class="no-offers">No offers yet. Share your listing to get more visibility!</p>';
            return;
        }

        // Sort offers by amount (highest first)
        const sortedOffers = [...this.offers].sort((a, b) => b.offer_amount - a.offer_amount);

        offersContainer.innerHTML = sortedOffers.map(offer => {
            const offerPercent = (offer.offer_amount / this.currentProperty.list_price * 100).toFixed(1);
            const daysAgo = Math.floor((new Date() - new Date(offer.created_at)) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="offer-card ${offer.status}" data-offer-id="${offer.id}">
                    <div class="offer-header">
                        <div class="offer-amount">
                            <h3>$${offer.offer_amount.toLocaleString()}</h3>
                            <span class="offer-percent">${offerPercent}% of list</span>
                        </div>
                        <div class="offer-buyer">
                            <span class="buyer-name">${offer.buyer_first_name} ${offer.buyer_last_name}</span>
                            <span class="buyer-type">${offer.financing_type || 'Not specified'}</span>
                            <span class="buyer-rating">${this.getBuyerRating(offer)}</span>
                        </div>
                    </div>
                    
                    <div class="offer-details">
                        <div class="offer-info">
                            <span>📅 Closing: ${new Date(offer.proposed_closing_date).toLocaleDateString()}</span>
                            <span>⏱️ ${daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}</span>
                        </div>
                        
                        ${offer.buyer_message ? `
                            <div class="offer-message">
                                <p>"${offer.buyer_message}"</p>
                            </div>
                        ` : ''}
                        
                        <div class="offer-contingencies">
                            ${offer.inspection_contingency ? '<span class="contingency">🔍 Inspection</span>' : ''}
                            ${offer.financing_contingency ? '<span class="contingency">💰 Financing</span>' : ''}
                            ${offer.appraisal_contingency ? '<span class="contingency">📊 Appraisal</span>' : ''}
                        </div>
                    </div>
                    
                    ${offer.status === 'pending' ? `
                        <div class="offer-actions">
                            <button class="btn-accept" onclick="dashboard.acceptOffer(${offer.id})">Accept</button>
                            <button class="btn-counter" onclick="dashboard.counterOffer(${offer.id})">Counter</button>
                            <button class="btn-reject" onclick="dashboard.rejectOffer(${offer.id})">Reject</button>
                        </div>
                    ` : `
                        <div class="offer-status-badge ${offer.status}">
                            ${offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }

    updateMessagesDisplay() {
        const messagesContainer = document.querySelector('.messages-list');
        if (!messagesContainer) return;

        const unreadMessages = this.messages.filter(m => !m.is_read && m.recipient_id === window.youreHomeAPI.currentUser.id);

        if (unreadMessages.length === 0) {
            messagesContainer.innerHTML = '<p class="no-messages">No new messages</p>';
            return;
        }

        messagesContainer.innerHTML = unreadMessages.map(message => `
            <div class="message-item" data-message-id="${message.id}">
                <div class="message-header">
                    <span class="sender-name">${message.sender_first_name} ${message.sender_last_name}</span>
                    <span class="message-time">${this.formatTime(message.created_at)}</span>
                </div>
                <div class="message-subject">${message.subject || 'No subject'}</div>
                <div class="message-preview">${message.message_body.substring(0, 100)}...</div>
                <button class="btn-read-message" onclick="dashboard.readMessage(${message.id})">Read</button>
            </div>
        `).join('');
    }

    getBuyerRating(offer) {
        // Calculate buyer rating based on pre-approval and offer strength
        if (!offer.buyer_pre_approved) return '⭐';
        
        const offerStrength = offer.offer_amount / this.currentProperty.list_price;
        if (offerStrength >= 1 && offer.financing_type === 'cash') return '⭐⭐⭐⭐⭐';
        if (offerStrength >= 0.98) return '⭐⭐⭐⭐';
        if (offerStrength >= 0.95) return '⭐⭐⭐';
        return '⭐⭐';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
        return date.toLocaleDateString();
    }

    // Offer Actions
    async acceptOffer(offerId) {
        if (!confirm('Are you sure you want to accept this offer? This will mark your property as pending.')) {
            return;
        }

        try {
            const result = await window.youreHomeAPI.respondToOffer(offerId, 'accept');
            if (result.success) {
                window.youreHomeAPI.showNotification('Offer accepted! The buyer will be notified.', 'success');
                await this.loadPropertyData(this.currentProperty.id);
            } else {
                window.youreHomeAPI.showNotification(result.error || 'Failed to accept offer', 'error');
            }
        } catch (error) {
            console.error('Error accepting offer:', error);
            window.youreHomeAPI.showNotification('Failed to accept offer', 'error');
        }
    }

    async counterOffer(offerId) {
        const offer = this.offers.find(o => o.id === offerId);
        if (!offer) return;

        const counterAmount = prompt(`Current offer: $${offer.offer_amount.toLocaleString()}\nEnter your counter offer amount:`);
        if (!counterAmount) return;

        const amount = parseFloat(counterAmount.replace(/[$,]/g, ''));
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const message = prompt('Add a message to the buyer (optional):');

        try {
            const result = await window.youreHomeAPI.respondToOffer(offerId, 'counter', {
                counter_amount: amount,
                counter_message: message
            });

            if (result.success) {
                window.youreHomeAPI.showNotification('Counter offer sent!', 'success');
                await this.loadPropertyData(this.currentProperty.id);
            } else {
                window.youreHomeAPI.showNotification(result.error || 'Failed to send counter offer', 'error');
            }
        } catch (error) {
            console.error('Error sending counter offer:', error);
            window.youreHomeAPI.showNotification('Failed to send counter offer', 'error');
        }
    }

    async rejectOffer(offerId) {
        if (!confirm('Are you sure you want to reject this offer?')) {
            return;
        }

        const reason = prompt('Reason for rejection (optional, helps buyer improve future offers):');

        try {
            const result = await window.youreHomeAPI.respondToOffer(offerId, 'reject', {
                rejection_reason: reason
            });

            if (result.success) {
                window.youreHomeAPI.showNotification('Offer rejected', 'success');
                await this.loadPropertyData(this.currentProperty.id);
            } else {
                window.youreHomeAPI.showNotification(result.error || 'Failed to reject offer', 'error');
            }
        } catch (error) {
            console.error('Error rejecting offer:', error);
            window.youreHomeAPI.showNotification('Failed to reject offer', 'error');
        }
    }

    async readMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        // Show message in modal
        const modal = document.createElement('div');
        modal.className = 'message-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h3>${message.subject || 'Message'}</h3>
                <p class="message-from">From: ${message.sender_first_name} ${message.sender_last_name}</p>
                <p class="message-date">${new Date(message.created_at).toLocaleString()}</p>
                <div class="message-body">${message.message_body}</div>
                <button class="btn-reply" onclick="dashboard.replyToMessage(${message.id})">Reply</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Mark as read
        await window.youreHomeAPI.markMessageRead(messageId);
        this.messages.find(m => m.id === messageId).is_read = true;
        this.updateMessagesDisplay();
        this.updateStatsDisplay();
    }

    async updateListingPrice() {
        const newPrice = prompt(`Current price: $${this.currentProperty.list_price.toLocaleString()}\nEnter new listing price:`);
        if (!newPrice) return;

        const price = parseFloat(newPrice.replace(/[$,]/g, ''));
        if (isNaN(price) || price <= 0) {
            alert('Please enter a valid price');
            return;
        }

        try {
            const result = await window.youreHomeAPI.updateProperty(this.currentProperty.id, {
                list_price: price
            });

            if (result.success) {
                window.youreHomeAPI.showNotification('Listing price updated!', 'success');
                this.currentProperty.list_price = price;
                this.updatePropertyDisplay();
            } else {
                window.youreHomeAPI.showNotification(result.error || 'Failed to update price', 'error');
            }
        } catch (error) {
            console.error('Error updating price:', error);
            window.youreHomeAPI.showNotification('Failed to update price', 'error');
        }
    }

    setupEventHandlers() {
        // Property selector
        const propertySelector = document.getElementById('propertySelector');
        if (propertySelector) {
            propertySelector.addEventListener('change', async (e) => {
                const propertyId = parseInt(e.target.value);
                this.currentProperty = this.properties.find(p => p.id === propertyId);
                if (this.currentProperty) {
                    await this.loadPropertyData(propertyId);
                }
            });
        }

        // Edit price button
        const editPriceBtn = document.querySelector('.edit-price-btn');
        if (editPriceBtn) {
            editPriceBtn.addEventListener('click', () => this.updateListingPrice());
        }

        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadPropertyData(this.currentProperty.id));
        }
    }

    startRealTimeUpdates() {
        // Poll for updates every 30 seconds
        setInterval(() => {
            if (this.currentProperty) {
                this.loadPropertyData(this.currentProperty.id);
            }
        }, 30000);
    }

    showLoading() {
        const loader = document.getElementById('dashboardLoader');
        if (loader) loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.getElementById('dashboardLoader');
        if (loader) loader.style.display = 'none';
    }

    showError(message) {
        const errorContainer = document.querySelector('.dashboard-error');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
    }

    showNoPropertiesMessage() {
        const mainContent = document.querySelector('.dashboard-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="no-properties">
                    <h2>Welcome to Your Seller Dashboard!</h2>
                    <p>You don't have any properties listed yet.</p>
                    <a href="/pages/list-property.html" class="btn-primary">List Your First Property</a>
                </div>
            `;
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new SellerDashboard();
});