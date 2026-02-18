from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import httpx
import math
import re
from collections import defaultdict
import time
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== RATE LIMITING ====================
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_REQUESTS = 5  # Max requests
RATE_LIMIT_WINDOW = 60   # Per 60 seconds

def check_rate_limit(ip: str, endpoint: str) -> bool:
    """Check if IP has exceeded rate limit for endpoint"""
    key = f"{ip}:{endpoint}"
    now = time.time()
    # Clean old entries
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limit_store[key]) >= RATE_LIMIT_REQUESTS:
        return False
    rate_limit_store[key].append(now)
    return True

# ==================== SIMPLE CACHE ====================
cache_store: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 300  # 5 minutes

def get_cached(key: str) -> Optional[Any]:
    """Get value from cache if not expired"""
    if key in cache_store:
        if time.time() < cache_store[key]["expires"]:
            return cache_store[key]["value"]
        del cache_store[key]
    return None

def set_cached(key: str, value: Any, ttl: int = CACHE_TTL):
    """Set value in cache with TTL"""
    cache_store[key] = {"value": value, "expires": time.time() + ttl}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe tener al menos una mayúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('La contraseña debe tener al menos una minúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe tener al menos un número')
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', v):
            raise ValueError('Email inválido')
        return v.lower()

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
    # ============================================================
    # 📏 VARIANTES/TAMAÑOS - Para productos como brocas, tornillos, etc.
    # ============================================================
    # Ejemplo: variants = [
    #   {"size": "3mm", "price": 5.99, "stock": 20},
    #   {"size": "5mm", "price": 7.99, "stock": 15},
    #   {"size": "8mm", "price": 9.99, "stock": 10}
    # ]
    # Si variants está vacío, el producto no tiene variantes
    variants: List[Dict[str, Any]] = []
    has_variants: bool = False

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
    variants: List[Dict[str, Any]] = []
    has_variants: bool = False

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
    variants: Optional[List[Dict[str, Any]]] = None
    has_variants: Optional[bool] = None

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
    selected_variant: Optional[str] = None  # Tamaño/variante seleccionada (ej: "5mm")

