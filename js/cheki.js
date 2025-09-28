document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cheki-page')) {
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData'));

        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        const formErrorEl = document.getElementById('form-error');
        const mobileCart = document.getElementById('mobile-cart');
        const mobileCartTotal = document.getElementById('mobile-cart-total');
        const orderSummaryContainer = document.querySelector('.order-summary-container');
        const chekiStockDisplay = document.getElementById('cheki-stock-display');

        let membersData = [];
        let groupChekiData = {};
        let cart = {};
        let availableStock = 0;
        
        async function loadMidtransScript() {
            try {
                const response = await fetch('/api/midtrans-client-key');
                if (!response.ok) throw new Error('Gagal mendapatkan client key Midtrans.');
                const data = await response.json();
                const clientKey = data.clientKey;

                if (clientKey) {
                    const script = document.createElement('script');
                    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
                    script.setAttribute('data-client-key', clientKey);
                    document.head.appendChild(script);
                } else {
                    throw new Error('Client key Midtrans tidak ditemukan.');
                }
            } catch (error) {
                console.error(error);
                submitButton.disabled = true;
                formErrorEl.textContent = 'Gagal memuat konfigurasi pembayaran.';
            }
        }

        function checkUrlForSuccess() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('transaction_status') === 'settlement' || urlParams.get('transaction_status') === 'capture') {
                const toastHTML = `
                    <div>Terima kasih sudah membeli cheki!</div>
                    <div class="toast-actions">
                        <button onclick="window.location.href='/dashboard.html'" class="toast-btn toast-btn-primary">Lihat Tiket</button>
                        <button onclick="document.querySelector('.toast-notification').classList.remove('show')" class="toast-btn toast-btn-secondary">Pesan Lagi</button>
                    </div>
                `;
                showToast(toastHTML, true, 10000);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        async function loadChekiProducts() {
            try {
                const response = await fetch('/api/products-and-stock');
                if (!response.ok) throw new Error('Data produk tidak ditemukan');
                const data = await response.json();
                
                membersData = data.members;
                groupChekiData = data.group_cheki; 
                availableStock = data.cheki_stock || 0;

                if (chekiStockDisplay) {
                    chekiStockDisplay.textContent = `${availableStock} tiket`;
                }
                renderProducts();
            } catch (error) {
                console.error("Gagal memuat produk cheki:", error);
                chekiListContainer.innerHTML = "<p>Gagal memuat produk. Coba segarkan halaman.</p>";
            }
        }
        
        function createProductCard(product) {
            const card = document.createElement('div');
            card.className = 'cheki-card reveal';
            const isOutOfStock = availableStock === 0;
            card.innerHTML = `
                <img src="${product.image}" alt="Cheki ${product.name}">
                <h3>${product.name}</h3>
                <p class="price">Rp ${product.price.toLocaleString('id-ID')}</p>
                <div class="quantity-selector">
                    <button class="quantity-btn" data-id="${product.id}" data-action="decrease" ${isOutOfStock ? 'disabled' : ''}>-</button>
                    <input type="number" class="quantity-input" data-id="${product.id}" value="0" min="0" readonly>
                    <button class="quantity-btn" data-id="${product.id}" data-action="increase" ${isOutOfStock ? 'disabled' : ''}>+</button>
                </div>
                ${isOutOfStock ? '<p style="color: red; margin-top: 10px;">Stok Habis</p>' : ''}
            `;
            return card;
        }
        
        function renderProducts() {
            chekiListContainer.innerHTML = '';
            if (groupChekiData?.id) {
                chekiListContainer.appendChild(createProductCard(groupChekiData));
            }
            membersData.forEach(member => {
                chekiListContainer.appendChild(createProductCard(member));
            });
        }

        function giveFeedback() {
            orderSummaryContainer.classList.add('item-added');
            setTimeout(() => orderSummaryContainer.classList.remove('item-added'), 500);
        }
        
        function resetCart() {
            cart = {};
            document.querySelectorAll('.quantity-input').forEach(input => input.value = 0);
            updateTotals();
        }

        function updateQuantity(productId, action) {
            let product = membersData.find(m => m.id === productId) || (productId === groupChekiData.id ? groupChekiData : null);
            if (!product) return;

            cart[productId] = cart[productId] || 0;

            if (action === 'increase') {
                const totalInCart = Object.values(cart).reduce((sum, count) => sum + count, 0);
                if (totalInCart >= availableStock) {
                    showToast('Maaf, stok cheki tidak mencukupi.', false);
                    return;
                }
                cart[productId]++;
                showToast(`Cheki ${product.name} ditambahkan!`);
                giveFeedback();
            } else if (action === 'decrease' && cart[productId] > 0) {
                cart[productId]--;
                showToast(`Cheki ${product.name} dikurangi.`);
            }

            document.querySelector(`.quantity-input[data-id="${productId}"]`).value = cart[productId];
            updateTotals();
        }

        function updateTotals() {
            let totalItems = 0;
            let totalPrice = 0;
            const allProducts = [...membersData, groupChekiData];

            for (const productId in cart) {
                if (cart[productId] > 0) {
                    const product = allProducts.find(p => p.id === productId);
                    if (product) {
                        totalItems += cart[productId];
                        totalPrice += cart[productId] * product.price;
                    }
                }
            }
            
            const formattedPrice = `Rp ${totalPrice.toLocaleString('id-ID')}`;
            totalItemsEl.textContent = totalItems;
            totalPriceEl.textContent = formattedPrice;
            mobileCartTotal.textContent = formattedPrice;
            mobileCart.classList.toggle('visible', totalItems > 0);
        }

        chekiListContainer.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-btn')) {
                updateQuantity(e.target.dataset.id, e.target.dataset.action);
            }
        });

        mobileCart.addEventListener('click', () => {
            orderSummaryContainer.scrollIntoView({ behavior: 'smooth' });
        });

        submitButton.addEventListener('click', async function (e) {
            e.preventDefault();

            if (!token || !userData) {
                formErrorEl.textContent = 'Anda harus login terlebih dahulu untuk memesan.';
                document.getElementById('auth-modal').classList.add('active');
                return;
            }

            if (typeof window.snap === 'undefined') {
                formErrorEl.textContent = 'Layanan pembayaran belum siap. Coba lagi sesaat.';
                return;
            }

            if (Object.values(cart).reduce((sum, count) => sum + count, 0) === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }

            formErrorEl.textContent = '';
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            const item_details = [];
            const allProducts = [...membersData, groupChekiData];
            for (const productId in cart) {
                if (cart[productId] > 0) {
                    const product = allProducts.find(p => p.id === productId);
                    if (product) {
                        item_details.push({
                            id: product.id,
                            price: product.price,
                            quantity: cart[productId],
                            name: `Cheki ${product.name}`
                        });
                    }
                }
            }
            
            const gross_amount = item_details.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const orderData = {
                transaction_details: {
                    order_id: 'CHEKI-' + new Date().getTime(),
                    gross_amount: gross_amount
                },
                customer_details: {
                    first_name: userData.nama_pengguna, 
                    email: userData.email,
                    phone: userData.nomor_whatsapp || 'N/A',
                },
                item_details: item_details
            };
            
            try {
                const response = await fetch('/get-snap-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderData }),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Gagal mendapatkan token pembayaran.');
                
                window.snap.pay(result.token, {
                    onSuccess: function(result) {
                        fetch('/update-order-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                order_id: result.order_id,
                                transaction_status: result.transaction_status
                            }),
                        });
                        resetCart();
                        window.location.href = `/cheki.html?order_id=${result.order_id}&transaction_status=${result.transaction_status}`;
                    },
                    onPending: function(result){
                        showToast("Pembayaran Anda sedang diproses.", true, 5000);
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
                    },
                    onError: function(result){
                        showToast("Pembayaran gagal! Silakan coba lagi.", false);
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
                    },
                    onClose: function () {
                        formErrorEl.textContent = 'Anda menutup jendela pembayaran.';
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
                    }
                });

            } catch (error) {
                formErrorEl.textContent = 'Terjadi kesalahan: ' + error.message;
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
            }
        });
        
        checkUrlForSuccess();
        loadChekiProducts();
        loadMidtransScript();
    }
});