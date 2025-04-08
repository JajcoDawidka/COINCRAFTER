// Inicjalizacja zmiennych
let wallet;
let provider;
let connection;
const network = solanaWeb3.clusterApiUrl('mainnet-beta'); // Możesz zmienić na 'devnet' dla testów

// Główne funkcje portfela
async function initWallet() {
    if ('solana' in window) {
        wallet = window.solana;
        provider = new window.PhantomWalletAdapter();
        
        // Auto-connect jeśli już zalogowany
        if (wallet.isConnected) {
            await handleWalletConnect();
        }
        
        // Nasłuchuj zmian stanu portfela
        wallet.on('connect', handleWalletConnect);
        wallet.on('disconnect', handleWalletDisconnect);
    }
    
    // Inicjalizacja połączenia z blockchainem
    connection = new solanaWeb3.Connection(network, 'confirmed');
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
        
        console.log('Connected wallet:', wallet.publicKey.toString());
    }
}

function handleWalletDisconnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.classList.remove('connected');
    walletAddress.style.display = 'none';
}

// Funkcje nawigacji
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
            e.preventDefault();
            const targetSection = this.getAttribute('href').substring(1);
            showSection(targetSection);
            history.pushState(null, null, `#${targetSection}`);
        });
    });
    
    // Obsługa przycisku "Create Token" na stronie głównej
    const homeCreateBtn = document.querySelector('.hero-text .create-token-btn');
    if (homeCreateBtn) {
        homeCreateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('create-token');
            history.pushState(null, null, '#create-token');
        });
    }
    
    // Obsługa historii przeglądarki
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.substring(1);
        const validSections = Array.from(sections).map(s => s.id);
        
        if (hash && validSections.includes(hash)) {
            showSection(hash);
        } else {
            showSection('home');
        }
    });
    
    // Inicjalizacja sekcji
    const initialHash = window.location.hash.substring(1);
    const validSections = Array.from(sections).map(s => s.id);
    const initialSection = validSections.includes(initialHash) ? initialHash : 'home';
    showSection(initialSection);
}

// Funkcje tworzenia tokena
async function setupTokenCreation() {
    const launchBtn = document.querySelector('.launch-token-btn');
    if (!launchBtn) return;
    
    launchBtn.addEventListener('click', async function() {
        if (!wallet?.isConnected) {
            alert('Please connect your Phantom Wallet first');
            return;
        }
        
        const tokenName = document.getElementById('token-name').value;
        const tokenSymbol = document.getElementById('token-symbol').value;
        const tokenDecimals = parseInt(document.getElementById('token-decimals').value);
        const tokenSupply = parseInt(document.getElementById('token-supply').value);
        
        // Walidacja
        if (!tokenName || tokenName.length > 32) {
            alert('Token name must be between 1-32 characters');
            return;
        }
        
        if (!tokenSymbol || tokenSymbol.length > 10) {
            alert('Token symbol must be between 1-10 characters');
            return;
        }
        
        if (isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Please enter valid token supply');
            return;
        }
        
        // Pokazanie ładowania
        launchBtn.disabled = true;
        launchBtn.innerHTML = '<span class="loader"></span> Creating Token...';
        
        try {
            const tokenAddress = await createToken(
                tokenName,
                tokenSymbol,
                tokenDecimals,
                tokenSupply
            );
            
            alert(`Token created successfully!\nAddress: ${tokenAddress}`);
        } catch (error) {
            console.error('Token creation error:', error);
            alert(`Token creation failed: ${error.message}`);
        } finally {
            launchBtn.disabled = false;
            launchBtn.textContent = 'Launch Token';
        }
    });
}

async function createToken(name, symbol, decimals, supply) {
    const mintKeypair = solanaWeb3.Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(
        solanaWeb3.MintLayout.span
    );
    
    // 1. Create Mint Account
    const createAccountIx = solanaWeb3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: solanaWeb3.MintLayout.span,
        lamports,
        programId: solanaWeb3.TOKEN_PROGRAM_ID,
    });
    
    // 2. Initialize Mint
    const initMintIx = solanaWeb3.Token.createInitMintInstruction(
        solanaWeb3.TOKEN_PROGRAM_ID,
        mintKeypair.publicKey,
        decimals,
        wallet.publicKey, // Mint Authority
        wallet.publicKey  // Freeze Authority
    );
    
    // 3. Create Associated Token Account
    const associatedAccount = await solanaWeb3.Token.getAssociatedTokenAddress(
        solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
        solanaWeb3.TOKEN_PROGRAM_ID,
        mintKeypair.publicKey,
        wallet.publicKey
    );
    
    const createATA = solanaWeb3.Token.createAssociatedTokenAccountInstruction(
        solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
        solanaWeb3.TOKEN_PROGRAM_ID,
        mintKeypair.publicKey,
        associatedAccount,
        wallet.publicKey,
        wallet.publicKey
    );
    
    // 4. Mint Tokens
    const mintToIx = solanaWeb3.Token.createMintToInstruction(
        solanaWeb3.TOKEN_PROGRAM_ID,
        mintKeypair.publicKey,
        associatedAccount,
        wallet.publicKey,
        [],
        supply * Math.pow(10, decimals)
    );
    
    // Build transaction
    const transaction = new solanaWeb3.Transaction().add(
        createAccountIx,
        initMintIx,
        createATA,
        mintToIx
    );
    
    // Send transaction
    const signature = await wallet.sendTransaction(transaction, connection, {
        signers: [mintKeypair],
    });
    
    await connection.confirmTransaction(signature, 'confirmed');
    return mintKeypair.publicKey.toString();
}

// Inicjalizacja uploadu logo
function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    if (!uploadArea) return;
    
    uploadArea.addEventListener('click', function() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png,.jpg,.jpeg';
        fileInput.click();
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                if (!['image/png', 'image/jpeg'].includes(this.files[0].type)) {
                    alert('Please upload only PNG or JPG images');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    uploadArea.innerHTML = `
                        <img src="${e.target.result}" class="uploaded-logo" alt="Token Logo">
                        <p>Click to change</p>
                    `;
                };
                reader.onerror = function() {
                    alert('Error loading file');
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
}

// Inicjalizacja strony
document.addEventListener('DOMContentLoaded', function() {
    initWallet();
    initNavigation();
    setupTokenCreation();
    initLogoUpload();
    
    // Inicjalizacja przycisku Connect Wallet
    document.getElementById('connect-wallet').addEventListener('click', async () => {
        if (!wallet) {
            alert('Phantom Wallet nie jest dostępny. Zainstaluj rozszerzenie z https://phantom.app/');
            return;
        }
        
        try {
            if (!wallet.isConnected) {
                await wallet.connect();
            } else {
                await wallet.disconnect();
            }
        } catch (error) {
            console.error('Connection error:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    });
});