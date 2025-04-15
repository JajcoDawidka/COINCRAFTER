document.addEventListener('DOMContentLoaded', function() {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.querySelector('.fee-info');
    
    // Initialize fees
    const baseFee = 0.3;
    const socialFee = 0.1;
    let totalFee = baseFee;

    // Update fee display
    function updateFeeDisplay() {
        const additionalFees = [];
        
        if (socialToggle.checked) {
            additionalFees.push({
                name: 'Social Links',
                value: socialFee
            });
        }
        
        // Calculate total fee
        totalFee = baseFee + additionalFees.reduce((sum, fee) => sum + fee.value, 0);
        
        // Update display
        feeInfo.innerHTML = `
            <div class="base-fee">Base fee: <span>${baseFee} SOL</span></div>
            ${additionalFees.length > 0 ? `
                <div class="additional-fees">
                    ${additionalFees.map(fee => `
                        <div class="fee-item">
                            <span>${fee.name}:</span>
                            <span class="fee-value">+${fee.value} SOL</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="total-fee">Total: ${totalFee.toFixed(2)} SOL</div>
        `;
    }
    
    // Listen for checkbox changes
    socialToggle.addEventListener('change', updateFeeDisplay);
    updateFeeDisplay();
});

// =============================================
// MAIN SETTINGS
// =============================================
const APP_ENV = 'production';
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta');
const PAYMENT_ADDRESS = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';
const PAYMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// =============================================
// GLOBAL VARIABLES
// =============================================
let wallet;
let connection;
let currentSection = 'home';
let paymentModalTimer;
let paymentModal;

// =============================================
// APP INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    await initWallet();
    initNavigation();
    initTokenForm();
    initLogoUpload();
    initFAQ();
    console.log('App initialized');
});

// =============================================
// PHANTOM WALLET INTEGRATION
// =============================================
async function initWallet() {
    if (APP_ENV === 'development' && !window.solana) {
        console.warn('Dev mode - Phantom not available');
        window.solana = {
            connect: async () => ({ 
                publicKey: { 
                    toString: () => 'DEV_TEST_WALLET' 
                } 
            }),
            isConnected: false,
            on: () => {},
            disconnect: async () => {}
        };
    }

    if (!window.solana) {
        console.error('Phantom Wallet not available!');
        return;
    }

    wallet = window.solana;
    
    if (wallet.isConnected) {
        await handleWalletConnect();
    }
    
    wallet.on('connect', handleWalletConnect);
    wallet.on('disconnect', handleWalletDisconnect);
    
    document.getElementById('connect-wallet').addEventListener('click', toggleWalletConnection);
}

async function toggleWalletConnection() {
    try {
        if (!wallet.isConnected) {
            await wallet.connect();
        } else {
            await wallet.disconnect();
        }
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Wallet connection error: ' + error.message, 'error');
    }
}

