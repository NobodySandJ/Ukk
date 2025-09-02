// public/data.js

const groupData = {
    name: "Mujōken no Umi (無条件の海)",
    tagline: "Lautan Tanpa Syarat",
    description: `
        <p class="text-lg mb-4">
            <strong>Mujōken no Umi (無条件の海)</strong>, atau "Lautan Tanpa Syarat," adalah grup idola yang mengusung konsep bahwa cinta dan musik dapat menciptakan samudra di mana saja, bahkan di tengah daratan. 
        </p>
        <p>
            Terdiri dari lima anggota yang terinspirasi oleh pesona hewan laut—<strong>Runa</strong> (Ubur-Ubur), <strong>Hina</strong> (Berang-Berang Laut), <strong>Ami</strong> (Axolotl), <strong>Marina</strong> (Lumba-Lumba), dan <strong>Anzu</strong> (Ikan Badut)—mereka siap mengajakmu menyelami lautan dukungan dan semangat yang tak terbatas.
        </p>
    `,
    chekiPrice: 35000 // Harga per cheki
};

const members = [
    {
        id: "runa",
        name: "Runa (ルナ)",
        animal: "Ubur-Ubur Panggung",
        image: "public/img/runa.jpg", // Ganti dengan path gambar yang sesuai
        sifat: "Tenang, anggun, dan sedikit misterius. Runa adalah tipe cool beauty yang memancarkan aura etereal di atas panggung.",
        jikoshoukai: "Melayang-layang di lautan cinta kalian, aku datang untuk menyengat hatimu dengan pesonaku yang lembut. Jangan berkedip, nanti aku menghilang! Aku Runa, sang ubur-ubur panggung!"
    },
    {
        id: "hina",
        name: "Hina (ヒナ)",
        animal: "Si Berang-Berang Laut Penuh Energi",
        image: "public/img/hina.jpg", // Ganti dengan path gambar yang sesuai
        sifat: "Ceria, super energik, dan sangat ramah. Hina adalah mood maker di dalam grup yang selalu berhasil membuat suasana menjadi ramai dan positif.",
        jikoshoukai: "Dengan cangkang kerang di satu tangan dan hatimu di tangan lainnya, aku siap memecahkan keheningan! Tok tok tok! Siap menyemangatimu hari ini! Aku Hina, berang-berang laut kesayanganmu!"
    },
    {
        id: "ami",
        name: "Ami (アミ)",
        animal: "Axolotl yang Selalu Tersenyum",
        image: "public/img/ami.jpg", // Ganti dengan path gambar yang sesuai
        sifat: "Unik, quirky, dan wajahnya seolah selalu tersenyum. Ami adalah member yang paling tahan banting dan optimis.",
        jikoshoukai: "Walaupun terjatuh, aku akan tumbuh dan tersenyum lagi! Siap meregenerasi semangatmu kapan pun kamu butuh! Senyumku hanya untukmu, aku Ami, axolotl-mu yang abadi!"
    },
    {
        id: "marina",
        name: "Marina (マリナ)",
        animal: "Sang Lumba-Lumba Karismatik",
        image: "public/img/marina.jpg", // Ganti dengan path gambar yang sesuai
        sifat: "Cerdas, karismatik, dan seorang komunikator yang hebat. Marina seringkali menjadi juru bicara grup dan memiliki jiwa kepemimpinan.",
        jikoshoukai: "Melompat lebih tinggi dari ombak, aku akan memandumu melewati lautan tak bersyarat ini! Dengarkan baik-baik, sonar hatiku memanggil namamu! Aku Marina!"
    },
    {
        id: "anzu",
        name: "Anzu (アンズ)",
        animal: "Ikan Badut Pemberani",
        image: "public/img/anzu.jpg", // Ganti dengan path gambar yang sesuai
        sifat: "Pemalu pada awalnya, namun menjadi sangat berani dan protektif jika menyangkut member lain yang ia anggap sebagai 'rumahnya'.",
        jikoshoukai: "Dari balik anemon panggung, aku mengintip untuk menemukanmu! Mungkin aku kecil dan suka bersembunyi, tapi aku akan selalu ada untuk melindungimu! Namaku Anzu, ikan badut penjagamu!"
    }
];