document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        videoFile: null,
        caption: '',
        platforms: {
            facebook: { selected: false, token: '' },
            instagram: { selected: false, token: '' },
            youtube: { selected: false, token: '' },
            tiktok: { selected: false, token: '' }
        },
        token: localStorage.getItem('saas_token') || null,
        user: JSON.parse(localStorage.getItem('saas_user')) || null
    };

    let API_BASE = localStorage.getItem('saas_backend_url') || (window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:4000');

    // Elements
    const dashboardContainer = document.querySelector('.dashboard-container');
    const authOverlay = document.getElementById('auth-overlay');
    
    // Auth Elements
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authBackendUrl = document.getElementById('auth-backend-url');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authError = document.getElementById('auth-error');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const logoutBtn = document.getElementById('logout-btn');

    let isLoginMode = true;

    // API Elements
    const apiModal = document.getElementById('api-modal');
    const openApiDocsBtn = document.getElementById('open-api-docs-btn');
    const closeApiBtn = document.getElementById('close-api-btn');
    const apiKeyDisplay = document.getElementById('api-key-display');
    const curlApiKey = document.getElementById('curl-api-key');
    const copyCurlBtn = document.getElementById('copy-curl-btn');

    // Settings Elements
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsBackendUrl = document.getElementById('settings-backend-url');
    const cloudinaryNameInput = document.getElementById('cloudinary-cloud-name');
    const cloudinaryPresetInput = document.getElementById('cloudinary-upload-preset');
    const n8nWebhookInput = document.getElementById('n8n-webhook-url');

    // Dashboard Elements
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const filenameDisplay = document.getElementById('filename-display');
    const removeFileBtn = document.getElementById('remove-file-btn');
    
    const captionInput = document.getElementById('caption-input');
    const charCount = document.getElementById('char-count');
    const generateAiBtn = document.getElementById('generate-ai-btn');

    const summaryVideo = document.getElementById('summary-video');
    const summaryCaption = document.getElementById('summary-caption');
    const publishBtn = document.getElementById('publish-btn');
    
    const statusBar = document.getElementById('status-bar');
    const closeStatusBtn = document.getElementById('close-status-btn');
    const statusMessage = document.getElementById('status-message');
    const statusTitle = document.getElementById('status-title');
    const statusIcon = document.getElementById('status-icon');
    const retryBtn = document.getElementById('retry-btn');

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    const stepCards = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3')
    ];

    const progressFill = document.getElementById('progress-fill');
    const progressDots = [
        document.getElementById('dot-1'),
        document.getElementById('dot-2'),
        document.getElementById('dot-3')
    ];

    // --- Authentication Flow ---
    const checkAuth = () => {
        if (state.token && state.user) {
            authOverlay.classList.add('hidden');
            dashboardContainer.style.display = 'block';
            
            // Populate API Key
            apiKeyDisplay.value = state.user.apiKey;
            curlApiKey.textContent = state.user.apiKey;

            // Populate stored tokens
            if (state.user.facebookToken) populateToken('facebook', state.user.facebookToken);
            if (state.user.instagramToken) populateToken('instagram', state.user.instagramToken);
            if (state.user.youtubeToken) populateToken('youtube', state.user.youtubeToken);
            if (state.user.tiktokToken) populateToken('tiktok', state.user.tiktokToken);

        } else {
            authOverlay.classList.remove('hidden');
            dashboardContainer.style.display = 'none';
        }
    };

    const populateToken = (platform, token) => {
        // Obsolete function, retained for state sync if needed
        state.platforms[platform].token = token;
    };

    authSwitchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Log In' : 'Sign Up';
        authSubtitle.textContent = isLoginMode ? 'Welcome back to your dashboard' : 'Create your SaaS account';
        authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
        authSwitchText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        authSwitchBtn.textContent = isLoginMode ? "Sign Up" : "Log In";
        authError.style.display = 'none';
    });

    authSubmitBtn.addEventListener('click', async () => {
        const email = authEmail.value.trim();
        const password = authPassword.value.trim();

        if (!email || !password) {
            authError.textContent = 'Please fill in all fields';
            authError.style.display = 'block';
            return;
        }

        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        
        try {
            authSubmitBtn.disabled = true;
            authSubmitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Processing...';

            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (!isLoginMode) {
                // Auto login after register
                isLoginMode = true;
                authSubmitBtn.click();
                return;
            }

            // Save state
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('saas_token', data.token);
            localStorage.setItem('saas_user', JSON.stringify(data.user));

            authError.style.display = 'none';
            checkAuth();

        } catch (error) {
            authError.textContent = error.message;
            authError.style.display = 'block';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
        }
    });

    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = authPassword.type === 'password';
            authPassword.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.innerHTML = isPassword ? '<i class="ph ph-eye-slash"></i>' : '<i class="ph ph-eye"></i>';
        });
    }

    logoutBtn.addEventListener('click', () => {
        state.token = null;
        state.user = null;
        localStorage.removeItem('saas_token');
        localStorage.removeItem('saas_user');
        checkAuth();
    });

    // --- API Docs ---
    openApiDocsBtn.addEventListener('click', () => apiModal.classList.remove('hidden'));
    closeApiBtn.addEventListener('click', () => apiModal.classList.add('hidden'));

    copyCurlBtn.addEventListener('click', () => {
        const pre = document.querySelector('pre');
        navigator.clipboard.writeText(pre.innerText);
        copyCurlBtn.textContent = 'Copied!';
        setTimeout(() => copyCurlBtn.textContent = 'Copy cURL', 2000);
    });

    // --- Settings Modal ---
    const loadSettings = () => {
        settingsBackendUrl.value = localStorage.getItem('saas_backend_url') || '';
        cloudinaryNameInput.value = localStorage.getItem('saas_cloud_name') || '';
        cloudinaryPresetInput.value = localStorage.getItem('saas_upload_preset') || '';
        n8nWebhookInput.value = localStorage.getItem('saas_n8n_webhook') || '';
    };
    loadSettings();

    // Set initial auth backend url value
    if (authBackendUrl) {
        authBackendUrl.value = API_BASE;
    }

    openSettingsBtn.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        const backendUrl = settingsBackendUrl.value.trim();
        const sanitizedBackendUrl = backendUrl.replace(/\/$/, '');
        localStorage.setItem('saas_backend_url', sanitizedBackendUrl);
        API_BASE = sanitizedBackendUrl;
        if (authBackendUrl) {
            authBackendUrl.value = sanitizedBackendUrl;
        }

        localStorage.setItem('saas_cloud_name', cloudinaryNameInput.value.trim());
        localStorage.setItem('saas_upload_preset', cloudinaryPresetInput.value.trim());
        localStorage.setItem('saas_n8n_webhook', n8nWebhookInput.value.trim());
        
        saveSettingsBtn.innerHTML = '<i class="ph ph-check"></i> Saved!';
        saveSettingsBtn.style.background = 'var(--success)';
        
        setTimeout(() => {
            settingsModal.classList.add('hidden');
            saveSettingsBtn.innerHTML = 'Save Settings';
            saveSettingsBtn.style.background = '';
        }, 1000);
    });




    // --- UI Interactions ---
    const handleFileUpload = (file) => {
        if (!file) return;
        const validTypes = ['.mp4', '.mov', '.avi'];
        const isValid = validTypes.some(type => file.name.toLowerCase().endsWith(type));
        
        if (isValid) {
            state.videoFile = file;
            uploadZone.classList.add('hidden');
            filePreview.classList.remove('hidden');
            filenameDisplay.textContent = file.name;
            
            // Enable Step 2
            stepCards[1].classList.remove('disabled');
            captionInput.disabled = false;
            updateProgress(2);
            updateSummary();
        } else {
            alert('Please upload a valid video file (MP4, MOV, AVI)');
        }
    };

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFileUpload(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0]);
    });

    removeFileBtn.addEventListener('click', () => {
        state.videoFile = null;
        fileInput.value = '';
        uploadZone.classList.remove('hidden');
        filePreview.classList.add('hidden');
        
        // Disable subsequent steps
        captionInput.value = '';
        state.caption = '';
        charCount.textContent = '0';
        
        stepCards[1].classList.add('disabled');
        captionInput.disabled = true;
        
        // Reset publish button
        publishBtn.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Publish';
        publishBtn.style.backgroundColor = '';
        
        checkStep3();
        updateSummary();
        updateProgress(1);
    });

    captionInput.addEventListener('input', (e) => {
        state.caption = e.target.value;
        charCount.textContent = state.caption.length;
        checkStep3();
        updateSummary();
    });

    generateAiBtn.addEventListener('click', async () => {
        if (!state.videoFile) return;
        
        const originalText = generateAiBtn.innerHTML;
        generateAiBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generating...';
        generateAiBtn.disabled = true;

        const filename = state.videoFile.name.replace(/\.[^/.]+$/, ""); 
        
        setTimeout(() => {
            const formattedName = filename.replace(/[-_]/g, ' ');
            const tagName = filename.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
            const aiCaption = `Here is our latest video: ${formattedName}. Check it out and let us know your thoughts. #Video #Auto #${tagName} #Social`;
            const finalCaption = aiCaption.substring(0, 220);
            
            state.caption = finalCaption;
            captionInput.value = finalCaption;
            charCount.textContent = finalCaption.length;
            
            generateAiBtn.innerHTML = originalText;
            generateAiBtn.disabled = false;
            
            checkStep3();
            updateSummary();
        }, 1500);
    });

    const checkStep3 = () => {
        if (state.caption.trim().length > 0) {
            stepCards[2].classList.remove('disabled');
            publishBtn.disabled = false;
            updateProgress(3);
        } else {
            stepCards[2].classList.add('disabled');
            publishBtn.disabled = true;
            updateProgress(2);
        }
    };

    const updateSummary = () => {
        summaryVideo.textContent = state.videoFile ? state.videoFile.name : '-';
        if (state.caption) {
            const preview = state.caption.length > 80 ? state.caption.substring(0, 80) + '...' : state.caption;
            summaryCaption.textContent = preview;
        } else {
            summaryCaption.textContent = '-';
        }
    };

    // --- Publish to new Backend API ---
    const doPublish = async () => {
        loadingOverlay.classList.remove('hidden');
        statusBar.classList.add('hidden');
        statusBar.classList.remove('error');

        try {
            loadingText.textContent = 'Uploading to Server...';
            
            const formData = new FormData();
            formData.append('video', state.videoFile);
            formData.append('title', state.caption);
            formData.append('platforms', 'all');
            formData.append('cloud_name', localStorage.getItem('saas_cloud_name') || '');
            formData.append('upload_preset', localStorage.getItem('saas_upload_preset') || '');
            formData.append('webhook_url', localStorage.getItem('saas_n8n_webhook') || '');

            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                headers: {
                    'x-api-key': state.user.apiKey
                },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Server error occurred');
            }

            // Success
            loadingOverlay.classList.add('hidden');
            
            statusTitle.textContent = 'Successfully Uploaded!';
            statusMessage.textContent = `Your video has been published.`;
            statusIcon.className = 'ph ph-check-circle';
            statusBar.classList.remove('error');
            retryBtn.classList.add('hidden');
            statusBar.classList.remove('hidden');
            
            // Update button to show success state permanently
            publishBtn.innerHTML = '<i class="ph ph-check"></i> Published';
            publishBtn.style.backgroundColor = 'var(--success, #10b981)';
            publishBtn.disabled = true;

        } catch (error) {
            console.error(error);
            loadingOverlay.classList.add('hidden');
            
            statusTitle.textContent = 'Upload Failed';
            statusMessage.textContent = error.message;
            statusIcon.className = 'ph ph-warning-circle';
            statusBar.classList.add('error');
            retryBtn.classList.remove('hidden');
            statusBar.classList.remove('hidden');
        }
    };

    publishBtn.addEventListener('click', doPublish);
    retryBtn.addEventListener('click', () => {
        statusBar.classList.add('hidden');
        doPublish();
    });
    closeStatusBtn.addEventListener('click', () => {
        statusBar.classList.add('hidden');
    });

    const updateProgress = (step) => {
        const percentage = ((step - 1) / 2) * 100;
        progressFill.style.width = `${percentage}%`;
        progressDots.forEach((dot, index) => {
            if (index < step) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    };

    // Init
    checkAuth();
});
