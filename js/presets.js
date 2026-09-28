/**
 * Link & Social Media Preset Definitions and Payload Formatters
 */

const PRESETS_CONFIG = {
  website: {
    name: "Website / URL",
    category: "Web",
    iconKey: "website",
    description: "Standard web page, portfolio, or landing page link",
    defaultPresetLogo: null,
    fields: [
      { id: "url", label: "Website URL", type: "url", placeholder: "https://yourwebsite.com", required: true, default: "https://antigravity.google" }
    ],
    formatPayload: function (values) {
      let url = (values.url || "").trim();
      if (url && !/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      return url || "https://example.com";
    }
  },

  instagram: {
    name: "Instagram",
    category: "Social Media",
    iconKey: "instagram",
    description: "Link to your Instagram profile or post",
    defaultPresetLogo: "instagram",
    fields: [
      { id: "username", label: "Instagram Username or Link", type: "text", placeholder: "@yourname or profile link", required: true, default: "google" }
    ],
    formatPayload: function (values) {
      let raw = (values.username || "").trim();
      if (!raw) return "https://instagram.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.replace(/^@+/, "");
      return `https://instagram.com/${clean}`;
    }
  },

  x: {
    name: "X / Twitter",
    category: "Social Media",
    iconKey: "x",
    description: "Link to your X profile or tweet",
    defaultPresetLogo: "x",
    fields: [
      { id: "username", label: "X Username or URL", type: "text", placeholder: "@yourhandle or URL", required: true, default: "Google" }
    ],
    formatPayload: function (values) {
      let raw = (values.username || "").trim();
      if (!raw) return "https://x.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.replace(/^@+/, "");
      return `https://x.com/${clean}`;
    }
  },

  linkedin: {
    name: "LinkedIn",
    category: "Social Media",
    iconKey: "linkedin",
    description: "Link to your personal profile or company page",
    defaultPresetLogo: "linkedin",
    fields: [
      { id: "target", label: "LinkedIn Profile / Company / Handle", type: "text", placeholder: "https://linkedin.com/in/... or username", required: true, default: "in/google" }
    ],
    formatPayload: function (values) {
      let raw = (values.target || "").trim();
      if (!raw) return "https://linkedin.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.replace(/^\/+/, "");
      if (clean.startsWith("in/") || clean.startsWith("company/")) {
        return `https://linkedin.com/${clean}`;
      }
      return `https://linkedin.com/in/${clean}`;
    }
  },

  youtube: {
    name: "YouTube",
    category: "Social Media",
    iconKey: "youtube",
    description: "Link to your YouTube channel or video",
    defaultPresetLogo: "youtube",
    fields: [
      { id: "channel", label: "Channel Handle or Video URL", type: "text", placeholder: "@channelName or video link", required: true, default: "@Google" }
    ],
    formatPayload: function (values) {
      let raw = (values.channel || "").trim();
      if (!raw) return "https://youtube.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.startsWith("@") ? raw : `@${raw}`;
      return `https://youtube.com/${clean}`;
    }
  },

  tiktok: {
    name: "TikTok",
    category: "Social Media",
    iconKey: "tiktok",
    description: "Link to your TikTok account or video",
    defaultPresetLogo: "tiktok",
    fields: [
      { id: "username", label: "TikTok Username or URL", type: "text", placeholder: "@username or URL", required: true, default: "@google" }
    ],
    formatPayload: function (values) {
      let raw = (values.username || "").trim();
      if (!raw) return "https://tiktok.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.startsWith("@") ? raw : `@${raw}`;
      return `https://tiktok.com/${clean}`;
    }
  },

  whatsapp: {
    name: "WhatsApp",
    category: "Communication",
    iconKey: "whatsapp",
    description: "Direct WhatsApp chat with optional pre-filled message",
    defaultPresetLogo: "whatsapp",
    fields: [
      { id: "phone", label: "Phone Number (with Country Code)", type: "tel", placeholder: "+1 234 567 8900", required: true, default: "+15551234567" },
      { id: "message", label: "Pre-filled Message (Optional)", type: "textarea", placeholder: "Hello! I saw your QR code...", rows: 2, default: "Hello! Connecting via QR code." }
    ],
    formatPayload: function (values) {
      const phoneDigits = (values.phone || "").replace(/[^\d]/g, "");
      const msg = (values.message || "").trim();
      if (!phoneDigits) return "https://wa.me/";
      if (msg) {
        return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
      }
      return `https://wa.me/${phoneDigits}`;
    }
  },

  telegram: {
    name: "Telegram",
    category: "Communication",
    iconKey: "telegram",
    description: "Link to Telegram username, channel, or group",
    defaultPresetLogo: "telegram",
    fields: [
      { id: "username", label: "Telegram Username or Channel", type: "text", placeholder: "username or t.me link", required: true, default: "telegram" }
    ],
    formatPayload: function (values) {
      let raw = (values.username || "").trim();
      if (!raw) return "https://t.me";
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.replace(/^@+/, "");
      return `https://t.me/${clean}`;
    }
  },

  facebook: {
    name: "Facebook",
    category: "Social Media",
    iconKey: "facebook",
    description: "Link to Facebook page, profile, or event",
    defaultPresetLogo: null,
    fields: [
      { id: "url", label: "Facebook Profile / Page URL", type: "text", placeholder: "https://facebook.com/yourpage", required: true, default: "https://facebook.com" }
    ],
    formatPayload: function (values) {
      let raw = (values.url || "").trim();
      if (!raw) return "https://facebook.com";
      if (/^https?:\/\//i.test(raw)) return raw;
      return `https://facebook.com/${raw.replace(/^\/+/, "")}`;
    }
  },

  snapchat: {
    name: "Snapchat",
    category: "Social Media",
    iconKey: "snapchat",
    description: "Quick add link for Snapchat profile",
    defaultPresetLogo: null,
    fields: [
      { id: "username", label: "Snapchat Username", type: "text", placeholder: "username", required: true, default: "snapchat" }
    ],
    formatPayload: function (values) {
      const clean = (values.username || "").replace(/^@+/, "").trim();
      return clean ? `https://snapchat.com/add/${clean}` : "https://snapchat.com";
    }
  },

  discord: {
    name: "Discord",
    category: "Social Media",
    iconKey: "discord",
    description: "Discord server invite link",
    defaultPresetLogo: null,
    fields: [
      { id: "invite", label: "Invite Code or Full URL", type: "text", placeholder: "discord.gg/... or code", required: true, default: "https://discord.gg" }
    ],
    formatPayload: function (values) {
      let raw = (values.invite || "").trim();
      if (!raw) return "https://discord.gg";
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("discord.gg/")) return "https://" + raw;
      return `https://discord.gg/${raw}`;
    }
  },

  wifi: {
    name: "Wi-Fi Network",
    category: "Utilities",
    iconKey: "wifi",
    description: "Instant scan-to-connect Wi-Fi configuration",
    defaultPresetLogo: "wifi",
    fields: [
      { id: "ssid", label: "Network Name (SSID)", type: "text", placeholder: "My Home Wi-Fi", required: true, default: "Home_Guest_WiFi" },
      { id: "password", label: "Password", type: "text", placeholder: "Password", default: "SecurePass123" },
      { id: "security", label: "Security Encryption", type: "select", options: [
        { label: "WPA / WPA2 / WPA3", value: "WPA" },
        { label: "WEP", value: "WEP" },
        { label: "Open (No Password)", value: "nopass" }
      ], default: "WPA" },
      { id: "hidden", label: "Hidden Network", type: "checkbox", default: false }
    ],
    formatPayload: function (values) {
      const ssid = (values.ssid || "").trim();
      const pwd = values.security === "nopass" ? "" : (values.password || "");
      const sec = values.security || "WPA";
      const hidden = values.hidden ? "H:true;" : "";
      // Escape special characters in SSID & Password: \ ; , : "
      const esc = (s) => (s || "").replace(/([\\;,:"'])/g, "\\$1");
      return `WIFI:S:${esc(ssid)};T:${sec};P:${esc(pwd)};${hidden};`;
    }
  },

  vcard: {
    name: "vCard Contact",
    category: "Contact",
    iconKey: "vcard",
    description: "Digital Business Card: adds contact directly into phone address book",
    defaultPresetLogo: null,
    fields: [
      { id: "firstName", label: "First Name", type: "text", placeholder: "John", required: true, default: "Alex" },
      { id: "lastName", label: "Last Name", type: "text", placeholder: "Doe", default: "Morgan" },
      { id: "organization", label: "Company / Organization", type: "text", placeholder: "Acme Corp", default: "DeepMind Tech" },
      { id: "title", label: "Job Title", type: "text", placeholder: "Software Architect", default: "Lead Engineer" },
      { id: "phone", label: "Phone Number", type: "tel", placeholder: "+1 234 567 8900", default: "+1 (555) 789-0123" },
      { id: "email", label: "Email Address", type: "email", placeholder: "john@example.com", default: "alex.morgan@example.com" },
      { id: "url", label: "Website", type: "url", placeholder: "https://yourwebsite.com", default: "https://example.com" },
      { id: "note", label: "Note / Bio", type: "textarea", placeholder: "Met at conference...", rows: 2, default: "Scanned from QR Code" }
    ],
    formatPayload: function (values) {
      const fn = (values.firstName || "").trim();
      const ln = (values.lastName || "").trim();
      const org = (values.organization || "").trim();
      const title = (values.title || "").trim();
      const tel = (values.phone || "").trim();
      const email = (values.email || "").trim();
      const url = (values.url || "").trim();
      const note = (values.note || "").trim();

      let vcard = "BEGIN:VCARD\nVERSION:3.0\n";
      vcard += `N:${ln};${fn};;;\n`;
      vcard += `FN:${fn} ${ln}`.trim() + "\n";
      if (org) vcard += `ORG:${org}\n`;
      if (title) vcard += `TITLE:${title}\n`;
      if (tel) vcard += `TEL;TYPE=CELL:${tel}\n`;
      if (email) vcard += `EMAIL;TYPE=WORK:${email}\n`;
      if (url) vcard += `URL:${url}\n`;
      if (note) vcard += `NOTE:${note}\n`;
      vcard += "END:VCARD";
      return vcard;
    }
  },

  email: {
    name: "Email",
    category: "Communication",
    iconKey: "email",
    description: "Send pre-composed email message",
    defaultPresetLogo: null,
    fields: [
      { id: "to", label: "Recipient Email", type: "email", placeholder: "recipient@example.com", required: true, default: "contact@example.com" },
      { id: "subject", label: "Subject Line", type: "text", placeholder: "Inquiry regarding...", default: "Partnership Inquiry" },
      { id: "body", label: "Message Body", type: "textarea", placeholder: "Hello, I would like to...", rows: 2, default: "Hi, I scanned your QR code and wanted to get in touch!" }
    ],
    formatPayload: function (values) {
      const to = (values.to || "").trim();
      const subj = (values.subject || "").trim();
      const body = (values.body || "").trim();
      const params = [];
      if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      return `mailto:${to}` + (params.length ? `?${params.join("&")}` : "");
    }
  },

  phone: {
    name: "Phone Call",
    category: "Communication",
    iconKey: "phone",
    description: "Instantly prompt phone dialer",
    defaultPresetLogo: null,
    fields: [
      { id: "number", label: "Phone Number", type: "tel", placeholder: "+1 (555) 000-0000", required: true, default: "+15551234567" }
    ],
    formatPayload: function (values) {
      const num = (values.number || "").trim();
      return `tel:${num}`;
    }
  },

  sms: {
    name: "SMS",
    category: "Communication",
    iconKey: "sms",
    description: "Open text messaging with pre-filled content",
    defaultPresetLogo: null,
    fields: [
      { id: "number", label: "Recipient Phone Number", type: "tel", placeholder: "+1 234 567 8900", required: true, default: "+15551234567" },
      { id: "message", label: "Pre-filled Text Message", type: "textarea", placeholder: "Message...", rows: 2, default: "Hello from QR Code!" }
    ],
    formatPayload: function (values) {
      const num = (values.number || "").trim();
      const msg = (values.message || "").trim();
      return `sms:${num}` + (msg ? `?body=${encodeURIComponent(msg)}` : "");
    }
  },

  text: {
    name: "Plain Text",
    category: "Other",
    iconKey: "text",
    description: "Encode any raw text, notes, or serial keys",
    defaultPresetLogo: null,
    fields: [
      { id: "text", label: "Content", type: "textarea", placeholder: "Enter text...", rows: 4, required: true, default: "Antigravity QR Generator - High Performance & Custom Logo" }
    ],
    formatPayload: function (values) {
      return (values.text || "").trim() || "Antigravity QR Generator";
    }
  }
};
