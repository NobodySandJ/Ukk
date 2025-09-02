document.addEventListener('DOMContentLoaded', function() {
    
    // --- KODE UNTUK MENU HAMBURGER MOBILE ---
    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.querySelector('.nav-links'); // Menggunakan class

    if (hamburger && navLinks) {
        // Buka/Tutup menu saat hamburger di klik
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Tutup menu saat salah satu link di klik (untuk navigasi di halaman yang sama)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
    
    // --- FUNGSI SMOOTH SCROLL ---
    function smoothScrollTo(targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70, // Penyesuaian tinggi header
                behavior: 'smooth'
            });
        }
    }

    // --- LOGIKA NAVIGASI ---
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            const [path, targetId] = href.split('#');

            // Jika link adalah anchor di halaman yang sama
            if (!path && targetId) {
                e.preventDefault();
                smoothScrollTo(targetId);
            }
            // Jika link mengarah ke anchor di halaman lain (index.html)
            else if (path === 'index.html' && targetId) {
                e.preventDefault();
                // Simpan target di sessionStorage agar bisa diakses di halaman berikutnya
                sessionStorage.setItem('scrollToTarget', targetId);
                // Arahkan ke halaman index.html
                window.location.href = path;
            }
        });
    });

    // --- EKSEKUSI SMOOTH SCROLL SETELAH PINDAH HALAMAN ---
    // Cek apakah ada target scroll yang tersimpan dari halaman sebelumnya
    const scrollTargetId = sessionStorage.getItem('scrollToTarget');
    if (scrollTargetId) {
        // Beri sedikit jeda agar halaman termuat sepenuhnya sebelum scroll
        setTimeout(() => {
            smoothScrollTo(scrollTargetId);
            // Hapus target dari sessionStorage setelah digunakan
            sessionStorage.removeItem('scrollToTarget');
        }, 100);
    }

    // --- KODE UNTUK LIGHTBOX GALERI ---
    const galleryItems = document.querySelectorAll('.gallery-item img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-btn');

    if (galleryItems.length > 0 && lightbox) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                lightbox.style.display = 'block';
                lightboxImg.src = item.src; // Pastikan src gambar diatur
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                lightbox.style.display = 'none';
            });
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
    }
});