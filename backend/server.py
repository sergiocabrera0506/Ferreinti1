from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import httpx
import math
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "customer"
    created_at: datetime

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category_id: str
    images: List[str] = []
    features: List[str] = []
    stock: int = 0
    sku: str = ""
    is_offer: bool = False
    is_bestseller: bool = False
    is_new: bool = False

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    created_at: datetime
    rating: float = 0
    review_count: int = 0

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    original_price: Optional[float] = None
    category_id: str
    images: List[str] = []
    features: List[str] = []
    stock: int = 0
    sku: str = ""
    is_offer: bool = False
    is_bestseller: bool = False
    is_new: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    category_id: Optional[str] = None
    images: Optional[List[str]] = None
    features: Optional[List[str]] = None
    stock: Optional[int] = None
    sku: Optional[str] = None
    is_offer: Optional[bool] = None
    is_bestseller: Optional[bool] = None
    is_new: Optional[bool] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str
    name: str
    slug: str
    image: str
    icon: str

class CategoryCreate(BaseModel):
    name: str
    slug: str
    image: str
    icon: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    image: Optional[str] = None
    icon: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CartItemResponse(BaseModel):
    product_id: str
    quantity: int
    product: Optional[Product] = None

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime

class ShippingAddress(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: ShippingAddress
    payment_session_id: str

class OrderStatusUpdate(BaseModel):
    status: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str
    user_id: str
    user_email: str
    user_name: str
    items: List[Dict[str, Any]]
    subtotal: float
    shipping_cost: float
    total: float
    status: str
    shipping_address: Dict[str, Any]
    payment_session_id: str
    created_at: datetime

class CheckoutRequest(BaseModel):
    origin_url: str
    shipping_address: ShippingAddress

class ShippingConfig(BaseModel):
    store_lat: float = -12.1190285
    store_lng: float = -77.0349915
    free_radius_km: float = 5.0
    price_per_km: float = 1.50
    min_shipping_cost: float = 5.0

class ShippingConfigUpdate(BaseModel):
    store_lat: Optional[float] = None
    store_lng: Optional[float] = None
    free_radius_km: Optional[float] = None
    price_per_km: Optional[float] = None
    min_shipping_cost: Optional[float] = None

class ShippingCalculation(BaseModel):
    address: ShippingAddress

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return f"token_{uuid.uuid4().hex}"

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def get_shipping_config() -> ShippingConfig:
    """Get shipping configuration from database or return defaults"""
    config = await db.settings.find_one({"setting_id": "shipping_config"}, {"_id": 0})
    if config:
        return ShippingConfig(**config)
    return ShippingConfig()

async def calculate_shipping_cost(lat: float, lng: float) -> Dict[str, Any]:
    """Calculate shipping cost based on distance from store"""
    config = await get_shipping_config()
    
    distance = haversine_distance(config.store_lat, config.store_lng, lat, lng)
    
    if distance <= config.free_radius_km:
        return {
            "distance_km": round(distance, 2),
            "shipping_cost": 0,
            "is_free": True,
            "message": f"Envío gratis (dentro de {config.free_radius_km}km)"
        }
    
    extra_km = distance - config.free_radius_km
    cost = extra_km * config.price_per_km
    
    if cost < config.min_shipping_cost:
        cost = config.min_shipping_cost
    
    return {
        "distance_km": round(distance, 2),
        "shipping_cost": round(cost, 2),
        "is_free": False,
        "message": f"Costo de envío: ${round(cost, 2)} ({round(distance, 1)}km)"
    }

async def get_current_user(request: Request) -> Optional[User]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if not session_token:
        # Fallback to Authorization header
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            session_token = auth.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
        return User(**user)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user

async def require_admin(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere rol de administrador.")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # First user becomes admin
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "customer"
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "picture": None,
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = generate_token()
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "email": user_data.email, "name": user_data.name, "role": role, "session_token": session_token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or user.get("password") != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    session_token = generate_token()
    session_doc = {
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "role": user.get("role", "customer"),
        "session_token": session_token
    }

@api_router.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        data = resp.json()
    
    # Check if user exists
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing.get("role", "customer")
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # First user becomes admin
        user_count = await db.users.count_documents({})
        role = "admin" if user_count == 0 else "customer"
        
        user_doc = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "password": None,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = data.get("session_token", generate_token())
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": data["email"],
        "name": data["name"],
        "picture": data.get("picture"),
        "role": role,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Sesión cerrada"}

# ==================== CATEGORIES ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/categories/{slug}")
async def get_category(slug: str):
    category = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return category

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_offer: Optional[bool] = None,
    is_bestseller: Optional[bool] = None,
    is_new: Optional[bool] = None,
    limit: int = 20,
    skip: int = 0
):
    query = {}
    if category:
        query["category_id"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if is_offer:
        query["is_offer"] = True
    if is_bestseller:
        query["is_bestseller"] = True
    if is_new:
        query["is_new"] = True
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

@api_router.get("/products/category/{category_id}", response_model=List[Product])
async def get_products_by_category(category_id: str, limit: int = 20):
    products = await db.products.find({"category_id": category_id}, {"_id": 0}).limit(limit).to_list(limit)
    return products

@api_router.get("/products/related/{product_id}", response_model=List[Product])
async def get_related_products(product_id: str, limit: int = 8):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        return []
    
    related = await db.products.find(
        {"category_id": product["category_id"], "product_id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    return related

# ==================== CART ROUTES ====================

@api_router.get("/cart")
async def get_cart(user: User = Depends(require_auth)):
    cart = await db.carts.find_one({"user_id": user.user_id}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    items_with_products = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            items_with_products.append({**item, "product": product})
            total += product["price"] * item["quantity"]
    
    return {"items": items_with_products, "total": round(total, 2)}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: User = Depends(require_auth)):
    cart = await db.carts.find_one({"user_id": user.user_id})
    
    if not cart:
        await db.carts.insert_one({
            "user_id": user.user_id,
            "items": [item.model_dump()],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Check if item exists
        existing_idx = next((i for i, x in enumerate(cart["items"]) if x["product_id"] == item.product_id), None)
        if existing_idx is not None:
            cart["items"][existing_idx]["quantity"] += item.quantity
        else:
            cart["items"].append(item.model_dump())
        
        await db.carts.update_one(
            {"user_id": user.user_id},
            {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Producto añadido al carrito"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: User = Depends(require_auth)):
    cart = await db.carts.find_one({"user_id": user.user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Carrito no encontrado")
    
    for i, x in enumerate(cart["items"]):
        if x["product_id"] == item.product_id:
            if item.quantity <= 0:
                cart["items"].pop(i)
            else:
                cart["items"][i]["quantity"] = item.quantity
            break
    
    await db.carts.update_one(
        {"user_id": user.user_id},
        {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Carrito actualizado"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user: User = Depends(require_auth)):
    await db.carts.update_one(
        {"user_id": user.user_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Producto eliminado del carrito"}

@api_router.delete("/cart/clear")
async def clear_cart(user: User = Depends(require_auth)):
    await db.carts.update_one(
        {"user_id": user.user_id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Carrito vaciado"}

# ==================== WISHLIST ROUTES ====================

@api_router.get("/wishlist")
async def get_wishlist(user: User = Depends(require_auth)):
    wishlist = await db.wishlists.find_one({"user_id": user.user_id}, {"_id": 0})
    if not wishlist:
        return {"products": []}
    
    products = []
    for pid in wishlist.get("product_ids", []):
        product = await db.products.find_one({"product_id": pid}, {"_id": 0})
        if product:
            products.append(product)
    
    return {"products": products}

@api_router.post("/wishlist/add/{product_id}")
async def add_to_wishlist(product_id: str, user: User = Depends(require_auth)):
    wishlist = await db.wishlists.find_one({"user_id": user.user_id})
    
    if not wishlist:
        await db.wishlists.insert_one({
            "user_id": user.user_id,
            "product_ids": [product_id],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        if product_id not in wishlist.get("product_ids", []):
            await db.wishlists.update_one(
                {"user_id": user.user_id},
                {"$push": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Producto añadido a lista de deseos"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, user: User = Depends(require_auth)):
    await db.wishlists.update_one(
        {"user_id": user.user_id},
        {"$pull": {"product_ids": product_id}}
    )
    return {"message": "Producto eliminado de lista de deseos"}

# ==================== REVIEWS ROUTES ====================

@api_router.get("/reviews/{product_id}", response_model=List[Review])
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(100)
    return reviews

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, user: User = Depends(require_auth)):
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "product_id": review_data.product_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review_data.product_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"product_id": review_data.product_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return Review(**review_doc)

# ==================== SHIPPING ROUTES ====================

@api_router.get("/shipping/config")
async def get_shipping_config_route():
    config = await get_shipping_config()
    return config

@api_router.post("/shipping/calculate")
async def calculate_shipping(data: ShippingCalculation):
    if data.address.lat is None or data.address.lng is None:
        raise HTTPException(status_code=400, detail="Se requieren coordenadas (lat, lng) para calcular envío")
    
    result = await calculate_shipping_cost(data.address.lat, data.address.lng)
    return result

# ==================== ORDERS ROUTES ====================

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: User = Depends(require_auth)):
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user: User = Depends(require_auth)):
    # Get product details and calculate total
    items_with_details = []
    subtotal = 0
    for item in order_data.items:
        product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
        if product:
            items_with_details.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "name": product["name"],
                "price": product["price"],
                "image": product["images"][0] if product["images"] else ""
            })
            subtotal += product["price"] * item.quantity
    
    # Calculate shipping
    shipping_cost = 0
    if order_data.shipping_address.lat and order_data.shipping_address.lng:
        shipping_result = await calculate_shipping_cost(
            order_data.shipping_address.lat, 
            order_data.shipping_address.lng
        )
        shipping_cost = shipping_result["shipping_cost"]
    
    total = subtotal + shipping_cost
    
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    order_doc = {
        "order_id": order_id,
        "user_id": user.user_id,
        "user_email": user.email,
        "user_name": user.name,
        "items": items_with_details,
        "subtotal": round(subtotal, 2),
        "shipping_cost": round(shipping_cost, 2),
        "total": round(total, 2),
        "status": "pending",
        "shipping_address": order_data.shipping_address.model_dump(),
        "payment_session_id": order_data.payment_session_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.update_one({"user_id": user.user_id}, {"$set": {"items": []}})
    
    return Order(**order_doc)

# ==================== PAYMENTS ROUTES ====================

import stripe

stripe.api_key = STRIPE_API_KEY
if "sk_test_emergent" in STRIPE_API_KEY:
    stripe.api_base = "https://integrations.emergentagent.com/stripe"

@api_router.post("/payments/checkout")
async def create_checkout(checkout_data: CheckoutRequest, request: Request, user: User = Depends(require_auth)):
    # Get cart
    cart = await db.carts.find_one({"user_id": user.user_id}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    
    # Calculate subtotal and build line items
    subtotal = 0.0
    line_items = []
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            subtotal += product["price"] * item["quantity"]
            line_items.append({
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": product["name"],
                        "images": product.get("images", [])[:1]
                    },
                    "unit_amount": int(product["price"] * 100)
                },
                "quantity": item["quantity"]
            })
    
    # Calculate shipping
    shipping_cost = 0.0
    if checkout_data.shipping_address.lat and checkout_data.shipping_address.lng:
        shipping_result = await calculate_shipping_cost(
            checkout_data.shipping_address.lat,
            checkout_data.shipping_address.lng
        )
        shipping_cost = shipping_result["shipping_cost"]
    
    # Add shipping as line item if applicable
    if shipping_cost > 0:
        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "Envío"},
                "unit_amount": int(shipping_cost * 100)
            },
            "quantity": 1
        })
    
    total = subtotal + shipping_cost
    
    if total <= 0:
        raise HTTPException(status_code=400, detail="El total debe ser mayor a 0")
    
    origin = checkout_data.origin_url.rstrip('/')
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout/cancel"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user.user_id,
                "user_email": user.email
            }
        )
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Error al crear sesión de pago")
    
    # Create payment transaction record
    transaction_doc = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.id,
        "user_id": user.user_id,
        "user_email": user.email,
        "subtotal": round(subtotal, 2),
        "shipping_cost": round(shipping_cost, 2),
        "amount": round(total, 2),
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "shipping_address": checkout_data.shipping_address.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.id, "total": total, "shipping_cost": shipping_cost}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        status = session.status
        payment_status = session.payment_status
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": status, "payment_status": payment_status}}
        )
        
        return {"status": status, "payment_status": payment_status, "session_id": session_id}
    except Exception as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(status_code=400, detail="Error al obtener estado del pago")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        event = stripe.Webhook.construct_event(body, signature, STRIPE_API_KEY)
        
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            await db.payment_transactions.update_one(
                {"session_id": session["id"]},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ==================== CLOUDINARY ROUTES ====================

ALLOWED_FOLDERS = ("products/", "categories/", "users/", "uploads/")

@api_router.get("/cloudinary/signature")
async def generate_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "video"]),
    folder: str = Query("products")
):
    """Generate signed upload params for Cloudinary"""
    # Validate folder
    folder_with_slash = folder if folder.endswith("/") else f"{folder}/"
    if not any(folder_with_slash.startswith(allowed) for allowed in ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Carpeta no permitida")

    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }

    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )

    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

@api_router.delete("/cloudinary/delete")
async def delete_cloudinary_image(
    public_id: str = Query(..., description="Public ID of the image to delete"),
    user: User = Depends(require_admin)
):
    """Delete an image from Cloudinary (admin only)"""
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return {"message": "Imagen eliminada", "result": result}
    except Exception as e:
        logger.error(f"Cloudinary delete error: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar imagen")

@api_router.get("/cloudinary/config")
async def get_cloudinary_config():
    """Get Cloudinary config for frontend (public info only)"""
    return {
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "upload_preset": None,  # Using signed uploads instead
        "max_file_size": 10485760,  # 10MB
        "allowed_formats": ["jpg", "jpeg", "png", "webp", "gif"],
        "transformation": {
            "quality": "auto",
            "fetch_format": "auto"
        }
    }

@api_router.post("/admin/convert-images-to-webp")
async def convert_existing_images_to_webp(user: User = Depends(require_admin)):
    """Convertir todas las URLs de imágenes existentes para usar formato WebP optimizado"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    if not cloud_name:
        raise HTTPException(status_code=500, detail="Cloudinary no configurado")
    
    updated_products = 0
    updated_categories = 0
    
    # Función para optimizar URL de Cloudinary
    def optimize_cloudinary_url(url):
        if not url or not isinstance(url, str):
            return url
        
        # Si ya tiene f_auto,q_auto, no cambiar
        if 'f_auto,q_auto' in url or 'f_webp' in url:
            return url
            
        # Si es URL de Cloudinary, agregar transformación
        if 'res.cloudinary.com' in url and '/upload/' in url:
            # Insertar f_auto,q_auto después de /upload/
            return url.replace('/upload/', '/upload/f_auto,q_auto/')
        
        # Si es URL de Cloudinary con versión (v1234567890)
        if 'res.cloudinary.com' in url:
            import re
            # Buscar patrón /upload/v[números]/
            pattern = r'(/upload/)(v\d+/)'
            if re.search(pattern, url):
                return re.sub(pattern, r'\1f_auto,q_auto/\2', url)
        
        return url
    
    # Actualizar productos
    products = await db.products.find({"images": {"$exists": True, "$ne": []}}).to_list(1000)
    for product in products:
        updated_images = [optimize_cloudinary_url(img) for img in product.get("images", [])]
        if updated_images != product.get("images", []):
            await db.products.update_one(
                {"_id": product["_id"]},
                {"$set": {"images": updated_images}}
            )
            updated_products += 1
    
    # Actualizar categorías
    categories = await db.categories.find({"image": {"$exists": True, "$ne": ""}}).to_list(100)
    for category in categories:
        updated_image = optimize_cloudinary_url(category.get("image", ""))
        if updated_image != category.get("image", ""):
            await db.categories.update_one(
                {"_id": category["_id"]},
                {"$set": {"image": updated_image}}
            )
            updated_categories += 1
    
    return {
        "message": "Conversión completada",
        "updated_products": updated_products,
        "updated_categories": updated_categories
    }

# ==================== BANNERS ROUTES ====================

@api_router.get("/banners")
async def get_active_banners():
    """Obtener banners activos para mostrar en la tienda"""
    banners = await db.banners.find(
        {"is_active": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(20)
    return banners

@api_router.get("/admin/banners")
async def admin_get_banners(user: User = Depends(require_admin)):
    """Obtener todos los banners (admin)"""
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return {"banners": banners}

@api_router.post("/admin/banners")
async def create_banner(banner_data: dict, user: User = Depends(require_admin)):
    """Crear nuevo banner"""
    banner_id = f"banner_{uuid.uuid4().hex[:12]}"
    
    banner_doc = {
        "banner_id": banner_id,
        "title": banner_data.get("title", ""),
        "subtitle": banner_data.get("subtitle", ""),
        "image": banner_data.get("image", ""),
        "image_mobile": banner_data.get("image_mobile", ""),
        "link": banner_data.get("link", ""),
        "button_text": banner_data.get("button_text", ""),
        "is_active": banner_data.get("is_active", True),
        "order": banner_data.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.banners.insert_one(banner_doc)
    
    return {"banner_id": banner_id, "message": "Banner creado exitosamente"}

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, banner_data: dict, user: User = Depends(require_admin)):
    """Actualizar banner existente"""
    existing = await db.banners.find_one({"banner_id": banner_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    
    update_data = {
        "title": banner_data.get("title", existing.get("title", "")),
        "subtitle": banner_data.get("subtitle", existing.get("subtitle", "")),
        "image": banner_data.get("image", existing.get("image", "")),
        "image_mobile": banner_data.get("image_mobile", existing.get("image_mobile", "")),
        "link": banner_data.get("link", existing.get("link", "")),
        "button_text": banner_data.get("button_text", existing.get("button_text", "")),
        "is_active": banner_data.get("is_active", existing.get("is_active", True)),
        "order": banner_data.get("order", existing.get("order", 0)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.banners.update_one({"banner_id": banner_id}, {"$set": update_data})
    
    return {"message": "Banner actualizado exitosamente"}

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, user: User = Depends(require_admin)):
    """Eliminar banner"""
    result = await db.banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    
    return {"message": "Banner eliminado exitosamente"}

# ==================== ADMIN ROUTES ====================

# Dashboard Stats
@api_router.get("/admin/dashboard")
async def admin_dashboard(user: User = Depends(require_admin)):
    # Get date ranges
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Total products
    total_products = await db.products.count_documents({})
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Orders stats
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Revenue calculations
    all_orders = await db.orders.find({}, {"_id": 0, "total": 1, "created_at": 1, "status": 1}).to_list(10000)
    
    total_revenue = sum(o.get("total", 0) for o in all_orders if o.get("status") == "paid")
    
    today_orders = [o for o in all_orders if o.get("created_at", "") >= today_start.isoformat()]
    today_revenue = sum(o.get("total", 0) for o in today_orders if o.get("status") == "paid")
    
    week_orders = [o for o in all_orders if o.get("created_at", "") >= week_start.isoformat()]
    week_revenue = sum(o.get("total", 0) for o in week_orders if o.get("status") == "paid")
    
    month_orders = [o for o in all_orders if o.get("created_at", "") >= month_start.isoformat()]
    month_revenue = sum(o.get("total", 0) for o in month_orders if o.get("status") == "paid")
    
    # Low stock products (< 10)
    low_stock = await db.products.count_documents({"stock": {"$lt": 10}})
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Top selling products (based on order items)
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "total_sold": {"$sum": "$items.quantity"}, "name": {"$first": "$items.name"}}},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(pipeline).to_list(5)
    
    return {
        "total_products": total_products,
        "total_users": total_users,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
        "revenue": {
            "total": round(total_revenue, 2),
            "today": round(today_revenue, 2),
            "week": round(week_revenue, 2),
            "month": round(month_revenue, 2)
        },
        "recent_orders": recent_orders,
        "top_products": top_products
    }

# Products Management
@api_router.get("/admin/products")
async def admin_get_products(
    user: User = Depends(require_admin),
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category_id"] = category
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total}

@api_router.post("/admin/products")
async def admin_create_product(product_data: ProductCreate, user: User = Depends(require_admin)):
    product_id = f"prod_{uuid.uuid4().hex[:8]}"
    product_doc = {
        "product_id": product_id,
        **product_data.model_dump(),
        "rating": 0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"message": "Producto creado", "product_id": product_id}

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, product_data: ProductUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.products.update_one({"product_id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"message": "Producto actualizado"}

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user: User = Depends(require_admin)):
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"message": "Producto eliminado"}

# Categories Management
@api_router.get("/admin/categories")
async def admin_get_categories(user: User = Depends(require_admin)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return {"categories": categories}

@api_router.post("/admin/categories")
async def admin_create_category(category_data: CategoryCreate, user: User = Depends(require_admin)):
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    category_doc = {
        "category_id": category_id,
        **category_data.model_dump()
    }
    await db.categories.insert_one(category_doc)
    return {"message": "Categoría creada", "category_id": category_id}

@api_router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, category_data: CategoryUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in category_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.categories.update_one({"category_id": category_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return {"message": "Categoría actualizada"}

@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, user: User = Depends(require_admin)):
    # Check if category has products
    products_count = await db.products.count_documents({"category_id": category_id})
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar. La categoría tiene {products_count} productos")
    
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"message": "Categoría eliminada"}

# Orders Management
@api_router.get("/admin/orders")
async def admin_get_orders(
    user: User = Depends(require_admin),
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total}

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status_data: OrderStatusUpdate, user: User = Depends(require_admin)):
    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Usar: {', '.join(valid_statuses)}")
    
    result = await db.orders.update_one(
        {"order_id": order_id}, 
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    return {"message": f"Estado actualizado a: {status_data.status}"}

@api_router.get("/admin/orders/{order_id}")
async def admin_get_order(order_id: str, user: User = Depends(require_admin)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

# Users Management
@api_router.get("/admin/users")
async def admin_get_users(
    user: User = Depends(require_admin),
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total}

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: User = Depends(require_admin)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Get user orders
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {"user": user, "orders": orders}

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(user_id: str, role: str, admin: User = Depends(require_admin)):
    if role not in ["customer", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido. Usar: customer o admin")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": f"Rol actualizado a: {role}"}

# Shipping Configuration
@api_router.get("/admin/shipping")
async def admin_get_shipping(user: User = Depends(require_admin)):
    config = await get_shipping_config()
    return config

@api_router.put("/admin/shipping")
async def admin_update_shipping(config_data: ShippingConfigUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in config_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    await db.settings.update_one(
        {"setting_id": "shipping_config"},
        {"$set": {**update_data, "setting_id": "shipping_config"}},
        upsert=True
    )
    
    return {"message": "Configuración de envío actualizada"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.categories.find_one()
    if existing:
        return {"message": "Datos ya existentes"}
    
    # Categories
    categories = [
        {"category_id": "cat_manual", "name": "Herramientas Manuales", "slug": "herramientas-manuales", "image": "https://images.unsplash.com/photo-1581166418878-11f0dde922c2?w=400", "icon": "Wrench"},
        {"category_id": "cat_electric", "name": "Herramientas Eléctricas", "slug": "herramientas-electricas", "image": "https://images.unsplash.com/photo-1720156066527-41497702fc63?w=400", "icon": "Zap"},
        {"category_id": "cat_conexiones", "name": "Conexiones Eléctricas", "slug": "conexiones-electricas", "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", "icon": "Cable"},
        {"category_id": "cat_bano", "name": "Accesorios para Baño", "slug": "accesorios-bano", "image": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400", "icon": "Droplets"},
        {"category_id": "cat_cocina", "name": "Accesorios para Cocina", "slug": "accesorios-cocina", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", "icon": "ChefHat"},
        {"category_id": "cat_ruedas", "name": "Ruedas para Muebles", "slug": "ruedas-muebles", "image": "https://images.unsplash.com/photo-1634429436458-60b95e2e105a?w=400", "icon": "Circle"},
    ]
    await db.categories.insert_many(categories)
    
    # Products
    products = [
        # Manual Tools
        {"product_id": "prod_001", "name": "Martillo Profesional Stanley", "description": "Martillo de carpintero con mango antideslizante. Cabeza de acero forjado de alta resistencia.", "price": 25.99, "original_price": 32.99, "category_id": "cat_manual", "images": ["https://images.unsplash.com/photo-1586864387789-628af9feed72?w=600", "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600"], "features": ["Mango antideslizante", "Acero forjado", "Peso: 500g", "Garantía 2 años"], "stock": 50, "sku": "MART-001", "is_offer": True, "is_bestseller": True, "is_new": False, "rating": 4.8, "review_count": 124, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_002", "name": "Set de Destornilladores 12 Piezas", "description": "Kit completo de destornilladores con puntas intercambiables. Incluye estuche organizador.", "price": 18.50, "category_id": "cat_manual", "images": ["https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=600"], "features": ["12 piezas", "Puntas magnéticas", "Estuche incluido", "Mangos ergonómicos"], "stock": 35, "sku": "DEST-002", "is_offer": False, "is_bestseller": True, "is_new": False, "rating": 4.5, "review_count": 89, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_003", "name": "Llave Ajustable 10 Pulgadas", "description": "Llave inglesa de acero cromado con apertura máxima de 30mm.", "price": 15.99, "category_id": "cat_manual", "images": ["https://images.unsplash.com/photo-1580402427914-a6cc60d7b44f?w=600"], "features": ["Acero cromado", "Apertura 30mm", "Escala métrica", "Mango antideslizante"], "stock": 40, "sku": "LLAV-003", "is_offer": False, "is_bestseller": False, "is_new": True, "rating": 4.3, "review_count": 45, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Electric Tools
        {"product_id": "prod_004", "name": "Taladro Inalámbrico 20V", "description": "Taladro percutor con batería de litio recargable. Incluye 2 baterías y cargador rápido.", "price": 89.99, "original_price": 119.99, "category_id": "cat_electric", "images": ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600", "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600"], "features": ["20V Litio", "2 velocidades", "Luz LED", "2 baterías incluidas"], "stock": 25, "sku": "TALA-004", "is_offer": True, "is_bestseller": True, "is_new": False, "rating": 4.9, "review_count": 256, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_005", "name": "Sierra Circular 1400W", "description": "Sierra circular profesional con disco de 185mm. Ideal para cortes precisos en madera.", "price": 75.00, "category_id": "cat_electric", "images": ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600"], "features": ["1400W potencia", "Disco 185mm", "Guía láser", "Profundidad ajustable"], "stock": 15, "sku": "SIER-005", "is_offer": False, "is_bestseller": False, "is_new": True, "rating": 4.6, "review_count": 67, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_006", "name": "Lijadora Orbital 300W", "description": "Lijadora orbital compacta para acabados finos. Sistema de recolección de polvo.", "price": 45.50, "category_id": "cat_electric", "images": ["https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600"], "features": ["300W", "Velocidad variable", "Bajo ruido", "Sistema antipolvo"], "stock": 30, "sku": "LIJA-006", "is_offer": False, "is_bestseller": False, "is_new": False, "rating": 4.4, "review_count": 34, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Electrical Connections
        {"product_id": "prod_007", "name": "Cable Eléctrico 2.5mm 100m", "description": "Rollo de cable eléctrico THW calibre 14 AWG. Color azul.", "price": 55.00, "category_id": "cat_conexiones", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"], "features": ["100 metros", "Calibre 14 AWG", "THW", "600V"], "stock": 100, "sku": "CABL-007", "is_offer": False, "is_bestseller": True, "is_new": False, "rating": 4.7, "review_count": 89, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_008", "name": "Centro de Carga 8 Circuitos", "description": "Centro de carga residencial para 8 circuitos. Incluye interruptor principal.", "price": 65.00, "original_price": 79.99, "category_id": "cat_conexiones", "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"], "features": ["8 circuitos", "Interruptor 100A", "Montaje empotrado", "Certificado UL"], "stock": 20, "sku": "CENT-008", "is_offer": True, "is_bestseller": False, "is_new": False, "rating": 4.5, "review_count": 45, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Bathroom Accessories
        {"product_id": "prod_009", "name": "Regadera Cromada Alta Presión", "description": "Regadera de 5 funciones con sistema de alta presión. Acabado cromado premium.", "price": 35.99, "category_id": "cat_bano", "images": ["https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600"], "features": ["5 funciones", "Alta presión", "Cromado", "Fácil instalación"], "stock": 45, "sku": "REGA-009", "is_offer": False, "is_bestseller": True, "is_new": True, "rating": 4.6, "review_count": 78, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_010", "name": "Llave Mezcladora para Lavabo", "description": "Llave monomando con cartucho cerámico. Acabado níquel satinado.", "price": 42.00, "category_id": "cat_bano", "images": ["https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600"], "features": ["Monomando", "Cartucho cerámico", "Níquel satinado", "Ahorro de agua"], "stock": 30, "sku": "LLAV-010", "is_offer": False, "is_bestseller": False, "is_new": False, "rating": 4.4, "review_count": 56, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Kitchen Accessories
        {"product_id": "prod_011", "name": "Grifo Cocina Extraíble", "description": "Grifo de cocina con cabezal extraíble y doble función. Acabado acero inoxidable.", "price": 68.50, "original_price": 85.00, "category_id": "cat_cocina", "images": ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"], "features": ["Cabezal extraíble", "Doble función", "Acero inoxidable", "Giro 360°"], "stock": 25, "sku": "GRIF-011", "is_offer": True, "is_bestseller": True, "is_new": False, "rating": 4.8, "review_count": 134, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_012", "name": "Organizador de Fregadero", "description": "Canasta organizadora de acero inoxidable para fregadero.", "price": 22.00, "category_id": "cat_cocina", "images": ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"], "features": ["Acero inoxidable", "Antioxidante", "Fácil limpieza", "Ajustable"], "stock": 60, "sku": "ORGA-012", "is_offer": False, "is_bestseller": False, "is_new": True, "rating": 4.2, "review_count": 28, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Furniture Wheels
        {"product_id": "prod_013", "name": "Ruedas Giratorias 50mm Pack 4", "description": "Set de 4 ruedas giratorias con freno. Capacidad de carga 40kg por rueda.", "price": 12.99, "category_id": "cat_ruedas", "images": ["https://images.unsplash.com/photo-1634429436458-60b95e2e105a?w=600"], "features": ["4 unidades", "Con freno", "50mm diámetro", "Carga 40kg c/u"], "stock": 80, "sku": "RUED-013", "is_offer": False, "is_bestseller": True, "is_new": False, "rating": 4.5, "review_count": 92, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_014", "name": "Ruedas para Muebles Pesados 75mm", "description": "Ruedas industriales para muebles pesados. Goma de alta resistencia.", "price": 24.50, "original_price": 29.99, "category_id": "cat_ruedas", "images": ["https://images.unsplash.com/photo-1634429436458-60b95e2e105a?w=600"], "features": ["75mm diámetro", "Goma resistente", "Carga 80kg c/u", "Base metálica"], "stock": 40, "sku": "RUED-014", "is_offer": True, "is_bestseller": False, "is_new": False, "rating": 4.6, "review_count": 54, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_015", "name": "Deslizadores para Sillas Pack 8", "description": "Deslizadores de fieltro para proteger pisos. Adhesivos de alta fijación.", "price": 8.99, "category_id": "cat_ruedas", "images": ["https://images.unsplash.com/photo-1634429436458-60b95e2e105a?w=600"], "features": ["8 unidades", "Fieltro premium", "Autoadhesivos", "Protege pisos"], "stock": 120, "sku": "DESL-015", "is_offer": False, "is_bestseller": False, "is_new": True, "rating": 4.3, "review_count": 67, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.products.insert_many(products)
    
    # Default shipping config
    await db.settings.update_one(
        {"setting_id": "shipping_config"},
        {"$set": {
            "setting_id": "shipping_config",
            "store_lat": -12.1190285,
            "store_lng": -77.0349915,
            "free_radius_km": 5.0,
            "price_per_km": 1.50,
            "min_shipping_cost": 5.0
        }},
        upsert=True
    )
    
    return {"message": "Datos iniciales creados exitosamente"}

# ==================== IMPORT PRODUCTS FROM CSV ====================

class ImportProductsRequest(BaseModel):
    clear_existing: bool = False

@api_router.post("/admin/import-products")
async def import_csv_products(request: ImportProductsRequest, user: User = Depends(require_admin)):
    """Import products from the predefined CSV data"""
    
    # Create new categories if needed
    new_categories = [
        {"category_id": "cat_adhesivos", "name": "Adhesivos y Pegamentos", "slug": "adhesivos-pegamentos", "image": "https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033443546.png?v=1731231292", "icon": "Droplets"},
        {"category_id": "cat_fontaneria", "name": "Fontanería y Grifería", "slug": "fontaneria-griferia", "image": "https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_163019219.png?v=1730241021", "icon": "Droplets"},
        {"category_id": "cat_hogar", "name": "Hogar y Limpieza", "slug": "hogar-limpieza", "image": "https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_031540433-Photoroom.png?v=1731230170", "icon": "HomeIcon"},
    ]
    
    for cat in new_categories:
        existing = await db.categories.find_one({"category_id": cat["category_id"]})
        if not existing:
            await db.categories.insert_one(cat)
    
    # CSV Products data (unique products only)
    csv_products = [
        {"name": "Montaje Sin Clavos FORTIKONG", "description": "Pega, fija y monta sin clavos, sin taquetes ni tornillos. Aplicador de precisión. Color amarillo claro. Alta resistencia.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033749915.png?v=1731231478"], "stock": 10, "sku": "FORT-001"},
        {"name": "Pegamento Instantáneo Pegatanke", "description": "Pegamento instantáneo Toke ultra 3g, ideal para adherir materiales como acero, aluminio, hierro, caucho, cobre, madera, estaño, cuero.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033443546.png?v=1731231292"], "stock": 20, "sku": "PEGA-001"},
        {"name": "Masilla Epóxica PEGATANKE", "description": "Epóxico no permite el paso a la humedad, corrosión o abrasión. Impermeable al agua, gasoil, gasolina, anticongelante, fluidos hidráulicos, aceites, grasas y demás disolventes. Aislante a los fluidos de transmisión y al ácido de las baterías.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033327017.png?v=1731231216"], "stock": 15, "sku": "PEGA-002"},
        {"name": "Epóxico Transparente FORTIKONG", "description": "Ideal para reparación de madera, porcelana, fibra de vidrio, metales, luces LED, maquinaria, electrónica, automotriz, construcción. Secado rápido. Unión fuerte. Resiste hasta 130kg/cm2. Resistente al agua, ácido, aceite.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033126938.png?v=1731231095"], "stock": 15, "sku": "FORT-002"},
        {"name": "Pega Acero Gris FORTIKONG", "description": "Ideal para metal, cerámica, plástico, motocicletas, tanques de combustible, parachoques, espejos, radiadores, lámparas, aparatos eléctricos. Latón, metales, cobre, hierro. Resiste hasta 160kg/cm2.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_033028825.png?v=1731231037"], "stock": 15, "sku": "FORT-003"},
        {"name": "Pega Acero FORTIKONG", "description": "Ideal para metal, cerámica, plástico para motocicletas, tanques de combustible, parachoques, espejos, radiadores, lámparas. Latón, metales, cobre, hierro, plástico, cerámica. Resiste hasta 160kg/cm2. Color gris.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_032901788.png?v=1731230951"], "stock": 15, "sku": "FORT-004"},
        {"name": "Pega Todo FORTIKONG", "description": "Color blanco. 85gr. Temperatura -5 a 50°C. Soporta 100 kg por cm2. Para madera, metales, espejos, mármol, hormigón, galvanizados, plásticos, cemento. Sella áreas de alta vibración. Uso exterior o interior.", "price": 0, "category_id": "cat_adhesivos", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_032056142.png?v=1731230464"], "stock": 20, "sku": "FORT-005"},
        {"name": "Bote Para Basura Con Pedal 20L LION TOOLS", "description": "Acabado satinado. Cuerpo acero inoxidable. Cubeta interior de plástico PP. Cierre lento. 20 litros. 27cm x 44cm x 27cm.", "price": 0, "category_id": "cat_hogar", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_031540433-Photoroom.png?v=1731230170"], "stock": 5, "sku": "LION-001"},
        {"name": "Bote Para Basura Con Pedal 12L LION TOOLS", "description": "Acabado Satinado. Cuerpo Acero Inoxidable 410. Cubeta Interior De Plástico PP. Cierre Lento. 27cm x 30.5cm x 27cm.", "price": 236.00, "category_id": "cat_hogar", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-11-10_025748572.png?v=1731229077"], "stock": 5, "sku": "LION-002"},
        {"name": "Tarja Escurridor Izquierdo T01R", "description": "Tarja para Cocina. Tamaño: 80x50 cm. Lado: Izquierdo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_204737530.png?v=1730774859"], "stock": 3, "sku": "FIDIC-001"},
        {"name": "Pack de Baño Completo", "description": "Set completo de accesorios para baño.", "price": 160.00, "category_id": "cat_bano", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_194447072-Photoroom.jpg?v=1730252700"], "stock": 5, "sku": "PACK-001"},
        {"name": "Tarja Derecha FIDIC T01", "description": "Tarja 80x50. Escurridor Derecho. Calibre 22. Tipo Satín. FIDIC T01.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_161607540.png?v=1730240169"], "stock": 3, "sku": "FIDIC-002"},
        {"name": "Mezcladora Para Fregadero FIDIC F8511", "description": "Cubierta Metálica. Cuello Metálico. Cuerpo Metálico. 1/4\" Vuelta. Color Cromo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_195159060-Photoroom.jpg?v=1730253130"], "stock": 5, "sku": "FIDIC-003"},
        {"name": "Mezcladora Para Fregadero FIDIC F8501-1", "description": "Cuello Metálico. Cubierta Metálica. Cuerpo Metálico. Vuelta Completa. Color Cromo.", "price": 150.00, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_163019219.png?v=1730241021"], "stock": 5, "sku": "FIDIC-004"},
        {"name": "Mezcladora Para Fregadero FIDIC F8501", "description": "Cubierta Metálica. Cuello Metálico. Cuerpo Metálico. Vuelta Completa. Color Cromo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_162825230.png?v=1730240981"], "stock": 5, "sku": "FIDIC-005"},
        {"name": "Mezcladora Para Fregadero FIDIC F8281", "description": "Manerales Metálico. Cuello Flexible. Cuerpo De Bronce. Cubierta Metálica. Color Cromo. Vuelta Completa. Cuello Largo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_195040767-Photoroom.jpg?v=1730253062"], "stock": 5, "sku": "FIDIC-006"},
        {"name": "Mezcladora Para Fregadero FIDIC F8258", "description": "Cuello Metálico. Cubierta Metálica. Cuerpo De Bronce. Manerales Metálicos 1/4\" De Vuelta Mezcladora Para Fregadero 8\". Color Cromo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_194926958-Photoroom.jpg?v=1730253007"], "stock": 5, "sku": "FIDIC-007"},
        {"name": "Mezcladora Para Fregadero A La Pared FIDIC F8255", "description": "Mezcladora Para Fregadero a la Pared. Cuello Metálico. Cubierta Metálica. Cuerpo De Bronce. Vuelta Completa. Color Cromo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_194806936-Photoroom.jpg?v=1730252913"], "stock": 5, "sku": "FIDIC-008"},
        {"name": "Mezcladora Para Fregadero FIDIC F8245BN", "description": "Cuello Metálico. Cubierta Metálica. Cuerpo De Bronce. Manerales Metálicos 1/4\" De Vuelta. Mezcladora Para Fregadero 8\". Color Satín.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_162011842.png?v=1730240413"], "stock": 5, "sku": "FIDIC-009"},
        {"name": "Mezcladora Para Fregadero FIDIC F8245", "description": "Cuello Metálico. Cubierta Metálica. Cuerpo De Bronce. Manerales Metálicos 1/4\" De Vuelta. Mezcladora Para Fregadero 8\". Color Cromo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_161838393.png?v=1730240320"], "stock": 5, "sku": "FIDIC-010"},
        {"name": "Mezcladora Para Fregadero FIDIC F8202BN", "description": "Manerales Metálico. Cuello Metálico. Cuerpo De Bronce. Cubierta Metálica. Color Satín. Cuello Largo.", "price": 0, "category_id": "cat_fontaneria", "images": ["https://cdn.shopify.com/s/files/1/0898/6181/6593/files/imagen_2024-10-29_161607540.png?v=1730240169"], "stock": 5, "sku": "FIDIC-011"},
    ]
    
    imported_count = 0
    skipped_count = 0
    
    for prod_data in csv_products:
        # Check if product already exists by SKU
        existing = await db.products.find_one({"sku": prod_data["sku"]})
        if existing:
            skipped_count += 1
            continue
        
        product = {
            "product_id": f"prod_{uuid.uuid4().hex[:8]}",
            "name": prod_data["name"],
            "description": prod_data["description"],
            "price": prod_data["price"],
            "category_id": prod_data["category_id"],
            "images": prod_data["images"],
            "features": [],
            "stock": prod_data["stock"],
            "sku": prod_data["sku"],
            "is_offer": False,
            "is_bestseller": False,
            "is_new": True,
            "rating": 0,
            "review_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.products.insert_one(product)
        imported_count += 1
    
    return {
        "message": f"Importación completada",
        "imported": imported_count,
        "skipped": skipped_count,
        "total_in_csv": len(csv_products)
    }

# ==================== MAIN APP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
