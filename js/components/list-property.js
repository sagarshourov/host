// js/list-property.js
// Complete functionality for the property listing form

class PropertyListingForm {
    constructor() {
        this.currentStep = 0;
        this.formSteps = [];
        this.progressSteps = [];
        this.selectedFeeStructure = 'seller-pays-all'; // Default to seller pays 2.5%
        this.uploadedPhotos = [];
        this.init();
    }

    init() {
        // Get form elements
        this.formSteps = document.querySelectorAll('.form-step');
        this.progressSteps = document.querySelectorAll('.step');
        
        // Initialize form
        this.showStep(0);
        this.setupEventListeners();
        this.setupFeeCalculator();
        this.setupPhotoUpload();
    }

    // =====================================
    // FORM NAVIGATION
    // =====================================
    showStep(stepIndex) {
        // Hide all steps
        this.formSteps.forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        if (this.formSteps[stepIndex]) {
            this.formSteps[stepIndex].classList.add('active');
            this.currentStep = stepIndex;
            
            // Update progress indicators
            this.updateProgressSteps();
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.formSteps.length - 1) {
                this.showStep(this.currentStep + 1);
            }
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    updateProgressSteps() {
        this.progressSteps.forEach((step, index) => {
            if (index <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    validateCurrentStep() {
        // Basic validation - you can expand this
        const currentFormStep = this.formSteps[this.currentStep];
        const requiredFields = currentFormStep.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields');
        }

        return isValid;
    }

    // =====================================
    // AI HOME VALUATION
    // =====================================
    async getHomeValue() {
        const button = document.querySelector('.btn-valuation');
        if (!button) return;

        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Calculating...';
        button.disabled = true;

        // Get property data
        const propertyData = {
            address: document.getElementById('address')?.value || '',
            city: document.getElementById('city')?.value || '',
            state: document.getElementById('state')?.value || 'NJ',
            zipCode: document.getElementById('zipCode')?.value || '',
            bedrooms: parseInt(document.getElementById('bedrooms')?.value) || 0,
            bathrooms: parseFloat(document.getElementById('bathrooms')?.value) || 0,
            squareFeet: parseInt(document.getElementById('sqft')?.value) || 0,
            yearBuilt: parseInt(document.getElementById('yearBuilt')?.value) || 0,
            propertyType: document.getElementById('propertyType')?.value || 'single-family'
        };

        // Validate data
        if (!propertyData.squareFeet || !propertyData.bedrooms || !propertyData.bathrooms) {
            alert('Please fill in bedrooms, bathrooms, and square feet to get a valuation.');
            button.textContent = originalText;
            button.disabled = false;
            return;
        }

        try {
            // Simulate AI calculation (replace with actual API call later)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Calculate estimated value
            const basePrice = 175; // Base price per sq ft for Atlantic County
            let pricePerSqFt = basePrice;

            // Adjustments
            if (propertyData.propertyType === 'condo') pricePerSqFt *= 0.85;
            if (propertyData.propertyType === 'townhouse') pricePerSqFt *= 0.9;
            
            const age = new Date().getFullYear() - (propertyData.yearBuilt || 1990);
            if (age < 5) pricePerSqFt *= 1.15;
            else if (age > 30) pricePerSqFt *= 0.8;

            // Add bedroom/bathroom multiplier
            const bedBathMultiplier = 1 + ((propertyData.bedrooms - 3) * 0.05) + ((propertyData.bathrooms - 2) * 0.03);
            pricePerSqFt *= bedBathMultiplier;

            // Calculate values
            const estimatedValue = Math.round(propertyData.squareFeet * pricePerSqFt);
            const minValue = Math.round(estimatedValue * 0.9);
            const maxValue = Math.round(estimatedValue * 1.1);

            // Display results
            this.displayValuationResults({
                minValue: minValue,
                maxValue: maxValue,
                recommendedPrice: estimatedValue,
                pricePerSqFt: pricePerSqFt
            });

        } catch (error) {
            console.error('Valuation error:', error);
            alert('Unable to calculate valuation. Please try again.');
        }

        // Reset button
        button.textContent = originalText;
        button.disabled = false;
    }

    displayValuationResults(results) {
        // Show the results div that's already in HTML
        const resultsDiv = document.getElementById('valuationResults');
        if (resultsDiv) {
            resultsDiv.style.display = 'block';
        }

        // Update the values
        document.getElementById('valuationRange').textContent = 
            `$${results.minValue.toLocaleString()} - $${results.maxValue.toLocaleString()}`;
        document.getElementById('valuationRecommended').textContent = 
            `Recommended List: $${results.recommendedPrice.toLocaleString()}`;
        document.getElementById('pricePerSqft').textContent = `$${results.pricePerSqFt.toFixed(2)}`;

        // Auto-fill the list price field
        const listPriceField = document.getElementById('listPrice');
        if (listPriceField && !listPriceField.value) {
            listPriceField.value = `$${results.recommendedPrice.toLocaleString()}`;
        }

        // Store for use in "Use Recommended Price" button
        this.recommendedPrice = results.recommendedPrice;
    }

    // =====================================
    // FEE STRUCTURE SELECTION (2.5% TOTAL)
    // =====================================
    setupFeeCalculator() {
        // Fee option radio buttons
        const feeOptions = document.querySelectorAll('input[name="feeStructure"]');
        feeOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                this.selectedFeeStructure = e.target.value;
                this.updatePayoutCalculator();
                
                // Update active card styling
                document.querySelectorAll('.fee-option-card').forEach(card => {
                    card.classList.remove('active');
                });
                e.target.closest('.fee-option-card').classList.add('active');
            });
        });

        // Custom fee slider
        const sellerSlider = document.getElementById('sellerSplit');
        if (sellerSlider) {
            sellerSlider.addEventListener('input', (e) => {
                this.updateCustomFeeDisplay();
            });
        }

        // Initialize payout calculator
        this.updatePayoutCalculator();
    }

