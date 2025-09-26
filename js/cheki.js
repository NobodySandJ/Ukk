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

        function checkUrlForSuccess() {
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('order_id');
            const transactionStatus = urlParams.get('transaction_status');

            if (orderId && (transactionStatus === 'settlement' || transactionStatus === 'capture')) {
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
            
            if (groupChekiData && groupChekiData.id) {
                const groupCard = createProductCard(groupChekiData);
                chekiListContainer.appendChild(groupCard);
            }
            
            membersData.forEach(member => {
                const memberCard = createProductCard(member);
                chekiListContainer.appendChild(memberCard);
            });
        }
        
        function showToast(message, isSuccess = true, duration = 3000) {
            const oldToast = document.querySelector('.toast-notification');
            if (oldToast) oldToast.remove();
            
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.style.backgroundColor = isSuccess ? 'var(--success-color)' : '#D33333';
            
            if (/<[a-z][\s\S]*>/i.test(message)) {
                toast.innerHTML = message;
            } else {
                toast.textContent = message;
            }

            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 100);

            if (duration !== 0) {
                 setTimeout(() => {
                    toast.classList.remove('show');
                    toast.addEventListener('transitionend', () => toast.remove());
                }, duration);
            }
        }

        function giveFeedback() {
            orderSummaryContainer.classList.add('item-added');
            setTimeout(() => orderSummaryContainer.classList.remove('item-added'), 500);
        }
        
        function resetCart() {
            cart = {};
            const inputs = document.querySelectorAll('.quantity-input');
            inputs.forEach(input => input.value = 0);
            updateTotals();
        }

        function updateQuantity(productId, action) {
            let product = membersData.find(m => m.id === productId) || (productId === groupChekiData.id ? groupChekiData : null);
            if (!product) return;

            if (!cart[productId]) cart[productId] = 0;

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
            let totalItems = 0, totalPrice = 0;
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
            totalItemsEl.textContent = totalItems;
            const formattedPrice = `Rp ${totalPrice.toLocaleString('id-ID')}`;
            totalPriceEl.textContent = formattedPrice;

            if (totalItems > 0) {
                mobileCart.classList.add('visible');
                mobileCartTotal.textContent = formattedPrice;
            } else {
                mobileCart.classList.remove('visible');
            }
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

            const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
            if (totalItems === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }

            formErrorEl.textContent = '';
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

            let item_details = [];
            let gross_amount = 0;
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
                        gross_amount += product.price * cart[productId];
                    }
                }
            }

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

                if (!response.ok) {
                     const err = await response.json();
                     throw new Error(err.message || 'Gagal mendapatkan token pembayaran.');
                }
                
                const data = await response.json();
                window.snap.pay(data.token, {
                    onSuccess: async function(result) {
                        await fetch('/update-order-status', {
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
                        alert("Pembayaran Anda sedang diproses. Status: " + result.transaction_status);
                        submitButton.disabled = false;
                        submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
                    },
                    onError: function(result){
                        alert("Pembayaran gagal!");
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
    }
});