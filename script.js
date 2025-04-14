// =============================================
// FEE DISPLAY & SOCIAL TOGGLE
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.querySelector('.fee-info');

    let baseFee = 0.3;
    let socialFee = 0.1;
    let totalFee = baseFee;

    function updateFeeDisplay() {
        const additionalFees = [];

        if (socialToggle.checked) {
            additionalFees.push({ name: 'Social Links', value: socialFee });
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

window.Buffer = window.buffer.Buffer;


// =============================================
// MAIN CONFIG
// =============================================
const APP_ENV = 'production';
const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta');
const FEE_RECEIVER = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';

let wallet;
let connection;
let currentSection = 'home';

// =============================================
// INIT APP
// =============================================
document.addEventListener('DOMContentLoaded', async function () {
    connection = new solanaWeb3.Connection(NETWORK, 'confirmed');
    await initWallet();
    initNavigation();
    initTokenForm();
    initLogoUpload();
    console.log('Aplikacja zainicjalizowana');
});

// =============================================
// WALLET SETUP
// =============================================
async function initWallet() {
    if (APP_ENV === 'development' && !window.solana) {
        window.solana = {
            connect: async () => ({ publicKey: { toString: () => 'DEV_TEST_WALLET' } }),
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

    if (wallet.isConnected) await handleWalletConnect();
    wallet.on('connect', handleWalletConnect);
    wallet.on('disconnect', handleWalletDisconnect);

    document.getElementById('connect-wallet').addEventListener('click', toggleWalletConnection);
}

async function toggleWalletConnection() {
    try {
        if (!wallet.isConnected) await wallet.connect();
        else await wallet.disconnect();
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
// NAVIGATION
// =============================================
function initNavigation() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.remove('hidden-section');
            target.classList.add('active-section');
            currentSection = sectionId;
        }
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                showSection(href.substring(1));
                history.pushState(null, null, href);
            }
        });
    });

    window.addEventListener('popstate', function () {
        const hash = window.location.hash.substring(1);
        showSection(hash || 'home');
    });

    showSection(window.location.hash.substring(1) || 'home');
}

// =============================================
// CREATE TOKEN LOGIC
// =============================================
function initTokenForm() {
    const launchBtn = document.querySelector('.launch-token-btn');
    if (!launchBtn) return;

    document.getElementById('social-links-toggle').addEventListener('change', function () {
        const socialFields = document.getElementById('social-fields');
        socialFields.style.display = this.checked ? 'block' : 'none';
    });

    launchBtn.addEventListener('click', async function () {
        if (!wallet?.isConnected) {
            alert('Najpierw podłącz swój Phantom Wallet!');
            return;
        }

        const tokenName = document.getElementById('token-name').value.trim();
        const tokenSymbol = document.getElementById('token-symbol').value.trim().toUpperCase();
        const tokenDecimals = parseInt(document.getElementById('token-decimals').value);
        const tokenSupply = parseInt(document.getElementById('token-supply').value);
        const tokenDescription = document.getElementById('token-description').value.trim();

        if (!tokenName || tokenName.length > 32 || !tokenSymbol || tokenSymbol.length > 10 || isNaN(tokenSupply) || tokenSupply <= 0) {
            alert('Błędne dane tokena.');
            return;
        }

        launchBtn.disabled = true;
        const originalText = launchBtn.innerHTML;
        launchBtn.innerHTML = '<span class="loader"></span> Tworzenie tokena...';

        try {
            const totalFee = parseFloat(document.querySelector('.total-fee').textContent.split(' ')[1]);
            const paymentTx = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new solanaWeb3.PublicKey(FEE_RECEIVER),
                    lamports: totalFee * solanaWeb3.LAMPORTS_PER_SOL
                })
            );
            paymentTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            paymentTx.feePayer = wallet.publicKey;
            const signature = await wallet.sendTransaction(paymentTx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            const tokenAddress = await createToken(tokenName, tokenSymbol, tokenDecimals, tokenSupply);

            alert(`Token utworzony pomyślnie!\nAdres: ${tokenAddress}`);
        } catch (error) {
            console.error(error);
            alert('Błąd: ' + error.message);
        } finally {
            launchBtn.disabled = false;
            launchBtn.innerHTML = originalText;
        }
    });
}

async function createToken(name, symbol, decimals, supply) {
    const mintKeypair = solanaWeb3.Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(solanaWeb3.MintLayout.span);
    const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: solanaWeb3.MintLayout.span,
            lamports,
            programId: solanaWeb3.TOKEN_PROGRAM_ID,
        })
    );
    const signature = await wallet.sendTransaction(transaction, connection, { signers: [mintKeypair] });
    await connection.confirmTransaction(signature, 'confirmed');
    return mintKeypair.publicKey.toString();
}

// =============================================
// LOGO UPLOAD
// =============================================
function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    if (!uploadArea) return;

    uploadArea.addEventListener('click', function () {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png,.jpg,.jpeg';
        fileInput.click();

        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                    alert('Nieprawidłowy plik.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    uploadArea.innerHTML = `<img src="${e.target.result}" class="uploaded-logo" alt="Logo tokena"><p>Kliknij aby zmienić</p>`;
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

// =============================================
// LOADER STYLE
// =============================================
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
@keyframes spin {
    to { transform: rotate(360deg); }
}`;
document.head.appendChild(loaderStyle);
