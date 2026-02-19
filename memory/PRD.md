# FERRE INTI - PRD (Product Requirements Document)

## Problem Statement
Copiar todo el codigo del repositorio GitHub https://github.com/sergiocabrera0506/Ferreinti1/tree/elbueno exactamente como estaba. El usuario quiere empezar a subir sus productos, ya cuenta con MongoDB Atlas y dashboard.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Cookie-based sessions + Google OAuth (Emergent)
- **Payments**: Stripe (test mode - needs real key)
- **Image Upload**: Cloudinary (requires config)
- **Shipping**: Haversine distance-based calculation

## What's Been Implemented (Feb 19, 2026)
- Full code cloned from GitHub repo (branch: elbueno) - EXACT copy
- All admin pages: Dashboard, Products, Categories, Orders, Users, Shipping
- Truck animation in checkout with CSS matching user's exact HTML specs:
  - Blue cab, dark cargo with logo, textured cardboard box
  - Mirror, grille, speed lines, truck shadow, smoke effects
  - Metallic rear door animation
- Fixed: Checkout redirect issue (auth loading race condition)
- Fixed: Truck animation completes even on payment error
- Seed data: 6 categories, 7 products
- Admin user: admin@ferreinti.com / admin123

## Pending Configuration
- Cloudinary env vars for image upload
- MongoDB Atlas connection string (production)
- Stripe real test key for payments

## Next Tasks
1. User to configure Cloudinary and Stripe credentials
2. Start uploading products via admin panel
