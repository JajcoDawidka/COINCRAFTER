document.addEventListener('DOMContentLoaded', function() {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.querySelector('.fee-info');
    
    // Inicjalizacja opłat
    let baseFee = 0.3;
    let socialFee = 0.1;
    let totalFee = baseFee;

    // Funkcja aktualizująca wyświetlane opłaty
    function updateFeeDisplay() {
        const additionalFees = [];
        
        if (socialToggle.checked) {
            additionalFees.push({
                name: 'Social Links',
                value: socialFee
            });
        }
        
        // Oblicz całkowitą opłatę
        totalFee = baseFee + additionalFees.reduce((sum, fee) => sum + fee.value, 0);
        
        // Zaktualizuj wyświetlanie
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
    
    // Nasłuchuj zmian checkboxa
    socialToggle.addEventListener('change', updateFeeDisplay);
    
    // Inicjalizacja początkowa
    updateFeeDisplay();
});

// =============================================
// GŁÓWNE USTAWIENIA
// =============================================
const APP_ENV = 'production'; // 'development' lub 'production'
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta'); // 'devnet' dla testów
const FEE_RECEIVER = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq'; // Adres odbiorcy opłat

// =============================================
// ZMIENNE GLOBALNE
// =============================================
let wallet;
let connection;
let currentSection = 'home';

// =============================================
// INICJALIZACJA APLIKACJI
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Inicjalizacja połączenia z blockchain
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    
    // 2. Inicjalizacja portfela
    await initWallet();
    
    // 3. Inicjalizacja nawigacji
    initNavigation();
    
    // 4. Inicjalizacja formularza tokena
    initTokenForm();
    
    // 5. Inicjalizacja uploadu logo
    initLogoUpload();
    
    console.log('Aplikacja zainicjalizowana');
});

// =============================================
// PHANTOM WALLET INTEGRATION
// =============================================
async function initWallet() {
    // Tryb developerski
    if (APP_ENV === 'development' && !window.solana) {
        console.warn('Uruchomiono tryb developerski - Phantom nie jest dostępny');
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
        console.error('Phantom Wallet nie jest dostępny!');
        return;
    }

    wallet = window.solana;
    
    // Autopołączenie jeśli portfel już podłączony
    if (wallet.isConnected) {
        await handleWalletConnect();
    }
    
    // Nasłuchiwanie zdarzeń portfela
    wallet.on('connect', handleWalletConnect);
    wallet.on('disconnect', handleWalletDisconnect);
    
    // Inicjalizacja przycisku Connect
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
        console.error('Błąd połączenia:', error);
        alert('Błąd połączenia z portfelem: ' + error.message);
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
        
        console.log('Portfel podłączony:', wallet.publicKey.toString());
    }
}

function handleWalletDisconnect() {
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.classList.remove('connected');
    walletAddress.style.display = 'none';
    
    console.log('Portfel rozłączony');
}

// =============================================
// NAWIGACJA MIĘDZY SEKCJAMI
// =============================================
function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Pokaz wybraną sekcję
    function showSection(sectionId) {
        // Ukryj wszystkie sekcje
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        
        // Pokaż wybraną sekcję
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden-section');
            targetSection.classList.add('active-section');
            currentSection = sectionId;
        }
        
        // Aktualizuj aktywne linki w nawigacji
        navLinks.forEach(link => {
            if (link.getAttribute('href').startsWith('#')) {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            }
        });
        
        // Przewiń do góry
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Obsługa kliknięć w nawigacji
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Obsługa linków wewnętrznych
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetSection = href.substring(1);
                showSection(targetSection);
                history.pushState(null, null, href);
            }
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
        if (hash && document.getElementById(hash)) {
            showSection(hash);
        } else {
            showSection('home');
        }
    });
    
    // Inicjalizacja początkowej sekcji
    const initialHash = window.location.hash.substring(1);
    showSection(initialHash || 'home');
}

