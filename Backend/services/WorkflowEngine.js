// services/WorkflowEngine.js
const EventEmitter = require('events');
const moment = require('moment');

class WorkflowEngine extends EventEmitter {
  constructor(db, emailService, documentService, notificationService) {
    super();
    this.db = db;
    this.emailService = emailService;
    this.documentService = documentService;
    this.notificationService = notificationService;
    
    // Define workflow rules and activities for each step
    this.stepActivities = this.defineStepActivities();
    this.validationRules = this.defineValidationRules();
    this.automationRules = this.defineAutomationRules();
  }

  // Define specific activities and business logic for each step
  defineStepActivities() {
    return {
      // Step 1: Pre-Approval Process
      1: {
        name: 'Pre-Approval Process',
        activities: {
          onStart: async (transaction) => {
            // Generate pre-approval application
            const application = await this.generatePreApprovalApplication(transaction);
            
            // Send to lender API
            const lenderResponse = await this.submitToLender(application);
            
            // Schedule credit check
            await this.scheduleCreditCheck(transaction);
            
            // Create tasks
            return {
              applicationId: application.id,
              lenderReference: lenderResponse.reference
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Credit check completed') {
              await this.calculateBuyerRating(transaction);
            }
            if (task.name === 'Pre-approval letter received') {
              await this.storePreApprovalLetter(transaction);
              await this.notifyAgent(transaction, 'Pre-approval received');
            }
          },
          
          onComplete: async (transaction) => {
            // Generate buyer profile
            await this.generateBuyerProfile(transaction);
            // Enable property search
            await this.enablePropertySearch(transaction);
          }
        },
        requiredDocuments: ['W2', 'Tax Returns', 'Bank Statements', 'ID'],
        estimatedDuration: 3, // days
        dependencies: []
      },

      // Step 2: Property Search & Selection
      2: {
        name: 'Property Search & Selection',
        activities: {
          onStart: async (transaction) => {
            // Connect to MLS API
            const mlsConnection = await this.connectToMLS(transaction);
            
            // Set up property alerts
            await this.setupPropertyAlerts(transaction);
            
            // Generate comparable analysis
            return {
              mlsSessionId: mlsConnection.sessionId,
              searchCriteria: transaction.searchCriteria
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Schedule showings') {
              await this.sendShowingRequests(transaction);
            }
            if (task.name === 'Select property') {
              await this.generatePropertyReport(transaction);
              await this.runComparableAnalysis(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Lock in property details
            await this.lockPropertySelection(transaction);
            // Prepare offer documentation
            await this.prepareOfferDocs(transaction);
          }
        },
        requiredDocuments: ['Property Disclosure'],
        estimatedDuration: 7,
        dependencies: [1] // Requires Step 1 completion
      },

      // Step 3: Submit Offer
      3: {
        name: 'Submit Offer',
        activities: {
          onStart: async (transaction) => {
            // Generate offer letter
            const offer = await this.generateOfferLetter(transaction);
            
            // Calculate earnest money
            const earnestMoney = await this.calculateEarnestMoney(transaction);
            
            // Set offer expiration
            const expiration = moment().add(72, 'hours');
            
            return {
              offerId: offer.id,
              earnestMoney,
              expirationTime: expiration
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'E-sign offer') {
              await this.captureElectronicSignature(transaction);
            }
            if (task.name === 'Submit to seller') {
              await this.submitOfferToSeller(transaction);
              await this.startOfferTimer(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            await this.notifyAllParties(transaction, 'Offer submitted');
          }
        },
        requiredDocuments: ['Offer Letter', 'Pre-approval Letter'],
        estimatedDuration: 1,
        dependencies: [2]
      },

      // Step 4: Negotiation & Acceptance
      4: {
        name: 'Negotiation & Acceptance',
        activities: {
          onStart: async (transaction) => {
            // Set up negotiation room
            const room = await this.createNegotiationRoom(transaction);
            
            // Track counter offers
            await this.initializeCounterTracking(transaction);
            
            return { negotiationRoomId: room.id };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Review counter-offer') {
              await this.analyzeCounterOffer(transaction);
            }
            if (task.name === 'Accept final terms') {
              await this.lockFinalTerms(transaction);
              await this.generateAcceptanceLetter(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Move to contract phase
            await this.initiateContractPhase(transaction);
          }
        },
        requiredDocuments: ['Counter Offer', 'Acceptance Letter'],
        estimatedDuration: 2,
        dependencies: [3]
      },

      // Step 5: Purchase Agreement Generation
      5: {
        name: 'Purchase Agreement Generation',
        activities: {
          onStart: async (transaction) => {
            // Generate state-specific contract
            const contract = await this.generatePurchaseAgreement(transaction);
            
            // Add all negotiated terms
            await this.incorporateTerms(contract, transaction);
            
            // Prepare for signatures
            await this.prepareForESignature(contract);
            
            return { contractId: contract.id };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'E-sign agreement') {
              await this.recordSignature(transaction);
              await this.createAuditTrail(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Distribute executed copies
            await this.distributeContracts(transaction);
            // Start attorney review timer (if applicable)
            await this.startAttorneyReviewPeriod(transaction);
          }
        },
        requiredDocuments: ['Purchase Agreement'],
        estimatedDuration: 1,
        dependencies: [4]
      },

      // Step 6: Attorney Review Period
      6: {
        name: 'Attorney Review Period',
        activities: {
          onStart: async (transaction) => {
            // Assign attorneys
            const attorneys = await this.assignAttorneys(transaction);
            
            // Start 3-day timer
            const reviewDeadline = moment().add(3, 'days');
            
            // Send contracts for review
            await this.sendToAttorneys(transaction, attorneys);
            
            return {
              buyerAttorney: attorneys.buyer,
              sellerAttorney: attorneys.seller,
              deadline: reviewDeadline
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Contract review') {
              await this.recordAttorneyComments(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Finalize contract
            await this.finalizeContract(transaction);
          }
        },
        requiredDocuments: ['Attorney Approval'],
        estimatedDuration: 3,
        dependencies: [5]
      },

      // Step 7: Earnest Money Deposit
      7: {
        name: 'Earnest Money Deposit',
        activities: {
          onStart: async (transaction) => {
            // Generate escrow instructions
            const instructions = await this.generateEscrowInstructions(transaction);
            
            // Set up escrow account
            const escrowAccount = await this.setupEscrowAccount(transaction);
            
            // Send wire instructions
            await this.sendWireInstructions(transaction, escrowAccount);
            
            return {
              escrowAccountNumber: escrowAccount.number,
              wireInstructions: instructions.wireDetails
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Send wire transfer') {
              await this.trackWireTransfer(transaction);
            }
            if (task.name === 'Confirm receipt') {
              await this.confirmEscrowDeposit(transaction);
              await this.issueEscrowReceipt(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Lock earnest money
            await this.lockEarnestMoney(transaction);
            // Update transaction status
            await this.updateToContingencyPhase(transaction);
          }
        },
        requiredDocuments: ['Wire Receipt', 'Escrow Receipt'],
        estimatedDuration: 2,
        dependencies: [6]
      },

      // Step 8: Home Inspection
      8: {
        name: 'Home Inspection',
        activities: {
          onStart: async (transaction) => {
            // Schedule inspection
            const inspection = await this.scheduleInspection(transaction);
            
            // Send inspector checklist
            await this.sendInspectorChecklist(inspection);
            
            // Notify all parties
            await this.notifyInspectionSchedule(transaction, inspection);
            
            return {
              inspectionId: inspection.id,
              scheduledDate: inspection.date,
              inspector: inspection.inspectorName
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Conduct inspection') {
              await this.trackInspectionProgress(transaction);
            }
            if (task.name === 'Receive report') {
              await this.processInspectionReport(transaction);
              await this.identifyRepairItems(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Generate repair request
            await this.generateRepairRequest(transaction);
          }
        },
        requiredDocuments: ['Inspection Report', 'Photos'],
        estimatedDuration: 3,
        dependencies: [7]
      },

      // Step 9: Repair Request/Negotiation
      9: {
        name: 'Repair Request/Negotiation',
        activities: {
          onStart: async (transaction) => {
            // Analyze inspection report
            const issues = await this.analyzeInspectionIssues(transaction);
            
            // Prioritize repairs
            const priorities = await this.prioritizeRepairs(issues);
            
            // Generate repair request form
            const request = await this.createRepairRequest(priorities);
            
            return {
              repairRequestId: request.id,
              criticalItems: priorities.critical,
              negotiableItems: priorities.negotiable
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Submit repair request') {
              await this.submitRepairRequest(transaction);
              await this.setRepairDeadline(transaction);
            }
            if (task.name === 'Negotiate agreement') {
              await this.finalizeRepairAgreement(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Document repair agreement
            await this.documentRepairAgreement(transaction);
          }
        },
        requiredDocuments: ['Repair Request', 'Repair Agreement'],
        estimatedDuration: 5,
        dependencies: [8]
      },

      // Step 10: Formal Mortgage Application
      10: {
        name: 'Formal Mortgage Application',
        activities: {
          onStart: async (transaction) => {
            // Generate full application
            const application = await this.generateMortgageApplication(transaction);
            
            // Compile documentation
            const docs = await this.compileLoanDocuments(transaction);
            
            // Submit to lender
            const submission = await this.submitToLenderPortal(application, docs);
            
            return {
              applicationNumber: submission.applicationNumber,
              loanOfficer: submission.assignedOfficer,
              portal: submission.portalUrl
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Upload tax returns') {
              await this.validateTaxDocuments(transaction);
            }
            if (task.name === 'Employment verification') {
              await this.processEmploymentVerification(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Move to underwriting
            await this.initiateUnderwriting(transaction);
          }
        },
        requiredDocuments: ['Tax Returns', 'W2s', 'Bank Statements', 'Pay Stubs'],
        estimatedDuration: 3,
        dependencies: [7]
      },

      // Step 11: Property Appraisal
      11: {
        name: 'Property Appraisal',
        activities: {
          onStart: async (transaction) => {
            // Order appraisal
            const appraisal = await this.orderAppraisal(transaction);
            
            // Schedule with appraiser
            const appointment = await this.scheduleAppraisal(appraisal);
            
            // Prepare property for appraisal
            await this.sendAppraisalPrep(transaction);
            
            return {
              appraisalId: appraisal.id,
              appointmentDate: appointment.date,
              appraiser: appointment.appraiserName
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Property visit') {
              await this.trackAppraisalVisit(transaction);
            }
            if (task.name === 'Receive report') {
              await this.processAppraisalReport(transaction);
              await this.validatePropertyValue(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Submit to lender
            await this.submitAppraisalToLender(transaction);
          }
        },
        requiredDocuments: ['Appraisal Report'],
        estimatedDuration: 7,
        dependencies: [10]
      },

      // Step 12: Underwriting Process
      12: {
        name: 'Underwriting Process',
        activities: {
          onStart: async (transaction) => {
            // Initialize underwriting
            const underwriting = await this.startUnderwriting(transaction);
            
            // Set up condition tracking
            await this.setupConditionTracking(underwriting);
            
            return {
              underwritingId: underwriting.id,
              assignedUnderwriter: underwriting.underwriter
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Conditional approval') {
              await this.processConditionalApproval(transaction);
              await this.generateConditionsList(transaction);
            }
            if (task.name === 'Clear to close') {
              await this.issueClearToClose(transaction);
              await this.notifyClosingTeam(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Generate commitment letter
            await this.generateCommitmentLetter(transaction);
          }
        },
        requiredDocuments: ['Conditional Approval', 'Clear to Close'],
        estimatedDuration: 10,
        dependencies: [11]
      },

      // Step 13: Title Search
      13: {
        name: 'Title Search',
        activities: {
          onStart: async (transaction) => {
            // Order title search
            const titleSearch = await this.orderTitleSearch(transaction);
            
            // Research property history
            await this.researchPropertyHistory(transaction);
            
            return {
              titleOrderNumber: titleSearch.orderNumber,
              titleCompany: titleSearch.company
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Identify issues') {
              await this.analyzeTitleIssues(transaction);
            }
            if (task.name === 'Clear title') {
              await this.clearTitleIssues(transaction);
              await this.generateTitleCommitment(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Issue preliminary title report
            await this.issuePreliminaryTitle(transaction);
          }
        },
        requiredDocuments: ['Title Report', 'Title Commitment'],
        estimatedDuration: 5,
        dependencies: [7]
      },

      // Step 14: Title Insurance
      14: {
        name: 'Title Insurance',
        activities: {
          onStart: async (transaction) => {
            // Quote policies
            const quotes = await this.quoteTitleInsurance(transaction);
            
            // Review coverage options
            await this.presentCoverageOptions(quotes);
            
            return {
              ownerPolicyQuote: quotes.owner,
              lenderPolicyQuote: quotes.lender
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Select coverage') {
              await this.bindTitleInsurance(transaction);
            }
            if (task.name === 'Pay premiums') {
              await this.processTitlePremiums(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm coverage
            await this.confirmTitleCoverage(transaction);
          }
        },
        requiredDocuments: ['Title Insurance Binder'],
        estimatedDuration: 2,
        dependencies: [13]
      },

      // Step 15: Homeowner's Insurance
      15: {
        name: "Homeowner's Insurance",
        activities: {
          onStart: async (transaction) => {
            // Get insurance quotes
            const quotes = await this.getInsuranceQuotes(transaction);
            
            // Compare coverage
            const comparison = await this.compareInsuranceOptions(quotes);
            
            return {
              quotes: quotes,
              recommendedPolicy: comparison.recommended
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Select policy') {
              await this.bindHomeownersInsurance(transaction);
            }
            if (task.name === 'Provide proof to lender') {
              await this.sendInsuranceToLender(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm insurance in place
            await this.confirmInsuranceCoverage(transaction);
          }
        },
        requiredDocuments: ['Insurance Binder', 'Declaration Page'],
        estimatedDuration: 3,
        dependencies: [10]
      },

      // Step 16: Closing Document Preparation
      16: {
        name: 'Closing Document Preparation',
        activities: {
          onStart: async (transaction) => {
            // Generate closing disclosure
            const disclosure = await this.generateClosingDisclosure(transaction);
            
            // Prepare all documents
            const documents = await this.prepareClosingDocuments(transaction);
            
            // Calculate final numbers
            const calculations = await this.calculateFinalNumbers(transaction);
            
            return {
              closingDisclosureId: disclosure.id,
              documentCount: documents.length,
              finalNumbers: calculations
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Generate closing disclosure') {
              await this.sendClosingDisclosure(transaction);
              await this.startThreeDayWait(transaction);
            }
            if (task.name === 'Calculate final costs') {
              await this.finalizeClosingCosts(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Package documents for closing
            await this.packageClosingDocuments(transaction);
          }
        },
        requiredDocuments: ['Closing Disclosure', 'Settlement Statement'],
        estimatedDuration: 3,
        dependencies: [12, 14, 15]
      },

      // Step 17: Final Walk-Through
      17: {
        name: 'Final Walk-Through',
        activities: {
          onStart: async (transaction) => {
            // Schedule walk-through
            const walkthrough = await this.scheduleWalkthrough(transaction);
            
            // Generate checklist
            const checklist = await this.generateWalkthroughChecklist(transaction);
            
            return {
              walkthroughDate: walkthrough.date,
              checklist: checklist
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Verify repairs') {
              await this.verifyRepairCompletion(transaction);
            }
            if (task.name === 'Document issues') {
              await this.documentWalkthroughIssues(transaction);
              await this.negotiateFinalIssues(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Sign off on property condition
            await this.signWalkthroughForm(transaction);
          }
        },
        requiredDocuments: ['Walk-through Form'],
        estimatedDuration: 1,
        dependencies: [16]
      },

      // Step 18: Closing Appointment
      18: {
        name: 'Closing Appointment',
        activities: {
          onStart: async (transaction) => {
            // Schedule closing
            const closing = await this.scheduleClosing(transaction);
            
            // Set up signing method (in-person or remote)
            const signingMethod = await this.setupSigningMethod(transaction);
            
            // Send calendar invites
            await this.sendClosingInvites(transaction, closing);
            
            return {
              closingDate: closing.date,
              closingTime: closing.time,
              method: signingMethod
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Setup video call') {
              await this.setupRemoteClosing(transaction);
              await this.testVideoConnection(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm all parties ready
            await this.confirmClosingReadiness(transaction);
          }
        },
        requiredDocuments: ['Closing Appointment Confirmation'],
        estimatedDuration: 1,
        dependencies: [17]
      },

      // Step 19: Document Signing
      19: {
        name: 'Document Signing',
        activities: {
          onStart: async (transaction) => {
            // Initialize signing session
            const session = await this.startSigningSession(transaction);
            
            // Verify identities
            await this.verifySignerIdentities(session);
            
            // Queue documents for signing
            await this.queueSigningDocuments(session);
            
            return {
              sessionId: session.id,
              documentCount: session.documentCount,
              estimatedTime: session.estimatedTime
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Identity verification') {
              await this.recordIdentityVerification(transaction);
            }
            if (task.name === 'Sign documents') {
              await this.captureSignatures(transaction);
              await this.timestampSignatures(transaction);
            }
            if (task.name === 'Notarize documents') {
              await this.completeNotarization(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Package signed documents
            await this.packageSignedDocuments(transaction);
            // Trigger funding
            await this.triggerFunding(transaction);
          }
        },
        requiredDocuments: ['All Signed Documents'],
        estimatedDuration: 1,
        dependencies: [18]
      },

      // Step 20: Fund Disbursement
      20: {
        name: 'Fund Disbursement',
        activities: {
          onStart: async (transaction) => {
            // Request loan funding
            const funding = await this.requestLoanFunding(transaction);
            
            // Verify down payment received
            await this.verifyDownPayment(transaction);
            
            // Prepare disbursement instructions
            const instructions = await this.prepareDisbursementInstructions(transaction);
            
            return {
              fundingRequestId: funding.id,
              expectedFundingTime: funding.expectedTime,
              disbursementInstructions: instructions
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Receive loan funds') {
              await this.confirmLoanFunding(transaction);
            }
            if (task.name === 'Disburse funds') {
              await this.executeDisbursements(transaction);
              await this.payOffExistingMortgage(transaction);
              await this.distributeProceeds(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Generate funding confirmation
            await this.generateFundingConfirmation(transaction);
            // Calculate and distribute platform fees
            await this.processPlatformFees(transaction);
          }
        },
        requiredDocuments: ['Funding Confirmation', 'Disbursement Statement'],
        estimatedDuration: 1,
        dependencies: [19]
      },

      // Step 21: Deed Recording
      21: {
        name: 'Deed Recording',
        activities: {
          onStart: async (transaction) => {
            // Prepare recording package
            const recordingPackage = await this.prepareRecordingPackage(transaction);
            
            // Submit for e-recording
            const submission = await this.submitForRecording(recordingPackage);
            
            return {
              recordingNumber: submission.trackingNumber,
              expectedRecordingTime: submission.expectedTime
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Submit for recording') {
              await this.trackRecordingStatus(transaction);
            }
            if (task.name === 'Get recorded deed') {
              await this.retrieveRecordedDocuments(transaction);
              await this.updatePropertyOwnership(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm ownership transfer
            await this.confirmOwnershipTransfer(transaction);
            // Trigger key release
            await this.authorizeKeyRelease(transaction);
          }
        },
        requiredDocuments: ['Recorded Deed', 'Recording Confirmation'],
        estimatedDuration: 1,
        dependencies: [20]
      },

      // Step 22: Keys & Possession Transfer
      22: {
        name: 'Keys & Possession Transfer',
        activities: {
          onStart: async (transaction) => {
            // Coordinate key transfer
            const keyTransfer = await this.coordinateKeyTransfer(transaction);
            
            // Schedule utility transfers
            await this.scheduleUtilityTransfers(transaction);
            
            // Generate possession letter
            const letter = await this.generatePossessionLetter(transaction);
            
            return {
              keyTransferTime: keyTransfer.scheduledTime,
              possessionLetter: letter.id
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Receive keys') {
              await this.confirmKeyReceipt(transaction);
              await this.updateAccessCodes(transaction);
            }
            if (task.name === 'Transfer utilities') {
              await this.processUtilityTransfers(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm possession
            await this.confirmPossession(transaction);
            // Send welcome package
            await this.sendWelcomePackage(transaction);
          }
        },
        requiredDocuments: ['Possession Confirmation', 'Key Receipt'],
        estimatedDuration: 1,
        dependencies: [21]
      },

      // Step 23: Title Insurance Policy Issued
      23: {
        name: 'Title Insurance Policy Issued',
        activities: {
          onStart: async (transaction) => {
            // Generate final policies
            const policies = await this.generateFinalTitlePolicies(transaction);
            
            // Quality check
            await this.qcTitlePolicies(policies);
            
            return {
              ownerPolicyNumber: policies.owner.policyNumber,
              lenderPolicyNumber: policies.lender.policyNumber
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Issue policies') {
              await this.issueTitlePolicies(transaction);
            }
            if (task.name === 'Deliver policies') {
              await this.deliverTitlePolicies(transaction);
              await this.storeInVault(transaction, 'title_policies');
            }
          },
          
          onComplete: async (transaction) => {
            // Confirm policy delivery
            await this.confirmPolicyDelivery(transaction);
          }
        },
        requiredDocuments: ['Owner Title Policy', 'Lender Title Policy'],
        estimatedDuration: 5,
        dependencies: [21]
      },

      // Step 24: Final Escrow Package
      24: {
        name: 'Final Escrow Package',
        activities: {
          onStart: async (transaction) => {
            // Compile all documents
            const compilation = await this.compileAllDocuments(transaction);
            
            // Create digital package
            const package = await this.createDigitalPackage(compilation);
            
            // Generate index
            const index = await this.generateDocumentIndex(package);
            
            return {
              packageId: package.id,
              documentCount: compilation.count,
              packageSize: package.size
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Create package') {
              await this.encryptPackage(transaction);
              await this.createBackup(transaction);
            }
            if (task.name === 'Deliver to parties') {
              await this.distributeEscrowPackage(transaction);
              await this.sendAccessCredentials(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Archive transaction
            await this.archiveTransaction(transaction);
          }
        },
        requiredDocuments: ['Complete Document Package'],
        estimatedDuration: 3,
        dependencies: [23]
      },

      // Step 25: Platform Fee & Celebration
      25: {
        name: "You're Home Platform Fee",
        activities: {
          onStart: async (transaction) => {
            // Calculate final fees
            const fees = await this.calculatePlatformFees(transaction);
            
            // Generate savings report
            const savings = await this.generateSavingsReport(transaction);
            
            // Create success summary
            const summary = await this.createSuccessSummary(transaction);
            
            return {
              totalFee: fees.total,
              buyerPortion: fees.buyer,
              sellerPortion: fees.seller,
              totalSaved: savings.amount
            };
          },
          
          onTaskComplete: async (transaction, task) => {
            if (task.name === 'Collect payment') {
              await this.processPlatformPayment(transaction);
            }
            if (task.name === 'Generate savings report') {
              await this.sendSavingsReport(transaction);
            }
            if (task.name === 'Celebrate success!') {
              await this.sendCongratulations(transaction);
              await this.requestReview(transaction);
              await this.offerReferralProgram(transaction);
            }
          },
          
          onComplete: async (transaction) => {
            // Mark transaction complete
            await this.completeTransaction(transaction);
            // Send satisfaction survey
            await this.sendSatisfactionSurvey(transaction);
          }
        },
        requiredDocuments: ['Platform Fee Receipt', 'Savings Report'],
        estimatedDuration: 1,
        dependencies: [24]
      }
    };
  }

  // Define validation rules for each step
  defineValidationRules() {
    return {
      1: {
        canStart: async (transaction) => {
          return transaction.status === 'active';
        },
        canComplete: async (transaction) => {
          // Check all required documents uploaded
          const docs = await this.checkDocuments(transaction, 1);
          const tasks = await this.checkTasks(transaction, 1);
          return docs.complete && tasks.complete;
        }
      },
      2: {
        canStart: async (transaction) => {
          const step1 = await this.getStepStatus(transaction, 1);
          return step1 === 'completed';
        },
        canComplete: async (transaction) => {
          const property = await this.getSelectedProperty(transaction);
          return property !== null;
        }
      },
      3: {
        canStart: async (transaction) => {
          const step2 = await this.getStepStatus(transaction, 2);
          return step2 === 'completed';
        },
        canComplete: async (transaction) => {
          const offer = await this.getOffer(transaction);
          return offer && offer.signed && offer.submitted;
        }
      },
      // ... validation rules for all 25 steps
    };
  }

  // Define automation rules
  defineAutomationRules() {
    return {
      // Auto-advance rules
      autoAdvance: {
        1: { to: 2, condition: 'on_complete' },
        2: { to: 3, condition: 'on_property_selected' },
        3: { to: 4, condition: 'on_offer_submitted' },
        4: { to: 5, condition: 'on_offer_accepted' },
        // ... more rules
      },
      
      // Parallel execution rules
      parallel: {
        10: [11, 13], // Mortgage app can trigger appraisal and title search
        12: [14, 15, 16], // Clear to close triggers multiple steps
      },
      
      // Conditional branching
      conditional: {
        8: {
          condition: 'inspection_issues_found',
          true: 9, // Go to repair negotiation
          false: 10 // Skip to mortgage application
        }
      },
      
      // Automated notifications
      notifications: {
        3: ['offer_submitted', 'offer_expiring'],
        8: ['inspection_scheduled', 'inspection_complete'],
        19: ['closing_scheduled', 'closing_reminder'],
        21: ['deed_recorded', 'ownership_transferred']
      }
    };
  }

  // Main execution method
  async executeStep(transactionId, stepNumber, action = 'start') {
    const transaction = await this.getTransaction(transactionId);
    const step = this.stepActivities[stepNumber];
    
    if (!step) {
      throw new Error(`Step ${stepNumber} not found`);
    }
    
    // Validate step can be executed
    const validation = this.validationRules[stepNumber];
    if (validation) {
      if (action === 'start' && validation.canStart) {
        const canStart = await validation.canStart(transaction);
        if (!canStart) {
          throw new Error(`Cannot start step ${stepNumber}: Prerequisites not met`);
        }
      }
      
      if (action === 'complete' && validation.canComplete) {
        const canComplete = await validation.canComplete(transaction);
        if (!canComplete) {
          throw new Error(`Cannot complete step ${stepNumber}: Requirements not met`);
        }
      }
    }
    
    // Execute the appropriate activity
    let result;
    switch (action) {
      case 'start':
        result = await this.startStep(transaction, stepNumber);
        break;
      case 'complete':
        result = await this.completeStep(transaction, stepNumber);
        break;
      case 'task':
        result = await this.executeTask(transaction, stepNumber, action.taskId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Check for automation rules
    await this.checkAutomation(transaction, stepNumber, action);
    
    // Send notifications
    await this.sendStepNotifications(transaction, stepNumber, action);
    
    return result;
  }

  async startStep(transaction, stepNumber) {
    const step = this.stepActivities[stepNumber];
    
    // Update step status to in-progress
    await this.updateStepStatus(transaction.id, stepNumber, 'in-progress');
    
    // Execute onStart activities
    let result = {};
    if (step.activities.onStart) {
      result = await step.activities.onStart(transaction);
    }
    
    // Store step details
    await this.storeStepDetails(transaction.id, stepNumber, result);
    
    // Create tasks for this step
    await this.createStepTasks(transaction.id, stepNumber);
    
    // Set up monitoring
    await this.setupStepMonitoring(transaction.id, stepNumber);
    
    // Log activity
    await this.logActivity(transaction.id, `Started step ${stepNumber}: ${step.name}`);
    
    return {
      success: true,
      stepNumber,
      stepName: step.name,
      details: result
    };
  }

  async completeStep(transaction, stepNumber) {
    const step = this.stepActivities[stepNumber];
    
    // Execute onComplete activities
    if (step.activities.onComplete) {
      await step.activities.onComplete(transaction);
    }
    
    // Update step status
    await this.updateStepStatus(transaction.id, stepNumber, 'completed');
    
    // Check for auto-advance
    const autoAdvance = this.automationRules.autoAdvance[stepNumber];
    if (autoAdvance) {
      await this.executeStep(transaction.id, autoAdvance.to, 'start');
    }
    
    // Check for parallel steps
    const parallel = this.automationRules.parallel[stepNumber];
    if (parallel) {
      for (const parallelStep of parallel) {
        await this.executeStep(transaction.id, parallelStep, 'start');
      }
    }
    
    // Update overall progress
    await this.updateTransactionProgress(transaction.id);
    
    // Log activity
    await this.logActivity(transaction.id, `Completed step ${stepNumber}: ${step.name}`);
    
    return {
      success: true,
      stepNumber,
      stepName: step.name,
      nextSteps: autoAdvance ? [autoAdvance.to] : []
    };
  }

  // Helper methods would go here...
  async getTransaction(id) {
    const result = await this.db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updateStepStatus(transactionId, stepNumber, status) {
    await this.db.query(
      `UPDATE transaction_progress 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE transaction_id = $2 AND step_id = (
         SELECT id FROM transaction_steps WHERE step_number = $3
       )`,
      [status, transactionId, stepNumber]
    );
  }

  // ... Additional helper methods for all the specific activities
}

module.exports = WorkflowEngine;