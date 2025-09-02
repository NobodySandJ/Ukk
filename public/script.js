// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const groupIntroEl = document.getElementById('group-intro');
    const memberListEl = document.getElementById('member-list');
    const groupChekiOptionEl = document.getElementById('group-cheki-option');
    const stockDisplayEl = document.getElementById('stock-display');
    const totalPriceEl = document.getElementById('total-price');
    const nicknameInput = document.getElementById('nickname');
    const submitBtn = document.getElementById('submit-order');
    const modal = document.getElementById('notification-modal');
    const modalMessage = document.getElementById('notification-message');
    const closeModalBtn = document.getElementById('close-modal');

    let currentStock = 0;
    let order = {
        group: 0,
        members: {} // { runa: 1, hina: 2 }
    };

    // === Render Functions ===
    function renderGroupInfo() {
        groupIntroEl.innerHTML = groupData.description;
    }

    function renderMembers() {
        memberListEl.innerHTML = members.map(member => `
            <div class="glass-card rounded-lg overflow-hidden text-center p-4 transform hover:scale-105 transition-transform duration-300">
                <img src="${member.image}" alt="${member.name}" class="w-32 h-32 md:w-40 md:h-40 object-cover rounded-full mx-auto border-4 border-teal-500/50">
                <h3 class="text-xl font-bold mt-4">${member.name}</h3>
                <p class="text-teal-300 text-sm mb-2">${member.animal}</p>
                <p class="text-xs text-slate-300 mb-4 h-16">"${member.jikoshoukai}"</p>
                <div class="flex items-center justify-center space-x-3">
                    <button data-member-id="${member.id}" class="op-btn minus bg-red-500/50 w-8 h-8 rounded-full">-</button>
                    <span id="qty-${member.id}" class="text-xl font-bold w-10">0</span>
                    <button data-member-id="${member.id}" class="op-btn plus bg-teal-500/50 w-8 h-8 rounded-full">+</button>
                </div>
            </div>
        `).join('');
    }

    function renderGroupCheki() {
        groupChekiOptionEl.innerHTML = `
            <div class="flex-grow">
                <h3 class="text-xl font-bold">Cheki Group (Semua Member)</h3>
                <p class="text-sm text-slate-300">Dapatkan cheki spesial bersama semua member Mujōken no Umi!</p>
            </div>
            <div class="flex items-center justify-center space-x-3 mt-4 md:mt-0">
                <button data-member-id="group" class="op-btn minus bg-red-500/50 w-10 h-10 rounded-full">-</button>
                <span id="qty-group" class="text-2xl font-bold w-12 text-center">0</span>
                <button data-member-id="group" class="op-btn plus bg-teal-500/50 w-10 h-10 rounded-full">+</button>
            </div>
        `;
    }

    // === Logic Functions ===
    function updateOrder(memberId, operation) {
        let totalChekis = calculateTotalChekis();

        if (operation === 'plus') {
            if (totalChekis >= currentStock) {
                showNotification("Stok tiket tidak mencukupi!");
                return;
            }
            if (memberId === 'group') {
                order.group++;
            } else {
                order.members[memberId] = (order.members[memberId] || 0) + 1;
            }
        } else if (operation === 'minus') {
            if (memberId === 'group') {
                if (order.group > 0) order.group--;
            } else {
                if (order.members[memberId] && order.members[memberId] > 0) {
                    order.members[memberId]--;
                }
            }
        }
        updateUI();
    }

    function calculateTotalChekis() {
        return order.group + Object.values(order.members).reduce((a, b) => a + b, 0);
    }
    
    function updateUI() {
        // Update quantities
        document.getElementById('qty-group').textContent = order.group;
        members.forEach(m => {
            document.getElementById(`qty-${m.id}`).textContent = order.members[m.id] || 0;
        });

        // Update total price
        const totalChekis = calculateTotalChekis();
        totalPriceEl.textContent = `Rp ${(totalChekis * groupData.chekiPrice).toLocaleString('id-ID')}`;

        // Update button state
        if (totalChekis > 0 && totalChekis <= currentStock) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-disabled');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-disabled');
        }
    }

    async function fetchStock() {
        try {
            // Nanti ini akan diganti dengan fetch('/api/get-stock')
            // Untuk sekarang, kita gunakan nilai dummy
            const response = await fetch('/api/get-stock');
            if(!response.ok) throw new Error("Gagal mengambil data stok");
            
            const data = await response.json();
            currentStock = data.stock;
            stockDisplayEl.textContent = currentStock;
            stockDisplayEl.classList.remove('animate-pulse');
        } catch (error) {
            console.error(error);
            stockDisplayEl.textContent = "Error";
            currentStock = 0; // Set stock to 0 if API fails
        }
        updateUI();
    }

    function showNotification(message) {
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
    }

    // === Event Listeners ===
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('op-btn')) {
            const memberId = e.target.dataset.memberId;
            const operation = e.target.classList.contains('plus') ? 'plus' : 'minus';
            updateOrder(memberId, operation);
        }
    });

    submitBtn.addEventListener('click', async () => {
        const nickname = nicknameInput.value.trim();
        const totalChekis = calculateTotalChekis();

        if (totalChekis === 0) {
            showNotification("Anda belum memilih cheki.");
            return;
        }
        if (!nickname) {
            showNotification("Harap isi nama panggilan Anda.");
            return;
        }

        const orderDetails = {
            nickname: nickname,
            totalAmount: totalChekis * groupData.chekiPrice,
            items: {
                group: order.group,
                ...order.members
            },
            timestamp: new Date().toISOString()
        };
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Mengirim...";

        try {
            const response = await fetch('/api/submit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderDetails)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengirim pesanan.');
            }
            
            showNotification("Pesanan berhasil dikirim! Silakan cek email/WA Anda untuk instruksi pembayaran.");
            // Reset order
            order = { group: 0, members: {} };
            nicknameInput.value = '';
            fetchStock(); // Refresh stock
        } catch (error) {
            showNotification(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Pesan Sekarang";
        }
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // === Initial Load ===
    function init() {
        renderGroupInfo();
        renderMembers();
        renderGroupCheki();
        fetchStock();
    }

    init();
});