// =============================================
// TWORZENIE TOKENA
// =============================================
function initTokenForm() {
    const launchBtn = document.querySelector('.launch-token-btn');
    if (!launchBtn) return;
    
    // Obsługa pokazywania/ukrywania pól social media
    document.getElementById('social-links-toggle').addEventListener('change', function() {
        const socialFields = document.getElementById('social-fields');
        if (this.checked) {
            socialFields.style.display = 'block';
        } else {
            socialFields.style.display = 'none';
        }
    });
    
    launchBtn.addEventListener('click', async function() {
        // Walidacja portfela
        if (!wallet?.isConnected) {
            alert('Najpierw podłącz swój Phantom Wallet!');
            return;
        }

        // Pobierz dane z formularza
        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim().toUpperCase();
        const tokenDecimals = parseInt(document.getElementById('token-decimals').value);
        const tokenSupply = parseInt(document.getElementById('token-supply').value);
        const tokenDescription = document.getElementById('token-description').value.trim();

        // Walidacja
        if (!tokenName || tokenName.length > 32) {
            alert('Nazwa tokena musi mieć 1-32 znaków');
            return;
        }

        if (!tokenSymbol || tokenSymbol.length > 10) {
            alert('Symbol tokena musi mieć 1-10 znaków');
            return;
        }

        if (isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Podaj prawidłową ilość tokenów');
            return;
        }

        // Przygotuj przycisk do ładowania
        launchBtn.disabled = true;
        const originalText = launchBtn.innerHTML;
        launchBtn.innerHTML = '<span class="loader"></span> Tworzenie tokena...';

        try {
            // Pobierz sumę SOL do zapłaty
            const totalFee = parseFloat(document.querySelector('.total-fee').textContent.split(' ')[1]);
            
            // Przygotuj transakcję płatności
            const paymentTx = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(FEE_RECEIVER),
                    lamports: totalFee * solanaWeb3.LAMPORTS_PER_SOL
                })
            );

            // Ustaw feePayer i recentBlockhash
            paymentTx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
            paymentTx.feePayer = wallet.publicKey;

            // Wyślij transakcję do podpisu i wykonania
            const paymentSignature = await wallet.sendTransaction(paymentTx, connection);
            await connection.confirmTransaction(paymentSignature, 'confirmed');
            
            // Po udanej płatności twórz token
            const tokenAddress = await createToken(
                tokenName,
                tokenSymbol,
                tokenDecimals,
                tokenSupply
            );

            alert(`Token utworzony pomyślnie!\n
Adres: ${tokenAddress}\n
Opłata: ${totalFee} SOL wysłane na adres ${FEE_RECEIVER}\n\n
🔗 Dodaj płynność: https://raydium.io/liquidity/create-pool/\n
📊 Sprawdź swój token: https://raydium.io/portfolio/?position_tab=standard`);
        } catch (error) {
            console.error('Błąd:', error);
            alert('Operacja nieudana: ' + error.message);
        } finally {
            // Przywróć przycisk
            launchBtn.disabled = false;
            launchBtn.innerHTML = originalText;
        }
    });
}

async function createToken(name, symbol, decimals, supply) {
    // 1. Generuj nowy mint
    const mintKeypair = solanaWeb3.Keypair.generate();
    
    // 2. Oblicz wymagane lamports
    const lamports = await connection.getMinimumBalanceForRentExemption(
        solanaWeb3.MintLayout.span
    );
    
    // 3. Przygotuj instrukcje
    const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: solanaWeb3.MintLayout.span,
            lamports,
            programId: solanaWeb3.TOKEN_PROGRAM_ID,
        }),
        
        solanaWeb3.Token.createInitMintInstruction(
            solanaWeb3.TOKEN_PROGRAM_ID,
            mintKeypair.publicKey,
            decimals,
            wallet.publicKey,
            wallet.publicKey
        ),
        
        solanaWeb3.Token.createAssociatedTokenAccountInstruction(
            solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
            solanaWeb3.TOKEN_PROGRAM_ID,
            mintKeypair.publicKey,
            await solanaWeb3.Token.getAssociatedTokenAddress(
                solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
                solanaWeb3.TOKEN_PROGRAM_ID,
                mintKeypair.publicKey,
                wallet.publicKey
            ),
            wallet.publicKey,
            wallet.publicKey
        ),
        
        solanaWeb3.Token.createMintToInstruction(
            solanaWeb3.TOKEN_PROGRAM_ID,
            mintKeypair.publicKey,
            await solanaWeb3.Token.getAssociatedTokenAddress(
                solanaWeb3.ASSOCIATED_TOKEN_PROGRAM_ID,
                solanaWeb3.TOKEN_PROGRAM_ID,
                mintKeypair.publicKey,
                wallet.publicKey
            ),
            wallet.publicKey,
            [],
            supply * Math.pow(10, decimals)
        )
    );
    
    // 4. Wyślij transakcję
    const signature = await wallet.sendTransaction(transaction, connection, {
        signers: [mintKeypair],
    });
    
    // 5. Czekaj na potwierdzenie
    await connection.confirmTransaction(signature, 'confirmed');
    
    return mintKeypair.publicKey.toString();
}

// =============================================
// UPLOAD LOGO
// =============================================
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
                    alert('Akceptujemy tylko pliki PNG i JPG');
                    return;
                }
                
                if (this.files[0].size > 2 * 1024 * 1024) {
                    alert('Maksymalny rozmiar pliku to 2MB');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    uploadArea.innerHTML = `
                        <img src="${e.target.result}" class="uploaded-logo" alt="Logo tokena">
                        <p>Kliknij aby zmienić</p>
                    `;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#9945FF';
        this.style.backgroundColor = 'rgba(153, 69, 255, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        this.style.backgroundColor = 'transparent';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        this.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
}

// Styl dla loadera i poprawionej ikony uploadu
const loaderStyle = document.createElement('style');
loaderStyle.textContent = `
.loader {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
    vertical-align: middle;
}

.upload-icon {
    background: transparent !important;
    padding: 0 !important;
}

.upload-icon path {
    stroke: var(--accent-yellow);
    fill: none;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(loaderStyle);
