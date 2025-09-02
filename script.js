document.addEventListener('DOMContentLoaded', function() {
    // Efek smooth scroll untuk navigasi
    const navLinks = document.querySelectorAll('nav a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 70, // Adjust for header height
                    behavior: 'smooth'
                });
            }
        });
    });

    // Animasi sederhana untuk member card saat scroll
    const memberCards = document.querySelectorAll('.member-card');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.5s ease forwards';
            }
        });
    }, {
        threshold: 0.1
    });

    memberCards.forEach(card => {
        observer.observe(card);
    });
});

// Keyframes untuk animasi (bisa ditambahkan di CSS)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.member-card {
    opacity: 0; /* Mulai dengan transparan */
}
`;
document.head.appendChild(styleSheet);

// Tambahkan kode ini ke dalam file script.js Anda

document.addEventListener('DOMContentLoaded', function() {
    
    // ... (kode smooth scroll dan animasi member card yang sudah ada sebelumnya bisa tetap di sini) ...

    // --- Kode untuk Lightbox Galeri ---
    const galleryItems = document.querySelectorAll('.gallery-item img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-btn');

    if (galleryItems.length > 0 && lightbox) { // Pastikan elemen ada di halaman
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                lightbox.style.display = 'block';
                lightboxImg.src = item.src;
            });
        });

        closeBtn.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });

        // Tutup lightbox jika mengklik di luar gambar
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    
    // Efek smooth scroll untuk navigasi
    const navLinks = document.querySelectorAll('nav a[href^="index.html#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let targetId = this.getAttribute('href').substring(10); // Ambil ID setelah 'index.html#'
            let targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70, // Sesuaikan dengan tinggi header
                    behavior: 'smooth'
                });
            }
        });
    });

    // Kode untuk Lightbox Galeri
    const galleryItems = document.querySelectorAll('.gallery-item img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-btn');

    if (galleryItems.length > 0 && lightbox) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                lightbox.style.display = 'block';
                lightboxImg.src = item.src;
            });
        });

        closeBtn.addEventListener('click', () => {
            lightbox.style.display = 'none';
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = 'none';
            }
        });
    }
});