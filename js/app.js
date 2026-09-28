/**
 * QR Generator Application Controller
 * Manages UI interactions, logo handling, presets, live canvas updates, and export.
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    activePresetKey: "website",
    fieldValues: {},
    logo: {
      image: null,
      imageSrc: null, // Data URL or object URL
      size: 0.22, // 22% of QR width
      padding: 10,
      badgeShape: "rounded", // 'circle' | 'rounded' | 'square' | 'none'
      badgeBg: "#ffffff",
      badgeBorder: 2,
      badgeBorderColor: "#e2e8f0",
      shadow: true
    },
    qrStyle: {
      dotStyle: "rounded",
      cornerStyle: "rounded",
      fgColor: "#0f172a",
      fgColorEnd: "#3b82f6",
      gradientType: "linear-diagonal",
      bgColor: "#ffffff",
      cornerColor: null, // null = match fg
      margin: 3
    },
    exportResolution: 1024
  };

  // Color Palettes
  const COLOR_PALETTES = [
    { name: "Default Pro", fg: "#0f172a", fgEnd: "#3b82f6", grad: "linear-diagonal", bg: "#ffffff" },
    { name: "Electric Indigo", fg: "#4338ca", fgEnd: "#818cf8", grad: "linear-diagonal", bg: "#ffffff" },
    { name: "Cyber Neon", fg: "#06b6d4", fgEnd: "#a855f7", grad: "linear-diagonal", bg: "#0b0f19" },
    { name: "Sunset Ember", fg: "#ea580c", fgEnd: "#db2777", grad: "linear-diagonal", bg: "#ffffff" },
    { name: "Emerald Luxe", fg: "#047857", fgEnd: "#10b981", grad: "linear-diagonal", bg: "#ffffff" },
    { name: "Dark Velvet", fg: "#f8fafc", fgEnd: "#cbd5e1", grad: "none", bg: "#0f172a" },
    { name: "Monochrome", fg: "#000000", fgEnd: "#000000", grad: "none", bg: "#ffffff" }
  ];

  // DOM Elements
  const el = {
    platformGrid: document.getElementById("platformGrid"),
    formContainer: document.getElementById("presetFormContainer"),
    presetDesc: document.getElementById("presetDescription"),
    qrCanvas: document.getElementById("qrCanvas"),
    payloadPreview: document.getElementById("payloadPreview"),
    copyPayloadBtn: document.getElementById("copyPayloadBtn"),
    
    // Logo elements
    logoFileInput: document.getElementById("logoFileInput"),
    logoDropZone: document.getElementById("logoDropZone"),
    logoPreviewContainer: document.getElementById("logoPreviewContainer"),
    logoPreviewImg: document.getElementById("logoPreviewImg"),
    removeLogoBtn: document.getElementById("removeLogoBtn"),
    logoSizeSlider: document.getElementById("logoSizeSlider"),
    logoSizeVal: document.getElementById("logoSizeVal"),
    logoPaddingSlider: document.getElementById("logoPaddingSlider"),
    logoPaddingVal: document.getElementById("logoPaddingVal"),
    logoShapeBtns: document.querySelectorAll("[data-logo-shape]"),
    logoBgColor: document.getElementById("logoBgColor"),
    logoBorderWidth: document.getElementById("logoBorderWidth"),
    logoBorderWidthVal: document.getElementById("logoBorderWidthVal"),
    logoBorderColor: document.getElementById("logoBorderColor"),
    presetLogosGrid: document.getElementById("presetLogosGrid"),
    sampleLogoBtn: document.getElementById("sampleLogoBtn"),

    // QR Style elements
    dotStyleBtns: document.querySelectorAll("[data-dot-style]"),
    cornerStyleBtns: document.querySelectorAll("[data-corner-style]"),
    fgColorInput: document.getElementById("fgColorInput"),
    fgColorEndInput: document.getElementById("fgColorEndInput"),
    gradientTypeSelect: document.getElementById("gradientTypeSelect"),
    bgColorInput: document.getElementById("bgColorInput"),
    bgTransparentCheckbox: document.getElementById("bgTransparentCheckbox"),
    customCornerColorCheckbox: document.getElementById("customCornerColorCheckbox"),
    cornerColorWrapper: document.getElementById("cornerColorWrapper"),
    cornerColorInput: document.getElementById("cornerColorInput"),
    paletteContainer: document.getElementById("paletteContainer"),

    // Export & Action elements
    downloadPngBtn: document.getElementById("downloadPngBtn"),
    downloadSvgBtn: document.getElementById("downloadSvgBtn"),
    copyImageBtn: document.getElementById("copyImageBtn"),
    resolutionSelect: document.getElementById("resolutionSelect"),
    eccStatusBadge: document.getElementById("eccStatusBadge"),
    toastContainer: document.getElementById("toastContainer")
  };

  // --- Initialization ---
  function init() {
    renderPlatformList();
    renderColorPalettes();
    renderPresetLogos();
    selectPreset("website");
    setupEventListeners();
    updateQRCode();
  }

  // --- Platform Selection & Form Rendering ---
  function renderPlatformList() {
    el.platformGrid.innerHTML = "";
    Object.keys(PRESETS_CONFIG).forEach(key => {
      const cfg = PRESETS_CONFIG[key];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `platform-btn ${key === state.activePresetKey ? "active" : ""}`;
      btn.dataset.preset = key;
      btn.id = `platform_btn_${key}`;
      btn.innerHTML = `
        <span class="platform-icon">${PLATFORM_ICONS[cfg.iconKey] || ""}</span>
        <span class="platform-name">${cfg.name}</span>
      `;
      btn.addEventListener("click", () => selectPreset(key));
      el.platformGrid.appendChild(btn);
    });
  }

  function selectPreset(presetKey) {
    state.activePresetKey = presetKey;
    const cfg = PRESETS_CONFIG[presetKey];

    // Update active button state
    document.querySelectorAll(".platform-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === presetKey);
    });

    // Update description
    if (el.presetDesc) {
      el.presetDesc.textContent = cfg.description;
    }

    // Reset default values for this preset if not set
    state.fieldValues = {};
    cfg.fields.forEach(f => {
      state.fieldValues[f.id] = f.default !== undefined ? f.default : "";
    });

    renderPresetForm(cfg);
    updateQRCode();
  }

  function renderPresetForm(cfg) {
    el.formContainer.innerHTML = "";

    cfg.fields.forEach(field => {
      const group = document.createElement("div");
      group.className = "form-group";

      const label = document.createElement("label");
      label.htmlFor = `field_${field.id}`;
      label.className = "form-label";
      label.innerHTML = `${field.label} ${field.required ? '<span class="text-rose-500">*</span>' : ''}`;
      group.appendChild(label);

      let inputEl;
      if (field.type === "textarea") {
        inputEl = document.createElement("textarea");
        inputEl.rows = field.rows || 3;
      } else if (field.type === "select") {
        inputEl = document.createElement("select");
        field.options.forEach(opt => {
          const optEl = document.createElement("option");
          optEl.value = opt.value;
          optEl.textContent = opt.label;
          if (opt.value === state.fieldValues[field.id]) optEl.selected = true;
          inputEl.appendChild(optEl);
        });
      } else if (field.type === "checkbox") {
        const checkWrap = document.createElement("div");
        checkWrap.className = "checkbox-wrapper";
        inputEl = document.createElement("input");
        inputEl.type = "checkbox";
        inputEl.checked = !!state.fieldValues[field.id];
        checkWrap.appendChild(inputEl);
        const checkLabel = document.createElement("span");
        checkLabel.textContent = "Yes, hidden network";
        checkWrap.appendChild(checkLabel);
        group.appendChild(checkWrap);
      } else {
        inputEl = document.createElement("input");
        inputEl.type = field.type || "text";
      }

      inputEl.id = `field_${field.id}`;
      inputEl.className = "form-input";
      if (field.placeholder) inputEl.placeholder = field.placeholder;
      if (field.type !== "checkbox") {
        inputEl.value = state.fieldValues[field.id] || "";
      }

      // Input listener for real-time update
      const handler = (e) => {
        state.fieldValues[field.id] = field.type === "checkbox" ? e.target.checked : e.target.value;
        updateQRCode();
      };
      inputEl.addEventListener("input", handler);
      inputEl.addEventListener("change", handler);

      if (field.type !== "checkbox") {
        group.appendChild(inputEl);
      }

      el.formContainer.appendChild(group);
    });
  }

  // --- Preset Social Media Center Logos ---
  function renderPresetLogos() {
    if (!el.presetLogosGrid) return;
    el.presetLogosGrid.innerHTML = "";

    const availableLogos = [
      { key: "instagram", name: "Instagram" },
      { key: "x", name: "X" },
      { key: "linkedin", name: "LinkedIn" },
      { key: "youtube", name: "YouTube" },
      { key: "tiktok", name: "TikTok" },
      { key: "whatsapp", name: "WhatsApp" },
      { key: "telegram", name: "Telegram" },
      { key: "wifi", name: "Wi-Fi" }
    ];

    availableLogos.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-logo-pill";
      btn.title = `Add ${item.name} Center Logo`;
      btn.innerHTML = `<span class="pill-icon">${PLATFORM_ICONS[item.key] || ""}</span><span>${item.name}</span>`;
      btn.addEventListener("click", () => {
        applyPresetLogo(item.key);
      });
      el.presetLogosGrid.appendChild(btn);
    });
  }

  function applyPresetLogo(key) {
    const svgStr = PRESET_LOGO_SVGS[key];
    if (!svgStr) return;

    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    loadLogoFromSource(url, true);
    showToast(`${key.toUpperCase()} logo added to QR center!`, "success");
  }

  // --- Palette & Styling Setup ---
  function renderColorPalettes() {
    if (!el.paletteContainer) return;
    el.paletteContainer.innerHTML = "";

    COLOR_PALETTES.forEach((p, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `palette-pill ${idx === 0 ? "active" : ""}`;
      btn.title = p.name;
      btn.innerHTML = `
        <span class="palette-swatch" style="background: ${p.grad !== 'none' ? `linear-gradient(135deg, ${p.fg}, ${p.fgEnd})` : p.fg}; border: 1px solid rgba(255,255,255,0.2);"></span>
        <span class="palette-name">${p.name}</span>
      `;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".palette-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.qrStyle.fgColor = p.fg;
        state.qrStyle.fgColorEnd = p.fgEnd;
        state.qrStyle.gradientType = p.grad;
        state.qrStyle.bgColor = p.bg;

        el.fgColorInput.value = p.fg;
        el.fgColorEndInput.value = p.fgEnd;
        el.gradientTypeSelect.value = p.grad;
        el.bgColorInput.value = p.bg;
        el.bgTransparentCheckbox.checked = false;

        updateQRCode();
      });
      el.paletteContainer.appendChild(btn);
    });
  }

  // --- Logo Handling ---
  function handleLogoFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG, JPG, SVG, WebP)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      loadLogoFromSource(e.target.result, false);
      showToast("Logo uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  }

  function loadLogoFromSource(src, isBlobUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      state.logo.image = img;
      state.logo.imageSrc = src;

      // Update UI preview
      el.logoPreviewImg.src = src;
      el.logoPreviewContainer.classList.remove("hidden");
      el.logoDropZone.classList.add("has-logo");

      updateECCBadge();
      updateQRCode();
    };
    img.src = src;
  }

  function removeLogo() {
    state.logo.image = null;
    state.logo.imageSrc = null;
    el.logoFileInput.value = "";
    el.logoPreviewImg.src = "";
    el.logoPreviewContainer.classList.add("hidden");
    el.logoDropZone.classList.remove("has-logo");
    updateECCBadge();
    updateQRCode();
    showToast("Logo removed", "info");
  }

  function updateECCBadge() {
    if (!el.eccStatusBadge) return;
    if (state.logo.image) {
      el.eccStatusBadge.innerHTML = `<span class="badge-dot-green"></span> Level H (30% Redundancy) — 100% Scan Protected`;
      el.eccStatusBadge.className = "ecc-badge high";
    } else {
      el.eccStatusBadge.innerHTML = `<span class="badge-dot-blue"></span> Level M (15% Standard)`;
      el.eccStatusBadge.className = "ecc-badge standard";
    }
  }

  // --- QR Code Rendering ---
  function getPayloadString() {
    const cfg = PRESETS_CONFIG[state.activePresetKey];
    if (!cfg) return "https://example.com";
    return cfg.formatPayload(state.fieldValues);
  }

  function updateQRCode() {
    const payload = getPayloadString();

    // Update raw payload preview in UI
    if (el.payloadPreview) {
      el.payloadPreview.textContent = payload;
    }

    // Prepare Logo Configuration
    let logoConfig = null;
    if (state.logo.image) {
      logoConfig = {
        image: state.logo.image,
        imageSrc: state.logo.imageSrc,
        size: state.logo.size,
        padding: state.logo.padding,
        badgeShape: state.logo.badgeShape,
        badgeBg: state.logo.badgeBg,
        badgeBorder: state.logo.badgeBorder,
        badgeBorderColor: state.logo.badgeBorderColor,
        shadow: state.logo.shadow
      };
    }

    // Call QREngine
    try {
      QREngine.render(el.qrCanvas, {
        text: payload,
        size: 1024,
        margin: state.qrStyle.margin,
        dotStyle: state.qrStyle.dotStyle,
        cornerStyle: state.qrStyle.cornerStyle,
        fgColor: state.qrStyle.fgColor,
        fgColorEnd: state.qrStyle.fgColorEnd,
        gradientType: state.qrStyle.gradientType,
        bgColor: state.qrStyle.bgColor,
        cornerColor: state.qrStyle.cornerColor,
        logo: logoConfig
      });
    } catch (err) {
      console.error("QR Code Generation Error:", err);
      showToast("Error generating QR code. Payload might be too long.", "error");
    }
  }

  // --- Export Actions ---
  function downloadPNG() {
    const exportSize = parseInt(el.resolutionSelect ? el.resolutionSelect.value : "1024", 10) || 1024;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = exportSize;
    tempCanvas.height = exportSize;

    const payload = getPayloadString();
    let logoConfig = null;
    if (state.logo.image) {
      logoConfig = {
        image: state.logo.image,
        imageSrc: state.logo.imageSrc,
        size: state.logo.size,
        padding: Math.round(state.logo.padding * (exportSize / 1024)),
        badgeShape: state.logo.badgeShape,
        badgeBg: state.logo.badgeBg,
        badgeBorder: Math.round(state.logo.badgeBorder * (exportSize / 1024)),
        badgeBorderColor: state.logo.badgeBorderColor,
        shadow: state.logo.shadow
      };
    }

    QREngine.render(tempCanvas, {
      text: payload,
      size: exportSize,
      margin: state.qrStyle.margin,
      dotStyle: state.qrStyle.dotStyle,
      cornerStyle: state.qrStyle.cornerStyle,
      fgColor: state.qrStyle.fgColor,
      fgColorEnd: state.qrStyle.fgColorEnd,
      gradientType: state.qrStyle.gradientType,
      bgColor: state.qrStyle.bgColor,
      cornerColor: state.qrStyle.cornerColor,
      logo: logoConfig
    });

    const link = document.createElement("a");
    link.download = `qrcode_${state.activePresetKey}_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    showToast(`High-Res PNG (${exportSize}x${exportSize}px) downloaded!`, "success");
  }

  function downloadSVG() {
    const payload = getPayloadString();
    let logoConfig = null;
    if (state.logo.image) {
      logoConfig = {
        image: state.logo.image,
        imageSrc: state.logo.imageSrc,
        size: state.logo.size,
        padding: state.logo.padding,
        badgeShape: state.logo.badgeShape,
        badgeBg: state.logo.badgeBg,
        badgeBorder: state.logo.badgeBorder,
        badgeBorderColor: state.logo.badgeBorderColor
      };
    }

    const svgContent = QREngine.generateSVG({
      text: payload,
      size: 1024,
      margin: state.qrStyle.margin,
      dotStyle: state.qrStyle.dotStyle,
      cornerStyle: state.qrStyle.cornerStyle,
      fgColor: state.qrStyle.fgColor,
      fgColorEnd: state.qrStyle.fgColorEnd,
      gradientType: state.qrStyle.gradientType,
      bgColor: state.qrStyle.bgColor,
      cornerColor: state.qrStyle.cornerColor,
      logo: logoConfig
    });

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `qrcode_${state.activePresetKey}_${Date.now()}.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Print-ready Vector SVG downloaded!", "success");
  }

  async function copyImageToClipboard() {
    if (!navigator.clipboard || !window.ClipboardItem) {
      showToast("Clipboard API not supported in this browser. Please download PNG instead.", "error");
      return;
    }

    try {
      el.qrCanvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Failed to copy image to clipboard", "error");
          return;
        }
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        showToast("QR Code image copied to clipboard!", "success");
      }, "image/png");
    } catch (err) {
      console.error(err);
      showToast("Could not copy image to clipboard", "error");
    }
  }

  function copyPayloadText() {
    const payload = getPayloadString();
    navigator.clipboard.writeText(payload)
      .then(() => showToast("Payload link copied to clipboard!", "success"))
      .catch(() => showToast("Failed to copy link", "error"));
  }

  // --- Toast Notification Helper ---
  function showToast(message, type = "info") {
    if (!el.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-indicator"></div>
      <div class="toast-body">${message}</div>
    `;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Setup Event Listeners ---
  function setupEventListeners() {
    // 1. File Upload Drag & Drop
    if (el.logoDropZone && el.logoFileInput) {
      el.logoDropZone.addEventListener("click", (e) => {
        if (e.target !== el.removeLogoBtn && !e.target.closest("#removeLogoBtn")) {
          el.logoFileInput.click();
        }
      });

      el.logoFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          handleLogoFile(e.target.files[0]);
        }
      });

      el.logoDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.logoDropZone.classList.add("dragover");
      });

      el.logoDropZone.addEventListener("dragleave", () => {
        el.logoDropZone.classList.remove("dragover");
      });

      el.logoDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        el.logoDropZone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleLogoFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (el.removeLogoBtn) {
      el.removeLogoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeLogo();
      });
    }

    // Sample logo button
    if (el.sampleLogoBtn) {
      el.sampleLogoBtn.addEventListener("click", () => {
        loadLogoFromSource("assets/sample-logo.svg", false);
        showToast("Sample Brand Logo applied!", "success");
      });
    }

    // 2. Logo Adjustments
    if (el.logoSizeSlider) {
      el.logoSizeSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        state.logo.size = val / 100;
        if (el.logoSizeVal) el.logoSizeVal.textContent = `${val}%`;
        updateQRCode();
      });
    }

    if (el.logoPaddingSlider) {
      el.logoPaddingSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        state.logo.padding = val;
        if (el.logoPaddingVal) el.logoPaddingVal.textContent = `${val}px`;
        updateQRCode();
      });
    }

    el.logoShapeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        el.logoShapeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.logo.badgeShape = btn.dataset.logoShape;
        updateQRCode();
      });
    });

    if (el.logoBgColor) {
      el.logoBgColor.addEventListener("input", (e) => {
        state.logo.badgeBg = e.target.value;
        updateQRCode();
      });
    }

    if (el.logoBorderWidth) {
      el.logoBorderWidth.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        state.logo.badgeBorder = val;
        if (el.logoBorderWidthVal) el.logoBorderWidthVal.textContent = `${val}px`;
        updateQRCode();
      });
    }

    if (el.logoBorderColor) {
      el.logoBorderColor.addEventListener("input", (e) => {
        state.logo.badgeBorderColor = e.target.value;
        updateQRCode();
      });
    }

    // 3. Dot & Corner Styles
    el.dotStyleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        el.dotStyleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.qrStyle.dotStyle = btn.dataset.dotStyle;
        updateQRCode();
      });
    });

    el.cornerStyleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        el.cornerStyleBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.qrStyle.cornerStyle = btn.dataset.cornerStyle;
        updateQRCode();
      });
    });

    // 4. Color Controls
    if (el.fgColorInput) {
      el.fgColorInput.addEventListener("input", (e) => {
        state.qrStyle.fgColor = e.target.value;
        updateQRCode();
      });
    }

    if (el.fgColorEndInput) {
      el.fgColorEndInput.addEventListener("input", (e) => {
        state.qrStyle.fgColorEnd = e.target.value;
        updateQRCode();
      });
    }

    if (el.gradientTypeSelect) {
      el.gradientTypeSelect.addEventListener("change", (e) => {
        state.qrStyle.gradientType = e.target.value;
        updateQRCode();
      });
    }

    if (el.bgColorInput) {
      el.bgColorInput.addEventListener("input", (e) => {
        if (!el.bgTransparentCheckbox.checked) {
          state.qrStyle.bgColor = e.target.value;
          updateQRCode();
        }
      });
    }

    if (el.bgTransparentCheckbox) {
      el.bgTransparentCheckbox.addEventListener("change", (e) => {
        state.qrStyle.bgColor = e.target.checked ? "transparent" : el.bgColorInput.value;
        updateQRCode();
      });
    }

    if (el.customCornerColorCheckbox) {
      el.customCornerColorCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          el.cornerColorWrapper.classList.remove("hidden");
          state.qrStyle.cornerColor = el.cornerColorInput.value;
        } else {
          el.cornerColorWrapper.classList.add("hidden");
          state.qrStyle.cornerColor = null;
        }
        updateQRCode();
      });
    }

    if (el.cornerColorInput) {
      el.cornerColorInput.addEventListener("input", (e) => {
        state.qrStyle.cornerColor = e.target.value;
        updateQRCode();
      });
    }

    // 5. Actions & Downloads
    if (el.downloadPngBtn) el.downloadPngBtn.addEventListener("click", downloadPNG);
    if (el.downloadSvgBtn) el.downloadSvgBtn.addEventListener("click", downloadSVG);
    if (el.copyImageBtn) el.copyImageBtn.addEventListener("click", copyImageToClipboard);
    if (el.copyPayloadBtn) el.copyPayloadBtn.addEventListener("click", copyPayloadText);
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
