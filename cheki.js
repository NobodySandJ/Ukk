document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('cheki-page')) {

        // ==================================================================
        // === PASTE URL APLIKASI WEB ANDA DARI GOOGLE APPS SCRIPT DI SINI ===
        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvolmRVcvvoB1zrI-Nh18n1K7LqYY6LEJzIkiKPWOOxXP1LUY1MG7L7M8XyZKL3s-ZQA/exec';
        // ==================================================================
        
        const chekiListContainer = document.getElementById('cheki-list');
        const totalItemsEl = document.getElementById('total-items');
        const totalPriceEl = document.getElementById('total-price');
        const submitButton = document.getElementById('submit-button'); // Tombol diubah
        const customerNameEl = document.getElementById('customer-name');
        const customerSocialEl = document.getElementById('customer-social');
        const formErrorEl = document.getElementById('form-error');

        const members = [
            { id: 'runa', name: 'Runa', price: 35000, img: 'https://via.placeholder.com/300x400.png?text=Runa' },
            { id: 'hina', name: 'Hina', price: 35000, img: 'https://via.placeholder.com/300x400.png?text=Hina' },
            { id: 'ami', name: 'Ami', price: 35000, img: 'https://via.placeholder.com/300x400.png?text=Ami' },
            { id: 'marina', name: 'Marina', price: 35000, img: 'https://via.placeholder.com/300x400.png?text=Marina' },
            { id: 'anzu', name: 'Anzu', price: 35000, img: 'https://via.placeholder.com/300x400.png?text=Anzu' },
        ];

        let cart = {};

        function renderProducts() {
            chekiListContainer.innerHTML = '';
            members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'cheki-card';
                card.innerHTML = `
                    <img src="${member.img}" alt="Cheki ${member.name}">
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
                    const member = members.find(m => m.id === memberId);
                    totalItems += cart[memberId];
                    totalPrice += cart[memberId] * member.price;
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
        
        submitButton.addEventListener('click', async e => {
            e.preventDefault();
            const customerName = customerNameEl.value.trim();
            const customerSocial = customerSocialEl.value.trim();
            let orderSummaryText = '';
            let totalItems = parseInt(totalItemsEl.textContent);
            
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
            
            for (const memberId in cart) {
                if (cart[memberId] > 0) {
                    const member = members.find(m => m.id === memberId);
                    orderSummaryText += `${member.name} x${cart[memberId]}; `;
                }
            }

            const orderData = {
                customerName: customerName,
                customerSocial: customerSocial,
                orderSummary: orderSummaryText.trim(),
                totalPrice: parseInt(totalPriceEl.textContent.replace(/[^0-9]/g, ''))
            };

            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // Penting untuk menghindari error CORS
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                
                // Karena mode 'no-cors', kita tidak bisa membaca response,
                // jadi kita asumsikan berhasil jika tidak ada error jaringan.
                alert('Pesanan Berhasil Terkirim! Terima kasih telah memesan.');
                window.location.reload(); // Refresh halaman setelah berhasil

            } catch (error) {
                formErrorEl.textContent = 'Terjadi kesalahan. Coba lagi nanti.';
                submitButton.disabled = false;
                submitButton.textContent = 'Kirim Pesanan';
            }
        });

        renderProducts();
    }
});