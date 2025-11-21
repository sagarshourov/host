const express = require('express');
const router = express.Router();

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// GET /api/transactions/:transactionId/complete
// Fetch all transaction data (phases, steps, tasks with dynamic status, details)
router.get('/:transactionId/complete', async (req, res) => {

    try {
        const { transactionId } = req.params; // offerId > transactionId
        // Validate transactionId
        if (!transactionId || isNaN(transactionId)) {
            return res.status(400).json({ message: 'Invalid transaction ID' });
        }
        const offer = await pool.query(`select * from transactions where id = $1 `, [transactionId]);
        if (offer.rowCount === 0) {
            return res.status(400).json({ message: 'This offer not accepted!' });
        }

        // Initialize task status for this transaction if not exists
        // This creates initial 'pending' status for all tasks if they don't have any status yet
        const initializeTasksQuery = `
            INSERT INTO task_value (task_id, transactions_id, status)
            SELECT t.id, $1, t.status
            FROM tasks t
            WHERE NOT EXISTS (
                SELECT 1 FROM task_value tv 
                WHERE tv.task_id = t.id 
                AND tv.transactions_id = $1
            )
        `;
        await pool.query(initializeTasksQuery, [transactionId]);

        // Fetch phases
        const phasesQuery = `
            SELECT id, name, display_name, sort_order 
            FROM phases 
            ORDER BY sort_order
        `;
        const phases = await pool.query(phasesQuery);

        // Fetch steps with dynamic status calculation based on tasks
        const stepsQuery = `
            WITH task_status_counts AS (
                SELECT 
                    t.step_id,
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN tv_latest.status = 'completed' THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN tv_latest.status = 'in-progress' THEN 1 END) as in_progress_tasks
                FROM tasks t
                LEFT JOIN LATERAL (
                    SELECT status
                    FROM task_value tv
                    WHERE tv.task_id = t.id 
                    AND tv.transactions_id = $1
                    ORDER BY tv.created_at DESC
                    LIMIT 1
                ) tv_latest ON true
                GROUP BY t.step_id
            )
            SELECT 
                s.id, 
                s.phase_id, 
                s.title, 
                CASE 
                    WHEN tsc.total_tasks = tsc.completed_tasks THEN 'completed'
                    WHEN tsc.in_progress_tasks > 0 OR tsc.completed_tasks > 0 THEN 'in-progress'
                    ELSE COALESCE(s.status, 'pending')
                END as status,
                s.description, 
                s.created_at, 
                s.updated_at,
                p.name as phase_name
            FROM steps s
            JOIN phases p ON s.phase_id = p.id
            LEFT JOIN task_status_counts tsc ON tsc.step_id = s.id
            ORDER BY p.sort_order, s.id
        `;
        const steps = await pool.query(stepsQuery, [transactionId]);

        // Fetch tasks with their current status from task_value
        const tasksQuery = `
            SELECT 
                t.id, 
                t.step_id, 
                t.name, 
                COALESCE(tv_latest.status, 'pending') as status,
                t.type,
                t.text,
                t.url,
                t.sort_order, 
                t.created_at,
                COALESCE(tv_latest.status_updated_at, t.updated_at) as updated_at
            FROM tasks t
            LEFT JOIN LATERAL (
                SELECT 
                    tv.status,
                    tv.created_at as status_updated_at
                FROM task_value tv
                WHERE tv.task_id = t.id 
                AND tv.transactions_id = $1
                ORDER BY tv.created_at DESC
                LIMIT 1
            ) tv_latest ON true
            ORDER BY t.step_id, t.sort_order
        `;
        const tasks = await pool.query(tasksQuery, [transactionId]);

        // Fetch step details
        const detailsQuery = `
            SELECT step_id, detail_key, detail_value
            FROM step_details
        `;
        const detailsResult = await pool.query(detailsQuery);

        // Transform step details into grouped object
        const stepDetails = {};
        detailsResult.rows.forEach(detail => {
            if (!stepDetails[detail.step_id]) {
                stepDetails[detail.step_id] = {};
            }
            stepDetails[detail.step_id][detail.detail_key] = detail.detail_value;
        });

        res.json({
            transactionId,
            phases: phases.rows,
            steps: steps.rows,
            tasks: tasks.rows,
            stepDetails,
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error('Error fetching transaction data:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
        //pool.release();
    }
});

// PATCH /api/transactions/:transactionId/tasks/:taskId/status
// Update task status in task_value table
router.patch('/:transactionId/tasks/:taskId/status', async (req, res) => {
    //const pool = await db.connect();
    try {
        const { transactionId, taskId } = req.params;
        const { status, notes, userId } = req.body; // userId optional for tracking who made the change

        // Validate inputs
        if (!transactionId || isNaN(transactionId)) {
            return res.status(400).json({ message: 'Invalid transaction ID' });
        }
        if (!taskId || isNaN(taskId)) {
            return res.status(400).json({ message: 'Invalid task ID' });
        }

        // Validate status
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Check if task exists
        const taskExistsQuery = 'SELECT id, step_id FROM tasks WHERE id = $1';
        const taskResult = await pool.query(taskExistsQuery, [taskId]);

        if (taskResult.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const stepId = taskResult.rows[0].step_id;

        // Insert new status record into task_value
        const updateStatusQuery = `
                UPDATE task_value
                SET 
                    status = $3,
                    changed_by = $4,
                    notes = $5
                WHERE 
                    task_id = $1
                    AND transactions_id = $2
                RETURNING *;
            `;

        const statusResult = await pool.query(updateStatusQuery, [
            taskId,
            transactionId,
            status,
            userId || null,
            notes || null
        ]);

        // Get updated task with new status
        const updatedTaskQuery = `
            SELECT 
                t.id, 
                t.step_id, 
                t.name, 
                tv.status,
                tv.created_at as updated_at
            FROM tasks t
            JOIN task_value tv ON tv.task_id = t.id
            WHERE tv.id = $1
        `;
        const updatedTask = await pool.query(updatedTaskQuery, [statusResult.rows[0].id]);

        // Check if all tasks in the step are completed
        if (status === 'completed') {
            const checkStepQuery = `
                WITH latest_task_status AS (
                    SELECT DISTINCT ON (t.id) 
                        t.id,
                        COALESCE(tv.status, 'pending') as status
                    FROM tasks t
                    LEFT JOIN task_value tv ON tv.task_id = t.id 
                        AND tv.transactions_id = $1
                    WHERE t.step_id = $2
                    ORDER BY t.id, tv.created_at DESC
                )
                SELECT COUNT(*) FILTER (WHERE status != 'completed') AS incomplete_count
                FROM latest_task_status
            `;
            const checkResult = await pool.query(checkStepQuery, [transactionId, stepId]);

            const incompleteCount = parseInt(checkResult.rows[0].incomplete_count, 10);

            // Return step completion status
            updatedTask.rows[0].stepCompleted = incompleteCount === 0;

            if (incompleteCount === 0) {
                // Optionally update step status if you're still maintaining it
                const updateStepQuery = `
                    UPDATE steps
                    SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING id, status, updated_at
                `;
                const stepResult = await pool.query(updateStepQuery, [stepId]);
                updatedTask.rows[0].step = stepResult.rows[0];
            }
        }

        res.json(updatedTask.rows[0]);

    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
        // pool.release();
    }
});

// GET /api/transactions/:transactionId/progress
// Get transaction progress summary with dynamic task status
router.get('/:transactionId/progress', async (req, res) => {
    try {
        const { transactionId } = req.params;

        if (!transactionId || isNaN(transactionId)) {
            return res.status(400).json({ message: 'Invalid transaction ID' });
        }

        const progressQuery = `
            WITH task_status AS (
                SELECT DISTINCT ON (t.id) 
                    t.id,
                    t.step_id,
                    COALESCE(tv.status,'pending') as status
                FROM tasks t
                LEFT JOIN task_value tv ON tv.task_id = t.id 
                    AND tv.transactions_id = $1
                ORDER BY t.id, tv.created_at DESC
            ),
            step_status AS (
                SELECT 
                    s.id,
                    s.phase_id,
                    CASE 
                        WHEN COUNT(ts.id) = COUNT(CASE WHEN ts.status = 'completed' THEN 1 END) THEN 'completed'
                        WHEN COUNT(CASE WHEN ts.status IN ('in-progress', 'completed') THEN 1 END) > 0 THEN 'in-progress'
                        ELSE 'pending'
                    END as calculated_status
                FROM steps s
                LEFT JOIN task_status ts ON ts.step_id = s.id
                GROUP BY s.id, s.phase_id
            )
            SELECT 
                p.display_name as phase,
                COUNT(DISTINCT ss.id) as total_steps,
                COUNT(DISTINCT CASE WHEN ss.calculated_status = 'completed' THEN ss.id END) as completed_steps,
                COUNT(DISTINCT CASE WHEN ss.calculated_status = 'in-progress' THEN ss.id END) as in_progress_steps,
                COUNT(DISTINCT CASE WHEN ss.calculated_status = 'pending' THEN ss.id END) as pending_steps,
                CASE 
                    WHEN COUNT(DISTINCT ss.id) = 0 THEN 0
                    ELSE ROUND(
                        (COUNT(DISTINCT CASE WHEN ss.calculated_status = 'completed' THEN ss.id END)::float / 
                         COUNT(DISTINCT ss.id)::float) * 100, 
                        2
                    )
                END as completion_percentage
            FROM phases p
            LEFT JOIN step_status ss ON p.id = ss.phase_id
            GROUP BY p.id, p.display_name, p.sort_order
            ORDER BY p.sort_order
        `;

        const result = await db.query(progressQuery, [transactionId]);
        res.json(result.rows);

    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/transactions/:transactionId/tasks/:taskId/history
// Get task status history from task_value table
router.get('/:transactionId/tasks/:taskId/history', async (req, res) => {
    try {
        const { transactionId, taskId } = req.params;

        const historyQuery = `
            SELECT 
                tv.id,
                tv.status,
                tv.notes,
                tv.created_at,
                tv.changed_by,
                t.name as task_name
            FROM task_value tv
            JOIN tasks t ON tv.task_id = t.id
            WHERE tv.task_id = $1 
            AND tv.transactions_id = $2
            ORDER BY tv.created_at DESC
        `;

        const result = await db.query(historyQuery, [taskId, transactionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No history found for this task' });
        }

        res.json({
            taskId,
            transactionId,
            taskName: result.rows[0].task_name,
            history: result.rows
        });

    } catch (error) {
        console.error('Error fetching task history:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;