    updateCustomFeeDisplay() {
        const slider = document.getElementById('sellerSplit');
        const sellerPercentage = document.getElementById('sellerPercentage');
        const buyerPercentage = document.getElementById('buyerPercentage');
        
        const totalFee = 2.5; // 2.5% total
        const sellerSplit = parseFloat(slider.value);
        const buyerSplit = totalFee - sellerSplit;
        
        sellerPercentage.textContent = sellerSplit.toFixed(1);
        buyerPercentage.textContent = buyerSplit.toFixed(1);
        
        // Update visual bar
        const sellerWidth = (sellerSplit / totalFee) * 100;
        const buyerWidth = (buyerSplit / totalFee) * 100;
        
        document.getElementById('feeBarSeller').style.width = `${sellerWidth}%`;
        document.getElementById('feeBarBuyer').style.width = `${buyerWidth}%`;
        
        // Update fee amounts
        const listPrice = this.getListPrice();
        document.getElementById('sellerFeeCustom').textContent = 
            `$${Math.round(listPrice * sellerSplit / 100).toLocaleString()}`;
        document.getElementById('buyerFeeCustom').textContent = 
            `$${Math.round(listPrice * buyerSplit / 100).toLocaleString()}`;
        
        // Update buyer impact warning
        let impactText = '';
        if (buyerSplit === 0) {
            impactText = '✅ Maximum buyer interest';
        } else if (buyerSplit <= 0.5) {
            impactText = '✅ Minimal impact on buyer interest';
        } else if (buyerSplit <= 1) {
            impactText = '⚠️ Estimated 10-15% reduction in buyer interest';
        } else if (buyerSplit <= 1.5) {
            impactText = '⚠️ Estimated 15-25% reduction in buyer interest';
        } else {
            impactText = '🚨 Estimated 25-40% reduction in buyer interest';
        }
        document.getElementById('buyerImpact').textContent = impactText;
        
        this.updatePayoutCalculator();
    }

    getListPrice() {
        const listPriceInput = document.getElementById('listPrice');
        if (!listPriceInput) return 485000; // default
        
        const value = listPriceInput.value.replace(/[^\d]/g, '');
        return parseInt(value) || 485000;
    }

