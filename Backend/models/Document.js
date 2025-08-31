const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['LOI', 'PURCHASE_AGREEMENT', 'ADDENDUM'],
    required: true,
    default: 'LOI'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'signed', 'accepted', 'rejected', 'expired', 'completed'],
    default: 'draft'
  },
  
  // Parties involved
  buyer: {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    type: { type: String, enum: ['individual', 'company'], default: 'individual' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  seller: {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    type: { type: String, enum: ['individual', 'company'], default: 'individual' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Property details
  property: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: String,
    legalDescription: String,
    parcelNumber: String,
    county: String,
    propertyType: {
      type: String,
      enum: ['residential', 'commercial', 'land', 'multi-family', 'industrial'],
      default: 'residential'
    }
  },
  
  // Financial terms
  financial: {
    purchasePrice: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    financingRequired: { type: Boolean, default: true },
    financingAmount: Number,
    interestRate: Number,
    loanTermYears: Number,
    downPayment: Number,
    closingCosts: Number,
    escrowAmount: Number
  },
  
  // Important dates
  dates: {
    letterDate: { type: Date, default: Date.now },
    possessionDate: Date,
    closingDate: Date,
    inspectionDeadline: Date,
    financingDeadline: Date,
    conditionsDeadline: Date,
    standStillEndDate: Date,
    expirationDate: Date
  },
  
  // Terms and conditions
  terms: {
    deedType: { type: String, enum: ['warranty', 'special', 'quitclaim'], default: 'special' },
    includedItems: String,
    excludedItems: String,
    saleContingency: Boolean,
    inspectionContingency: Boolean,
    financingContingency: Boolean,
    appraisalContingency: Boolean,
    standStillProvision: Boolean,
    exclusiveNegotiation: Boolean,
    propertyRestrictions: String,
    additionalProvisions: String,
    specialConditions: [String]
  },
  
  // Document tracking
  tracking: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    sentAt: Date,
    viewedAt: Date,
    firstViewedAt: Date,
    signedAt: Date,
    completedAt: Date,
    viewCount: { type: Number, default: 0 },
    ipAddress: String,
    userAgent: String
  },
  
  // Files and attachments
  files: {
    pdfPath: String,
    pdfUrl: String,
    attachments: [{
      name: String,
      path: String,
      type: String,
      size: Number,
      uploadedAt: Date
    }]
  },
  
  // Communication history
  communications: [{
    type: { type: String, enum: ['email', 'sms', 'in-app', 'phone'] },
    direction: { type: String, enum: ['sent', 'received'] },
    recipient: String,
    subject: String,
    message: String,
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Signatures
  signatures: {
    buyer: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      ipAddress: String,
      signatureData: String
    },
    seller: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      ipAddress: String,
      signatureData: String
    }
  },
  
  // Metadata
  metadata: {
    version: { type: Number, default: 1 },
    source: { type: String, default: 'web' },
    referrer: String,
    campaign: String,
    notes: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
DocumentSchema.index({ 'buyer.email': 1 });
DocumentSchema.index({ 'seller.email': 1 });
DocumentSchema.index({ 'property.address': 1 });
DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ 'dates.expirationDate': 1 });

// Virtual for document age
DocumentSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiration
DocumentSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.dates.expirationDate) return null;
  return Math.floor((this.dates.expirationDate - Date.now()) / (1000 * 60 * 60 * 24));
});

// Instance methods
DocumentSchema.methods.markAsViewed = function(ipAddress, userAgent) {
  this.tracking.viewCount += 1;
  if (!this.tracking.firstViewedAt) {
    this.tracking.firstViewedAt = new Date();
    this.status = 'viewed';
  }
  this.tracking.viewedAt = new Date();
  this.tracking.ipAddress = ipAddress;
  this.tracking.userAgent = userAgent;
  return this.save();
};

DocumentSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.tracking.sentAt = new Date();
  return this.save();
};

DocumentSchema.methods.addCommunication = function(comm) {
  this.communications.push(comm);
  return this.save();
};

// Static methods
DocumentSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort('-createdAt');
};

DocumentSchema.statics.findExpiring = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'dates.expirationDate': {
      $gte: new Date(),
      $lte: futureDate
    },
    status: { $nin: ['completed', 'rejected', 'expired'] }
  });
};

module.exports = mongoose.model('Document', DocumentSchema);