// =====================================
// PROPERTY DETAILS - COMPLETE BUY FUNCTIONALITY
// File: js/components/property-details.js
// =====================================

// Global state for the property detail page
let isPreApproved = false;
let hasSubmittedOffer = false;
let sellerAllowsMessages = true; // This would come from property data
let userPreapprovalAmount = 0;
let userLenderName = '';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Property details page loaded');
    initializePropertyPage();
});

function initializePropertyPage() {
    // Photo gallery interactions
    initPhotoGallery();
    
    // Pre-approval system
    initPreApprovalSystem();
    
    // Action bar buttons
    initActionButtons();
    
    // Photo controls
    initPhotoControls();
    
    console.log('Property page initialized successfully');
}

// =====================================
// PHOTO GALLERY FUNCTIONALITY
// =====================================
function initPhotoGallery() {
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', function() {
            // Remove active class from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Update main photo (in a real app, you'd change the image source)
            console.log(`Switched to photo ${index + 1}`);
        });
    });
}

function initPhotoControls() {
    const photoControls = document.querySelectorAll('.photo-btn');
    
    photoControls.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.textContent.trim();
            
            if (text.includes('All Photos')) {
                showPhotoGallery();
            } else if (text.includes('Virtual Tour')) {
                showVirtualTour();
            }
        });
    });
}

function showPhotoGallery() {
    alert('📷 Opening full photo gallery...\n\nThis would show all 12 property photos in a lightbox gallery with:\n• High-resolution images\n• Zoom functionality\n• Slideshow controls\n• Room-by-room navigation');
}

function showVirtualTour() {
    alert('🎥 Opening virtual tour...\n\nThis would launch an immersive 3D virtual tour featuring:\n• 360° room views\n• Interactive hotspots\n• Floor plan overlay\n• Measurement tools');
}

// =====================================
// PRE-APPROVAL SYSTEM
// =====================================
function initPreApprovalSystem() {
    const preapprovalBtn = document.getElementById('preapprovalBtn');
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    const messageBtn = document.getElementById('messageBtn');

    // ✅ Restore pre-approval state from localStorage if present
    if (localStorage.getItem('preapprovalStatus') === 'approved') {
        isPreApproved = true;
        userPreapprovalAmount = parseInt(localStorage.getItem('preapprovalAmount')) || 0;
        userLenderName = localStorage.getItem('preapprovalLender') || '';

        // Update UI to show preapproval status
        const approvalIndicator = document.getElementById('approvalIndicator');
        const approvalStatus = document.getElementById('approvalStatus');
        const approvalSubtext = document.getElementById('approvalSubtext');

        if (approvalIndicator) approvalIndicator.classList.add('approved');
        if (approvalStatus) approvalStatus.textContent = `Pre-approved for $${userPreapprovalAmount.toLocaleString()}`;
        if (approvalSubtext) approvalSubtext.textContent = `Great! You can now make offers with intelligent analysis. Approval expires March 15, 2025.`;

        if (preapprovalBtn) preapprovalBtn.textContent = '✅ View Approval Details';
    }

    // ✅ Ensure action buttons reflect current state
    updateButtonStates(); // <-- MOVE THIS HERE to make the buttons clickable now

    if (preapprovalBtn) {
        preapprovalBtn.addEventListener('click', handlePreApprovalClick);
    }
}


function handlePreApprovalClick() {
    if (!isPreApproved) {
        showPreApprovalOptions();
    } else {
        showApprovalDetails();
    }
}

function showPreApprovalOptions() {
    const choice = confirm(`🏦 PRE-APPROVAL OPTIONS

Choose how you'd like to proceed:

OK = Get pre-approved through our partner lenders
Cancel = Upload existing pre-approval letter

Both options will enable you to make offers with intelligent analysis!`);
    
    if (choice) {
        startLenderPreApproval();
    } else {
        uploadExistingLetter();
    }
}

function startLenderPreApproval() {
    const userZip = prompt('Enter your ZIP code to find local mortgage brokers:', '08401');
    
    if (userZip) {
        showLenderOptions(userZip);
    }
}

