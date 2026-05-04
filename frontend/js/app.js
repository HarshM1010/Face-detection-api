/**
 * FaceDetect AI — Frontend Application
 *
 * Handles video upload, processing status polling, and results display.
 */

const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : `${window.location.protocol}//${window.location.hostname}:8000`;

// ─── DOM Elements ───────────────────────────────────────────────────────────

const uploadSection = document.getElementById('upload-section');
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const selectBtn = document.getElementById('select-btn');

const processingSection = document.getElementById('processing-section');
const processingStatus = document.getElementById('processing-status');
const progressFill = document.getElementById('progress-fill');

const resultsSection = document.getElementById('results-section');
const videoPlayer = document.getElementById('video-player');
const videoSource = document.getElementById('video-source');
const roiCount = document.getElementById('roi-count');
const roiTableBody = document.getElementById('roi-table-body');
const statTotalFrames = document.getElementById('stat-total-frames');
const statDetections = document.getElementById('stat-detections');
const statRate = document.getElementById('stat-rate');

const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const uploadAnotherBtn = document.getElementById('upload-another-btn');
const connectionStatus = document.getElementById('connection-status');

// ─── State ──────────────────────────────────────────────────────────────────

let currentVideoId = null;
let pollInterval = null;

// ─── Upload Handlers ────────────────────────────────────────────────────────

// Click to select
selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

uploadZone.addEventListener('click', () => {
    fileInput.click();
});

// File selected
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
    }
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
    }
});

// Upload another
uploadAnotherBtn.addEventListener('click', resetToUpload);
retryBtn.addEventListener('click', resetToUpload);

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Upload a video file to the backend API.
 * @param {File} file
 */
async function uploadFile(file) {
    // Validate file type
    const allowed = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showError(`File type "${ext}" is not supported. Please use: ${allowed.join(', ')}`);
        return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
        showError('File is too large. Maximum size is 100 MB.');
        return;
    }

    showSection('processing');
    updateStatus('Uploading...', 'Uploading video to server');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE}/api/v1/video/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Upload failed (HTTP ${response.status})`);
        }

        const data = await response.json();
        currentVideoId = data.id;

        updateStatus('Processing', 'Detecting faces and drawing ROI...');
        progressFill.style.width = '30%';

        // Start polling for completion
        startPolling(data.id);

    } catch (err) {
        console.error('Upload error:', err);
        showError(err.message || 'Failed to upload video. Is the backend running?');
    }
}

/**
 * Poll the backend for video processing status.
 * @param {string} videoId
 */
function startPolling(videoId) {
    let progress = 30;
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/v1/video/${videoId}/status`);
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(pollInterval);
                progressFill.style.width = '100%';
                updateStatus('Processing', 'Loading results...');
                setTimeout(() => showResults(videoId), 500);

            } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                showError(data.error_message || 'Video processing failed.');

            } else {
                // Animate progress
                progress = Math.min(progress + 5, 90);
                progressFill.style.width = `${progress}%`;
            }
        } catch (err) {
            console.error('Polling error:', err);
            // Don't stop polling on network hiccups
        }
    }, 2000);
}

/**
 * Display the processed video and ROI data.
 * @param {string} videoId
 */
async function showResults(videoId) {
    try {
        // Set video source
        videoSource.src = `${API_BASE}/api/v1/video/${videoId}/stream`;
        videoPlayer.load();

        // Fetch ROI data
        const roiResponse = await fetch(`${API_BASE}/api/v1/video/${videoId}/roi`);
        if (!roiResponse.ok) throw new Error('Failed to fetch ROI data');

        const roiData = await roiResponse.json();

        // Update stats
        statTotalFrames.textContent = roiData.total_frames.toLocaleString();
        statDetections.textContent = roiData.faces_detected.toLocaleString();
        const rate = roiData.total_frames > 0
            ? ((roiData.faces_detected / roiData.total_frames) * 100).toFixed(1)
            : '0';
        statRate.textContent = `${rate}%`;
        roiCount.textContent = `${roiData.faces_detected} detections`;

        // Populate ROI table
        roiTableBody.innerHTML = '';
        roiData.roi_data.forEach(roi => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${roi.frame_number}</td>
                <td>${roi.x_min}</td>
                <td>${roi.y_min}</td>
                <td>${roi.x_max}</td>
                <td>${roi.y_max}</td>
                <td class="confidence-cell">${(roi.confidence * 100).toFixed(1)}%</td>
            `;
            roiTableBody.appendChild(row);
        });

        showSection('results');
        updateStatus('Ready', 'Results loaded');

    } catch (err) {
        console.error('Results error:', err);
        showError(err.message || 'Failed to load results.');
    }
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────

/**
 * Show a specific section and hide all others.
 * @param {'upload' | 'processing' | 'results' | 'error'} section
 */
function showSection(section) {
    uploadSection.classList.toggle('hidden', section !== 'upload');
    processingSection.classList.toggle('hidden', section !== 'processing');
    resultsSection.classList.toggle('hidden', section !== 'results');
    errorSection.classList.toggle('hidden', section !== 'error');
}

/**
 * Update the connection status badge.
 */
function updateStatus(badge, detail) {
    connectionStatus.innerHTML = `<span class="status-dot"></span>${badge}`;
    if (detail) processingStatus.textContent = detail;
}

/**
 * Show the error section with a message.
 */
function showError(msg) {
    errorMessage.textContent = msg;
    showSection('error');
    updateStatus('Error', '');
}

/**
 * Reset the UI to the upload state.
 */
function resetToUpload() {
    currentVideoId = null;
    if (pollInterval) clearInterval(pollInterval);
    fileInput.value = '';
    progressFill.style.width = '0%';
    roiTableBody.innerHTML = '';
    showSection('upload');
    updateStatus('Ready', '');
}
