// routes/workflow.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const WorkflowEngine = require('../services/WorkflowEngine');
const StepServices = require('../services/StepServices');
const EmailService = require('../services/EmailService');
const DocumentService = require('../services/DocumentService');
const NotificationService = require('../services/NotificationService');

// Initialize services
let workflowEngine;
let stepServices;

// Initialize workflow engine with dependencies
router.use((req, res, next) => {
  if (!workflowEngine) {
    const db = req.app.locals.db;
    const emailService = new EmailService();
    const documentService = new DocumentService();
    const notificationService = new NotificationService(db);
    
    workflowEngine = new WorkflowEngine(db, emailService, documentService, notificationService);
    stepServices = new StepServices(db, workflowEngine);
    
    // Attach to request for use in routes
    req.workflow = workflowEngine;
    req.stepServices = stepServices;
  } else {
    req.workflow = workflowEngine;
    req.stepServices = stepServices;
  }
  next();
});

// Execute a step action (start, complete, or task)
router.post('/transactions/:id/steps/:stepNumber/execute', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const { action, taskId, data } = req.body;
    const userId = req.user.id;
    
    // Verify transaction ownership
    const db = req.app.locals.db;
    const transactionCheck = await db.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    // Execute the step action
    const result = await req.workflow.executeStep(
      id, 
      parseInt(stepNumber), 
      taskId ? { action: 'task', taskId } : action
    );
    
    res.json({
      success: true,
      result,
      message: `Step ${stepNumber} ${action} executed successfully`
    });
  } catch (error) {
    console.error('Workflow execution error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get workflow status for a transaction
router.get('/transactions/:id/workflow/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    // Get current workflow state
    const workflowStatus = await db.query(
      `SELECT 
        ts.step_number,
        ts.title as step_title,
        tp.status as step_status,
        tp.started_at,
        tp.completed_at,
        p.name as phase_name,
        p.display_name as phase_display_name,
        (SELECT COUNT(*) FROM tasks t 
         JOIN task_progress tpr ON t.id = tpr.task_id 
         WHERE t.step_id = ts.id 
         AND tpr.transaction_id = $1 
         AND tpr.status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE step_id = ts.id) as total_tasks,
        (SELECT json_agg(json_build_object(
          'id', t.id,
          'name', t.name,
          'status', COALESCE(tpr.status, 'pending'),
          'completed_at', tpr.completed_at
        )) FROM tasks t
        LEFT JOIN task_progress tpr ON t.id = tpr.task_id AND tpr.transaction_id = $1
        WHERE t.step_id = ts.id) as tasks
      FROM transaction_steps ts
      JOIN transaction_phases p ON ts.phase_id = p.id
      LEFT JOIN transaction_progress tp ON ts.id = tp.step_id AND tp.transaction_id = $1
      ORDER BY ts.display_order`,
      [id]
    );
    
    // Get active steps (in-progress)
    const activeSteps = workflowStatus.rows.filter(s => s.step_status === 'in-progress');
    
    // Get next available steps
    const completedSteps = workflowStatus.rows.filter(s => s.step_status === 'completed').map(s => s.step_number);
    const nextSteps = req.workflow.getNextAvailableSteps(completedSteps);
    
    // Get blockers for pending steps
    const blockers = await req.workflow.getStepBlockers(id);
    
    res.json({
      currentPhase: activeSteps[0]?.phase_name || 'preContract',
      activeSteps: activeSteps.map(s => ({
        number: s.step_number,
        title: s.step_title,
        progress: `${s.completed_tasks}/${s.total_tasks}`,
        tasks: s.tasks
      })),
      nextAvailableSteps: nextSteps,
      allSteps: workflowStatus.rows,
      blockers,
      overallProgress: {
        completed: completedSteps.length,
        total: 25,
        percentage: Math.round((completedSteps.length / 25) * 100)
      }
    });
  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({ error: 'Failed to fetch workflow status' });
  }
});

