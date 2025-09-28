document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.slider-nav .prev-btn');
    const nextBtn = document.querySelector('.slider-nav .next-btn');
    const dotsContainer = document.querySelector('.slider-dots');

    if (slides.length === 0) return;

    let currentSlide = 0;
    let autoSlideInterval;

    // Membuat dots navigasi
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoSlide();
        });
        dotsContainer.appendChild(dot);
    });
    const dots = document.querySelectorAll('.slider-dots .dot');

    // Fungsi untuk pindah slide
    function goToSlide(slideIndex) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        currentSlide = (slideIndex + slides.length) % slides.length; // Loop slide
        
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    // Fungsi untuk slide berikutnya
    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    // Fungsi untuk slide sebelumnya
    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Event listener untuk tombol
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoSlide();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoSlide();
    });
    
    // Fungsi untuk auto-slide
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000); // Ganti slide setiap 5 detik
    }

    // Fungsi untuk mereset interval auto-slide (saat user berinteraksi)
    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    // Inisialisasi slider
    goToSlide(0);
    startAutoSlide();
});