// =================================================================
// SIGNATURE PAD
// =================================================================
function initSignaturePad(canvasId, inputId, clearBtnId) {
    const canvas = document.getElementById(canvasId);
    const input = document.getElementById(inputId);
    const clearBtn = document.getElementById(clearBtnId);

    if (!canvas || !input) {
        console.warn(`Signature pad elements not found: ${canvasId}, ${inputId}`);
        return;
    }

    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    function getScales() {
        return {
            scaleX: canvas.width / canvas.getBoundingClientRect().width,
            scaleY: canvas.height / canvas.getBoundingClientRect().height
        };
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const { scaleX, scaleY } = getScales();
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function startDraw(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDraw() {
        if (isDrawing) {
            isDrawing = false;
            // ✅ Send full data URI - JotForm expects data:image/png;base64, prefix
            input.value = canvas.toDataURL('image/png');
        }
    }

    canvas.addEventListener('pointerdown', startDraw);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stopDraw);
    canvas.addEventListener('pointerleave', stopDraw);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            input.value = '';
        });
    }
}

// =================================================================
// FILE ACCUMULATION - stores files across multiple selections
// =================================================================
// =================================================================
// FILE ACCUMULATION - stores actual file data, not references
// =================================================================
const fileStore = {
    id_upload:       [],
    bank_statements: [],
    voided_check:    []
};

function addFilesToStore(inputElement, storeKey, containerId, maxFiles) {
    const newFiles = inputElement.files;

    for (let i = 0; i < newFiles.length; i++) {
        const newFile = newFiles[i];

        // Check if file already exists by name and size
        const alreadyExists = fileStore[storeKey].some(
            f => f.name === newFile.name && f.size === newFile.size
        );

        if (!alreadyExists) {
            if (maxFiles && fileStore[storeKey].length >= maxFiles) {
                alert(`You can only upload a maximum of ${maxFiles} files for this field.`);
                break;
            }

            // ✅ Clone the file data immediately before the input gets cleared
            const clonedFile = new File(
                [newFile],
                newFile.name,
                { type: newFile.type, lastModified: newFile.lastModified }
            );

            fileStore[storeKey].push(clonedFile);
            console.log(`✅ Stored file: ${clonedFile.name} (${(clonedFile.size / 1024).toFixed(1)} KB) in ${storeKey}`);
        }
    }

    // Update the display
    displayUploadedFiles(storeKey, containerId);
}

function removeFileFromStore(storeKey, containerId, indexToRemove) {
    fileStore[storeKey].splice(indexToRemove, 1);
    displayUploadedFiles(storeKey, containerId);
}

// =================================================================
// FILE DISPLAY
// =================================================================
// =================================================================
// FILE DISPLAY
// =================================================================
function displayUploadedFiles(storeKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const files = fileStore[storeKey];

    if (!files || files.length === 0) return;

    const countP = document.createElement('p');
    countP.style.fontWeight = 'bold';
    countP.style.marginBottom = '5px';
    countP.textContent = `${files.length} file${files.length > 1 ? 's' : ''} selected`;
    container.appendChild(countP);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '4px 0';
        row.style.borderBottom = '1px solid #eee';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${i + 1}. ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        nameSpan.style.fontSize = '0.85em';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.style.marginLeft = '10px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.background = 'none';
        removeBtn.style.border = 'none';
        removeBtn.style.color = 'red';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.fontSize = '0.9em';

        const capturedIndex = i;
        removeBtn.addEventListener('click', () => {
            removeFileFromStore(storeKey, containerId, capturedIndex);
        });

        row.appendChild(nameSpan);
        row.appendChild(removeBtn);
        container.appendChild(row);
    }
}

// =================================================================
// FORM SUBMISSION
// =================================================================
async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // --- Validation ---
    if (fileStore.bank_statements.length > 4) {
        alert('You can only upload a maximum of 4 bank statements.');
        return;
    }

    const owner1SignatureData = document.getElementById('owner1_signature_data');
    if (!owner1SignatureData || !owner1SignatureData.value.trim()) {
        alert('Please provide Owner 1\'s signature before submitting.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    // --- Build FormData manually ---
    const formData = new FormData();

    // Add all text/hidden fields from the form
    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
        const el = formElements[i];
        if (el.type === 'file') continue;
        if (el.type === 'submit' || el.type === 'button') continue;
        if (!el.name) continue;

        if (el.type === 'checkbox') {
            if (el.checked) formData.append(el.name, el.value || 'on');
            continue;
        }
        if (el.type === 'radio') {
            if (el.checked) formData.append(el.name, el.value);
            continue;
        }
        formData.append(el.name, el.value);
    }

    // ✅ Add files from the array-based fileStore
    fileStore.id_upload.forEach(file => {
        formData.append('id_upload', file, file.name);
    });

    fileStore.bank_statements.forEach(file => {
        formData.append('bank_statements', file, file.name);
    });

    fileStore.voided_check.forEach(file => {
        formData.append('voided_check', file, file.name);
    });

    // --- Debug: verify files are in FormData ---
    console.log("=== FORM DATA DEBUG ===");
    let fileCount = 0;
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`📁 ${key}: ${value.name} (${(value.size / 1024).toFixed(1)} KB, type: ${value.type})`);
            fileCount++;
        }
    }
    console.log(`Total files in FormData: ${fileCount}`);

    // ✅ Double-check fileStore state
    console.log("FileStore state:");
    console.log(`  id_upload: ${fileStore.id_upload.length} files`);
    console.log(`  bank_statements: ${fileStore.bank_statements.length} files`);
    console.log(`  voided_check: ${fileStore.voided_check.length} files`);
    console.log("========================");

    if (fileCount === 0) {
        alert('Please attach at least your bank statements before submitting.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/submit-form', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('Application submitted successfully!');
            form.reset();

            ['owner1_signature_canvas', 'owner2_signature_canvas'].forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                }
            });

            fileStore.id_upload       = [];
            fileStore.bank_statements = [];
            fileStore.voided_check    = [];

            ['id_upload_file_list', 'bank_statements_file_list', 'voided_check_file_list'].forEach(id => {
                const container = document.getElementById(id);
                if (container) container.innerHTML = '';
            });

        } else {
            console.error('Submission failed:', result.message);
            alert('Submission failed: ' + result.message);
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert('An unexpected error occurred. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
    }
}

// =================================================================
// INIT
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- Signature Pads ---
    initSignaturePad('owner1_signature_canvas', 'owner1_signature_data', 'clear_owner1');
    initSignaturePad('owner2_signature_canvas', 'owner2_signature_data', 'clear_owner2');

    // --- File Input Listeners ---
    const fileInputConfigs = [
        { id: 'id_upload',       storeKey: 'id_upload',       containerId: 'id_upload_file_list',       maxFiles: 2 },
        { id: 'bank_statements', storeKey: 'bank_statements', containerId: 'bank_statements_file_list', maxFiles: 4 },
        { id: 'voided_check',    storeKey: 'voided_check',    containerId: 'voided_check_file_list',    maxFiles: 1 }
    ];

    fileInputConfigs.forEach(({ id, storeKey, containerId, maxFiles }) => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('change', () => {
                addFilesToStore(inputElement, storeKey, containerId, maxFiles);
                inputElement.value = '';
            });
        }
    });

    // --- Form Submit Listener ---
    const form = document.getElementById('yourFormId');
    if (form) {
        console.log('✅ Form found, attaching submit listener');
        form.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('❌ Form not found - check that id="yourFormId" exists in your HTML');
    }

});