async function handleWalletConnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    if (wallet?.publicKey) {
        const shortAddress = `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        
        connectBtn.textContent = 'Connected';
        connectBtn.classList.add('connected');
        walletAddress.textContent = shortAddress;
        walletAddress.style.display = 'block';
    }
}

function handleWalletDisconnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.classList.remove('connected');
    walletAddress.style.display = 'none';
}

// =============================================
// SECTION NAVIGATION
// =============================================
function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden-section');
            targetSection.classList.add('active-section');
            currentSection = sectionId;
        }
        
        navLinks.forEach(link => {
            if (link.getAttribute('href').startsWith('#')) {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            }
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href.startsWith('#')) {
                e.preventDefault();
                showSection(href.substring(1));
                history.pushState(null, null, href);
            }
        });
    });
    
    const homeCreateBtn = document.querySelector('.hero-text .create-token-btn');
    if (homeCreateBtn) {
        homeCreateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('create-token');
            history.pushState(null, null, '#create-token');
        });
    }
    
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1);
        showSection(hash || 'home');
    });
    
    showSection(window.location.hash.substring(1) || 'home');
}

// =============================================
// TOKEN CREATION
// =============================================
function initTokenForm() {
    const launchBtn = document.querySelector('.launch-token-btn');
    if (!launchBtn) return;
    
    document.getElementById('social-links-toggle').addEventListener('change', function() {
        document.getElementById('social-fields').style.display = this.checked ? 'block' : 'none';
    });
    
    launchBtn.addEventListener('click', async function() {
        if (!wallet?.isConnected) {
            showNotification('Please connect your Phantom Wallet first!', 'warning');
            return;
        }

        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim().toUpperCase();
        const tokenSupply = parseInt(document.getElementById('token-supply').value);

        if (!tokenName || tokenName.length > 32) {
            showNotification('Token name must be 1-32 characters', 'error');
            return;
        }

        if (!tokenSymbol || tokenSymbol.length > 10 || !/^[A-Z0-9]+$/.test(tokenSymbol)) {
            showNotification('Symbol must contain only A-Z and 0-9 (max 10 chars)', 'error');
            return;
        }

        if (isNaN(tokenSupply) || tokenSupply <= 0) {
            showNotification('Please enter a valid token supply', 'error');
            return;
        }

        const totalFee = calculateTotalFee();
        showPaymentModal(totalFee);
    });
}

function calculateTotalFee() {
    const baseFee = 0.3;
    const socialFee = document.getElementById('social-links-toggle').checked ? 0.1 : 0;
    return baseFee + socialFee;
}

// =============================================
// PAYMENT MODAL WITH TIMER
// =============================================
function showPaymentModal(totalFee) {
    if (document.querySelector('.payment-modal-overlay')) return;

    // Clear any existing timer
    if (paymentModalTimer) {
        clearInterval(paymentModalTimer);
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'payment-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'payment-modal';
    modalContent.style.cssText = `
        background: #1A1A1A;
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        border: 1px solid rgba(255, 215, 0, 0.3);
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        text-align: center;
    `;

    // Initial time display
    let timeLeft = PAYMENT_TIMEOUT;
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    modalContent.innerHTML = `
        <h2 style="color: #FFD700; margin-bottom: 1.5rem;">Send Payment</h2>
        
        <div style="background: rgba(255, 215, 0, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
            <p style="margin-bottom: 0.5rem; color: white;">Send exactly <strong>${totalFee} SOL</strong> to:</p>
            <div class="copy-box" style="display: flex; align-items: center; background: rgba(0, 0, 0, 0.3); padding: 0.8rem; border-radius: 6px; margin-top: 0.5rem;">
                <code style="flex-grow: 1; word-break: break-all; font-family: monospace; color: #FFD700;">
                    ${PAYMENT_ADDRESS}
                </code>
                <button class="copy-btn" style="background: transparent; border: none; color: white; cursor: pointer; padding: 0.5rem; margin-left: 0.5rem;">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                </button>
            </div>
            <div class="payment-timer" style="margin-top: 1rem; color: white; font-weight: bold;">
                Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}
            </div>
        </div>
        
        <div style="display: flex; justify-content: center; margin: 1.5rem 0;">
            <div class="loader" style="width: 40px; height: 40px; border: 3px solid rgba(255, 215, 0, 0.3); border-top-color: #FFD700; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 1.5rem;">
            Waiting for transaction...
        </p>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    paymentModal = modalOverlay;

    // Start countdown
    paymentModalTimer = setInterval(() => {
        timeLeft -= 1000;
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        const timerDisplay = modalContent.querySelector('.payment-timer');
        
        timerDisplay.textContent = `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(paymentModalTimer);
            modalContent.querySelector('p').textContent = 'Transaction not detected. Please try again.';
            modalContent.querySelector('.loader').style.display = 'none';
            timerDisplay.style.color = '#FF6B6B';
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                document.body.removeChild(modalOverlay);
            }, 5000);
        }
    }, 1000);

    // Copy button functionality with notification
    modalContent.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(PAYMENT_ADDRESS).then(() => {
            showNotification('Address copied to clipboard!', 'success');
            const copyBtn = modalContent.querySelector('.copy-btn');
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg>';
            setTimeout(() => copyBtn.innerHTML = originalHTML, 2000);
        }).catch(err => {
            showNotification('Failed to copy address', 'error');
            console.error('Copy failed:', err);
        });
    });

    // Close modal when clicking outside
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            clearInterval(paymentModalTimer);
            document.body.removeChild(modalOverlay);
        }
    });
}

// =============================================
// LOGO UPLOAD (OPTIMIZED VERSION)
// =============================================
function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    if (!uploadArea) return;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.png,.jpg,.jpeg';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function() {
        if (this.files?.[0]) {
            if (!['image/png', 'image/jpeg'].includes(this.files[0].type)) {
                showNotification('Only PNG and JPG files are accepted', 'error');
                return;
            }
            
            if (this.files[0].size > 2 * 1024 * 1024) {
                showNotification('Maximum file size is 2MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadArea.innerHTML = `
                    <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                        <img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Token logo">
                    </div>
                    <p style="position: absolute; bottom: 10px; width: 100%; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.9rem;">Click to change</p>
                `;
            };
            reader.onerror = () => showNotification('Error loading file', 'error');
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Drag & drop handling
    ['dragover', 'dragleave', 'drop'].forEach(event => {
        uploadArea.addEventListener(event, (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 
                event === 'dragover' ? '#9945FF' : 'rgba(255, 255, 255, 0.1)';
            uploadArea.style.backgroundColor = 
                event === 'dragover' ? 'rgba(153, 69, 255, 0.1)' : 'transparent';
            
            if (event === 'drop' && e.dataTransfer.files?.[0]) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    });
}

// =============================================
// FAQ SECTION
// =============================================
function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        question.addEventListener('click', () => {
            const isExpanded = question.getAttribute('aria-expanded') === 'true';
            question.setAttribute('aria-expanded', !isExpanded);
            answer.setAttribute('aria-hidden', isExpanded);
        });
        
        question.setAttribute('aria-expanded', 'false');
        answer.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.currentTarget.parentElement.querySelector('code').textContent;
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
                setTimeout(() => btn.innerHTML = originalHTML, 2000);
            });
        });
    });
}

// =============================================
// NOTIFICATION SYSTEM (ENHANCED)
// =============================================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            ${type === 'success' ? 
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' :
             type === 'error' ? 
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' :
             type === 'warning' ?
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>' :
             '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
            }
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// =============================================
// DYNAMIC STYLES
// =============================================
const appStyles = document.createElement('style');
appStyles.textContent = `
@keyframes spin {
    to { transform: rotate(360deg); }
}

.notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    z-index: 1001;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
}

.notification.info {
    background: #9945FF;
    border-left: 4px solid #7E3AD8;
}

.notification.error {
    background: #FF6B6B;
    border-left: 4px solid #E05555;
}

.notification.warning {
    background: #FFA000;
    border-left: 4px solid #E09000;
}

.notification.success {
    background: #14F195;
    border-left: 4px solid #10D085;
}

.notification.fade-out {
    animation: fadeOut 0.5s ease;
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

/* Improved logo upload area styles */
#logo-upload-area {
    position: relative;
    min-height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}

#logo-upload-area img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 4px;
}

/* Animation for copy buttons */
.copy-btn {
    transition: all 0.2s ease;
}

.copy-btn:hover {
    transform: scale(1.1);
    opacity: 0.9;
}
`;
document.head.appendChild(appStyles);