class CartItemResponse(BaseModel):
    product_id: str
    quantity: int
    selected_variant: Optional[str] = None
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
    """Hash password using bcrypt (secure)"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        # Fallback for old SHA256 hashes during migration
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest() == hashed

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
async def register(user_data: UserCreate, request: Request, response: Response):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, "register"):
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta en 1 minuto.")
    
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
    logger.info(f"New user registered: {user_data.email} (role: {role})")
    
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
async def login(credentials: UserLogin, request: Request, response: Response):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip, "login"):
        raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta en 1 minuto.")
    
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password", "")):
        logger.warning(f"Failed login attempt for: {credentials.email}")
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
    # Use cache for categories (frequently accessed)
    cached = get_cached("all_categories")
    if cached:
        return cached
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    set_cached("all_categories", categories, ttl=600)  # Cache 10 min
    return categories

@api_router.get("/categories/{slug}")
async def get_category(slug: str):
    cached = get_cached(f"category_{slug}")
    if cached:
        return cached
    category = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    set_cached(f"category_{slug}", category, ttl=600)
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
            # Si tiene variante seleccionada, obtener el precio de esa variante
            item_price = product["price"]
            if item.get("selected_variant") and product.get("variants"):
                variant = next((v for v in product["variants"] if v["size"] == item["selected_variant"]), None)
                if variant:
                    item_price = variant.get("price", product["price"])
            
            items_with_products.append({**item, "product": product})
            total += item_price * item["quantity"]
    
    return {"items": items_with_products, "total": round(total, 2)}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: User = Depends(require_auth)):
    # Verificar que el producto existe
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Si el producto tiene variantes, verificar que se seleccionó una
    if product.get("has_variants") and product.get("variants") and not item.selected_variant:
        raise HTTPException(status_code=400, detail="Debes seleccionar un tamaño/medida")
    
    cart = await db.carts.find_one({"user_id": user.user_id})
    
    if not cart:
        await db.carts.insert_one({
            "user_id": user.user_id,
            "items": [item.model_dump()],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Check if item with same variant exists
        existing_idx = next(
            (i for i, x in enumerate(cart["items"]) 
             if x["product_id"] == item.product_id and x.get("selected_variant") == item.selected_variant), 
            None
        )
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
    # Validate stock availability BEFORE creating order
    items_with_details = []
    subtotal = 0
    stock_errors = []
    
    for item in order_data.items:
        product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
        if not product:
            stock_errors.append(f"Producto {item.product_id} no encontrado")
            continue
        if product.get("stock", 0) < item.quantity:
            stock_errors.append(f"{product['name']}: solo {product.get('stock', 0)} disponibles")
            continue
        items_with_details.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "name": product["name"],
            "price": product["price"],
            "image": product["images"][0] if product["images"] else ""
        })
        subtotal += product["price"] * item.quantity
    
    if stock_errors:
        raise HTTPException(status_code=400, detail=f"Stock insuficiente: {', '.join(stock_errors)}")
    
    if not items_with_details:
        raise HTTPException(status_code=400, detail="No hay productos válidos en la orden")
    
    # Calculate shipping
    shipping_cost = 0
    if order_data.shipping_address.lat and order_data.shipping_address.lng:
        shipping_result = await calculate_shipping_cost(
            order_data.shipping_address.lat, 
            order_data.shipping_address.lng
        )
        shipping_cost = shipping_result["shipping_cost"]
    
    total = subtotal + shipping_cost
    
    # Reduce stock for each product
    for item in order_data.items:
        await db.products.update_one(
            {"product_id": item.product_id},
            {"$inc": {"stock": -item.quantity}}
        )
    
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

from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

@api_router.post("/payments/checkout")
async def create_checkout(checkout_data: CheckoutRequest, request: Request, user: User = Depends(require_auth)):
    # Get cart
    cart = await db.carts.find_one({"user_id": user.user_id}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    
    # Calculate subtotal
    subtotal = 0.0
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            subtotal += product["price"] * item["quantity"]
    
    # Calculate shipping
    shipping_cost = 0.0
    if checkout_data.shipping_address.lat and checkout_data.shipping_address.lng:
        shipping_result = await calculate_shipping_cost(
            checkout_data.shipping_address.lat,
            checkout_data.shipping_address.lng
        )
        shipping_cost = shipping_result["shipping_cost"]
    
    total = subtotal + shipping_cost
    
    if total <= 0:
        raise HTTPException(status_code=400, detail="El total debe ser mayor a 0")
    
    # Create Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    origin = checkout_data.origin_url.rstrip('/')
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=round(total, 2),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user.user_id, 
            "user_email": user.email,
            "subtotal": str(subtotal),
            "shipping_cost": str(shipping_cost)
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_doc = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
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
    
    return {"url": session.url, "session_id": session.session_id, "total": total, "shipping_cost": shipping_cost}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status.status, "payment_status": status.payment_status}}
    )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {"$set": {"status": webhook_response.event_type, "payment_status": webhook_response.payment_status}}
        )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

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

# ==================== IMPORT FROM CSV (SHOPIFY FORMAT) ====================

import csv
from io import StringIO
from fastapi import UploadFile, File

def clean_html(html_text: str) -> str:
    """Convert HTML to plain text"""
    if not html_text:
        return ""
    # Remove HTML tags
    import re
    text = re.sub(r'<li>', '• ', html_text)
    text = re.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    return text.strip()

def extract_category_from_shopify(category_str: str) -> str:
    """Extract main category from Shopify category path"""
    if not category_str:
        return "general"
    # Take last part of category path
    parts = category_str.split('>')
    if len(parts) >= 2:
        return parts[1].strip().lower().replace(' ', '-')[:30]
    return parts[0].strip().lower().replace(' ', '-')[:30]

def slugify(text: str) -> str:
    """Convert text to slug"""
    import re
    text = text.lower().strip()
    text = re.sub(r'[áàäâ]', 'a', text)
    text = re.sub(r'[éèëê]', 'e', text)
    text = re.sub(r'[íìïî]', 'i', text)
    text = re.sub(r'[óòöô]', 'o', text)
    text = re.sub(r'[úùüû]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    return text[:50]

@api_router.post("/admin/import/csv")
async def import_products_csv(file: UploadFile = File(...), user: User = Depends(require_admin)):
    """Import products from Shopify CSV format"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos CSV")
    
    content = await file.read()
    try:
        # Try UTF-8 first, then latin-1
        try:
            text = content.decode('utf-8')
        except:
            text = content.decode('latin-1')
        
        reader = csv.DictReader(StringIO(text))
        
        imported = 0
        skipped = 0
        errors = []
        categories_created = set()
        
        for row in reader:
            try:
                title = row.get('Title', '').strip()
                if not title or title == 'Default Title':
                    skipped += 1
                    continue
                
                # Check if product already exists (by handle/slug)
                handle = row.get('Handle', slugify(title))
                existing = await db.products.find_one({"sku": handle})
                if existing:
                    skipped += 1
                    continue
                
                # Extract price (allow 0 price for later editing)
                price_str = row.get('Variant Price', '0').strip()
                price = float(price_str) if price_str else 0
                price = max(0, price)  # Allow 0 price
                
                # Original price (compare at)
                original_price_str = row.get('Variant Compare At Price', '').strip()
                original_price = float(original_price_str) if original_price_str else None
                
                # Stock
                stock_str = row.get('Variant Inventory Qty', '0').strip()
                stock = int(float(stock_str)) if stock_str else 0
                
                # Category
                category_raw = row.get('Product Category', 'General')
                category_slug = extract_category_from_shopify(category_raw)
                
                # Create category if not exists
                if category_slug not in categories_created:
                    existing_cat = await db.categories.find_one({"slug": category_slug})
                    if not existing_cat:
                        cat_name = category_slug.replace('-', ' ').title()
                        await db.categories.insert_one({
                            "category_id": f"cat_{uuid.uuid4().hex[:8]}",
                            "name": cat_name,
                            "slug": category_slug,
                            "image": "https://images.unsplash.com/photo-1581166418878-11f0dde922c2?w=400",
                            "icon": "Wrench"
                        })
                        categories_created.add(category_slug)
                        logger.info(f"Created category: {cat_name}")
                    else:
                        categories_created.add(category_slug)
                
                # Get category_id
                cat_doc = await db.categories.find_one({"slug": category_slug})
                category_id = cat_doc["category_id"] if cat_doc else "cat_general"
                
                # Image
                image_url = row.get('Image Src', '').strip()
                images = [image_url] if image_url else []
                
                # Description
                description = clean_html(row.get('Body (HTML)', ''))
                if not description:
                    description = title
                
                # Create product
                product_doc = {
                    "product_id": f"prod_{uuid.uuid4().hex[:8]}",
                    "name": title,
                    "description": description[:1000],
                    "price": round(price, 2),
                    "original_price": round(original_price, 2) if original_price and original_price > price else None,
                    "category_id": category_id,
                    "images": images,
                    "features": [],
                    "stock": max(0, stock),
                    "sku": handle,
                    "is_offer": bool(original_price and original_price > price),
                    "is_bestseller": False,
                    "is_new": True,
                    "rating": 0,
                    "review_count": 0,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.products.insert_one(product_doc)
                imported += 1
                
            except Exception as e:
                errors.append(f"{row.get('Title', 'Unknown')}: {str(e)}")
                continue
        
        # Clear cache after import
        cache_store.clear()
        
        logger.info(f"CSV Import completed: {imported} imported, {skipped} skipped")
        
        return {
            "message": f"Importación completada",
            "imported": imported,
            "skipped": skipped,
            "categories_created": len(categories_created),
            "errors": errors[:10] if errors else []
        }
        
    except Exception as e:
        logger.error(f"CSV Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")

@api_router.post("/admin/import/url")
async def import_products_from_url(url: str, user: User = Depends(require_admin)):
    """Import products from CSV URL"""
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(url, timeout=60)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="No se pudo descargar el archivo")
        
        # Create a fake UploadFile
        class FakeUploadFile:
            filename = "products.csv"
            async def read(self):
                return resp.content
        
        return await import_products_csv(FakeUploadFile(), user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==================== MAIN APP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    """Create indexes and clean expired sessions on startup"""
    logger.info("Creating MongoDB indexes...")
    try:
        # User indexes
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        # Product indexes
        await db.products.create_index("product_id", unique=True)
        await db.products.create_index("category_id")
        await db.products.create_index([("name", "text"), ("description", "text")])
        await db.products.create_index("is_offer")
        await db.products.create_index("is_bestseller")
        await db.products.create_index("is_new")
        # Session indexes
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at")
        # Order indexes
        await db.orders.create_index("order_id", unique=True)
        await db.orders.create_index("user_id")
        await db.orders.create_index("created_at")
        # Category indexes
        await db.categories.create_index("category_id", unique=True)
        await db.categories.create_index("slug", unique=True)
        logger.info("MongoDB indexes created successfully")
        
        # Clean expired sessions
        expired_count = await db.user_sessions.delete_many({
            "expires_at": {"$lt": datetime.now(timezone.utc).isoformat()}
        })
        if expired_count.deleted_count > 0:
            logger.info(f"Cleaned {expired_count.deleted_count} expired sessions")
    except Exception as e:
        logger.warning(f"Index creation warning (may already exist): {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