// Trigger specific step activities
router.post('/transactions/:id/steps/:stepNumber/activities/:activity', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber, activity } = req.params;
    const { data } = req.body;
    const db = req.app.locals.db;
    
    // Get transaction
    const transactionResult = await db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    const transaction = transactionResult.rows[0];
    
    let result;
    
    // Execute specific activities based on step and activity name
    switch (`${stepNumber}-${activity}`) {
      // Step 1 activities
      case '1-submit-application':
        result = await req.stepServices.generatePreApprovalApplication(transaction);
        await req.stepServices.submitToLender(result);
        break;
      
      case '1-check-credit':
        result = await req.stepServices.scheduleCreditCheck(transaction);
        break;
      
      case '1-calculate-rating':
        result = await req.stepServices.calculateBuyerRating(transaction);
        break;
      
      // Step 2 activities
      case '2-search-properties':
        result = await req.stepServices.connectToMLS(transaction);
        break;
      
      case '2-analyze-comparables':
        result = await req.stepServices.generateComparableAnalysis(transaction);
        break;
      
      // Step 3 activities
      case '3-generate-offer':
        result = await req.stepServices.generateOfferLetter(transaction);
        break;
      
      // Step 8 activities
      case '8-schedule-inspection':
        result = await req.stepServices.scheduleInspection(transaction);
        break;
      
      case '8-process-report':
        result = await req.stepServices.processInspectionReport(transaction);
        break;
      
      // Step 10 activities
      case '10-submit-mortgage':
        const application = await req.stepServices.generateMortgageApplication(transaction);
        const docs = await req.stepServices.compileLoanDocuments(transaction);
        result = await req.stepServices.submitToLenderPortal(application, docs);
        break;
      
      // Step 12 activities
      case '12-start-underwriting':
        result = await req.stepServices.startUnderwriting(transaction);
        break;
      
      case '12-conditional-approval':
        result = await req.stepServices.processConditionalApproval(transaction);
        break;
      
      case '12-clear-to-close':
        result = await req.stepServices.issueClearToClose(transaction);
        break;
      
      // Step 19 activities
      case '19-start-signing':
        result = await req.stepServices.startSigningSession(transaction);
        break;
      
      case '19-capture-signatures':
        result = await req.stepServices.captureSignatures(transaction);
        break;
      
      // Step 20 activities
      case '20-request-funding':
        result = await req.stepServices.requestLoanFunding(transaction);
        break;
      
      case '20-disburse-funds':
        result = await req.stepServices.executeDisbursements(transaction);
        break;
      
      // Step 21 activities
      case '21-record-deed':
        const package = await req.stepServices.prepareRecordingPackage(transaction);
        result = await req.stepServices.submitForRecording(package);
        break;
      
      default:
        return res.status(400).json({ error: `Unknown activity: ${activity} for step ${stepNumber}` });
    }
    
    res.json({
      success: true,
      activity,
      result
    });
  } catch (error) {
    console.error('Activity execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available actions for a step
router.get('/transactions/:id/steps/:stepNumber/actions', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const db = req.app.locals.db;
    
    // Get step status
    const stepStatus = await db.query(
      `SELECT tp.status, ts.title
       FROM transaction_progress tp
       JOIN transaction_steps ts ON tp.step_id = ts.id
       WHERE tp.transaction_id = $1 AND ts.step_number = $2`,
      [id, stepNumber]
    );
    
    if (stepStatus.rows.length === 0) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    const status = stepStatus.rows[0].status;
    const stepDef = req.workflow.stepActivities[stepNumber];
    
    const availableActions = [];
    
    if (status === 'pending') {
      // Check if step can be started
      const canStart = await req.workflow.canStartStep(id, stepNumber);
      if (canStart) {
        availableActions.push({
          action: 'start',
          label: `Start ${stepDef.name}`,
          description: stepDef.description
        });
      }
    } else if (status === 'in-progress') {
      // Get available activities
      const activities = Object.keys(stepDef.activities || {});
      activities.forEach(activity => {
        if (activity !== 'onStart' && activity !== 'onComplete') {
          availableActions.push({
            action: activity,
            label: activity.replace(/([A-Z])/g, ' $1').trim(),
            type: 'activity'
          });
        }
      });
      
      // Check if can complete
      const canComplete = await req.workflow.canCompleteStep(id, stepNumber);
      if (canComplete) {
        availableActions.push({
          action: 'complete',
          label: `Complete ${stepDef.name}`,
          type: 'completion'
        });
      }
    }
    
    res.json({
      step: stepNumber,
      title: stepStatus.rows[0].title,
      currentStatus: status,
      availableActions
    });
  } catch (error) {
    console.error('Error getting available actions:', error);
    res.status(500).json({ error: 'Failed to get available actions' });
  }
});

