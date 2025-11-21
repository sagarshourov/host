// controllers/titleSearchController.js
const TitleSearch = require('../models/titleSearch/TitleSearch');
const TitleIssue = require('../models/titleSearch/TitleIssue');
const TitleCommitment = require('../models/titleSearch/TitleCommitment');
const TitleInsurance = require('../models/titleSearch/TitleInsurance');
const Transaction = require('../models/titleSearch/Transaction');
const TitleCompany = require('../models/titleSearch/TitleCompany');

// Order title search automatically
exports.orderTitleSearch = async (req, res) => {
  try {
    const { transactionId } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        message: 'Transaction not found' 
      });
    }

    // Check if title search already exists for this transaction
    const existingSearch = await TitleSearch.findByTransactionId(transactionId);
    if (existingSearch) {
      return res.status(400).json({
        success: false,
        message: 'Title search already exists for this transaction'
      });
    }

    // Auto-select title company
    const titleCompany = await TitleCompany.findDefault();
    if (!titleCompany) {
      return res.status(404).json({
        success: false,
        message: 'No title company available'
      });
    }
    
    const titleSearch = await TitleSearch.create({
      transaction_id: transactionId,
      title_company_id: titleCompany.id,
      status: 'ordered'
    });

    // Simulate title search process
    setTimeout(async () => {
      await simulateTitleSearch(titleSearch.id, transaction.property_id);
    }, 2000);

    res.status(201).json({
      success: true,
      data: titleSearch,
      message: 'Title search ordered successfully'
    });
  } catch (error) {
    console.error('Order title search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get title search details
exports.getTitleSearch = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const titleSearch = await TitleSearch.findByTransactionId(transactionId);
    if (!titleSearch) {
      return res.status(404).json({ 
        success: false,
        message: 'Title search not found for this transaction' 
      });
    }

    const issues = await TitleIssue.findByTitleSearchId(titleSearch.id);
    const commitment = await TitleCommitment.findByTitleSearchId(titleSearch.id);
    const insurance = await TitleInsurance.findByTransactionId(transactionId);

    res.json({
      success: true,
      data: {
        titleSearch,
        issues,
        commitment,
        insurance
      }
    });
  } catch (error) {
    console.error('Get title search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update title search status
exports.updateTitleSearchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['ordered', 'in_progress', 'issues_found', 'clear', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const titleSearch = await TitleSearch.updateStatus(id, status);
    if (!titleSearch) {
      return res.status(404).json({
        success: false,
        message: 'Title search not found'
      });
    }

    res.json({
      success: true,
      data: titleSearch,
      message: 'Title search status updated successfully'
    });
  } catch (error) {
    console.error('Update title search status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add title issue
exports.addTitleIssue = async (req, res) => {
  try {
    const { titleSearchId } = req.params;
    const { issue_type, description, severity = 'medium' } = req.body;

    if (!issue_type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Issue type and description are required'
      });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity level'
      });
    }

    // Verify title search exists
    const titleSearch = await TitleSearch.findById(titleSearchId);
    if (!titleSearch) {
      return res.status(404).json({
        success: false,
        message: 'Title search not found'
      });
    }

    const issue = await TitleIssue.create({
      title_search_id: titleSearchId,
      issue_type,
      description,
      severity
    });

    // Update title search status if this is the first issue
    if (titleSearch.status === 'clear' || titleSearch.status === 'completed') {
      await TitleSearch.updateStatus(titleSearchId, 'issues_found');
    }

    res.status(201).json({
      success: true,
      data: issue,
      message: 'Title issue added successfully'
    });
  } catch (error) {
    console.error('Add title issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Resolve title issue
exports.resolveTitleIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes) {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes are required'
      });
    }

    const issue = await TitleIssue.resolve(issueId, resolution_notes);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Title issue not found'
      });
    }

    // Check if all issues are resolved for this title search
    const unresolvedIssues = await TitleIssue.findUnresolved(issue.title_search_id);

    if (unresolvedIssues.length === 0) {
      await TitleSearch.updateStatus(issue.title_search_id, 'clear');
    }

    res.json({
      success: true,
      data: issue,
      message: 'Title issue resolved successfully'
    });
  } catch (error) {
    console.error('Resolve title issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create title commitment
exports.createTitleCommitment = async (req, res) => {
  try {
    const { titleSearchId } = req.params;
    const {
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      commitment_document_url
    } = req.body;

    if (!commitment_number || !issue_date || !effective_date || !policy_amount) {
      return res.status(400).json({
        success: false,
        message: 'Commitment number, issue date, effective date, and policy amount are required'
      });
    }

    // Verify title search exists and is clear
    const titleSearch = await TitleSearch.findById(titleSearchId);
    if (!titleSearch) {
      return res.status(404).json({
        success: false,
        message: 'Title search not found'
      });
    }

    // Check if title has unresolved issues
    const unresolvedIssues = await TitleIssue.findUnresolved(titleSearchId);
    if (unresolvedIssues.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create commitment with unresolved title issues'
      });
    }

    const commitment = await TitleCommitment.create({
      title_search_id: titleSearchId,
      commitment_number,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount: premium_amount || 0,
      commitment_document_url,
      status: 'pending_review'
    });

    // Update title search status
    await TitleSearch.updateStatus(titleSearchId, 'commitment_ready');

    res.status(201).json({
      success: true,
      data: commitment,
      message: 'Title commitment created successfully'
    });
  } catch (error) {
    console.error('Create title commitment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Approve title commitment
exports.approveTitleCommitment = async (req, res) => {
  try {
    const { commitmentId } = req.params;

    const commitment = await TitleCommitment.approve(commitmentId);
    if (!commitment) {
      return res.status(404).json({
        success: false,
        message: 'Title commitment not found'
      });
    }
    
    // Update title search status
    await TitleSearch.updateStatus(commitment.title_search_id, 'commitment_approved');

    res.json({
      success: true,
      data: commitment,
      message: 'Title commitment approved successfully'
    });
  } catch (error) {
    console.error('Approve title commitment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Issue title insurance
exports.issueTitleInsurance = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const {
      policy_number,
      policy_type = "owner's",
      issue_date,
      effective_date,
      policy_amount,
      premium_amount,
      coverage_details = {},
      policy_document_url
    } = req.body;

    if (!policy_number || !issue_date || !effective_date || !policy_amount) {
      return res.status(400).json({
        success: false,
        message: 'Policy number, issue date, effective date, and policy amount are required'
      });
    }

    // Verify transaction exists
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if title commitment is approved
    const titleSearch = await TitleSearch.findByTransactionId(transactionId);
    if (!titleSearch || titleSearch.status !== 'commitment_approved') {
      return res.status(400).json({
        success: false,
        message: 'Title commitment must be approved before issuing insurance'
      });
    }

    const insurance = await TitleInsurance.create({
      transaction_id: transactionId,
      policy_number,
      policy_type,
      issue_date,
      effective_date,
      policy_amount,
      premium_amount: premium_amount || 0,
      coverage_details,
      policy_document_url,
      status: 'issued'
    });

    // Update transaction phase
    await Transaction.updatePhase(transactionId, 'title_insurance_issued');

    res.status(201).json({
      success: true,
      data: insurance,
      message: 'Title insurance issued successfully'
    });
  } catch (error) {
    console.error('Issue title insurance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get title insurance policy
exports.getTitleInsurancePolicy = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const insurance = await TitleInsurance.findByTransactionId(transactionId);
    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Title insurance policy not found for this transaction'
      });
    }

    res.json({
      success: true,
      data: insurance
    });
  } catch (error) {
    console.error('Get title insurance policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper functions


async function checkForCommonTitleIssues(propertyId) {
  // This would integrate with actual title search services
  // For demo purposes, return some simulated issues occasionally
  const issues = [];
  
  // 30% chance of having issues for demo
  if (Math.random() < 0.3) {
    const commonIssueTypes = [
      {
        issue_type: 'Property Tax Lien',
        description: 'Outstanding property taxes from previous years',
        severity: 'high'
      },
      {
        issue_type: 'Mortgage Lien',
        description: 'Previous mortgage not properly released',
        severity: 'high'
      },
      {
        issue_type: 'Judgment Lien',
        description: 'Court judgment against previous owner',
        severity: 'medium'
      },
      {
        issue_type: 'Easement Issue',
        description: 'Undisclosed utility easement on property',
        severity: 'medium'
      },
      {
        issue_type: 'Boundary Dispute',
        description: 'Property boundary not clearly defined',
        severity: 'low'
      }
    ];
    
    // Return 1-2 random issues
    const numIssues = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numIssues; i++) {
      const randomIssue = commonIssueTypes[Math.floor(Math.random() * commonIssueTypes.length)];
      issues.push(randomIssue);
    }
  }
  
  return issues;
}


// controllers/titleSearchController.js - Update the simulateTitleSearch function

async function simulateTitleSearch(titleSearchId, propertyId) {
  try {
    console.log(`Starting title search simulation for search ID: ${titleSearchId}`);
    
    // Update status to in progress after a short delay
    setTimeout(async () => {
      await TitleSearch.updateStatus(titleSearchId, 'in_progress');
      console.log(`Title search ${titleSearchId} status updated to in_progress`);
    }, 1000);

    // Simulate processing time - longer delay for more realistic experience
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Simulate finding common title issues
    const commonIssues = await checkForCommonTitleIssues(propertyId);
    
    if (commonIssues.length > 0) {
      console.log(`Found ${commonIssues.length} title issues for search ${titleSearchId}`);
      await TitleSearch.updateStatus(titleSearchId, 'issues_found');
      
      // Add found issues
      for (const issue of commonIssues) {
        await TitleIssue.create({
          title_search_id: titleSearchId,
          ...issue
        });
      }
    } else {
      console.log(`No title issues found for search ${titleSearchId}`);
      await TitleSearch.updateStatus(titleSearchId, 'clear');
      
      // Auto-create title commitment when no issues found
      setTimeout(async () => {
        await createAutoTitleCommitment(titleSearchId);
      }, 2000);
    }
    
    // Mark as completed
    await TitleSearch.markCompleted(titleSearchId);
    console.log(`Title search ${titleSearchId} completed`);
    
  } catch (error) {
    console.error('Simulate title search error:', error);
    await TitleSearch.updateStatus(titleSearchId, 'completed');
  }
}

// Helper function to auto-create title commitment
async function createAutoTitleCommitment(titleSearchId) {
  try {
    const titleSearch = await TitleSearch.findById(titleSearchId);
    if (!titleSearch) return;

    const commitmentNumber = `TCC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const policyAmount = 500000; // Example amount
    const premiumAmount = policyAmount * 0.0035; // Example premium calculation

    const commitment = await TitleCommitment.create({
      title_search_id: titleSearchId,
      commitment_number: commitmentNumber,
      issue_date: new Date(),
      effective_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      policy_amount: policyAmount,
      premium_amount: premiumAmount,
      status: 'pending_review'
    });

    console.log(`Auto-created title commitment: ${commitmentNumber}`);
    return commitment;
  } catch (error) {
    console.error('Error auto-creating title commitment:', error);
  }
}