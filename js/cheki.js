document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cheki-page')) {
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData'));

        const chekiListContainer = document.getElementById('cheki-list');
        const orderSummaryItemsEl = document.getElementById('order-summary-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        const formErrorEl = document.getElementById('form-error');
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
                showToast(`Terima kasih! Tiket Anda ada di dashboard.`);
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
        
        // REVISI: Fungsi membuat kartu member yang lebih simpel
        function createProductCard(product) {
            const card = document.createElement('div');
            card.className = 'cheki-member-card';
            const isOutOfStock = availableStock === 0;
            
            card.innerHTML = `
                <img src="${product.image}" alt="Cheki ${product.name}">
                <h3>${product.name}</h3>
                <div class="quantity-selector">
                    <button class="quantity-btn" data-id="${product.id}" data-action="decrease" ${isOutOfStock ? 'disabled' : ''}>-</button>
                    <input type="number" class="quantity-input" data-id="${product.id}" value="0" min="0" readonly>
                    <button class="quantity-btn" data-id="${product.id}" data-action="increase" ${isOutOfStock ? 'disabled' : ''}>+</button>
                </div>
                ${isOutOfStock ? '<p style="color: red; font-size: 0.8rem; margin-top: 10px;">Stok Habis</p>' : ''}
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
        
        function resetCart() {
            cart = {};
            document.querySelectorAll('.quantity-input').forEach(input => input.value = 0);
            updateTotals();
        }

        function updateQuantity(productId, action) {
            let product = membersData.find(m => m.id === productId) || (productId === groupChekiData.id ? groupChekiData : null);
            if (!product) return;

            cart[productId] = cart[productId] || { quantity: 0, name: product.name, price: product.price };

            if (action === 'increase') {
                const totalInCart = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
                if (totalInCart >= availableStock) {
                    showToast('Maaf, sisa stok tiket tidak mencukupi.', false);
                    return;
                }
                cart[productId].quantity++;
            } else if (action === 'decrease' && cart[productId].quantity > 0) {
                cart[productId].quantity--;
            }

            document.querySelector(`.quantity-input[data-id="${productId}"]`).value = cart[productId].quantity;
            updateTotals();
        }
        
        // REVISI: Fungsi update total dan ringkasan pesanan
        function updateTotals() {
            let totalPrice = 0;
            orderSummaryItemsEl.innerHTML = ''; // Kosongkan daftar item

            const hasItems = Object.values(cart).some(item => item.quantity > 0);

            if (!hasItems) {
                orderSummaryItemsEl.innerHTML = '<p class="empty-cart-message">Anda belum memilih tiket.</p>';
            } else {
                for (const productId in cart) {
                    const item = cart[productId];
                    if (item.quantity > 0) {
                        const itemEl = document.createElement('div');
                        itemEl.className = 'summary-item';
                        itemEl.innerHTML = `
                            <span>${item.quantity}x ${item.name}</span>
                            <span>Rp ${(item.quantity * item.price).toLocaleString('id-ID')}</span>
                        `;
                        orderSummaryItemsEl.appendChild(itemEl);
                        totalPrice += item.quantity * item.price;
                    }
                }
            }
            
            totalPriceEl.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        }


        chekiListContainer.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-btn')) {
                updateQuantity(e.target.dataset.id, e.target.dataset.action);
            }
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
            
            const totalItemsInCart = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
            if (totalItemsInCart === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }

            formErrorEl.textContent = '';
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            const item_details = Object.values(cart)
                .filter(item => item.quantity > 0)
                .map(item => ({
                    id: item.id,
                    price: item.price,
                    quantity: item.quantity,
                    name: `Cheki ${item.name}`
                }));
            
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