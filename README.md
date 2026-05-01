# JGS Funds — Business Funding Application

A professional business funding application website built for JGS Miami LLC, enabling prospective clients to submit loan applications with supporting documents directly through a custom-built web form.

🔗 **Live Site:** [https://jgsfunds.com/](https://jgsfunds.com/)

---

## Overview

JGS Funds needed a streamlined way for business owners to apply for funding online. This project delivers a fully custom application form that collects business details, owner information, digital signatures, and required documents — all submitted seamlessly to JotForm for the client's internal review process.

The site is built with vanilla HTML, CSS, and JavaScript on the frontend, with serverless Netlify Functions handling secure form processing, file storage, and third-party API integration on the backend.

---

## Features

- **Multi-Section Application Form** — Comprehensive form capturing business details, owner/officer information, and financing requirements
- **Document Upload System** — Supports multiple file uploads for IDs, bank statements, and voided checks with drag-and-drop UI and file accumulation across selections
- **Digital Signature Capture** — HTML5 Canvas-based signature pads for owner authorization with real-time drawing
- **Serverless Form Processing** — Netlify Functions handle multipart form parsing, file storage, and API submission without exposing credentials to the client
- **Cloud File Storage** — Uploaded documents are stored in Netlify Blobs with secure, shareable download links
- **JotForm API Integration** — All submission data is sent to JotForm for the client's existing workflow, including text fields, signatures, and document download links
- **Responsive Design** — Fully responsive layout optimized for desktop and mobile devices
- **Client-Side Validation** — Required field validation, file type restrictions, and upload limits before submission

---

## Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript     |
| Backend     | Netlify Functions (Node.js)         |
| File Storage| Netlify Blobs                       |
| API         | JotForm REST API                    |
| Hosting     | Netlify                             |
| DNS/Domain  | Custom domain via Netlify           |

---

## Architecture

```
Client Browser
    |
    |-- form.html (Application Form)
    |     |-- form-handler.js (Client-side validation, file handling, signature capture)
    |
    |-- POST /.netlify/functions/submit-form
          |
          |-- Parses multipart form data (custom binary parser)
          |-- Stores uploaded files to Netlify Blobs
          |-- Generates secure download URLs
          |-- Submits text data to JotForm API
          |-- Appends download links to submission
                |
                |-- Client reviews in JotForm Dashboard
                      |-- Downloads files via /.netlify/functions/download-file
```

---

## Project Structure

```
jgsFunds/
|-- assets/
|   |-- images/              # Logo and static assets
|   |-- videos/              # Background video assets
|-- netlify/
|   |-- functions/
|       |-- submit-form.js   # Form submission handler + file storage
|       |-- download-file.js # Secure file download endpoint
|-- index.html               # Landing page
|-- form.html                # Business funding application form
|-- form-handler.js          # Client-side form logic
|-- form_styles.css          # Form-specific styles
|-- script.js                # Landing page scripts
|-- styles.css               # Global styles
|-- netlify.toml             # Netlify configuration
|-- package.json             # Dependencies
|-- README.md
```

---

## Key Technical Decisions

### Custom Multipart Parser

Netlify Functions don't natively support multipart form data parsing. Rather than adding a heavy dependency like multer or busboy, a lightweight custom binary parser was built to extract both text fields and file buffers from the raw request body.

### Netlify Blobs for File Storage

JotForm's REST API does not support file uploads to control_fileupload fields — files can only be attached through JotForm's own form submission page, which requires browser session tokens. To solve this, uploaded documents are stored in Netlify Blobs (serverless object storage) and secure download links are embedded in the JotForm submission for the client to access.

### Serverless Architecture

All sensitive operations (API keys, file handling, third-party API calls) are handled server-side through Netlify Functions, keeping credentials secure and eliminating the need for a traditional backend server.

### Digital Signatures

HTML5 Canvas with pointer events captures owner signatures client-side, converting them to base64 data URIs that are submitted as hidden form fields and stored in JotForm's signature fields.

---

## Environment Variables

The following environment variables are configured in the Netlify Dashboard:

| Variable           | Description                              |
|-------------------|------------------------------------------|
| JOTFORM_API_KEY    | JotForm API key for submission creation  |
| JOTFORM_FORM_ID    | Target JotForm form ID                   |
| NETLIFY_SITE_ID    | Netlify site identifier for Blobs access |
| NETLIFY_TOKEN      | Netlify personal access token for Blobs  |

---

## Local Development

Clone the repository:

```
git clone https://github.com/gitTwix/jgsFunds.git
cd jgsFunds
```

Install dependencies:

```
npm install
```

Create a .env file with required variables:

```
JOTFORM_API_KEY=your_key
JOTFORM_FORM_ID=your_form_id
```

Run locally with Netlify Dev:

```
netlify dev
```

The site will be available at http://localhost:8888.

Note: File uploads use Netlify Blobs in production. Local development requires Netlify CLI and proper environment configuration.

---

## Deployment

The site deploys automatically via GitHub integration:

1. Push to main branch
2. Netlify detects changes and triggers a build
3. Functions are bundled and deployed
4. Site is published to jgsfunds.com

---

## Author

**Twix** — Full-stack development, UI/UX design, and deployment

GitHub: [@gitTwix](https://github.com/gitTwix)