const imageInput = document.getElementById('image-input');
const previewArea = document.getElementById('preview-area');
const optionsArea = document.getElementById('options-area');
const convertButton = document.getElementById('convert-button');
const messageArea = document.getElementById('message-area');

let originalFiles = [];

// progress bar
const progressBar = document.createElement('div');
progressBar.className = "w-full bg-gray-200 rounded-full h-3 mt-4 hidden";
progressBar.innerHTML = `<div id="progress-inner" class="bg-primary-blue h-3 rounded-full transition-all duration-300" style="width: 0%"></div>`;
optionsArea.appendChild(progressBar);
const progressInner = document.getElementById('progress-inner');

// kualitas slider
const qualityContainer = document.createElement('div');
qualityContainer.className = "mt-4 text-left hidden";
qualityContainer.innerHTML = `
  <label class="block text-sm font-medium text-gray-700 mb-1">Kualitas (JPEG / WebP)</label>
  <input type="range" id="quality-slider" min="0.1" max="1" step="0.1" value="0.8" class="w-full cursor-pointer">
  <p id="quality-value" class="text-sm text-gray-500 mt-1">80%</p>
`;
optionsArea.appendChild(qualityContainer);

const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${Math.round(qualitySlider.value * 100)}%`;
});

// fungsi buat preview gambar
function createPreviewElement(file) {
    const reader = new FileReader();
    const card = document.createElement('div');
    card.className = "bg-card-bg p-3 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-gray-200";

    const imageEl = document.createElement('img');
    imageEl.className = "w-full h-36 object-contain rounded-lg border border-gray-100 mb-2";
    imageEl.alt = "Pratinjau Gambar";

    const fileNameEl = document.createElement('p');
    fileNameEl.className = "font-medium text-xs truncate mb-2 text-gray-700";
    fileNameEl.textContent = file.name;

    const selectContainer = document.createElement('div');
    selectContainer.className = "relative w-full";

    const selectEl = document.createElement('select');
    selectEl.className = "block w-full p-2 pr-8 text-sm border border-gray-300 rounded-lg appearance-none bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue transition duration-200 cursor-pointer";
    selectEl.dataset.fileId = file.id;

    const formats = [
        { value: 'image/webp', text: 'WebP' },
        { value: 'image/jpeg', text: 'JPEG' },
        { value: 'image/png', text: 'PNG' }
    ];
    formats.forEach(format => {
        const option = document.createElement('option');
        option.value = format.value;
        option.textContent = format.text;
        selectEl.appendChild(option);
    });

    const arrowIcon = document.createElement('div');
    arrowIcon.className = "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700";
    arrowIcon.innerHTML = `<svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>`;

    selectContainer.appendChild(selectEl);
    selectContainer.appendChild(arrowIcon);

    reader.onload = function(event) {
        imageEl.src = event.target.result;
    };
    reader.readAsDataURL(file);

    card.appendChild(imageEl);
    card.appendChild(fileNameEl);
    card.appendChild(selectContainer);

    return card;
}

// handler input file
imageInput.addEventListener('change', (e) => {
    originalFiles = Array.from(e.target.files).map((file, index) => {
        file.id = `file-${index}`;
        return file;
    });

    messageArea.textContent = '';
    previewArea.innerHTML = '';

    if (originalFiles.length > 0) {
        originalFiles.forEach(file => {
            const preview = createPreviewElement(file);
            previewArea.appendChild(preview);
        });
        previewArea.classList.remove('hidden');
        optionsArea.classList.remove('hidden');
        progressBar.classList.remove('hidden');
        qualityContainer.classList.remove('hidden');
    } else {
        previewArea.classList.add('hidden');
        optionsArea.classList.add('hidden');
        progressBar.classList.add('hidden');
        qualityContainer.classList.add('hidden');
    }
});

// helper konversi file → blob
function convertImage(file, format, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // auto-resize
                const MAX_WIDTH = 1920;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                let finished = false;
                const timer = setTimeout(() => {
                    if (!finished) reject(new Error(`Timeout konversi ${file.name}`));
                }, 10000);

                canvas.toBlob(blob => {
                    finished = true;
                    clearTimeout(timer);
                    if (blob) resolve(blob);
                    else reject(new Error(`File ${file.name} gagal dikonversi (${format} tidak didukung).`));
                }, format, quality);
            };
            img.onerror = () => reject(new Error(`Gagal load gambar ${file.name}`));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`));
        reader.readAsDataURL(file);
    });
}

// konversi
convertButton.addEventListener('click', async () => {
    if (originalFiles.length === 0) {
        messageArea.textContent = 'Silakan pilih gambar terlebih dahulu.';
        return;
    }

    messageArea.textContent = 'Mengonversi gambar, mohon tunggu...';
    convertButton.disabled = true;
    progressInner.style.width = "0%";

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < originalFiles.length; i++) {
        const file = originalFiles[i];
        try {
            const selectEl = document.querySelector(`[data-file-id="${file.id}"]`);
            const format = selectEl.value;
            const quality = qualitySlider.value;

            const convertedBlob = await convertImage(file, format, quality);

            let fileName = file.name.split('.')[0];
            let fileExtension = format.split('/')[1];
            if (fileExtension === 'jpeg') fileExtension = 'jpg';
            zip.file(`${fileName}.${fileExtension}`, convertedBlob);
            successCount++;

        } catch (error) {
            console.error(error);
            messageArea.textContent = `⚠️ ${error.message}`;
        }

        // update progress bar
        const progressPercent = Math.round(((i + 1) / originalFiles.length) * 100);
        progressInner.style.width = `${progressPercent}%`;
    }

    if (successCount > 0) {
        zip.generateAsync({ type: 'blob' }).then(content => {
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gambar-terkonversi.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            messageArea.textContent = '✅ Konversi selesai! File ZIP sedang diunduh.';
            convertButton.disabled = false;

            // reset state
            imageInput.value = '';
            previewArea.innerHTML = '';
            previewArea.classList.add('hidden');
            optionsArea.classList.add('hidden');
            progressBar.classList.add('hidden');
            qualityContainer.classList.add('hidden');
            originalFiles = [];
        });
    } else {
        messageArea.textContent = 'Tidak ada gambar yang berhasil dikonversi.';
        convertButton.disabled = false;
    }
});
