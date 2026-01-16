// ================================================================
// FILE: leaderboard.js - Logika Halaman Leaderboard
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const filters = document.getElementById('leaderboard-filters');
    const listContainer = document.getElementById('leaderboard-list');

    // Load default: Global leaderboard
    loadLeaderboard('global');

    // ============================================================
    // EVENT LISTENER FILTER BUTTON
    // ============================================================
    filters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update tombol aktif
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Load data sesuai filter
            const filter = e.target.getAttribute('data-filter');
            loadLeaderboard(filter);
        }
    });

    // ============================================================
    // FUNGSI LOAD LEADERBOARD DARI API
    // ============================================================
    async function loadLeaderboard(type) {
        listContainer.innerHTML = '<p style="text-align:center; padding: 2rem;">Mengambil data...</p>';

        try {
            let url = '/api/leaderboard'; // Default Global
            if (type !== 'global') {
                url = `/api/leaderboard-per-member?memberName=${type}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            renderList(data, type);
        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<p style="text-align:center; color:red;">Gagal memuat leaderboard.</p>';
        }
    }

    // ============================================================
    // FUNGSI RENDER LIST LEADERBOARD
    // Edit di sini untuk mengubah tampilan kartu ranking
    // ============================================================
    function renderList(data, type) {
        listContainer.innerHTML = '';

        if (data.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:2rem;">Belum ada data untuk kategori ini.</div>';
            return;
        }

        data.forEach((user, index) => {
            const rankClass = index < 3 ? `rank-${index + 1}` : '';
            const rankIcon = index === 0 ? '👑' : `#${index + 1}`;

            // Teks berbeda antara Global dan Per-Member
            let scoreText = '';
            let subText = '';

            if (type === 'global') {
                scoreText = `${user.totalCheki} Cheki`;
                subText = `Team ${user.oshi || '-'}`;
            } else {
                scoreText = `${user.totalQuantity} Tiket`;
                subText = 'Total Tiket Dibeli';
            }

            const html = `
                <div class="rank-card">
                    <div class="rank-number ${rankClass}">${rankIcon}</div>
                    <div class="rank-user">
                        <h4>${user.username}</h4>
                        <p>${subText}</p>
                    </div>
                    <div class="rank-score">${scoreText}</div>
                </div>
            `;
            listContainer.innerHTML += html;
        });
    }
});