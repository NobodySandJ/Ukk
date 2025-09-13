// js/cheki.js (Versi Final Terintegrasi)

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('cheki-page')) {
        // --- Ambil data pengguna & token dari Local Storage ---
        const token = localStorage.getItem('userToken');
        const userData = JSON.parse(localStorage.getItem('userData'));

        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        const formErrorEl = document.getElementById('form-error');
        const mobileCart = document.getElementById('mobile-cart');
        const mobileCartTotal = document.getElementById('mobile-cart-total');

        let membersData = [];
        let cart = {};

        // --- Logika untuk mengecek status pembayaran setelah redirect ---
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
                            transaction_status: transactionStatus
                        }),
                    });
                    // Alihkan ke dasbor untuk melihat tiket
                    window.location.href = `/dashboard.html?payment=success&order_id=${orderId}`;
                } catch (error) {
                    formErrorEl.textContent = 'Pembayaran berhasil, namun gagal memperbarui status. Hubungi admin.';
                }
            }
        }

        // --- Memuat produk Cheki dari data.json ---
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

        // --- Render kartu produk ---
        function renderProducts() {
            // ... (Fungsi ini tidak berubah, biarkan seperti yang sudah ada)
        }
        
        // --- Fungsi lainnya (updateQuantity, updateTotals, dll.) ---
        // ... (Semua fungsi helper Anda yang lain tidak berubah)

        // --- [MODIFIKASI UTAMA] Event Listener Tombol Checkout ---
        submitButton.addEventListener('click', async function (e) {
            e.preventDefault();

            // 1. Cek apakah pengguna sudah login
            if (!token || !userData) {
                formErrorEl.textContent = 'Anda harus login terlebih dahulu untuk memesan.';
                // Buka modal login secara otomatis
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

            // 2. Siapkan data pesanan dengan data pengguna yang login
            const orderData = {
                transaction_details: {
                    order_id: 'CHEKI-' + new Date().getTime(),
                    gross_amount: gross_amount
                },
                customer_details: {
                    first_name: userData.username,
                    email: userData.email,
                    phone: userData.whatsapp_number || 'N/A',
                },
                item_details: item_details
            };

            try {
                // 3. Kirim permintaan ke backend DENGAN TOKEN OTORISASI
                const response = await fetch('/get-snap-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // <-- Ini yang paling penting!
                    },
                    body: JSON.stringify({ orderData }), // Kirim dalam format yang diharapkan backend
                });

                if (!response.ok) {
                     const err = await response.json();
                     throw new Error(err.message || 'Gagal mendapatkan token pembayaran.');
                }
                
                const data = await response.json();
                window.snap.pay(data.token, {
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
        
        // --- Inisialisasi Halaman ---
        checkUrlForSuccess();
        loadChekiProducts();
        // ... (Panggil fungsi-fungsi render dan update Anda yang lain di sini)
    }
});