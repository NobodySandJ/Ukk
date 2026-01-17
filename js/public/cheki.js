// Halaman buat beli cheki
// Disini ngatur keranjang belanja, stok, sama integrasi Midtrans
if (typeof window.basePath === 'undefined') {
    window.basePath = window.appBasePath || '../../';
}
var basePath = window.basePath;

document.addEventListener('DOMContentLoaded', () => {
    // Cek dulu ini beneran halaman cheki bukan
    if (!document.getElementById('cheki-page')) {
        return;
    }

    // ==========================================
    // AREA Variabel & State
    // ==========================================
    const chekiListContainer = document.getElementById('cheki-list');
    const orderSummaryItemsEl = document.getElementById('order-summary-items');
    const totalPriceEl = document.getElementById('total-price');
    const submitButton = document.getElementById('submit-button');
    const chekiStockDisplay = document.getElementById('cheki-stock-display');

    // Simpen data produk & keranjang disini
    let products = {
        members: [],
        group: {}
    };
    let cart = {};
    let availableStock = 0;
    let isMidtransScriptLoaded = false;

    // ============================================================
    // FUNGSI INISIALISASI HALAMAN
    // ============================================================
    const initializePage = async () => {
        renderProductSkeleton();
        loadMidtransScript();
        await fetchProductsAndStock();
        if ((products.members && products.members.length > 0) || (products.group && products.group.id)) {
            renderProducts();
        }
        addEventListeners();
        checkUrlForSuccess();
    };

    // ============================================================
    // SKELETON LOADING - Tampilan loading sebelum data muncul
    // ============================================================
    const renderProductSkeleton = () => {
        if (!chekiListContainer) return;
        chekiListContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'cheki-member-card';
            skeleton.innerHTML = `
                <div class="skeleton skeleton-product-image"></div>
                <div class="skeleton skeleton-text" style="margin-top: 1rem;"></div>
                <div class="skeleton skeleton-text-short"></div>
                <div class="skeleton skeleton-button" style="margin-top: 1rem;"></div>
            `;
            chekiListContainer.appendChild(skeleton);
        }
    };

    // ============================================================
    // LOAD SCRIPT MIDTRANS (Payment Gateway)
    // ============================================================
    const loadMidtransScript = async () => {
        if (window.snap || isMidtransScriptLoaded) return;
        try {
            const response = await fetch('/api/midtrans-client-key');
            if (!response.ok) throw new Error('Gagal mendapatkan kunci API pembayaran.');
            const data = await response.json();
            const clientKey = data.clientKey;
            if (!clientKey) throw new Error('Kunci API pembayaran tidak valid.');

            const script = document.createElement('script');
            script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', clientKey);
            script.onload = () => { isMidtransScriptLoaded = true; };
            document.head.appendChild(script);
        } catch (error) {
            console.error("Kesalahan Midtrans:", error);
            disablePaymentButton('Pembayaran Error');
        }
    };

    // ============================================================
    // FETCH PRODUK & STOK DARI SERVER
    // ============================================================
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
            chekiListContainer.innerHTML = `<p class="error-message" style="text-align: center; width: 100%;">${error.message}</p>`;
            disablePaymentButton('Gagal Memuat');
        }
    };

    // ============================================================
    // FUNGSI RENDER KARTU PRODUK
    // Edit di sini untuk mengubah tampilan kartu member cheki
    // ============================================================
    const createProductCard = (product) => {
        const card = document.createElement('div');
        card.className = 'cheki-member-card';
        const isOutOfStock = availableStock === 0;
        const formattedPrice = `Rp ${product.price.toLocaleString('id-ID')}`;

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${product.image}" alt="Cheki ${product.name}" loading="lazy">
            </div>
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="cheki-price" style="font-weight: 600; color: var(--primary-color); margin-bottom: 1rem; font-size: 1.1rem;">
                    ${formattedPrice}
                </p>
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

    const renderProducts = () => {
        if (!chekiListContainer) return;
        chekiListContainer.innerHTML = '';

        if (products.group && products.group.id) {
            chekiListContainer.appendChild(createProductCard(products.group));
        }
        if (products.members && products.members.length > 0) {
            products.members.forEach(member => {
                chekiListContainer.appendChild(createProductCard(member));
            });
        }
    };

    // ============================================================
    // FUNGSI UPDATE RINGKASAN PESANAN
    // ============================================================
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

    // ============================================================
    // FUNGSI LOGIKA KERANJANG (CART)
    // ============================================================
    const updateCart = (productId, action) => {
        const allProducts = [products.group, ...products.members];
        const product = allProducts.find(p => p && p.id === productId);
        if (!product) return;

        let currentQuantity = cart[productId]?.quantity || 0;
        const totalInCart = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

        if (action === 'increase') {
            if (totalInCart >= availableStock) {
                showToast('Maaf, sisa stok tiket tidak mencukupi.', false);
                return;
            }
            currentQuantity++;
        } else if (action === 'decrease' && currentQuantity > 0) {
            currentQuantity--;
        }

        if (currentQuantity > 0) {
            cart[productId] = { ...product, quantity: currentQuantity };
        } else {
            delete cart[productId];
        }

        const inputEl = document.querySelector(`.quantity-input[data-id="${productId}"]`);
        if (inputEl) inputEl.value = currentQuantity;
        updateOrderSummary();
    };

    const resetCart = () => {
        cart = {};
        document.querySelectorAll('.quantity-input').forEach(input => { input.value = 0; });
        updateOrderSummary();
    };

    // ============================================================
    // LOGIKA PEMBAYARAN - Integrasi Midtrans
    // ============================================================
    const handlePayment = async () => {
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData'));

        // Cek apakah user sudah login
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

        // Data pesanan yang dikirim ke server
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
                order_id: `MNU-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
                onSuccess: async (midtransResult) => {
                    try {
                        showToast('Memproses pembayaran Anda...', 'info', 2000);

                        // Update status pesanan di server
                        const updateResponse = await fetch('/update-order-status', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                order_id: midtransResult.order_id,
                                transaction_status: midtransResult.transaction_status
                            })
                        });

                        if (!updateResponse.ok) {
                            throw new Error('Gagal memperbarui status pesanan');
                        }

                        resetCart();
                        showToast('Pembayaran berhasil! Mengalihkan ke dashboard...', 'success', 1500);
                        setTimeout(() => {
                            window.location.href = `/dashboard.html?payment_success=true&order_id=${midtransResult.order_id}`;
                        }, 1500);
                    } catch (error) {
                        console.error('Error updating order status:', error);
                        showToast('Pembayaran berhasil, tapi ada kendala teknis. Silakan refresh halaman.', 'warning', 5000);
                        setTimeout(() => {
                            window.location.href = `/dashboard.html`;
                        }, 5000);
                    }
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

    // ============================================================
    // FUNGSI UTILITAS
    // ============================================================
    const disablePaymentButton = (text) => {
        if (!submitButton) return;
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-times-circle"></i> ${text}`;
    };

    const setPaymentButtonLoading = (isLoading, loadingText = 'Memproses pembayaran...') => {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingTextEl = document.getElementById('loading-text');

        if (!submitButton) return;
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            if (loadingOverlay) {
                loadingOverlay.classList.add('active');
                if (loadingTextEl) loadingTextEl.textContent = loadingText;
            }
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
            if (loadingOverlay) {
                loadingOverlay.classList.remove('active');
            }
        }
    };

    const checkUrlForSuccess = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('transaction_status');
        if (status === 'settlement' || status === 'capture') {
            window.location.href = `/dashboard.html?payment_success=true`;
        }
    };

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    const addEventListeners = () => {
        if (!chekiListContainer || !submitButton) return;

        // Delegasi event untuk tombol + dan -
        chekiListContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.quantity-btn');
            if (!button) return;

            const productId = button.dataset.id;
            const action = button.classList.contains('increase') ? 'increase' : 'decrease';
            updateCart(productId, action);
        });

        submitButton.addEventListener('click', handlePayment);
    };

    // Jalankan inisialisasi
    initializePage();
});