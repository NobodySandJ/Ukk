document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgot-password-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Ambil data dari input
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        
        // Nomor WhatsApp tujuan
        const adminWhatsAppNumber = '6285765907580';

        // Buat template pesan
        const message = `Halo Admin,

Saya lupa password akun saya di website Mujōken no Umi.
Berikut adalah data akun saya:
- Username: ${username}
- Email: ${email}

Mohon bantuannya untuk mereset password saya.
Terima kasih.`;

        // Encode pesan agar sesuai format URL
        const encodedMessage = encodeURIComponent(message);

        // Buat URL WhatsApp
        const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodedMessage}`;

        // Buka WhatsApp di tab baru
        window.open(whatsappUrl, '_blank');
    });
});