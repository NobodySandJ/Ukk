// ================================================================
// FILE: slider.js - Logika Slider/Carousel Gambar
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.slider-nav .prev-btn');
    const nextBtn = document.querySelector('.slider-nav .next-btn');
    const dotsContainer = document.querySelector('.slider-dots');

    if (slides.length === 0) return;

    let currentSlide = 0;
    let autoSlideInterval;

    // ============================================================
    // MEMBUAT DOTS NAVIGASI
    // ============================================================
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

    // ============================================================
    // FUNGSI PINDAH SLIDE
    // ============================================================
    function goToSlide(slideIndex) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        currentSlide = (slideIndex + slides.length) % slides.length; // Loop slide

        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // ============================================================
    // EVENT LISTENERS TOMBOL NAVIGASI
    // ============================================================
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoSlide();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoSlide();
    });

    // ============================================================
    // FUNGSI AUTO-SLIDE
    // Edit interval di sini (dalam milidetik, 5000 = 5 detik)
    // ============================================================
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    // Inisialisasi slider
    goToSlide(0);
    startAutoSlide();
});