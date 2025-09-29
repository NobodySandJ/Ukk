/**
 * File: js/cheki.js
 * Dibuat ulang dari nol untuk menangani logika halaman pemesanan Cheki
 * dan integrasi Midtrans Payment Gateway.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Pastikan skrip ini hanya berjalan di halaman cheki
    if (!document.getElementById('cheki-page')) {
        return;
    }

    // --- Selektor DOM ---
    const chekiListContainer = document.getElementById('cheki-list');
    const orderSummaryItemsEl = document.getElementById('order-summary-items');
    const totalPriceEl = document.getElementById('total-price');
    const submitButton = document.getElementById('submit-button');
    const chekiStockDisplay = document.getElementById('cheki-stock-display');

    // --- State Aplikasi ---
    let products = {
        members: [],
        group: {}
    };
    let cart = {};
    let availableStock = 0;
    let isMidtransScriptLoaded = false;

    // --- Fungsi Inisialisasi ---
    const initializePage = async () => {
        loadMidtransScript();
        await fetchProductsAndStock();
        renderProducts();
        addEventListeners();
        checkUrlForSuccess();
    };

    /**
     * Mengambil client key dari backend dan memuat skrip Snap.js dari Midtrans.
     * Skrip hanya akan dimuat sekali.
     */
    const loadMidtransScript = async () => {
        if (window.snap || isMidtransScriptLoaded) {
            return;
        }

        try {
            const response = await fetch('/api/midtrans-client-key');
            if (!response.ok) throw new Error('Gagal mendapatkan kunci API pembayaran.');
            
            const data = await response.json();
            const clientKey = data.clientKey;

            if (!clientKey) throw new Error('Kunci API pembayaran tidak valid.');

            const script = document.createElement('script');
            script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', clientKey);
            script.onload = () => {
                isMidtransScriptLoaded = true;
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error("Kesalahan Midtrans:", error);
            disablePaymentButton('Pembayaran Error');
        }
    };

    /**
     * Mengambil data produk (member, grup) dan stok tiket dari backend.
     */
    const fetchProductsAndStock = async () => {
        if (!chekiStockDisplay || !chekiListContainer) return;
        
        chekiStockDisplay.textContent = 'Memuat...';
        try {
            const response = await fetch('/api/products-and-stock');
            if (!response.ok) throw new Error('Data produk tidak dapat dimuat.');
            
            const data = await response.json();
            products.members = data.members || [];
            products.group = data.group_cheki || {};
            availableStock = data.cheki_stock || 0;

            chekiStockDisplay.textContent = `${availableStock} tiket`;
        } catch (error) {
            console.error("Gagal memuat produk:", error);
            chekiListContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
            disablePaymentButton('Gagal Memuat');
        }
    };

    // --- Fungsi Render Tampilan ---
    
    /**
     * Membuat kartu HTML untuk satu produk.
     * @param {object} product - Objek produk (member atau grup).
     * @returns {HTMLDivElement} - Elemen div kartu produk.
     */
    const createProductCard = (product) => {
        const card = document.createElement('div');
        card.className = 'cheki-member-card';
        const isOutOfStock = availableStock === 0;

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${product.image}" alt="Cheki ${product.name}" loading="lazy">
            </div>
            <div class="card-content">
                <h3>${product.name}</h3>
                <div class="quantity-selector">
                    <button class="quantity-btn decrease" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>-</button>
                    <input type="number" class="quantity-input" data-id="${product.id}" value="0" min="0" readonly>
                    <button class="quantity-btn increase" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>+</button>
                </div>
            </div>
            ${isOutOfStock ? '<p style="color: red; font-size: 0.8rem; padding: 0 1rem 1rem;">Stok Habis</p>' : ''}
        `;
        return card;
    };

    /**
     * Merender semua produk ke dalam kontainer.
     */
    const renderProducts = () => {
        if (!chekiListContainer) return;
        
        chekiListContainer.innerHTML = '';
        if (products.group?.id) {
            chekiListContainer.appendChild(createProductCard(products.group));
        }
        products.members.forEach(member => {
            chekiListContainer.appendChild(createProductCard(member));
        });
    };

    /**
     * Memperbarui tampilan ringkasan pesanan dan total harga.
     */
    const updateOrderSummary = () => {
        if (!orderSummaryItemsEl || !totalPriceEl) return;

        orderSummaryItemsEl.innerHTML = '';
        let totalPrice = 0;
        const itemsInCart = Object.values(cart).filter(item => item.quantity > 0);

        if (itemsInCart.length === 0) {
            orderSummaryItemsEl.innerHTML = '<p class="empty-cart-message">Anda belum memilih tiket.</p>';
        } else {
            itemsInCart.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'summary-item';
                const itemTotalPrice = item.quantity * item.price;
                itemEl.innerHTML = `
                    <span>${item.quantity}x ${item.name}</span>
                    <span>Rp ${itemTotalPrice.toLocaleString('id-ID')}</span>
                `;
                orderSummaryItemsEl.appendChild(itemEl);
                totalPrice += itemTotalPrice;
            });
        }
        
        totalPriceEl.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
    };

    // --- Fungsi Logika Keranjang (Cart) ---

    /**
     * Mengubah jumlah item di keranjang.
     * @param {string} productId - ID produk yang akan diubah.
     * @param {'increase' | 'decrease'} action - Aksi yang dilakukan.
     */
    const updateCart = (productId, action) => {
        const allProducts = [products.group, ...products.members];
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        let currentQuantity = cart[productId]?.quantity || 0;
        const totalInCart = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

        if (action === 'increase') {
            if (totalInCart >= availableStock) {
                showToast('Maaf, sisa stok tiket tidak mencukupi.', false);
                return;
            }
            currentQuantity++;
        } else if (action === 'decrease') {
            if (currentQuantity > 0) {
                currentQuantity--;
            }
        }

        if (currentQuantity > 0) {
            cart[productId] = { 
                ...product, 
                quantity: currentQuantity 
            };
        } else {
            delete cart[productId];
        }

        // Update input value
        const inputEl = document.querySelector(`.quantity-input[data-id="${productId}"]`);
        if (inputEl) {
            inputEl.value = currentQuantity;
        }

        updateOrderSummary();
    };

    const resetCart = () => {
        cart = {};
        document.querySelectorAll('.quantity-input').forEach(input => input.value = 0);
        updateOrderSummary();
    }
    
    // --- Logika Pembayaran ---

    const handlePayment = async () => {
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData'));

        if (!token || !userData) {
            showToast('Anda harus login untuk memesan.', false);
            document.getElementById('auth-modal')?.classList.add('active');
            return;
        }

        if (!isMidtransScriptLoaded || typeof window.snap === 'undefined') {
            showToast('Layanan pembayaran belum siap. Coba lagi sesaat.', false);
            return;
        }

        const itemsInCart = Object.values(cart).filter(item => item.quantity > 0);
        if (itemsInCart.length === 0) {
            showToast('Keranjang Anda masih kosong.', false);
            return;
        }

        setPaymentButtonLoading(true);

        const orderDetails = {
            item_details: itemsInCart.map(item => ({
                id: item.id,
                price: item.price,
                quantity: item.quantity,
                name: `Cheki ${item.name}`
            })),
            customer_details: {
                email: userData.email,
                phone: userData.nomor_whatsapp || ''
            },
            transaction_details: {
                order_id: `CHEKI-${userData.id}-${Date.now()}`,
                gross_amount: itemsInCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            }
        };

        try {
            const response = await fetch('/get-snap-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderDetails)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal memulai pembayaran.');

            // Buka popup pembayaran Midtrans
            window.snap.pay(result.token, {
                onSuccess: (midtransResult) => {
                    // Kirim status ke backend
                    fetch('/update-order-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: midtransResult.order_id,
                            transaction_status: midtransResult.transaction_status
                        })
                    });
                    resetCart();
                    // Redirect ke halaman yang sama dengan parameter untuk menampilkan notif sukses
                    window.location.href = `/cheki.html?order_id=${midtransResult.order_id}&transaction_status=${midtransResult.transaction_status}`;
                },
                onPending: () => {
                    showToast("Menunggu pembayaran Anda...", true, 5000);
                    setPaymentButtonLoading(false);
                },
                onError: () => {
                    showToast("Pembayaran gagal! Silakan coba lagi.", false);
                    setPaymentButtonLoading(false);
                },
                onClose: () => {
                    showToast('Anda menutup jendela pembayaran.', false);
                    setPaymentButtonLoading(false);
                }
            });

        } catch (error) {
            showToast(`Terjadi kesalahan: ${error.message}`, false);
            setPaymentButtonLoading(false);
        }
    };
    
    // --- Fungsi Utilitas ---

    const disablePaymentButton = (text) => {
        if (!submitButton) return;
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-times-circle"></i> ${text}`;
    };

    const setPaymentButtonLoading = (isLoading) => {
        if (!submitButton) return;
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
        }
    };

    /**
     * Cek URL setelah redirect dari Midtrans untuk menampilkan notifikasi sukses.
     */
    const checkUrlForSuccess = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('transaction_status');
        if (status === 'settlement' || status === 'capture') {
            showToast('Pembayaran berhasil! Tiket Anda sudah tersedia di dashboard.');
            // Hapus query params dari URL agar notif tidak muncul saat refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    // --- Event Listeners ---
    const addEventListeners = () => {
        chekiListContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.quantity-btn');
            if (!button) return;

            const productId = button.dataset.id;
            const action = button.classList.contains('increase') ? 'increase' : 'decrease';
            updateCart(productId, action);
        });

        submitButton.addEventListener('click', handlePayment);
    };

    // --- Jalankan Aplikasi ---
    initializePage();
});