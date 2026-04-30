require('dotenv').config();
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    let formData;

    // =================================================================
    // PARSE MULTIPART FORM DATA
    // =================================================================
    try {
        const contentType = event.headers['content-type'] || event.headers['Content-Type'];

        if (!contentType) {
            throw new Error("Content-Type header is missing.");
        }

        const boundary = contentType
            .split(';')
            .map(part => part.trim())
            .find(part => part.startsWith('boundary='))
            ?.split('=')
            .slice(1)
            .join('=')
            .trim();

        if (!boundary) {
            throw new Error("No boundary found in content-type header");
        }

        let bodyBuffer;
        if (event.isBase64Encoded) {
            bodyBuffer = Buffer.from(event.body, 'base64');
        } else {
            const looksLikeMultipart = event.body.startsWith('--') || event.body.includes('Content-Disposition');
            if (looksLikeMultipart) {
                bodyBuffer = Buffer.from(event.body, 'binary');
            } else {
                bodyBuffer = Buffer.from(event.body, 'base64');
            }
        }

        formData = parseMultipartFormData(bodyBuffer, boundary);

        console.log("✅ Parsed fields:", Object.keys(formData.fields).length);
        console.log("✅ Parsed files:", formData.files.map(f => `${f.name}: ${f.filename} (${f.data.length} bytes)`));

        const totalFileSize = formData.files.reduce((sum, f) => sum + f.data.length, 0);
        const totalSizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
        console.log(`📦 Total file size: ${totalSizeMB} MB`);

    } catch (error) {
        console.error("❌ Parse Error:", error);
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, message: "Failed to parse form data." })
        };
    }

    // =================================================================
    // SUBMIT VIA JOTFORM API
    // =================================================================
    try {
        const textData = formData.fields;
        const formID = process.env.JOTFORM_FORM_ID || '250987281224158';
        const apiKey = process.env.JOTFORM_API_KEY;
        const siteUrl = process.env.URL || 'http://localhost:8888';

        if (!apiKey) {
            throw new Error("JOTFORM_API_KEY is not set in environment variables");
        }

        const parseDate = (dateStr) => {
            if (!dateStr) return { month: '', day: '', year: '' };
            const [year, month, day] = dateStr.split('-');
            return { month: month || '', day: day || '', year: year || '' };
        };

        const owner1Dob  = parseDate(textData.owner1_dob);
        const owner2Dob  = parseDate(textData.owner2_dob);
        const owner1Date = parseDate(textData.owner1_date);
        const owner2Date = parseDate(textData.owner2_date);
        const startDate  = parseDate(textData.start_date);

        // ----------------------------------------------------------------
        // Group files
        // ----------------------------------------------------------------
        const filesByInputName = {};
        if (formData.files && formData.files.length > 0) {
            for (const file of formData.files) {
                if (!file.filename || file.data.length === 0) continue;
                if (!filesByInputName[file.name]) filesByInputName[file.name] = [];
                filesByInputName[file.name].push(file);
            }
        }

        const qidMap = { 'id_upload': '56', 'bank_statements': '58', 'voided_check': '59' };

        // ----------------------------------------------------------------
        // Step 1: Save files and generate download URLs
        // ----------------------------------------------------------------
        console.log("\n=== STEP 1: Storing files ===");

        const submissionTimestamp = Date.now();
        const downloadLinks = {}; // qid -> [{filename, url}]
        const isLocal = !process.env.NETLIFY || process.env.CONTEXT === 'dev';

        for (const [inputName, files] of Object.entries(filesByInputName)) {
            const qid = qidMap[inputName];
            if (!qid) continue;
            downloadLinks[qid] = [];

            for (const file of files) {
                let downloadUrl;

                if (isLocal) {
                    const uploadsDir = path.join(process.cwd(), 'uploads', String(submissionTimestamp));
                    fs.mkdirSync(uploadsDir, { recursive: true });
                    fs.writeFileSync(path.join(uploadsDir, file.filename), file.data);
                    downloadUrl = `${siteUrl}/.netlify/functions/download-file?ts=${submissionTimestamp}&name=${encodeURIComponent(file.filename)}`;
                } else {
                    const { getStore } = require('@netlify/blobs');
                    const store = getStore('form-uploads');
                    const blobKey = `${submissionTimestamp}/${inputName}/${file.filename}`;
                    await store.set(blobKey, file.data, {
                        metadata: {
                            filename:    file.filename,
                            contentType: file.mimeType,
                            uploadedAt:  new Date().toISOString()
                        }
                    });
                    downloadUrl = `${siteUrl}/.netlify/functions/download-file?key=${encodeURIComponent(blobKey)}`;
                }

                downloadLinks[qid].push({ filename: file.filename, url: downloadUrl });
                console.log(`  ✅ ${file.filename} → ${downloadUrl}`);
            }
        }

        // ----------------------------------------------------------------
        // Step 2: Build download links text for each file category
        // These go into the file upload fields as filenames
        // AND we build a summary with real download URLs
        // ----------------------------------------------------------------
        const fileSummaryLines = [];

        fileSummaryLines.push("=== UPLOADED DOCUMENTS ===");

        if (downloadLinks['56'] && downloadLinks['56'].length > 0) {
            fileSummaryLines.push("\nDrivers License / State ID:");
            downloadLinks['56'].forEach(d => {
                fileSummaryLines.push(`  • ${d.filename}: ${d.url}`);
            });
        }

        if (downloadLinks['58'] && downloadLinks['58'].length > 0) {
            fileSummaryLines.push("\nBank Statements:");
            downloadLinks['58'].forEach(d => {
                fileSummaryLines.push(`  • ${d.filename}: ${d.url}`);
            });
        }

        if (downloadLinks['59'] && downloadLinks['59'].length > 0) {
            fileSummaryLines.push("\nVoided Check:");
            downloadLinks['59'].forEach(d => {
                fileSummaryLines.push(`  • ${d.filename}: ${d.url}`);
            });
        }

        const fileSummary = fileSummaryLines.join('\n');
        console.log("\n" + fileSummary);

        // ----------------------------------------------------------------
        // Step 3: Create JotForm submission
        // - File fields get filenames (JotForm shows them in the UI)
        // - Download links go into a text field
        // ----------------------------------------------------------------
        console.log("\n=== STEP 3: Creating JotForm submission ===");

        const submission = {
            '55': 'Accepted',
            '3':  textData.legal_name || '',
            '4':  textData.dba_name || '',
            '8':  textData.tax_id || '',
            '5':  textData.street_address || '',
            '6':  textData.suite_floor || '',
            '7':  textData.city_state_zip || '',
            '9':  { full: textData.phone_number || '' },
            '13': textData.business_email || '',
            '12': textData.business_website || '',
            '10': { month: startDate.month, day: startDate.day, year: startDate.year },
            '11': textData.annual_sales || '',
            '19': textData.monthly_sales || '',
            '14': textData.bankruptcy_liens || '',
            '15': textData.existing_loan || '',
            '17': textData.loan_balance || '',
            '16': textData.own_home || '',
            '18': textData.lease_mortgage || '',
            '20': { full: textData.landlord_contact || '' },
            '21': textData.amount_requested || '',
            '22': textData.purpose_financing || '',
            '24': textData.owner1_name || '',
            '25': textData.owner1_title || '',
            '29': { month: owner1Dob.month, day: owner1Dob.day, year: owner1Dob.year },
            '30': textData.owner1_ssn || '',
            '26': { addr_line1: textData.owner1_street_address || '', addr_line2: '', city: textData.owner1_city_state_zip || '', state: '', postal: '' },
            '27': { full: textData.owner1_phone || '' },
            '28': textData.owner1_ownership_percent || '',
            '51': textData.owner1_signature_data || '',
            '44': textData.owner1_name || '',
            '46': { month: owner1Date.month, day: owner1Date.day, year: owner1Date.year },
            '33': textData.owner2_name || '',
            '34': textData.owner2_title || '',
            '38': { month: owner2Dob.month, day: owner2Dob.day, year: owner2Dob.year },
            '39': textData.owner2_ssn || '',
            '35': { addr_line1: textData.owner2_street_address || '', addr_line2: '', city: textData.owner2_city_state_zip || '', state: '', postal: '' },
            '36': { full: textData.owner2_phone || '' },
            '37': textData.owner2_ownership_percent || '',
            '52': textData.owner2_signature_data || '',
            '45': textData.owner2_name || '',
            '47': { month: owner2Date.month, day: owner2Date.day, year: owner2Date.year }
        };

        // Put filenames in file upload fields (JotForm shows these as file entries)
        for (const [qid, links] of Object.entries(downloadLinks)) {
            submission[qid] = links.map(l => l.filename);
        }

        // Build flat payload
        const apiPayload = {};
        for (const [qid, value] of Object.entries(submission)) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    apiPayload[`submission[${qid}][${index}]`] = item;
                });
            } else if (typeof value === 'object' && value !== null) {
                for (const [subKey, subVal] of Object.entries(value)) {
                    apiPayload[`submission[${qid}][${subKey}]`] = subVal;
                }
            } else {
                apiPayload[`submission[${qid}]`] = value;
            }
        }

        const createUrl = `https://api.jotform.com/form/${formID}/submissions?apiKey=${apiKey}`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(apiPayload).toString()
        });

        const createResult = await createResponse.json();

        if (createResult.responseCode !== 200) {
            console.error("❌ Submission failed:", createResult.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: createResult.message })
            };
        }

        const submissionID = createResult.content.submissionID;
        console.log("✅ Submission created:", submissionID);

        // ----------------------------------------------------------------
        // Step 4: Update submission — add download links to a text field
        // We'll use the purpose_financing field to append links,
        // or if your client adds a new field, use that instead
        // ----------------------------------------------------------------
        console.log("\n=== STEP 4: Adding download links ===");

        // Append download links to the existing purpose field
        const originalPurpose = textData.purpose_financing || '';
        const updatedPurpose = originalPurpose + '\n\n' + fileSummary;

        const updatePayload = {
            [`submission[22]`]: updatedPurpose
        };


        const updateUrl = `https://api.jotform.com/submission/${submissionID}?apiKey=${apiKey}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(updatePayload).toString()
        });

        const updateResult = await updateResponse.json();
        console.log("Update result:", updateResult.responseCode, updateResult.message || 'OK');

        // ----------------------------------------------------------------
        // Step 5: Final verification
        // ----------------------------------------------------------------
        console.log("\n=== STEP 5: Final verification ===");
        const finalResp = await fetch(`https://api.jotform.com/submission/${submissionID}?apiKey=${apiKey}`);
        const finalResult = await finalResp.json();

        if (finalResult.responseCode === 200) {
            // Check file fields
            for (const [inputName, qid] of Object.entries(qidMap)) {
                const answer = finalResult.content.answers[qid];
                if (answer) {
                    console.log(`  Field ${qid} (${answer.text}):`);
                    console.log(`    ${JSON.stringify(answer.answer)}`);
                }
            }

            // Check purpose field for download links
            const purposeAnswer = finalResult.content.answers['22'];
            if (purposeAnswer) {
                console.log(`\n  Purpose field contains download links: ${purposeAnswer.answer.includes('download-file') ? 'YES ✅' : 'NO ❌'}`);
            }
        }

        console.log("\n✅ All done! Submission ID:", submissionID);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Form submitted successfully.",
                submissionID
            })
        };

    } catch (error) {
        console.error("❌ Critical Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: "Internal server error." })
        };
    }
};


