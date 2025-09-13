// js/cheki.js

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cheki-page')) {

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const GET_SNAP_TOKEN_URL = isLocal ? 'http://localhost:3000/get-snap-token' : '/get-snap-token';

        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        // [DIHAPUS] Variabel untuk input customer
        // const customerNameEl = document.getElementById('customer-name');
        // const customerEmailEl = document.getElementById('customer-email');
        // const customerSocialEl = document.getElementById('customer-social');
        const formErrorEl = document.getElementById('form-error');

        const mobileCart = document.getElementById('mobile-cart');
        const mobileCartTotal = document.getElementById('mobile-cart-total');

        let membersData = [];
        let cart = {};
        
        // [REVISI] Fungsi ini sekarang mengarahkan ke dashboard setelah sukses
        async function checkUrlForSuccess() {
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('order_id');
            const transactionStatus = urlParams.get('transaction_status');

            if (orderId && (transactionStatus === 'settlement' || transactionStatus === 'capture')) {
                try {
                    await fetch('/update-order-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: orderId,
                            transaction_status: transactionStatus,
                            payment_type: urlParams.get('payment_type') || 'Tidak diketahui'
                        }),
                    });
                    console.log('Status berhasil diupdate dari URL redirect.');
                    // [PENGALIHAN] Alihkan ke halaman dashboard setelah pembayaran sukses
                    window.location.href = `/dashboard.html?payment=success&order_id=${orderId}`;
                } catch (error) {
                    console.error('Gagal mengirim konfirmasi status dari URL:', error);
                    // Tetap di halaman ini tapi beri pesan error
                    formErrorEl.textContent = 'Pembayaran berhasil, namun gagal memperbarui status. Hubungi admin.';
                }
            }
        }

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
        
        // [DIHAPUS] Fungsi showSuccessMessage karena tiket ditampilkan di dashboard
        
        // Fungsi lain (showToast, giveFeedback, updateQuantity, updateTotals) tetap sama...

        chekiListContainer.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-btn')) {
                updateQuantity(e.target.dataset.id, e.target.dataset.action);
            }
        });

        mobileCart.addEventListener('click', () => {
            document.querySelector('.order-summary-container').scrollIntoView({ behavior: 'smooth' });
        });

        submitButton.addEventListener('click', async function (e) {
            e.preventDefault();

            // [REVISI] Validasi sekarang hanya mengecek total item
            // Data pelanggan akan diambil dari sesi login nantinya
            const totalItems = parseInt(totalItemsEl.textContent, 10);

            if (totalItems === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }

            // [sementara] Data customer hardcoded, nanti diganti dengan data user yg login
            const loggedInUser = {
                name: "Pengguna Terdaftar",
                email: "user@example.com",
                social: "08123456789"
            };

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
                transaction_details: {
                    order_id: 'CHEKI-' + new Date().getTime(),
                    gross_amount: gross_amount
                },
                customer_details: {
                    first_name: loggedInUser.name,
                    email: loggedInUser.email,
                    phone: loggedInUser.social,
                },
                item_details: item_details
            };

            try {
                const response = await fetch(GET_SNAP_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData),
                });

                if (!response.ok) throw new Error('Gagal mendapatkan token pembayaran dari server.');

                const data = await response.json();
                const snapToken = data.token;

                if (!snapToken) throw new Error('Token tidak valid diterima dari server.');

                window.snap.pay(snapToken, {
                    onSuccess: function (result) { /* Dikosongkan karena ditangani oleh redirect */ },
                    onPending: function (result) { /* ... */ },
                    onError: function (result) { /* ... */ },
                    onClose: function () { /* ... */ }
                });

            } catch (error) {
                console.error('Error:', error);
                formErrorEl.textContent = 'Terjadi kesalahan: ' + error.message;
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Lanjut ke Pembayaran';
            }
        });

        checkUrlForSuccess();
        loadChekiProducts();
    }
});