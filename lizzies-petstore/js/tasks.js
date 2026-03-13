/**
 * tasks.js — Daily task system for engagement.
 * Generates 3 daily tasks seeded by the current date.
 * Tasks refresh each day. Completing all 3 earns a daily star.
 *
 * Does NOT own a RAF loop. Exposes completeTask() called by game.js
 * when the matching action fires.
 */

class TaskManager {
    constructor() {
        this._taskPool = null; // Loaded from data/tasks.json
    }

    /**
     * Load the task pool from data/tasks.json. Idempotent.
     */
    async loadTasks() {
        if (this._taskPool) return this._taskPool;
        try {
            const resp = await fetch('data/tasks.json');
            this._taskPool = await resp.json();
        } catch (e) {
            console.warn('TaskManager: failed to load tasks.json', e);
            this._taskPool = [];
        }
        return this._taskPool;
    }

    /**
     * Get today's date key (YYYY-MM-DD).
     */
    _dateKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /**
     * Seeded PRNG (Mulberry32) for deterministic daily task selection.
     */
    _seededRandom(seed) {
        let s = seed | 0;
        return () => {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
        };
    }

    /**
     * Hash a string to a seed number.
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        }
        return hash;
    }

    /**
     * Get today's 3 tasks. Generates if new day or first launch.
     * Returns { date, taskIds, completed, totalStars }.
     */
    getDailyTasks() {
        const data = window.saveManager.load();
        const today = this._dateKey();

        if (!data.dailyTasks || data.dailyTasks.date !== today) {
            // New day — generate fresh tasks
            const taskIds = this._pickTasks(today);
            data.dailyTasks = {
                date: today,
                taskIds: taskIds,
                completed: []
            };
            window.saveManager.save(data);
        }

        return data.dailyTasks;
    }

    /**
     * Pick 3 unique tasks seeded by date string.
     */
    _pickTasks(dateStr) {
        if (!this._taskPool || this._taskPool.length < 3) return [];
        const rng = this._seededRandom(this._hashString(dateStr));
        const pool = [...this._taskPool];
        const picked = [];

        // Fisher-Yates partial shuffle to pick 3
        for (let i = pool.length - 1; i > 0 && picked.length < 3; i--) {
            const j = Math.floor(rng() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
            picked.push(pool[i].id);
        }

        return picked;
    }

    /**
     * Get task metadata by ID.
     */
    getTaskById(id) {
        if (!this._taskPool) return null;
        return this._taskPool.find(t => t.id === id) || null;
    }

    /**
     * Mark a task as complete by its action name.
     * Returns { task, allComplete, incompleteCount } if newly completed, or null.
     */
    completeTask(action) {
        const data = window.saveManager.load();
        if (!data.dailyTasks || data.dailyTasks.date !== this._dateKey()) return null;
        if (!this._taskPool) return null;

        // Find a matching task that's in today's list and not yet completed
        const task = this._taskPool.find(t =>
            t.action === action &&
            data.dailyTasks.taskIds.includes(t.id) &&
            !data.dailyTasks.completed.includes(t.id)
        );

        if (!task) return null;

        data.dailyTasks.completed.push(task.id);

        const allComplete = data.dailyTasks.completed.length >= data.dailyTasks.taskIds.length;

        // Award star if all 3 completed
        if (allComplete) {
            data.dailyTasks.totalStars = (data.dailyTasks.totalStars || 0) + 1;
        }

        window.saveManager.save(data);
        return {
            task,
            allComplete,
            incompleteCount: data.dailyTasks.taskIds.length - data.dailyTasks.completed.length
        };
    }

    /**
     * Get count of incomplete tasks.
     */
    incompleteCount() {
        const data = window.saveManager.load();
        if (!data.dailyTasks || data.dailyTasks.date !== this._dateKey()) return 3;
        return data.dailyTasks.taskIds.length - data.dailyTasks.completed.length;
    }
}