    updatePayoutCalculator() {
        const listPrice = this.getListPrice();
        let sellerFee = 0;
        let buyerFee = 0;
        
        // Calculate fees based on selected structure (2.5% total)
        switch(this.selectedFeeStructure) {
            case 'seller-pays-all':
                sellerFee = listPrice * 0.025; // 2.5%
                buyerFee = 0;
                break;
            case 'split-equal':
                sellerFee = listPrice * 0.0125; // 1.25%
                buyerFee = listPrice * 0.0125; // 1.25%
                break;
            case 'custom-split':
                const sellerPercent = parseFloat(document.getElementById('sellerPercentage')?.textContent || 1.25) / 100;
                const buyerPercent = parseFloat(document.getElementById('buyerPercentage')?.textContent || 1.25) / 100;
                sellerFee = listPrice * sellerPercent;
                buyerFee = listPrice * buyerPercent;
                break;
        }
        
        // Update fee displays
        document.getElementById('sellerFeeAll').textContent = `2.5% ($${sellerFee.toLocaleString()})`;
        document.getElementById('sellerFeeHalf').textContent = `1.25% ($${(listPrice * 0.0125).toLocaleString()})`;
        document.getElementById('buyerFeeHalf').textContent = `1.25% ($${(listPrice * 0.0125).toLocaleString()})`;
        
        const closingCosts = listPrice * 0.005; // 0.5% estimated closing costs
        const netProceeds = listPrice - sellerFee - closingCosts;
        const traditionalFee = listPrice * 0.06; // 6% traditional
        const savings = traditionalFee - sellerFee;
        
        // Update payout display
        document.getElementById('salePrice').textContent = `$${listPrice.toLocaleString()}`;
        document.getElementById('yourFeeDeduction').textContent = `-$${sellerFee.toLocaleString()}`;
        document.getElementById('closingCosts').textContent = `-$${closingCosts.toLocaleString()}`;
        document.getElementById('netPayout').textContent = `$${netProceeds.toLocaleString()}`;
        document.getElementById('payoutPercent').textContent = `${((netProceeds / listPrice) * 100).toFixed(1)}%`;
        document.getElementById('totalSavings').textContent = `+$${savings.toLocaleString()}`;
    }

    // =====================================
    // PHOTO UPLOAD
    // =====================================
    setupPhotoUpload() {
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.getElementById('photoUpload');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    handleFiles(files) {
        const maxFiles = 20;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        for (let file of files) {
            if (this.uploadedPhotos.length >= maxFiles) {
                alert(`Maximum ${maxFiles} photos allowed`);
                break;
            }
            
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`);
                continue;
            }
            
            if (file.size > maxSize) {
                alert(`${file.name} is too large. Maximum size is 10MB`);
                continue;
            }
            
            this.uploadedPhotos.push(file);
            this.displayPhoto(file);
        }
        
        this.updatePhotoCount();
    }

    displayPhoto(file) {
        const container = document.getElementById('uploadedPhotos');
        if (!container) return;
        
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <div class="photo-thumbnail">📷</div>
            <div class="photo-info">
                <div class="photo-name">${file.name}</div>
                <div class="photo-size">${(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button type="button" class="photo-remove" onclick="removePhoto(this)">×</button>
        `;
        
        container.appendChild(photoItem);
    }

    updatePhotoCount() {
        const countElement = document.querySelector('.photo-count');
        if (countElement) {
            countElement.textContent = `${this.uploadedPhotos.length} of 20 photos uploaded`;
        }
    }

    // =====================================
    // FORM SUBMISSION - CONNECTS TO YOUR BACKEND!
    // =====================================
    async submitListing() {
        console.log('Starting submission...');
        console.log('API available?', window.youreHomeAPI);
        console.log('Logged in?', window.youreHomeAPI?.isLoggedIn());
        console.log('Current user:', window.youreHomeAPI?.currentUser);
        
        // Check authentication first
        if (!window.youreHomeAPI || !window.youreHomeAPI.isLoggedIn()) {
            alert('Please log in to list your property');
            window.location.href = '/login.html';
            return;
        }
    
        if (!this.validateAllSteps()) {
            alert('Please complete all required fields');
            return;
        }
    
        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '🔄 Publishing...';
        }
    
        try {
            // Collect form data - ALIGNED WITH DATABASE COLUMNS
            const propertyData = {
                // Basic property info
                streetAddress: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zip').value,
                listPrice: parseInt(document.getElementById('listPrice').value.replace(/[^\d]/g, '')),
                bedrooms: parseInt(document.getElementById('bedrooms').value),
                bathrooms: parseFloat(document.getElementById('bathrooms').value),
                squareFeet: parseInt(document.getElementById('sqft').value.replace(/[^\d]/g, '')),
                lotSize: document.getElementById('lotSize').value,
                propertyType: document.getElementById('propertyType').value,
                yearBuilt: parseInt(document.getElementById('yearBuilt').value) || null,
                description: document.getElementById('description').value,
                
                // ALIGNED WITH YOUR DATABASE COLUMNS:
                
                // HVAC - using hvac_install_year (not date)
                hvacType: document.getElementById('hvac_type').value || null,
                hvacInstallYear: document.getElementById('hvac_install_year').value ? 
                    parseInt(document.getElementById('hvac_install_year').value.split('-')[0]) : null,
                
                // Water Heater - using water_heater_year (not date)
                waterHeaterType: document.getElementById('water_heater_type').value || null,
                waterHeaterYear: document.getElementById('water_heater_year').value ? 
                    parseInt(document.getElementById('water_heater_year').value.split('-')[0]) : null,
                
                // Roof - using roof_material and roof_year
                roofMaterial: document.getElementById('roof_material').value || null,
                roofYear: document.getElementById('roof_year').value ? 
                    parseInt(document.getElementById('roof_year').value.split('-')[0]) : null,
                
                // Septic - using existing column names
                hasSeptic: document.getElementById('has_septic').checked,
                septicType: document.getElementById('septic_type').value || null,
                septicLastPumped: document.getElementById('septic_last_pumped').value || null,
                
                // Solar - using existing column names
                hasSolar: document.getElementById('has_solar').checked,
                solarType: document.getElementById('solar_type').value || null, // owned/leased
                solarInstallYear: document.getElementById('solar_install_year').value ? 
                    parseInt(document.getElementById('solar_install_year').value.split('-')[0]) : null,
                solarMonthlySavings: document.getElementById('solar_monthly_savings').value ? 
                    parseFloat(document.getElementById('solar_monthly_savings').value) : null,
                
                // Property condition
                propertyCondition: document.getElementById('property_condition').value || 'move-in-ready',
                majorRepairsNeeded: document.getElementById('major_repairs_needed').value || null,
                
                // Other fields
                propertyTaxAnnual: document.getElementById('propertyTax').value ? 
                    parseFloat(document.getElementById('propertyTax').value.replace(/[^\d]/g, '')) : null,
                hoaFeesMonthly: document.getElementById('hoaFees').value ? 
                    parseFloat(document.getElementById('hoaFees').value.replace(/[^\d]/g, '')) : null,
                allowMessages: document.getElementById('allowMessages') ? 
                    document.getElementById('allowMessages').checked : true,
                minimumOffer: document.getElementById('minimumOffer').value ?
                    parseInt(document.getElementById('minimumOffer').value.replace(/[^\d]/g, '')) : null,
                
                // Features
                garageSpaces: parseInt(document.getElementById('garageSpaces')?.value || 0),
                hasPool: document.getElementById('has_pool')?.checked || false,
                hasFireplace: document.getElementById('has_fireplace')?.checked || false
            };
            
            // Use the API from your api.js file
            console.log('Sending property data:', propertyData);
            const result = await window.youreHomeAPI.createProperty(propertyData, this.uploadedPhotos);
            console.log('API Response:', result);
        
        if (result.success) {
            alert(`🎉 Congratulations! Your property has been listed successfully!`);
            window.location.href = '/seller-dashboard.html';
        } else {
            throw new Error(result.error || 'Failed to create listing');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        alert(`Error: ${error.message || 'Failed to create listing. Please try again.'}`);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Publish Listing';
        }
    }
}

    validateAllSteps() {
        // Validate all required fields across all steps
        const requiredFields = document.querySelectorAll('#propertyForm [required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
            }
        });
        
