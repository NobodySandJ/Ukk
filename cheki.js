document.addEventListener('DOMContentLoaded', function() {
    // Memastikan kode hanya berjalan di halaman cheki
    if (document.getElementById('cheki-page')) {
        
        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvolmRVcvvoB1zrI-Nh18n1K7LqYY6LEJzIkiKPWOOxXP1LUY1MG7L7M8XyZKL3s-ZQA/exec';
        
        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button');
        const customerNameEl = document.getElementById('customer-name');
        const customerSocialEl = document.getElementById('customer-social');
        const formErrorEl = document.getElementById('form-error');

        let membersData = [];
        let cart = {};

        // --- FUNGSI BARU UNTUK MEMUAT MEMBER DARI JSON ---
        async function loadChekiProducts() {
            try {
                const response = await fetch('data.json');
                if (!response.ok) throw new Error('Data member tidak ditemukan');
                const data = await response.json();
                membersData = data.members; // Simpan data member
                renderProducts(); // Tampilkan produk setelah data dimuat
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
        
        function updateQuantity(memberId, action) {
            if (!cart[memberId]) cart[memberId] = 0;
            if (action === 'increase') cart[memberId]++;
            else if (action === 'decrease' && cart[memberId] > 0) cart[memberId]--;
            
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
            totalPriceEl.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        }
        
        chekiListContainer.addEventListener('click', e => {
            if (e.target.classList.contains('quantity-btn')) {
                updateQuantity(e.target.dataset.id, e.target.dataset.action);
            }
        });
        
        submitButton.addEventListener('click', e => {
            e.preventDefault();
            
            if (GOOGLE_SCRIPT_URL === '') {
                formErrorEl.textContent = 'URL Google Script belum diatur.';
                return;
            }

            const customerName = customerNameEl.value.trim();
            const customerSocial = customerSocialEl.value.trim();
            const totalItems = parseInt(totalItemsEl.textContent);
            
            if (customerName === '' || customerSocial === '') {
                formErrorEl.textContent = 'Mohon isi Nama dan Username Anda.';
                return;
            }
            if (totalItems === 0) {
                formErrorEl.textContent = 'Anda belum memilih cheki.';
                return;
            }
            
            formErrorEl.textContent = '';
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
            
            let orderSummaryText = '';
            for (const memberId in cart) {
                if (cart[memberId] > 0) {
                    const member = membersData.find(m => m.id === memberId);
                    if(member) orderSummaryText += `${member.name} x${cart[memberId]}; `;
                }
            }

            const orderData = {
                customerName: customerName,
                customerSocial: customerSocial,
                orderSummary: orderSummaryText.trim(),
                totalPrice: parseInt(totalPriceEl.textContent.replace(/[^0-9]/g, ''))
            };
            
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(orderData)
            })
            .then(() => {
                alert('Pesanan Berhasil Terkirim!\nTerima kasih telah memesan.');
                window.location.reload();
            })
            .catch(error => {
                formErrorEl.textContent = 'Terjadi kesalahan saat mengirim. Coba lagi nanti.';
                console.error('Error:', error);
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Pesanan';
            });
        });
        
        loadChekiProducts();
    }
});