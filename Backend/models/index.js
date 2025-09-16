
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// User Model (assuming you have this)
class User extends Model {}
User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('buyer', 'seller', 'agent', 'admin'),
    defaultValue: 'buyer'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true
});

// Pre-Approval Model
class PreApproval extends Model {}
PreApproval.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Application Data
  annualIncome: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  monthlyDebts: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  creditScore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  downPayment: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  employmentType: {
    type: DataTypes.ENUM('employed', 'self-employed', 'retired', 'other'),
    allowNull: false
  },
  employerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  yearsEmployed: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false
  },
  propertyType: {
    type: DataTypes.ENUM('single-family', 'condo', 'townhouse', 'multi-family'),
    allowNull: false
  },
  occupancyType: {
    type: DataTypes.ENUM('primary', 'secondary', 'investment'),
    allowNull: false
  },
  
  // Approval Details
  maxLoanAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  interestRate: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: false
  },
  monthlyPayment: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  lenderId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lenderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  approvalType: {
    type: DataTypes.ENUM('soft-pull', 'hard-pull', 'verified'),
    defaultValue: 'soft-pull'
  },
  
  // Buyer Rating
  buyerRating: {
    type: DataTypes.ENUM('A+', 'A', 'B+', 'B', 'C'),
    allowNull: false
  },
  
  // Status and Tracking
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'expired', 'revoked'),
    defaultValue: 'pending'
  },
  referenceNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  
  // Validity
  issuedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  // Credit Check Details
  softPullDate: DataTypes.DATE,
  softPullScore: DataTypes.INTEGER,
  hardPullDate: DataTypes.DATE,
  hardPullScore: DataTypes.INTEGER,
  creditReportId: DataTypes.STRING,
  
  // Metadata
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.TEXT,
  source: DataTypes.STRING
}, {
  sequelize,
  modelName: 'PreApproval',
  tableName: 'pre_approvals',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'status'] },
    { fields: ['expiresAt'] },
    { fields: ['referenceNumber'] }
  ]
});

// Pre-Approval Documents Model
class PreApprovalDocument extends Model {}
PreApprovalDocument.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  preApprovalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pre_approvals',
      key: 'id'
    }
  },
  documentType: {
    type: DataTypes.ENUM('pre-approval-letter', 'credit-report', 'income-verification'),
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileName: DataTypes.STRING,
  fileSize: DataTypes.INTEGER,
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'PreApprovalDocument',
  tableName: 'pre_approval_documents',
  timestamps: true
});

// Pre-Approval Usage History Model
class PreApprovalUsage extends Model {}
PreApprovalUsage.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  preApprovalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pre_approvals',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  offerAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  offerDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('submitted', 'accepted', 'rejected', 'withdrawn'),
    defaultValue: 'submitted'
  }
}, {
  sequelize,
  modelName: 'PreApprovalUsage',
  tableName: 'pre_approval_usage',
  timestamps: true
});

// Property Model (basic structure)
class Property extends Model {}
Property.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: DataTypes.STRING,
  price: DataTypes.DECIMAL(12, 2),
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  state: DataTypes.STRING,
  zipCode: DataTypes.STRING,
  bedrooms: DataTypes.INTEGER,
  bathrooms: DataTypes.DECIMAL(3, 1),
  squareFeet: DataTypes.INTEGER,
  listingStatus: {
    type: DataTypes.ENUM('active', 'pending', 'sold'),
    defaultValue: 'active'
  }
}, {
  sequelize,
  modelName: 'Property',
  tableName: 'properties',
  timestamps: true
});

// Offer Model
class Offer extends Model {}
Offer.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  preApprovalId: {
    type: DataTypes.UUID,
    references: {
      model: 'pre_approvals',
      key: 'id'
    }
  },
  buyerRating: {
    type: DataTypes.ENUM('A+', 'A', 'B+', 'B', 'C'),
    allowNull: true
  },
  isPreApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'countered', 'withdrawn'),
    defaultValue: 'pending'
  },
  earnestMoney: DataTypes.DECIMAL(10, 2),
  closingDate: DataTypes.DATE,
  contingencies: DataTypes.ARRAY(DataTypes.STRING),
  message: DataTypes.TEXT
}, {
  sequelize,
  modelName: 'Offer',
  tableName: 'offers',
  timestamps: true
});

// Define Associations
PreApproval.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(PreApproval, { foreignKey: 'userId', as: 'preApprovals' });

PreApproval.hasMany(PreApprovalDocument, { foreignKey: 'preApprovalId', as: 'documents' });
PreApprovalDocument.belongsTo(PreApproval, { foreignKey: 'preApprovalId' });

PreApproval.hasMany(PreApprovalUsage, { foreignKey: 'preApprovalId', as: 'usageHistory' });
PreApprovalUsage.belongsTo(PreApproval, { foreignKey: 'preApprovalId' });

Offer.belongsTo(PreApproval, { foreignKey: 'preApprovalId', as: 'preApproval' });
Offer.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Offer.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

module.exports = {
  sequelize,
  User,
  PreApproval,
  PreApprovalDocument,
  PreApprovalUsage,
  Property,
  Offer
};