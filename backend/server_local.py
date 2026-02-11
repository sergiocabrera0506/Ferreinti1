from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'ferreinti')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
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
    created_at: datetime

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
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

async def get_shipping_config() -> ShippingConfig:
    config = await db.settings.find_one({"setting_id": "shipping_config"}, {"_id": 0})
    if config:
        return ShippingConfig(**config)
    return ShippingConfig()

async def calculate_shipping_cost(lat: float, lng: float) -> Dict[str, Any]:
    config = await get_shipping_config()
    distance = haversine_distance(config.store_lat, config.store_lng, lat, lng)
    if distance <= config.free_radius_km:
        return {"distance_km": round(distance, 2), "shipping_cost": 0, "is_free": True}
    extra_km = distance - config.free_radius_km
    cost = max(extra_km * config.price_per_km, config.min_shipping_cost)
    return {"distance_km": round(distance, 2), "shipping_cost": round(cost, 2), "is_free": False}

async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            session_token = auth.split(" ")[1]
    if not session_token:
        return None
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
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
        raise HTTPException(status_code=403, detail="Acceso denegado")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
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
    session_token = generate_token()
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=False, samesite="lax", path="/", max_age=7*24*60*60)
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
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=False, samesite="lax", path="/", max_age=7*24*60*60)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture"), "role": user.get("role", "customer"), "session_token": session_token}

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
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
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
    related = await db.products.find({"category_id": product["category_id"], "product_id": {"$ne": product_id}}, {"_id": 0}).limit(limit).to_list(limit)
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
        await db.carts.insert_one({"user_id": user.user_id, "items": [item.model_dump()], "updated_at": datetime.now(timezone.utc).isoformat()})
    else:
        existing_idx = next((i for i, x in enumerate(cart["items"]) if x["product_id"] == item.product_id), None)
        if existing_idx is not None:
            cart["items"][existing_idx]["quantity"] += item.quantity
        else:
            cart["items"].append(item.model_dump())
        await db.carts.update_one({"user_id": user.user_id}, {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}})
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
    await db.carts.update_one({"user_id": user.user_id}, {"$set": {"items": cart["items"], "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Carrito actualizado"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, user: User = Depends(require_auth)):
    await db.carts.update_one({"user_id": user.user_id}, {"$pull": {"items": {"product_id": product_id}}})
    return {"message": "Producto eliminado del carrito"}

@api_router.delete("/cart/clear")
async def clear_cart(user: User = Depends(require_auth)):
    await db.carts.update_one({"user_id": user.user_id}, {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}})
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
        await db.wishlists.insert_one({"user_id": user.user_id, "product_ids": [product_id], "updated_at": datetime.now(timezone.utc).isoformat()})
    else:
        if product_id not in wishlist.get("product_ids", []):
            await db.wishlists.update_one({"user_id": user.user_id}, {"$push": {"product_ids": product_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Producto añadido a favoritos"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, user: User = Depends(require_auth)):
    await db.wishlists.update_one({"user_id": user.user_id}, {"$pull": {"product_ids": product_id}})
    return {"message": "Producto eliminado de favoritos"}

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
    reviews = await db.reviews.find({"product_id": review_data.product_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one({"product_id": review_data.product_id}, {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}})
    return Review(**review_doc)

# ==================== SHIPPING ROUTES ====================

@api_router.get("/shipping/config")
async def get_shipping_config_route():
    config = await get_shipping_config()
    return config

@api_router.post("/shipping/calculate")
async def calculate_shipping(data: ShippingCalculation):
    if data.address.lat is None or data.address.lng is None:
        raise HTTPException(status_code=400, detail="Se requieren coordenadas")
    result = await calculate_shipping_cost(data.address.lat, data.address.lng)
    return result

# ==================== ORDERS ROUTES ====================

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: User = Depends(require_auth)):
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user: User = Depends(require_auth)):
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
    shipping_cost = 0
    if order_data.shipping_address.lat and order_data.shipping_address.lng:
        shipping_result = await calculate_shipping_cost(order_data.shipping_address.lat, order_data.shipping_address.lng)
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    await db.carts.update_one({"user_id": user.user_id}, {"$set": {"items": []}})
    return Order(**order_doc)

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/dashboard")
async def admin_dashboard(user: User = Depends(require_admin)):
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    low_stock = await db.products.count_documents({"stock": {"$lt": 10}})
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    return {
        "total_products": total_products,
        "total_users": total_users,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "low_stock_products": low_stock,
        "revenue": {"total": 0, "today": 0, "week": 0, "month": 0},
        "recent_orders": recent_orders,
        "top_products": []
    }

@api_router.get("/admin/products")
async def admin_get_products(user: User = Depends(require_admin), search: Optional[str] = None, category: Optional[str] = None, limit: int = 50, skip: int = 0):
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"sku": {"$regex": search, "$options": "i"}}]
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

@api_router.get("/admin/categories")
async def admin_get_categories(user: User = Depends(require_admin)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return {"categories": categories}

@api_router.post("/admin/categories")
async def admin_create_category(category_data: CategoryCreate, user: User = Depends(require_admin)):
    category_id = f"cat_{uuid.uuid4().hex[:8]}"
    category_doc = {"category_id": category_id, **category_data.model_dump()}
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
    products_count = await db.products.count_documents({"category_id": category_id})
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar. La categoría tiene {products_count} productos")
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return {"message": "Categoría eliminada"}

@api_router.get("/admin/orders")
async def admin_get_orders(user: User = Depends(require_admin), status: Optional[str] = None, limit: int = 50, skip: int = 0):
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
        raise HTTPException(status_code=400, detail=f"Estado inválido")
    result = await db.orders.update_one({"order_id": order_id}, {"$set": {"status": status_data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": f"Estado actualizado a: {status_data.status}"}

@api_router.get("/admin/users")
async def admin_get_users(user: User = Depends(require_admin), search: Optional[str] = None, limit: int = 50, skip: int = 0):
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    users = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    return {"users": users, "total": total}

@api_router.get("/admin/shipping")
async def admin_get_shipping(user: User = Depends(require_admin)):
    config = await get_shipping_config()
    return config

@api_router.put("/admin/shipping")
async def admin_update_shipping(config_data: ShippingConfigUpdate, user: User = Depends(require_admin)):
    update_data = {k: v for k, v in config_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    await db.settings.update_one({"setting_id": "shipping_config"}, {"$set": {**update_data, "setting_id": "shipping_config"}}, upsert=True)
    return {"message": "Configuración actualizada"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    existing = await db.categories.find_one()
    if existing:
        return {"message": "Datos ya existentes"}
    
    categories = [
        {"category_id": "cat_manual", "name": "Herramientas Manuales", "slug": "herramientas-manuales", "image": "https://images.unsplash.com/photo-1581166418878-11f0dde922c2?w=400", "icon": "Wrench"},
        {"category_id": "cat_electric", "name": "Herramientas Eléctricas", "slug": "herramientas-electricas", "image": "https://images.unsplash.com/photo-1720156066527-41497702fc63?w=400", "icon": "Zap"},
        {"category_id": "cat_conexiones", "name": "Conexiones Eléctricas", "slug": "conexiones-electricas", "image": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", "icon": "Cable"},
        {"category_id": "cat_bano", "name": "Accesorios para Baño", "slug": "accesorios-bano", "image": "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400", "icon": "Droplets"},
        {"category_id": "cat_cocina", "name": "Accesorios para Cocina", "slug": "accesorios-cocina", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", "icon": "ChefHat"},
        {"category_id": "cat_ruedas", "name": "Ruedas para Muebles", "slug": "ruedas-muebles", "image": "https://images.unsplash.com/photo-1634429436458-60b95e2e105a?w=400", "icon": "Circle"},
    ]
    await db.categories.insert_many(categories)
    
    products = [
        {"product_id": "prod_001", "name": "Martillo Profesional Stanley", "description": "Martillo de carpintero con mango antideslizante.", "price": 25.99, "original_price": 32.99, "category_id": "cat_manual", "images": ["https://images.unsplash.com/photo-1586864387789-628af9feed72?w=600"], "features": ["Mango antideslizante", "Acero forjado"], "stock": 50, "sku": "MART-001", "is_offer": True, "is_bestseller": True, "is_new": False, "rating": 4.8, "review_count": 124, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_002", "name": "Set de Destornilladores 12 Piezas", "description": "Kit completo de destornilladores con puntas intercambiables.", "price": 18.50, "category_id": "cat_manual", "images": ["https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=600"], "features": ["12 piezas", "Puntas magnéticas"], "stock": 35, "sku": "DEST-002", "is_offer": False, "is_bestseller": True, "is_new": False, "rating": 4.5, "review_count": 89, "created_at": datetime.now(timezone.utc).isoformat()},
        {"product_id": "prod_003", "name": "Taladro Inalámbrico 20V", "description": "Taladro percutor con batería de litio recargable.", "price": 89.99, "original_price": 119.99, "category_id": "cat_electric", "images": ["https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600"], "features": ["20V Litio", "2 velocidades"], "stock": 25, "sku": "TALA-003", "is_offer": True, "is_bestseller": True, "is_new": False, "rating": 4.9, "review_count": 256, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.products.insert_many(products)
    
    return {"message": "Datos iniciales creados exitosamente"}

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
