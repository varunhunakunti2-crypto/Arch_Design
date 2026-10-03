# NORDIC — Architecture & Spatial Design Studio

A modern, high-performance web platform and digital portfolio for **NORDIC**, an architectural and spatial design studio based across Copenhagen, London, Oslo, and Stockholm.

Built with clean semantic HTML5, custom CSS design system variables, modular JavaScript, and an automated build pipeline for SEO, performance optimization, and strict schema validation.

---

## 🌟 Highlights & Features

- **Modern Architectural Editorial Design**: Sophisticated monochrome base frame complimented by structured pastel color blocks, pill-shaped CTAs, smooth transitions, and crisp typography (`figmaSans` & `figmaMono`).
- **Complete Page Architecture**:
  - **Homepage**: Studio manifesto, featured architectural projects showcase, process breakdown, and inquiry form.
  - **About**: Firm history, leadership, philosophy, and global studio presence.
  - **Services**: Architecture, Interior Design, and Structural Engineering capabilities.
  - **Projects Showcase**: Master portfolio + dedicated individual case studies (*Vestfold Kulturhus*, *Brygge Apartments*, *Villa Granberg*, *Lumen Pavilion*).
  - **Offices**: International studio locations (Copenhagen, London, Oslo, Stockholm) with interactive details.
  - **Contact**: Direct contact endpoint integration, office directory, and interactive form handling.
  - **Custom Error Pages**: SEO-compliant `404` and `500` fallback handling with `noindex` directives.
- **Custom Production Build Pipeline (`build.mjs`)**:
  - Compiles source files into `dist/`.
  - Stamps production base URL dynamically across canonical links, OpenGraph metadata, Twitter Cards, and JSON-LD structured data.
  - Auto-generates `sitemap.xml` and `robots.txt` directly from `site.config.json`.
  - Environment variable injection (e.g. `CONTACT_ENDPOINT`).
  - Automated asset tree pruning (removes unused media assets from production builds).
  - Automated build-time validation: checks page titles, canonical tags, single `<h1>` tag constraints, touch icons, link/asset reference integrity, and JSON-LD schema validity.
- **Vercel Cloud Deployment**: Pre-configured `vercel.json` with strict security headers (HSTS, No-Sniff, Referrer-Policy, Frame-Options) and immutable asset caching rules.

---

## 📁 Repository Structure

```
Arch_Design/
├── frontend/
│   ├── about/              # About page
│   ├── assets/             # Raw & optimized media assets (AVIF, WebP, JPG)
│   ├── contact/            # Contact page
│   ├── css/                # Global CSS design system & typography
│   ├── js/                 # Application logic & site configuration
│   ├── offices/            # Studio locations page
│   ├── projects/           # Projects listing & case study pages
│   ├── scripts/            # Build & optimization scripts (build.mjs)
│   ├── services/           # Services breakdown page
│   ├── 404.html            # Custom 404 error page
│   ├── 500.html            # Custom 500 error page
│   ├── DESIGN.md           # Comprehensive design system spec & token reference
│   ├── index.html          # Main landing page
│   ├── package.json        # Frontend scripts & dependencies definition
│   └── site.config.json    # Canonical routes, metadata & site config
├── vercel.json             # Vercel deployment configuration & security headers
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)

### Build for Production

To run the custom production build pipeline:

```bash
# Navigate to frontend directory or run directly via npm
npm --prefix frontend run build
```

Or run the script directly:

```bash
node frontend/scripts/build.mjs
```

The compiled, verified static site will be output to `frontend/dist/`.

### Development & Preview

You can serve the source files or the built `dist/` directory locally using any static file server, for example:

```bash
npx serve frontend
# or preview the production build
npx serve frontend/dist
```

---

## ⚙️ Configuration & Deployment

### Site Configuration (`site.config.json`)

Site routes, priority levels, canonical base URL, and contact details are managed in `frontend/site.config.json`:

```json
{
  "siteName": "NORDIC",
  "baseUrl": "https://www.nordicstudio.com",
  "email": "hello@nordicstudio.com",
  "routes": [
    { "path": "/", "priority": 1.0, "changefreq": "weekly" },
    { "path": "/about/", "priority": 0.5, "changefreq": "monthly" }
  ]
}
```

### Environment Variables

- `CONTACT_ENDPOINT`: Optional endpoint URL injected into `js/config.js` during build for form submission.

### Vercel Deployment

The project builds automatically on Vercel using the root configuration in `vercel.json`:
- **Build Command**: `node frontend/scripts/build.mjs`
- **Output Directory**: `frontend/dist`

---

## 🎨 Design System Reference

Full design token specifications, color palettes (Lime, Lilac, Cream, Mint, Navy), typography hierarchy (`figmaSans`, `figmaMono`), and micro-component behaviors are detailed in [`frontend/DESIGN.md`](file:///c:/Users/varun/Music/New%20folder/Projects/Arch_Design/frontend/DESIGN.md).

---

## 📄 License

Private repository — All rights reserved © NORDIC Architecture Studio.