function showLenderOptions(zipCode) {
    alert(`🏦 Connecting you with pre-approved lenders in ${zipCode}...

We're partnering with:
• Atlantic Mortgage Group ⭐⭐⭐⭐⭐
• Shore Financial Partners ⭐⭐⭐⭐⭐
• First Home Lending ⭐⭐⭐⭐⭐

Benefits:
✅ Quick 15-minute pre-approval
✅ Competitive rates starting at 6.75%
✅ No upfront fees
✅ Instant offer capability

They'll contact you within 24 hours for a quick pre-approval!`);
    
    // Simulate approval process
    setTimeout(() => {
        simulatePreApproval('Atlantic Mortgage Group', 650000);
    }, 2000);
}

function uploadExistingLetter() {
    alert(`📎 UPLOAD PRE-APPROVAL LETTER

Click "Choose File" to upload your existing pre-approval letter.

Accepted formats: PDF, JPG, PNG
Max file size: 10MB

We'll verify your letter and enable offer submission within 1 hour.

This would open a file upload dialog.`);
    
    // Simulate upload and verification
    setTimeout(() => {
        const confirmed = confirm('Letter uploaded successfully!\n\nWould you like us to extract the approval details automatically?');
        if (confirmed) {
            simulatePreApproval('Your Existing Lender', 750000);
        }
    }, 1000);
}

function simulatePreApproval(lenderName = 'Atlantic Mortgage Group', amount = 650000) {
    isPreApproved = true;
    userPreapprovalAmount = amount;
    userLenderName = lenderName;
    
    // Store in localStorage
    localStorage.setItem('preapprovalStatus', 'approved');
    localStorage.setItem('preapprovalAmount', amount);
    localStorage.setItem('preapprovalLender', lenderName);
    
    
    // Update UI elements
    const approvalIndicator = document.getElementById('approvalIndicator');
    const approvalStatus = document.getElementById('approvalStatus');
    const approvalSubtext = document.getElementById('approvalSubtext');
    const preapprovalBtn = document.getElementById('preapprovalBtn');
    
    if (approvalIndicator) approvalIndicator.classList.add('approved');
    if (approvalStatus) approvalStatus.textContent = `Pre-approved for $${amount.toLocaleString()}`;
    if (approvalSubtext) approvalSubtext.textContent = `Great! You can now make offers with intelligent analysis. Approval expires March 15, 2025.`;
    if (preapprovalBtn) preapprovalBtn.textContent = '✅ View Approval Details';
    
    // Enable make offer button
    updateButtonStates();
    
    // Show success message
    showNotification(`🎉 Pre-approved for $${amount.toLocaleString()}!`, 'success');
}

function showApprovalDetails() {
    alert(`✅ Your Pre-Approval Details

Approval Amount: $${userPreapprovalAmount.toLocaleString()}
Lender: ${userLenderName}
Rate: 6.75% (30-year fixed)
Approval Expires: March 15, 2025

Status: ✅ ACTIVE
Credit Score: 740+
Debt-to-Income: 28%

You can now make offers with intelligent market analysis!`);
}

// =====================================
// OFFER SUBMISSION SYSTEM - MODAL VERSION
// Replace your entire OFFER SUBMISSION SYSTEM section with this
// =====================================

let currentModalOffer = 0;

function initActionButtons() {
    // Handle main action buttons (Make Offer, Message Seller)
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    const messageBtn = document.getElementById('messageBtn');
    
    if (makeOfferBtn) {
        makeOfferBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.classList.contains('disabled')) {
                showOfferForm(); // This now opens the modal
            } else {
                showPreApprovalRequired();
            }
        });
    }
    
    if (messageBtn) {
        messageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.classList.contains('disabled')) {
                showMessageForm();
            } else {
                showOfferRequired();
            }
        });
    }
    
    // Handle secondary action buttons
    const actionBarButtons = document.querySelectorAll('.action-btn-bar');
    actionBarButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            handleActionButtonClick(this);
        });
    });
    
    // Close modal when clicking outside
    const modal = document.getElementById('offerModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeOfferModal();
            }
        });
    }
    
    // Handle escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOfferModal();
        }
    });
}

function handleActionButtonClick(button) {
    const text = button.textContent.trim();
    
    if (button.classList.contains('disabled')) {
        handleDisabledButtonClick(button, text);
        return;
    }
    
    if (text.includes('Schedule Tour')) {
        schedulePropertyTour();
    } else if (text.includes('Save Property')) {
        saveProperty(button);
    } else if (text.includes('Share')) {
        shareProperty();
    }
}

function handleDisabledButtonClick(button, text) {
    if (text.includes('Make Offer')) {
        showPreApprovalRequired();
    } else if (text.includes('Message')) {
        showOfferRequired();
    }
}