// Upload documents for a step
router.post('/transactions/:id/steps/:stepNumber/documents', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const { documentType, documentUrl, documentData } = req.body;
    const db = req.app.locals.db;
    
    // Store document
    const result = await db.query(
      `INSERT INTO documents (transaction_id, step_id, document_type, file_url, uploaded_by)
       VALUES ($1, (SELECT id FROM transaction_steps WHERE step_number = $2), $3, $4, $5)
       RETURNING *`,
      [id, stepNumber, documentType, documentUrl, req.user.id]
    );
    
    // Check if this completes any document requirements
    await req.workflow.checkDocumentRequirements(id, stepNumber);
    
    res.json({
      success: true,
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get step requirements and dependencies
router.get('/transactions/:id/steps/:stepNumber/requirements', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    
    const stepDef = req.workflow.stepActivities[stepNumber];
    const validation = req.workflow.validationRules[stepNumber];
    
    // Check current requirements status
    const requirementStatus = await req.workflow.checkStepRequirements(id, stepNumber);
    
    res.json({
      step: stepNumber,
      name: stepDef.name,
      requiredDocuments: stepDef.requiredDocuments,
      dependencies: stepDef.dependencies,
      estimatedDuration: stepDef.estimatedDuration,
      requirementsMet: requirementStatus.met,
      missingRequirements: requirementStatus.missing,
      blockers: requirementStatus.blockers
    });
  } catch (error) {
    console.error('Error getting requirements:', error);
    res.status(500).json({ error: 'Failed to get requirements' });
  }
});

// Simulate step completion (for testing)
router.post('/transactions/:id/steps/:stepNumber/simulate', authenticateToken, async (req, res) => {
  try {
    const { id, stepNumber } = req.params;
    const { includeActivities } = req.body;
    
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Simulation not allowed in production' });
    }
    
    // Simulate step activities
    const result = await req.workflow.simulateStep(id, stepNumber, includeActivities);
    
    res.json({
      success: true,
      simulated: true,
      result
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate step' });
  }
});

// Get workflow analytics
router.get('/transactions/:id/workflow/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    
    // Calculate time spent on each step
    const stepTiming = await db.query(
      `SELECT 
        ts.step_number,
        ts.title,
        tp.started_at,
        tp.completed_at,
        EXTRACT(EPOCH FROM (tp.completed_at - tp.started_at))/3600 as hours_spent
       FROM transaction_progress tp
       JOIN transaction_steps ts ON tp.step_id = ts.id
       WHERE tp.transaction_id = $1 AND tp.completed_at IS NOT NULL
       ORDER BY ts.display_order`,
      [id]
    );
    
    // Get bottlenecks (steps taking longer than estimated)
    const bottlenecks = stepTiming.rows.filter(step => {
      const estimated = req.workflow.stepActivities[step.step_number]?.estimatedDuration * 24;
      return step.hours_spent > estimated;
    });
    
    // Calculate estimated completion
    const remainingSteps = 25 - stepTiming.rows.length;
    const avgTimePerStep = stepTiming.rows.reduce((sum, s) => sum + s.hours_spent, 0) / stepTiming.rows.length;
    const estimatedHoursRemaining = remainingSteps * avgTimePerStep;
    
    res.json({
      completedSteps: stepTiming.rows.length,
      totalSteps: 25,
      stepTimings: stepTiming.rows,
      bottlenecks,
      averageTimePerStep: avgTimePerStep,
      estimatedHoursRemaining,
      estimatedCompletionDate: new Date(Date.now() + estimatedHoursRemaining * 3600000)
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

module.exports = router;