// =================================================================
// PARSE MULTIPART FORM DATA
// =================================================================
function parseMultipartFormData(bodyBuffer, boundary) {
    const fields = {};
    const files  = [];

    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const CRLFCRLF       = Buffer.from('\r\n\r\n');

    const parts = splitBuffer(bodyBuffer, boundaryBuffer);

    for (const part of parts) {
        if (part.length === 0) continue;

        const separatorIndex = indexOfBuffer(part, CRLFCRLF);
        if (separatorIndex === -1) continue;

        const headersBuffer = part.slice(0, separatorIndex);
        const headers       = headersBuffer.toString('utf-8');

        let bodyPart = part.slice(separatorIndex + CRLFCRLF.length);

        if (bodyPart.length >= 2 && bodyPart.slice(-2).toString() === '\r\n') {
            bodyPart = bodyPart.slice(0, -2);
        }

        const nameMatch     = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);

        if (!nameMatch) continue;

        const name = nameMatch[1];

        if (filenameMatch) {
            const filename = filenameMatch[1];
            if (filename && bodyPart.length > 0) {
                const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
                const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
                files.push({ name, filename, data: bodyPart, mimeType });
            }
        } else {
            fields[name] = bodyPart.toString('utf-8');
        }
    }

    return { fields, files };
}

function splitBuffer(buffer, delimiter) {
    const parts = [];
    let start   = 0;

    while (true) {
        const index = indexOfBuffer(buffer, delimiter, start);
        if (index === -1) {
            parts.push(buffer.slice(start));
            break;
        }
        parts.push(buffer.slice(start, index));
        start = index + delimiter.length;
    }

    return parts;
}

function indexOfBuffer(buffer, search, offset = 0) {
    for (let i = offset; i <= buffer.length - search.length; i++) {
        let found = true;
        for (let j = 0; j < search.length; j++) {
            if (buffer[i + j] !== search[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}