function showPreApprovalRequired() {
    const popup = `🔒 PRE-APPROVAL REQUIRED

To make an offer on this property, you need to get pre-approved first.

Why pre-approval is required:
✓ Shows sellers you're a serious buyer
✓ Proves you can afford the property  
✓ Speeds up the closing process
✓ Gives you negotiating power

Ready to get started?`;
    
    alert(popup);
    
    // Highlight the pre-approval button
    const preapprovalBtn = document.getElementById('preapprovalBtn');
    if (preapprovalBtn) {
        preapprovalBtn.style.animation = 'pulse 2s infinite';
        preapprovalBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            preapprovalBtn.style.animation = '';
        }, 4000);
    }
}

function showOfferRequired() {
    alert(`🔒 SUBMIT AN OFFER FIRST

To message Sarah Johnson directly, you need to submit an offer first.

Why this protects sellers:
✓ Reduces spam and tire-kickers
✓ Ensures only serious buyers make contact
✓ Creates more meaningful conversations
✓ Saves everyone's time

Submit a competitive offer to unlock direct messaging!`);
}

// =====================================
// BEAUTIFUL MODAL OFFER SYSTEM
// =====================================

function showOfferForm() {
    if (!isPreApproved) {
        showPreApprovalRequired();
        return;
    }
    
    // Show the modal
    const modal = document.getElementById('offerModal');
    modal.classList.add('show');
    
    // Populate modal with user's pre-approval info
    document.getElementById('modalApprovalAmount').textContent = 
        `Pre-approved for $${userPreapprovalAmount.toLocaleString()}`;
    document.getElementById('modalApprovalLender').textContent = userLenderName;
    document.getElementById('modalMaxOffer').textContent = 
        `$${userPreapprovalAmount.toLocaleString()}`;
    
    // Reset modal state
    currentModalOffer = 0;
    document.getElementById('customOfferInput').value = '';
    document.getElementById('offerAnalysis').classList.remove('show');
    document.getElementById('submitOfferBtn').disabled = true;
    
    // Remove selected state from quick offer buttons
    document.querySelectorAll('.quick-offer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function closeOfferModal() {
    const modal = document.getElementById('offerModal');
    modal.classList.remove('show');
    currentModalOffer = 0;
}

function selectQuickOffer(amount) {
    // Remove selected state from all buttons
    document.querySelectorAll('.quick-offer-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected state to clicked button
    event.target.closest('.quick-offer-btn').classList.add('selected');
    
    // Clear custom input
    document.getElementById('customOfferInput').value = '';
    
    // Set current offer and analyze
    currentModalOffer = amount;
    analyzeOfferAmount();
    
    // Enable submit button
    document.getElementById('submitOfferBtn').disabled = false;
}

function analyzeOfferAmount() {
    const customInput = document.getElementById('customOfferInput');
    let offerAmount = currentModalOffer;
    
    // If there's a custom input, use that instead
    if (customInput.value) {
        offerAmount = parseInt(customInput.value.replace(/[^\d]/g, ''));
        currentModalOffer = offerAmount;
        
        // Remove selected state from quick offer buttons
        document.querySelectorAll('.quick-offer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
    
    if (!offerAmount || offerAmount < 100000) {
        document.getElementById('offerAnalysis').classList.remove('show');
        document.getElementById('submitOfferBtn').disabled = true;
        return;
    }
    
    // Check if offer exceeds pre-approval
    if (offerAmount > userPreapprovalAmount) {
        document.getElementById('offerAnalysis').classList.remove('show');
        document.getElementById('submitOfferBtn').disabled = true;
        
        // Show error styling
        customInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            customInput.style.borderColor = '';
        }, 2000);
        return;
    }
    
    // Analyze offer strength
    const analysis = analyzeOffer(offerAmount);
    
    // Update analysis display
    document.getElementById('strengthIcon').textContent = analysis.icon;
    document.getElementById('strengthBadge').textContent = analysis.strength;
    document.getElementById('strengthBadge').className = `strength-badge ${analysis.strength.toLowerCase()}`;
    document.getElementById('listPercent').textContent = `${analysis.percentOfList}%`;
    document.getElementById('compPercent').textContent = `${analysis.percentOfComps}%`;
    document.getElementById('adviceText').textContent = analysis.advice;
    
    // Show analysis
    document.getElementById('offerAnalysis').classList.add('show');
    document.getElementById('submitOfferBtn').disabled = false;
}

function formatCurrency(input) {
    // Remove non-digits
    let value = input.value.replace(/[^\d]/g, '');
    
    // Format with commas
    if (value) {
        value = parseInt(value).toLocaleString();
        input.value = value;
    }
    
    // Trigger analysis
    analyzeOfferAmount();
}

function submitOfferFromModal() {
    if (!currentModalOffer) return;
    
    const analysis = analyzeOffer(currentModalOffer);
    
    // Close modal
    closeOfferModal();
    
    // Show confirmation dialog
    const confirmationMessage = `🏠 CONFIRM YOUR OFFER

Property: 123 Ocean View Drive
Your Offer: $${currentModalOffer.toLocaleString()}
Strength: ${analysis.icon} ${analysis.strength}

OFFER DETAILS:
• Financing: Pre-approved (${userLenderName})
• Earnest Money: $${Math.round(currentModalOffer * 0.01).toLocaleString()} (1%)
• Inspection Period: 10 days
• Closing: 30 days

This offer will be legally binding if accepted by the seller.

Submit this ${analysis.strength.toLowerCase()} offer?`;
    
    const confirmed = confirm(confirmationMessage);
    
    if (confirmed) {
        submitOffer(currentModalOffer, analysis);
    } else {
        // Reopen modal if they cancel
        showOfferForm();
    }
}

// =====================================
// OFFER ANALYSIS FUNCTION (KEEP THIS)
// =====================================

function analyzeOffer(offerAmount, listPrice = 485000) {
    // Comparable sales data for analysis
    const comps = [
        { address: "125 Ocean View Drive", price: 475000, beds: 3, baths: 2, sqft: 1800 },
        { address: "121 Ocean View Drive", price: 495000, beds: 3, baths: 2.5, sqft: 1900 },
        { address: "119 Ocean View Drive", price: 425000, beds: 2, baths: 2, sqft: 1650 }
    ];
    
    const avgCompPrice = comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length;
    const percentOfList = (offerAmount / listPrice) * 100;
    const percentOfComps = (offerAmount / avgCompPrice) * 100;
    
    let strength, color, icon, advice;
    
    if (offerAmount < 460000) {
        strength = "WEAK";
        color = "#ef4444";
        icon = "🔴";
        advice = "This offer is significantly below market value. Consider increasing to be competitive.";
    } else if (offerAmount < 470000) {
        strength = "FAIR";
        color = "#f59e0b";
        icon = "🟡";
        advice = "This offer is below list price but within range. You may face competition.";
    } else if (offerAmount < 485000) {
        strength = "COMPETITIVE";
        color = "#22c55e";
        icon = "🟢";
        advice = "Strong offer that should get serious consideration from the seller.";
    } else if (offerAmount <= 500000) {
        strength = "VERY STRONG";
        color = "#16a34a";
        icon = "🔥";
        advice = "Excellent offer! This should stand out among other offers.";
    } else {
        strength = "EXCEPTIONALLY STRONG";
        color = "#15803d";
        icon = "⭐";
        advice = "Outstanding offer that will likely be accepted quickly.";
    }
    
    return {
        strength,
        color,
        icon,
        advice,
        percentOfList: percentOfList.toFixed(1),
        percentOfComps: percentOfComps.toFixed(1),
        avgCompPrice
    };
}

// =====================================
// FINAL SUBMISSION FUNCTION (KEEP THIS)
// =====================================

function submitOffer(offer, analysis) {
    hasSubmittedOffer = true;
    
    // Enable messaging
    enableMessaging();
    
    // Show success message
    const successMessage = `✅ OFFER SUBMITTED SUCCESSFULLY!

Your ${analysis.icon} ${analysis.strength} offer of $${offer.toLocaleString()} has been sent to Sarah Johnson.

WHAT HAPPENS NEXT:
• Sarah will review your offer within 24 hours
• You'll get a notification of her response
• Direct messaging is now unlocked
• You can track offer status in your dashboard

🎉 You can now message Sarah directly to discuss your offer!`;
    
    alert(successMessage);
    showNotification('Offer submitted successfully!', 'success');
}

// =====================================
// MESSAGING SYSTEM
// =====================================
function enableMessaging() {
    const messageBtn = document.getElementById('messageBtn');
    if (messageBtn && sellerAllowsMessages) {
        messageBtn.classList.remove('disabled');
        messageBtn.removeAttribute('data-tooltip');
        messageBtn.textContent = '💬 Message Sarah';
    }
}

function showMessageForm() {
    if (!hasSubmittedOffer) {
        showOfferRequired();
        return;
    }
    
    const message = prompt(`💬 Message Sarah Johnson:

Type your message:`, '');
    
    if (message && message.trim()) {
        sendMessage(message);
    }
}

function sendMessage(message) {
    alert(`✅ Message sent to Sarah Johnson!

Your message: "${message}"

Sarah will receive an email notification and can respond directly through the platform. You'll be notified when she replies.`);
    
    showNotification('Message sent!', 'success');
}

// =====================================
// OTHER PROPERTY ACTIONS
// =====================================
function schedulePropertyTour() {
    alert(`📅 Opening tour scheduler...

Available times this week:
• Today 2:00 PM ✅
• Tomorrow 10:00 AM ✅
• Tomorrow 4:00 PM ✅
• Saturday 11:00 AM ✅

This would open Sarah's calendar booking system where you can:
✓ Select preferred time slots
✓ Add special requests
✓ Get instant confirmation
✓ Receive calendar invites`);
}

function saveProperty(button) {
    button.textContent = '❤️ Saved!';
    button.style.background = '#22c55e';
    button.style.borderColor = '#16a34a';
    button.style.color = 'white';
    
    showNotification('Property saved to favorites!', 'success');
    
    setTimeout(() => {
        button.textContent = '❤️ Save Property';
        button.style.background = '';
        button.style.borderColor = '';
        button.style.color = '';
    }, 2000);
}

function shareProperty() {
    const shareData = {
        title: '123 Ocean View Drive - $485,000',
        text: 'Check out this amazing oceanfront property in Atlantic City!',
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData);
    } else {
        // Fallback for browsers without Web Share API
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Property link copied to clipboard!', 'success');
        });
    }
}