        // Check minimum photos
        if (this.uploadedPhotos.length < 1) {
            alert('Please upload at least 1 photos');
            return false;
        }
        
        return isValid;
    }

    // =====================================
    // EVENT LISTENERS SETUP
    // =====================================
    setupEventListeners() {
        // Navigation buttons are handled by inline onclick in HTML
        
        // AI Valuation button
        const aiBtn = document.querySelector('.btn-valuation');
        if (aiBtn) {
            aiBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.getHomeValue();
            });
        }

        // Use recommended price button
        const useValuationBtn = document.querySelector('.btn-use-valuation');
        if (useValuationBtn) {
            useValuationBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.useRecommendedPrice();
            });
        }

        // List price changes
        const listPriceInput = document.getElementById('listPrice');
        if (listPriceInput) {
            listPriceInput.addEventListener('input', () => {
                this.updatePayoutCalculator();
            });
        }

        // Character counter for description
        const description = document.getElementById('description');
        if (description) {
            description.addEventListener('input', (e) => {
                const count = e.target.value.length;
                document.getElementById('charCount').textContent = count;
                
                if (count > 2000) {
                    e.target.value = e.target.value.substring(0, 2000);
                    document.getElementById('charCount').textContent = 2000;
                }
            });
        }
    }

    useRecommendedPrice() {
        if (this.recommendedPrice) {
            document.getElementById('listPrice').value = `$${this.recommendedPrice.toLocaleString()}`;
            
            const minimumOffer = Math.round(this.recommendedPrice * 0.95);
            document.getElementById('minimumOffer').value = `$${minimumOffer.toLocaleString()}`;
            
            this.updatePayoutCalculator();
            
            const btn = document.querySelector('.btn-use-valuation');
            const originalText = btn.textContent;
            btn.textContent = '✅ Price Set!';
            btn.style.background = '#22c55e';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.listingForm = new PropertyListingForm();
});

