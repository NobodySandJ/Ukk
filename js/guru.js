document.addEventListener('DOMContentLoaded', () => {
    const manajemenContainer = document.getElementById('manajemen-container');
    const mapelContainer = document.getElementById('mapel-container');

    async function loadGuruData() {
        try {
            const response = await fetch('/data/guru.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            renderManajemen(data.manajemen);
            renderMapel(data.mapel);

        } catch (error) {
            console.error("Gagal memuat data guru:", error);
            manajemenContainer.innerHTML = '<p class="text-red-500 text-center">Gagal memuat data manajemen.</p>';
            mapelContainer.innerHTML = '<p class="text-red-500 text-center">Gagal memuat data guru mapel.</p>';
        }
    }

    function renderManajemen(manajemenList) {
        if (!manajemenList || manajemenList.length === 0) return;
        
        manajemenContainer.innerHTML = ''; // Kosongkan container
        manajemenList.forEach(guru => {
            const card = document.createElement('div');
            card.className = 'text-center w-full max-w-xs';
            card.innerHTML = `
                <div class="bg-gray-200 h-56 w-full rounded-lg border-4 border-purple-500 mb-3 flex items-center justify-center overflow-hidden">
                    <img src="${guru.foto}" alt="Foto ${guru.nama}" class="w-full h-full object-cover">
                </div>
                <p class="font-bold text-gray-800">${guru.nama}</p>
                <p class="text-sm text-gray-600">${guru.jabatan}</p>
            `;
            manajemenContainer.appendChild(card);
        });
    }

    function renderMapel(mapelData) {
        if (!mapelData) return;

        mapelContainer.innerHTML = ''; // Kosongkan container
        for (const mapel in mapelData) {
            const guruList = mapelData[mapel];
            const mapelDiv = document.createElement('div');
            
            let listItems = '';
            guruList.forEach(namaGuru => {
                listItems += `<li class="list-decimal list-inside">${namaGuru}</li>`;
            });

            mapelDiv.innerHTML = `
                <div>
                    <h3 class="font-bold text-xl mb-2 text-purple-700">${mapel}</h3>
                    <ol class="text-gray-600 space-y-1">
                        ${listItems}
                    </ol>
                </div>
            `;
            mapelContainer.appendChild(mapelDiv);
        }
    }

    loadGuruData();
});