// =====================================
// BUTTON STATE MANAGEMENT
// =====================================
function updateButtonStates() {
    const makeOfferBtn = document.getElementById('makeOfferBtn');
    const messageBtn = document.getElementById('messageBtn');
    
    // Update make offer button
    if (makeOfferBtn) {
        if (isPreApproved) {
            makeOfferBtn.classList.remove('disabled');
            makeOfferBtn.removeAttribute('disabled'); // ← ADD THIS LINE
            makeOfferBtn.removeAttribute('data-tooltip');
        } else {
            makeOfferBtn.classList.add('disabled');
            makeOfferBtn.setAttribute('disabled', 'true'); // ← ADD THIS LINE
            makeOfferBtn.setAttribute('data-tooltip', 'Get pre-approved first - Upload letter or use our lenders');
        }
    }
    
    // Update message button
    if (messageBtn) {
        if (hasSubmittedOffer && sellerAllowsMessages) {
            messageBtn.classList.remove('disabled');
            messageBtn.removeAttribute('disabled'); // ← ADD THIS LINE
            messageBtn.removeAttribute('data-tooltip');
            messageBtn.textContent = '💬 Message Sarah';
        } else {
            messageBtn.classList.add('disabled');
            messageBtn.setAttribute('disabled', 'true'); // ← ADD THIS LINE
            messageBtn.setAttribute('data-tooltip', 'Submit an offer first to unlock direct messaging');
        }
    }
}

// =====================================
// UTILITY FUNCTIONS
// =====================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#0ea5e9'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// =====================================
// DEBUGGING HELPERS
// =====================================
function debugPropertyPage() {
    console.log('Property Page Debug Info:');
    console.log('- Is Pre-approved:', isPreApproved);
    console.log('- Has Submitted Offer:', hasSubmittedOffer);
    console.log('- Seller Allows Messages:', sellerAllowsMessages);
    console.log('- Pre-approval Amount:', userPreapprovalAmount);
    console.log('- Lender Name:', userLenderName);
}

// Export for console debugging
function resetPreApproval() {
    localStorage.removeItem('preapprovalStatus');
    localStorage.removeItem('preapprovalAmount');
    localStorage.removeItem('preapprovalLender');
    location.reload(); // Refreshes the page to reset UI
}

window.resetPreApproval = resetPreApproval; // Now callable from DevTools

window.debugPropertyPage = debugPropertyPage;