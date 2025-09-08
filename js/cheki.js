// js/cheki.js

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('cheki-page')) {
        
        const GET_SNAP_TOKEN_URL = '/get-snap-token'; 
        
        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        const customerNameEl = document.getElementById('customer-name');
        const customerEmailEl = document.getElementById('customer-email');
        const customerSocialEl = document.getElementById('customer-social');
        const formErrorEl = document.getElementById('form-error');
        const orderSummaryContainer = document.querySelector('.order-summary-container');
        const chekiFormWrapper = document.getElementById('cheki-form-wrapper');
        
        const mobileCart = document.getElementById('mobile-cart');
        const mobileCartTotal = document.getElementById('mobile-cart-total');

        let membersData = [];
        let cart = {};

        async function loadChekiProducts() {
            try {
                const response = await fetch('data.json');
                if (!response.ok) throw new Error('Data member tidak ditemukan');
                const data = await response.json();
                membersData = data.members; 
                renderProducts();
            } catch (error) {
                console.error("Gagal memuat produk cheki:", error);
                chekiListContainer.innerHTML = "<p>Gagal memuat produk. Coba segarkan halaman.</p>";
            }
        }
        
        function renderProducts() {
            chekiListContainer.innerHTML = '';
            membersData.forEach(member => {
                const card = document.createElement('div');
                card.className = 'cheki-card reveal';
                card.innerHTML = `
                    <img src="${member.image}" alt="Cheki ${member.name}">
                    <h3>${member.name}</h3>
                    <p class="price">Rp ${member.price.toLocaleString('id-ID')}</p>
                    <div class="quantity-selector">
                        <button class="quantity-btn" data-id="${member.id}" data-action="decrease">-</button>
                        <input type="number" class="quantity-input" data-id="${member.id}" value="0" min="0" readonly>
                        <button class="quantity-btn" data-id="${member.id}" data-action="increase">+</button>
                    </div>
                `;
                chekiListContainer.appendChild(card);
            });
        }
        
        function showToast(message) {
            const oldToast = document.querySelector('.toast-notification');
            if (oldToast) oldToast.remove();
            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                toast.addEventListener('transitionend', () => toast.remove());
            }, 3000);
        }

        function giveFeedback() {
            orderSummaryContainer.classList.add('item-added');
            setTimeout(() => orderSummaryContainer.classList.remove('item-added'), 500);
        }
        
        function updateQuantity(memberId, action) {
            const member = membersData.find(m => m.id === memberId);
            if (!member) return;

            if (!cart[memberId]) cart[memberId] = 0;

            if (action === 'increase') {
                cart[memberId]++;
                showToast(`${member.name} Cheki ditambahkan!`);
                giveFeedback();
            } else if (action === 'decrease' && cart[memberId] > 0) {
                cart[memberId]--;
                showToast(`${member.name} Cheki dikurangi.`);
            }
            
            const inputEl = document.querySelector(`.quantity-input[data-id="${memberId}"]`);
            if (inputEl) inputEl.value = cart[memberId];
            
            updateTotals();
        }
        
        function updateTotals() {
            let totalItems = 0, totalPrice = 0;
            for (const memberId in cart) {
                if (cart[memberId] > 0) {
                    const member = membersData.find(m => m.id === memberId);
                    if(member) {
                        totalItems += cart[memberId];
                        totalPrice += cart[memberId] * member.price;
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
        
        function showSuccessMessage(result) {
            chekiFormWrapper.style.display = 'none';
            mobileCart.style.display = 'none'; 

            const successMessage = document.createElement('div');
            successMessage.id = 'order-success-message';
            successMessage.innerHTML = `
                <h3><i class="fas fa-check-circle"></i> Pembayaran Berhasil!</h3>
                <p>Terima kasih! Pesanan Anda dengan ID <strong>${result.order_id}</strong> telah berhasil diproses.</p>
                <p>Silakan cek email Anda untuk detail pembayaran.</p>
                <button id="order-again-btn" class="cta-button">Pesan Lagi</button>
            `;
            orderSummaryContainer.appendChild(successMessage);
            
            document.getElementById('order-again-btn').addEventListener('click', () => {
                window.location.reload();
            });
        }

        chekiListContainer.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-btn')) {
                updateQuantity(e.target.dataset.id, e.target.dataset.action);
            }
        });
        
        mobileCart.addEventListener('click', () => {
            orderSummaryContainer.scrollIntoView({ behavior: 'smooth' });
        });

        submitButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const customerName = customerNameEl.value.trim();
            const customerEmail = customerEmailEl.value.trim();
            const customerSocial = customerSocialEl.value.trim();
            const totalItems = parseInt(totalItemsEl.textContent, 10);
            
            if (customerName === '' || customerSocial === '' || customerEmail === '') {
                formErrorEl.textContent = 'Mohon isi semua data (Nama, Email, dan Kontak).';
                return;
            }
            if (totalItems === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }
            
            formErrorEl.textContent = '';
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
            
            let item_details = [];
            let gross_amount = 0;
            for (const memberId in cart) {
                if (cart[memberId] > 0) {
                    const member = membersData.find(m => m.id === memberId);
                    if (member) {
                        item_details.push({
                            id: member.id,
                            price: member.price,
                            quantity: cart[memberId],
                            name: `Cheki ${member.name}`
                        });
                        gross_amount += member.price * cart[memberId];
                    }
                }
            }
            
            const orderData = {
                // [REVISI] Hapus parameter spesifik agar Snap menampilkan semua metode pembayaran
                transaction_details: {
                    order_id: 'CHEKI-' + new Date().getTime(),
                    gross_amount: gross_amount
                },
                customer_details: {
                    first_name: customerName,
                    email: customerEmail,
                    phone: customerSocial,
                },
                item_details: item_details
            };

            try {
                const response = await fetch(GET_SNAP_TOKEN_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData),
                });
                
                if (!response.ok) throw new Error('Gagal mendapatkan token pembayaran dari server.');

                const data = await response.json();
                const snapToken = data.token;

                if (!snapToken) throw new Error('Token tidak valid diterima dari server.');

                window.snap.pay(snapToken, {
                    onSuccess: function(result){
                      showSuccessMessage(result);
                    },
                    onPending: function(result){
                      console.log('Pembayaran tertunda (pending):', result);
                      formErrorEl.textContent = 'Pembayaran Anda sedang diproses. Silakan selesaikan.';
                    },
                    onError: function(result){
                      formErrorEl.textContent = 'Pembayaran gagal. Silakan coba lagi.';
                    },
                    onClose: function(){
                      formErrorEl.textContent = 'Anda menutup jendela pembayaran sebelum selesai.';
                      submitButton.disabled = false;
                      submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
                    }
                });

            } catch (error) {
                console.error('Error:', error);
                formErrorEl.textContent = 'Terjadi kesalahan: ' + error.message;
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
            }
        });
        
        loadChekiProducts();
    }
});