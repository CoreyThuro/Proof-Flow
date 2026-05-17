"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AristotleTimeoutError = exports.AristotleFailedError = void 0;
exports.isAristotleConfigured = isAristotleConfigured;
exports.createAristotleProject = createAristotleProject;
exports.pollUntilComplete = pollUntilComplete;
exports.checkProjectStatus = checkProjectStatus;
const BASE_URL = 'https://aristotle.harmonic.fun/api/v2';
const POLL_INTERVAL_MS = 20000;
const MAX_WAIT_MS = 360000; // 6 minutes; proofs typically take 1–5 min
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getApiKey() {
    const key = process.env.ARISTOTLE_API_KEY;
    if (!key)
        throw new Error('ARISTOTLE_API_KEY not set');
    return key;
}
function isAristotleConfigured() {
    return Boolean(process.env.ARISTOTLE_API_KEY);
}
class AristotleFailedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AristotleFailedError';
    }
}
exports.AristotleFailedError = AristotleFailedError;
class AristotleTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AristotleTimeoutError';
    }
}
exports.AristotleTimeoutError = AristotleTimeoutError;
// Creates a project, submits the sorry-based Lean code, and returns the project ID.
// Call this before pollUntilComplete so the ID can be persisted to DB for watchdog recovery.
async function createAristotleProject(leanCodeWithSorry) {
    const apiKey = getApiKey();
    const res = await fetch(`${BASE_URL}/project?project_type=2`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: leanCodeWithSorry }),
    });
    if (!res.ok) {
        throw new Error(`Aristotle create project: ${res.status} ${await res.text()}`);
    }
    const { project_id } = (await res.json());
    return project_id;
}
// Poll an already-submitted project until COMPLETE, then download and return the result.
// Throws AristotleFailedError if the project ends in FAILED/CANCELED.
// Throws AristotleTimeoutError if MAX_WAIT_MS elapses.
async function pollUntilComplete(projectId) {
    const apiKey = getApiKey();
    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const statusRes = await fetch(`${BASE_URL}/project/${projectId}`, {
            headers: { 'X-API-Key': apiKey },
        });
        if (!statusRes.ok)
            continue; // transient network error — keep polling
        const { status } = (await statusRes.json());
        if (status === 'COMPLETE') {
            const resultRes = await fetch(`${BASE_URL}/project/${projectId}/result`, {
                headers: { 'X-API-Key': apiKey },
            });
            if (!resultRes.ok) {
                throw new Error(`Aristotle result download: ${resultRes.status} ${await resultRes.text()}`);
            }
            return await resultRes.text();
        }
        if (status === 'FAILED' || status === 'CANCELED') {
            throw new AristotleFailedError(`Aristotle project ${projectId} ended with status ${status}`);
        }
        // QUEUED / IN_PROGRESS / UNKNOWN: keep polling
    }
    throw new AristotleTimeoutError(`Aristotle project ${projectId} timed out after ${MAX_WAIT_MS / 1000}s`);
}
// Used by the watchdog to check an existing project's status without blocking.
async function checkProjectStatus(projectId) {
    const apiKey = getApiKey();
    const res = await fetch(`${BASE_URL}/project/${projectId}`, {
        headers: { 'X-API-Key': apiKey },
    });
    if (!res.ok)
        throw new Error(`Aristotle status check: ${res.status}`);
    const { status } = (await res.json());
    return status;
}
//# sourceMappingURL=aristotleClient.js.map