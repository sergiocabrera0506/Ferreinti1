# FERRE INTI - PRD (Product Requirements Document)

## Problem Statement
Copiar todo el codigo del repositorio GitHub https://github.com/sergiocabrera0506/Ferreinti1/tree/elbueno para hacer cambios en la pagina. El usuario quiere empezar a subir sus productos, ya cuenta con MongoDB Atlas y dashboard.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: Cookie-based sessions + Google OAuth (Emergent)
- **Payments**: Stripe (test mode)
- **Image Upload**: Cloudinary (requires config)
- **Shipping**: Haversine distance-based calculation

## User Personas
1. **Admin** - Manages products, categories, orders, users, shipping config
2. **Customer** - Browses products, adds to cart, places orders

## Core Requirements (Static)
- E-commerce hardware store (Ferre Inti)
- Product catalog with categories
- Shopping cart & checkout with Stripe
- Admin dashboard for product management
- CSV import for bulk product upload
- Cloudinary image upload for products
- Distance-based shipping calculation
- Google OAuth + email/password auth

## What's Been Implemented (Feb 19, 2026)
- Full backend server.py with all CRUD endpoints
- Complete frontend App.js with all pages (Home, Category, Product, Search, Cart, Wishlist, Auth, Checkout, Orders, Profile)
- Admin panel: Dashboard, Products, Categories, Orders, Users, Shipping config
- ImageUpload component for Cloudinary
- Seed data: 6 categories, 7 products
- Admin user: admin@ferreinti.com / admin123

## Testing Results
- Backend: 95% (19/20 tests passed)
- Frontend: 100% (all UI flows working)
- Overall: 98%

## Prioritized Backlog
### P0 (Critical)
- Configure Cloudinary env vars for image upload functionality
- Connect to MongoDB Atlas (user's production database)

### P1 (Important)  
- Add more seed products or help user upload products
- Configure Stripe with real test keys

### P2 (Nice to have)
- Product image optimization
- SEO improvements
- Email notifications for orders
- Inventory management alerts

## Next Tasks
1. User needs to provide Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
2. User needs to provide MongoDB Atlas connection string
3. Start uploading products via admin panel or CSV import
