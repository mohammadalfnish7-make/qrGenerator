# QR Studio Pro 🚀

> **A Universal, High-Performance QR Code Generator for all Links and Social Media with Custom Center Logo support.**
> Completely offline-capable, containerized with Docker, and built with modern client-side web technologies.

![QR Studio Pro](assets/sample-logo.svg)

---

## ✨ Features

### 1. 🌐 All Types of Links & Social Media Supported
Tailored input fields and instant URL formatting for:
* **Website / URL**: Any standard website link, portfolio, or landing page.
* **Instagram**: Auto-formats `@username` or profile links.
* **X / Twitter**: Profile `@handles`, tweet links, or direct profiles.
* **LinkedIn**: Personal profile (`in/username`), company page, or full link.
* **YouTube**: Channel handles (`@channel`), video URLs, or custom links.
* **TikTok**: Profile `@username` or video link.
* **WhatsApp**: Phone number (with country code) + optional pre-filled message (`https://wa.me/...`).
* **Telegram**: Username, channel, or t.me group link.
* **Facebook**: Profile, page, or event URL.
* **Snapchat**: Quick-add user link.
* **Discord**: Server invite code or link.
* **Wi-Fi Network**: SSID, Password, WPA/WPA2/WPA3/WEP/Open, and Hidden network configuration (instant scan-to-connect on iOS & Android).
* **vCard (Digital Business Card)**: First Name, Last Name, Phone, Email, Company, Job Title, Website, Note (directly prompts "Add to Contacts" on scan).
* **Email**: Pre-addressed `mailto:` with Subject and Body.
* **Phone Call**: Direct dialer `tel:`.
* **SMS**: Text messaging with pre-composed text.
* **Plain Text**: Arbitrary notes, serial keys, or text snippets.

---

### 2. 🎨 Upload Logo to the Center of the QR Code
* **Drag & Drop or File Upload**: Upload any PNG, JPG, SVG, WebP, or GIF image.
* **1-Click Preset Social Logos**: Instant center logos for Instagram, X, LinkedIn, YouTube, TikTok, WhatsApp, Telegram, and Wi-Fi.
* **Safety Lock (Error Correction Level H)**: Whenever a logo is present, the engine automatically escalates error correction to **Level H (30% recovery)** to guarantee that your QR code scans reliably across all devices and cameras.
* **Logo Size Slider**: Adjust size from 14% to 30% of QR code width.
* **Background Badge Margin**: Configurable padding around the logo.
* **Badge Mask Shapes**: Circle, Rounded Squircle, Classic Square, or None.
* **Custom Badge & Border Styling**: Set badge background color, border width, and border color to seamlessly blend with your brand.
* **Floating 3D Drop Shadow**: Soft realistic drop shadow so the logo pops out cleanly.

---

### 3. 🖌️ Visual Styling & Color Themes
* **Module Dot Shapes**: Rounded rectangles, circular dots, classy diagonal cuts, or classic squares.
* **Corner Finder Styles**: Rounded eyes, circular rings, or square frames.
* **Colors & Gradients**: Single solid color or 2-stop linear/radial gradients (Linear 45°, Horizontal, Vertical, Radial Glow).
* **Corner Accent Color**: Independent accent color for the three finder patterns.
* **Transparent Background**: Seamless transparent PNG and SVG export for graphic design and packaging.
* **Curated Color Palettes**: One-click themes including Cyber Neon, Electric Indigo, Sunset Ember, Emerald Luxe, and Monochrome Pro.

---

### 4. 💾 Export & Sharing
* **High-Res PNG**: Export at 512×512, 1024×1024 (Retina HD), or 2048×2048 (Ultra Print).
* **Vector SVG**: Infinite-resolution standalone `.svg` vector file ready for print shops, Illustrator, or Figma.
* **Copy Image to Clipboard**: 1-click copy directly into your clipboard using the modern Clipboard API.
* **Raw Payload Inspector**: Inspect the exact string encoded inside the QR code and copy with one click.

---

## 🐳 Running with Docker

This project is fully containerized with a production-grade Alpine Nginx setup.

### 1. Start the Container
Run the following command from the project root directory:

```bash
docker compose up -d
```

### 2. Open the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

### 3. Live Development (Hot Reloading)
The `docker-compose.yml` mounts local files (`index.html`, `css/`, `js/`, `assets/`) into the Nginx container, meaning any changes you make to the code are reflected immediately in your browser upon refreshing!

### 4. Stop the Container
```bash
docker compose down
```

---

## 💻 Running Without Docker (Directly in Browser)

Because the application is completely self-contained with pure HTML5, CSS3, and JavaScript, you can also run it without Docker:
* Simply double-click `index.html` to open it in your browser (Chrome, Safari, Firefox, Edge).
* Or use any lightweight local static server:
  ```bash
  python3 -m http.server 8080
  ```

---

## 📁 Project Architecture

```
qrGenerator/
├── Dockerfile              # Production-grade Alpine Nginx Docker container
├── docker-compose.yml      # Docker Compose configuration (port 8080:80)
├── nginx.conf              # Nginx server configuration with gzip & security headers
├── .dockerignore           # Keeps container build context clean
├── index.html              # Modern, accessible semantic HTML5 app
├── css/
│   └── style.css           # Glassmorphism dark design system & responsive layout
├── js/
│   ├── qr-engine.js        # Self-contained QR matrix engine & high-precision renderer
│   ├── presets.js          # Platform configurations & string formatters (17 types)
│   └── app.js              # Application state, file drag-and-drop, UI controller
└── assets/
    ├── icons.js            # Vector SVGs for platforms and preset center logos
    └── sample-logo.svg     # Modern gradient brand demo logo
```

---

## 🛡️ Privacy & Performance

* **100% Client-Side**: No user inputs, uploaded logos, or generated QR codes are ever transmitted over the network or saved to an external database.
* **Zero External Dependencies**: Works completely offline, even inside air-gapped Docker networks.
* **High Scannability**: Guaranteed scannable by iOS Camera, Android Camera, Google Lens, and standard barcode scanners.