// Helper functions for inline onclick handlers
function nextStep(step) {
    if (window.listingForm) {
        window.listingForm.nextStep();
    }
}

function prevStep(step) {
    if (window.listingForm) {
        window.listingForm.previousStep();
    }
}

function generateHomeValuation() {
    if (window.listingForm) {
        window.listingForm.getHomeValue();
    }
}

function generateDescription() {
    const propertyType = document.getElementById('propertyType').value;
    const bedrooms = document.getElementById('bedrooms').value;
    const bathrooms = document.getElementById('bathrooms').value;
    const sqft = document.getElementById('sqft').value;
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
        .map(cb => cb.value);

    if (!propertyType || !bedrooms || !bathrooms || !sqft) {
        alert('Please fill in basic property details first (property type, bedrooms, bathrooms, square feet)');
        return;
    }

    const descriptions = {
        house: `Welcome to this stunning ${bedrooms}-bedroom, ${bathrooms}-bathroom home featuring ${sqft} square feet of beautifully designed living space.`,
        condo: `Discover urban living at its finest in this elegant ${bedrooms}-bedroom, ${bathrooms}-bathroom condominium spanning ${sqft} square feet.`,
        townhouse: `Experience the perfect blend of privacy and convenience in this spacious ${bedrooms}-bedroom, ${bathrooms}-bathroom townhouse with ${sqft} square feet.`
    };

    let description = descriptions[propertyType] || descriptions.house;
    
    if (features.includes('oceanview')) {
        description += ' Enjoy breathtaking ocean views from multiple rooms throughout the home.';
    }
    if (features.includes('pool')) {
        description += ' The private pool and outdoor space create the perfect setting for entertaining and relaxation.';
    }
    if (features.includes('garage')) {
        description += ' Convenient parking and storage are provided with the attached garage.';
    }
    if (features.includes('fireplace')) {
        description += ' Cozy up by the fireplace during cooler evenings.';
    }

    description += ' This property offers an exceptional opportunity for comfortable living in a desirable location. Schedule your private tour today to experience all this home has to offer.';

    document.getElementById('description').value = description;
    document.getElementById('charCount').textContent = description.length;
}

function useRecommendedPrice() {
    if (window.listingForm) {
        window.listingForm.useRecommendedPrice();
    }
}

function removePhoto(button) {
    const photoItem = button.parentElement;
    const fileName = photoItem.querySelector('.photo-name').textContent;
    
    if (window.listingForm) {
        window.listingForm.uploadedPhotos = window.listingForm.uploadedPhotos.filter(
            file => file.name !== fileName
        );
        window.listingForm.updatePhotoCount();
    }
    
    photoItem.remove();
}

// Functions for checkbox toggles
function toggleSeptic(checkbox) {
    const details = document.getElementById('septic-details');
    if (checkbox.checked) {
        details.classList.add('show');
        details.style.display = 'block';
    } else {
        details.classList.remove('show');
        details.style.display = 'none';
        document.getElementById('septic_last_serviced').value = '';
        document.getElementById('septic_notes').value = '';
    }
}

function toggleSolar(checkbox) {
    const details = document.getElementById('solar-details');
    if (checkbox.checked) {
        details.classList.add('show');
        details.style.display = 'block';
    } else {
        details.classList.remove('show');
        details.style.display = 'none';
        document.getElementById('solar_ownership').value = '';
        document.getElementById('solar_monthly_payment').value = '';
        document.getElementById('solar-payment').style.display = 'none';
    }
}

function toggleSolarPayment(select) {
    const paymentDiv = document.getElementById('solar-payment');
    paymentDiv.style.display = select.value === 'leased' ? 'block' : 'none';
    
    if (select.value !== 'leased') {
        document.getElementById('solar_monthly_payment').value = '';
    }
}

function submitPropertyListing() {

    console.log('Submitting property listing...');
    console.log('Listing form initialized:', window.listingForm);
    if (window.listingForm) {
        window.listingForm.submitListing();
    } else {
        console.error('Form not initialized!');
    }
}