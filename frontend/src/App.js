import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useSearchParams, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import "@/App.css";
import {
  Search, ShoppingCart, Heart, User, Menu, X, Star, ChevronRight, Minus, Plus, Trash2,
  Loader2, ArrowLeft, Tag, Truck, Shield, Phone, Mail, MapPin, Clock, ChevronDown,
  Wrench, Zap, Cable, Droplets, ChefHat, Circle, Eye, EyeOff, Package, LogOut,
  Hammer, Lightbulb, Settings as SettingsIcon
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Separator } from './components/ui/separator';
import { Textarea } from './components/ui/textarea';
import { Label } from './components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { AdminLayout, AdminDashboard, AdminProducts, AdminCategories, AdminOrders, AdminUsers, AdminShipping } from './pages/admin';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const iconMap = { Wrench, Zap, Cable, Droplets, ChefHat, Circle, Hammer, Lightbulb, Settings: SettingsIcon };

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const response = await axios.post(`${API}/auth/register`, { name, email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  }, []);

  const googleLogin = useCallback(async (sessionId) => {
    const response = await axios.post(`${API}/auth/google-session`, {}, { headers: { 'X-Session-ID': sessionId }, withCredentials: true });
    setUser(response.data);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, googleLogin, logout, checkAuth }), [user, loading, login, register, googleLogin, logout, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

// ==================== HEADER ====================
const Header = ({ cartCount, wishlistCount }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) { navigate(`/buscar?q=${encodeURIComponent(searchQuery)}`); setSearchQuery(''); }
  };

  const handleLogout = async () => { await logout(); setUserMenuOpen(false); navigate('/'); toast.success('Sesion cerrada'); };

  return (
    <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" data-testid="logo-link">
            <img src="/logo-ferre.png" alt="Ferre Inti" className="h-10 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <h1 className="text-lg font-bold leading-tight">FERRE INTI</h1>
              <p className="text-[10px] text-secondary-foreground/60 leading-tight">Ferreteria de Confianza</p>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar productos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-sm" data-testid="search-input" />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Link to="/favoritos" className="relative p-2 hover:bg-white/10 rounded-sm transition-colors" data-testid="wishlist-btn">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center font-bold">{wishlistCount}</span>}
            </Link>
            <Link to="/carrito" className="relative p-2 hover:bg-white/10 rounded-sm transition-colors" data-testid="cart-btn">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-[10px] rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </Link>

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-sm transition-colors" data-testid="user-menu-btn">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{user.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm max-w-[100px] truncate">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white text-foreground rounded-sm shadow-lg border py-1 z-50" data-testid="user-dropdown">
                    <div className="px-3 py-2 border-b"><p className="font-medium text-sm truncate">{user.name}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>
                    <Link to="/perfil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"><User className="w-4 h-4" /> Mi Perfil</Link>
                    <Link to="/pedidos" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"><Package className="w-4 h-4" /> Mis Pedidos</Link>
                    {user.role === 'admin' && <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-primary font-medium"><SettingsIcon className="w-4 h-4" /> Panel Admin</Link>}
                    <Separator />
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors w-full text-red-600"><LogOut className="w-4 h-4" /> Cerrar Sesion</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" data-testid="login-btn"><Button variant="default" size="sm" className="rounded-sm bg-primary text-primary-foreground"><User className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Ingresar</span></Button></Link>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 hover:bg-white/10 rounded-sm"><Menu className="w-5 h-5" /></button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-white/10 pt-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-sm" /></div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

// ==================== FOOTER ====================
const Footer = () => (
  <footer className="bg-secondary text-secondary-foreground mt-auto" data-testid="main-footer">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-3">FERRE INTI</h3>
          <p className="text-secondary-foreground/70 text-sm">Tu ferreteria de confianza. Herramientas, materiales y mas para tus proyectos.</p>
        </div>
        <div>
          <h4 className="font-bold mb-3">Contacto</h4>
          <div className="space-y-2 text-sm text-secondary-foreground/70">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> +51 999 888 777</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@ferreinti.com</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Lima, Peru</div>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-3">Horario</h4>
          <div className="space-y-2 text-sm text-secondary-foreground/70">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Lun - Sab: 8am - 7pm</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Dom: 9am - 2pm</div>
          </div>
        </div>
      </div>
      <Separator className="my-6 bg-white/10" />
      <p className="text-center text-sm text-secondary-foreground/50">2024 Ferre Inti. Todos los derechos reservados.</p>
    </div>
  </footer>
);

// ==================== HOME PAGE ====================
const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [offerProducts, setOfferProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featRes, offerRes, newRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?is_bestseller=true&limit=8`),
          axios.get(`${API}/products?is_offer=true&limit=4`),
          axios.get(`${API}/products?is_new=true&limit=4`),
        ]);
        setCategories(catRes.data);
        setFeaturedProducts(featRes.data);
        setOfferProducts(offerRes.data);
        setNewProducts(newRes.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fadeIn" data-testid="home-page">
      {/* Hero */}
      <section className="bg-gradient-to-br from-secondary to-secondary/90 text-white py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <Badge className="bg-primary text-primary-foreground mb-4">Ferreteria de Confianza</Badge>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">Todo lo que necesitas para tus proyectos</h1>
            <p className="text-lg text-white/70 mb-6">Herramientas profesionales, materiales de calidad y los mejores precios. Envio a todo Lima.</p>
            <div className="flex gap-3">
              <Link to="/buscar?q="><Button className="bg-primary text-primary-foreground rounded-sm px-6" data-testid="hero-cta">Ver Productos</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Categorias</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(cat => {
            const IconComp = iconMap[cat.icon] || Wrench;
            return (
              <Link key={cat.category_id} to={`/categoria/${cat.slug}`} className="group" data-testid={`category-${cat.slug}`}>
                <Card className="rounded-sm overflow-hidden hover:shadow-md transition-shadow h-full">
                  <div className="aspect-video relative">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white font-medium text-sm">{cat.name}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Productos Destacados</h2>
            <Link to="/buscar?q=" className="text-primary text-sm font-medium flex items-center gap-1">Ver todo <ChevronRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map(product => <ProductCard key={product.product_id} product={product} />)}
          </div>
        </section>
      )}

      {/* Offers */}
      {offerProducts.length > 0 && (
        <section className="bg-muted py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6 text-primary" /> Ofertas</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {offerProducts.map(product => <ProductCard key={product.product_id} product={product} />)}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-sm"><Truck className="w-8 h-8 text-primary flex-shrink-0" /><div><h4 className="font-bold">Envio Rapido</h4><p className="text-sm text-muted-foreground">Envio gratis en zona cercana</p></div></div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-sm"><Shield className="w-8 h-8 text-primary flex-shrink-0" /><div><h4 className="font-bold">Compra Segura</h4><p className="text-sm text-muted-foreground">Pago protegido con Stripe</p></div></div>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-sm"><Phone className="w-8 h-8 text-primary flex-shrink-0" /><div><h4 className="font-bold">Soporte</h4><p className="text-sm text-muted-foreground">Atencion personalizada</p></div></div>
        </div>
      </section>
    </div>
  );
};

// ==================== PRODUCT CARD ====================
const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  const addToCart = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { navigate('/auth'); return; }
    try { await axios.post(`${API}/cart/add`, { product_id: product.product_id, quantity: 1 }, { withCredentials: true }); toast.success('Agregado al carrito'); }
    catch { toast.error('Error al agregar'); }
  };

  return (
    <Link to={`/producto/${product.product_id}`} className="product-card-hover" data-testid={`product-card-${product.product_id}`}>
      <Card className="rounded-sm overflow-hidden h-full">
        <div className="aspect-square relative bg-muted">
          <img src={product.images?.[0] || 'https://via.placeholder.com/300'} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          {product.is_offer && discount > 0 && <Badge className="absolute top-2 left-2 bg-red-500 text-white">-{discount}%</Badge>}
          {product.is_new && <Badge className="absolute top-2 right-2 bg-green-500 text-white">Nuevo</Badge>}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 min-h-[40px]">{product.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            {product.rating > 0 && <><Star className="w-3 h-3 fill-primary text-primary" /><span className="text-xs text-muted-foreground">{product.rating} ({product.review_count})</span></>}
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="font-bold text-lg text-primary">${product.price?.toFixed(2)}</p>
              {product.original_price && <p className="text-xs text-muted-foreground line-through">${product.original_price?.toFixed(2)}</p>}
            </div>
            <Button size="sm" className="rounded-sm bg-primary text-primary-foreground h-8 px-3" onClick={addToCart} data-testid={`add-to-cart-${product.product_id}`}>
              <ShoppingCart className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// ==================== CATEGORY PAGE ====================
const CategoryPage = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const catRes = await axios.get(`${API}/categories/${slug}`);
        setCategory(catRes.data);
        const prodRes = await axios.get(`${API}/products?category=${catRes.data.category_id}`);
        setProducts(prodRes.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [slug]);

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!category) return <div className="text-center py-20"><h2 className="text-xl">Categoria no encontrada</h2></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" data-testid="category-page">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><Link to="/">Inicio</Link><ChevronRight className="w-3 h-3" /><span className="text-foreground">{category.name}</span></div>
      <h1 className="text-3xl font-bold mb-8">{category.name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(product => <ProductCard key={product.product_id} product={product} />)}
      </div>
      {products.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>No hay productos en esta categoria</p></div>}
    </div>
  );
};

// ==================== PRODUCT DETAIL PAGE ====================
const ProductPage = () => {
  const { productId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, relRes, revRes] = await Promise.all([
          axios.get(`${API}/products/${productId}`),
          axios.get(`${API}/products/related/${productId}`),
          axios.get(`${API}/reviews/${productId}`),
        ]);
        setProduct(prodRes.data); setRelated(relRes.data); setReviews(revRes.data); setSelectedImage(0); setQuantity(1);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [productId]);

  const addToCart = async () => {
    if (!user) { navigate('/auth'); return; }
    try { await axios.post(`${API}/cart/add`, { product_id: productId, quantity }, { withCredentials: true }); toast.success(`${quantity} producto(s) agregado(s) al carrito`); }
    catch { toast.error('Error al agregar'); }
  };

  const addToWishlist = async () => {
    if (!user) { navigate('/auth'); return; }
    try { await axios.post(`${API}/wishlist/add/${productId}`, {}, { withCredentials: true }); toast.success('Agregado a favoritos'); }
    catch { toast.error('Error al agregar'); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    try {
      await axios.post(`${API}/reviews`, { product_id: productId, ...reviewForm }, { withCredentials: true });
      toast.success('Resena publicada');
      const revRes = await axios.get(`${API}/reviews/${productId}`);
      setReviews(revRes.data); setReviewForm({ rating: 5, comment: '' });
    } catch { toast.error('Error al publicar'); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!product) return <div className="text-center py-20"><h2 className="text-xl">Producto no encontrado</h2></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" data-testid="product-page">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Volver</button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-sm overflow-hidden bg-muted mb-4">
            <img src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {product.images.map((img, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)} className={`w-16 h-16 rounded-sm overflow-hidden flex-shrink-0 border-2 ${selectedImage === idx ? 'border-primary' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center gap-3 mb-4">
            {product.rating > 0 && <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-primary text-primary" /><span className="font-medium">{product.rating}</span><span className="text-sm text-muted-foreground">({product.review_count} resenas)</span></div>}
            {product.sku && <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>}
          </div>

          <div className="mb-6">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-primary">${product.price?.toFixed(2)}</span>
              {product.original_price && <span className="text-xl text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>}
            </div>
          </div>

          <p className="text-muted-foreground mb-6">{product.description}</p>

          {product.features?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">Caracteristicas</h3>
              <ul className="space-y-1">{product.features.map((f, i) => <li key={i} className="text-sm text-muted-foreground flex items-center gap-2"><ChevronRight className="w-3 h-3 text-primary" />{f}</li>)}</ul>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border rounded-sm">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-muted"><Minus className="w-4 h-4" /></button>
              <span className="px-4 font-medium" data-testid="quantity-display">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-muted"><Plus className="w-4 h-4" /></button>
            </div>
            <Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>{product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}</Badge>
          </div>

          <div className="flex gap-3">
            <Button onClick={addToCart} disabled={product.stock <= 0} className="flex-1 rounded-sm bg-primary text-primary-foreground" data-testid="add-to-cart-detail"><ShoppingCart className="w-4 h-4 mr-2" /> Agregar al Carrito</Button>
            <Button variant="outline" onClick={addToWishlist} className="rounded-sm" data-testid="add-to-wishlist"><Heart className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-6">Resenas ({reviews.length})</h2>
        {user && (
          <form onSubmit={submitReview} className="mb-8 p-4 bg-muted rounded-sm">
            <h3 className="font-bold mb-3">Escribe una resena</h3>
            <div className="flex gap-1 mb-3">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setReviewForm(p => ({...p, rating: n}))}><Star className={`w-5 h-5 ${n <= reviewForm.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} /></button>)}</div>
            <Textarea placeholder="Tu comentario..." value={reviewForm.comment} onChange={(e) => setReviewForm(p => ({...p, comment: e.target.value}))} className="mb-3" />
            <Button type="submit" className="rounded-sm bg-primary" data-testid="submit-review">Publicar Resena</Button>
          </form>
        )}
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.review_id} className="rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><span className="font-medium">{review.user_name}</span><div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />)}</div></div>
                  <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('es-ES')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-6">Productos Relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{related.slice(0, 4).map(p => <ProductCard key={p.product_id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
};

// ==================== SEARCH PAGE ====================
const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try { const res = await axios.get(`${API}/products?search=${encodeURIComponent(query)}&limit=50`); setProducts(res.data); }
      catch { console.error('Search error'); } finally { setLoading(false); }
    };
    search();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" data-testid="search-page">
      <h1 className="text-2xl font-bold mb-2">{query ? `Resultados para "${query}"` : 'Todos los Productos'}</h1>
      <p className="text-muted-foreground mb-6">{products.length} productos encontrados</p>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{products.map(p => <ProductCard key={p.product_id} product={p} />)}</div>
      )}
    </div>
  );
};

// ==================== CART PAGE ====================
const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!user) { setLoading(false); return; }
    try { const res = await axios.get(`${API}/cart`, { withCredentials: true }); setCart(res.data); }
    catch { console.error('Cart error'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, [user]);

  const updateQuantity = async (productId, quantity) => {
    try { await axios.put(`${API}/cart/update`, { product_id: productId, quantity }, { withCredentials: true }); fetchCart(); }
    catch { toast.error('Error al actualizar'); }
  };

  const removeItem = async (productId) => {
    try { await axios.delete(`${API}/cart/remove/${productId}`, { withCredentials: true }); toast.success('Producto eliminado'); fetchCart(); }
    catch { toast.error('Error al eliminar'); }
  };

  if (!user) return <div className="text-center py-20"><h2 className="text-xl mb-4">Inicia sesion para ver tu carrito</h2><Link to="/auth"><Button className="rounded-sm bg-primary">Iniciar Sesion</Button></Link></div>;
  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn" data-testid="cart-page">
      <h1 className="text-2xl font-bold mb-6">Mi Carrito</h1>
      {cart.items.length === 0 ? (
        <div className="text-center py-12"><ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground mb-4">Tu carrito esta vacio</p><Link to="/"><Button className="rounded-sm bg-primary">Seguir Comprando</Button></Link></div>
      ) : (
        <div className="space-y-4">
          {cart.items.map(item => (
            <Card key={item.product_id} className="rounded-sm">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <img src={item.product?.images?.[0] || 'https://via.placeholder.com/80'} alt={item.product?.name} className="w-20 h-20 object-cover rounded-sm" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/producto/${item.product_id}`} className="font-medium hover:text-primary line-clamp-1">{item.product?.name}</Link>
                    <p className="text-primary font-bold mt-1">${item.product?.price?.toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border rounded-sm">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-1 hover:bg-muted"><Minus className="w-3 h-3" /></button>
                        <span className="px-3 text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-1 hover:bg-muted"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeItem(item.product_id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="font-bold">${(item.product?.price * item.quantity).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center"><span className="text-lg font-bold">Total</span><span className="text-2xl font-bold text-primary">${cart.total?.toFixed(2)}</span></div>
              <Button onClick={() => navigate('/checkout')} className="w-full mt-4 rounded-sm bg-primary text-primary-foreground" data-testid="checkout-btn">Proceder al Pago</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ==================== WISHLIST PAGE ====================
const WishlistPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchWishlist = async () => {
      try { const res = await axios.get(`${API}/wishlist`, { withCredentials: true }); setProducts(res.data.products); }
      catch { console.error('Wishlist error'); } finally { setLoading(false); }
    };
    fetchWishlist();
  }, [user]);

  const removeFromWishlist = async (productId) => {
    try { await axios.delete(`${API}/wishlist/remove/${productId}`, { withCredentials: true }); setProducts(prev => prev.filter(p => p.product_id !== productId)); toast.success('Eliminado de favoritos'); }
    catch { toast.error('Error'); }
  };

  if (!user) return <div className="text-center py-20"><h2 className="text-xl mb-4">Inicia sesion para ver tus favoritos</h2><Link to="/auth"><Button className="rounded-sm bg-primary">Iniciar Sesion</Button></Link></div>;
  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn" data-testid="wishlist-page">
      <h1 className="text-2xl font-bold mb-6">Mis Favoritos</h1>
      {products.length === 0 ? (
        <div className="text-center py-12"><Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground mb-4">No tienes productos favoritos</p><Link to="/"><Button className="rounded-sm bg-primary">Explorar Productos</Button></Link></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{products.map(p => <ProductCard key={p.product_id} product={p} />)}</div>
      )}
    </div>
  );
};

// ==================== AUTH PAGE ====================
const AuthPage = () => {
  const { user, login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (isLogin) { await login(formData.email, formData.password); toast.success('Bienvenido de vuelta!'); }
      else { await register(formData.name, formData.email, formData.password); toast.success('Cuenta creada exitosamente!'); }
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.detail || 'Error de autenticacion'); } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    const popup = window.open(`https://demobackend.emergentagent.com/auth/v1/env/oauth/authorize?redirect_uri=${window.location.origin}/auth/callback`, 'google_login', 'width=500,height=600');
    const checkPopup = setInterval(async () => {
      try {
        if (popup.location.href.includes('/auth/callback')) {
          const urlParams = new URLSearchParams(popup.location.search);
          const sessionId = urlParams.get('session_id');
          popup.close(); clearInterval(checkPopup);
          if (sessionId) { await googleLogin(sessionId); toast.success('Bienvenido!'); navigate('/'); }
        }
      } catch {}
      if (popup.closed) clearInterval(checkPopup);
    }, 500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8" data-testid="auth-page">
      <Card className="w-full max-w-md rounded-sm">
        <CardContent className="p-6">
          <div className="text-center mb-6"><div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center mx-auto mb-3"><Wrench className="w-6 h-6 text-primary-foreground" /></div><h2 className="text-xl font-bold">{isLogin ? 'Iniciar Sesion' : 'Crear Cuenta'}</h2><p className="text-sm text-muted-foreground">Ferre Inti - Tu ferreteria de confianza</p></div>

          <Button variant="outline" className="w-full rounded-sm mb-4" onClick={handleGoogleLogin} data-testid="google-login-btn">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 mb-4"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">O</span><Separator className="flex-1" /></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && <div><Label>Nombre</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="rounded-sm mt-1" required data-testid="register-name" /></div>}
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} className="rounded-sm mt-1" required data-testid="auth-email" /></div>
            <div className="relative"><Label>Contrasena</Label><Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData(p => ({...p, password: e.target.value}))} className="rounded-sm mt-1 pr-10" required data-testid="auth-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-muted-foreground">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            <Button type="submit" disabled={loading} className="w-full rounded-sm bg-primary" data-testid="auth-submit">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{isLogin ? 'Iniciar Sesion' : 'Crear Cuenta'}</Button>
          </form>

          <p className="text-center text-sm mt-4 text-muted-foreground">
            {isLogin ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium" data-testid="toggle-auth">{isLogin ? 'Registrate' : 'Inicia Sesion'}</button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== CHECKOUT PAGE ====================
const CheckoutPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip_code: '', lat: null, lng: null });
  const [shippingCost, setShippingCost] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    const fetchCart = async () => {
      try { const res = await axios.get(`${API}/cart`, { withCredentials: true }); setCart(res.data); if (res.data.items.length === 0) navigate('/carrito'); }
      catch { navigate('/carrito'); } finally { setLoading(false); }
    };
    fetchCart();
  }, [user, navigate]);

  const calculateShipping = async () => {
    if (!address.lat || !address.lng) { toast.error('Se requieren coordenadas para calcular envio'); return; }
    try { const res = await axios.post(`${API}/shipping/calculate`, { address }); setShippingCost(res.data); }
    catch { toast.error('Error al calcular envio'); }
  };

  const handleCheckout = async () => {
    if (!address.street || !address.city || !address.state || !address.zip_code) { toast.error('Completa la direccion de envio'); return; }
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/payments/checkout`, { origin_url: window.location.origin, shipping_address: address }, { withCredentials: true });
      if (res.data.url) window.location.href = res.data.url;
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al procesar pago'); } finally { setProcessing(false); }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const total = cart.total + (shippingCost?.shipping_cost || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn" data-testid="checkout-page">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Card className="rounded-sm"><CardHeader><CardTitle>Direccion de Envio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Calle / Direccion</Label><Input value={address.street} onChange={(e) => setAddress(p => ({...p, street: e.target.value}))} className="rounded-sm mt-1" data-testid="address-street" /></div>
              <div className="grid grid-cols-2 gap-4"><div><Label>Ciudad</Label><Input value={address.city} onChange={(e) => setAddress(p => ({...p, city: e.target.value}))} className="rounded-sm mt-1" /></div><div><Label>Departamento</Label><Input value={address.state} onChange={(e) => setAddress(p => ({...p, state: e.target.value}))} className="rounded-sm mt-1" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><Label>Codigo Postal</Label><Input value={address.zip_code} onChange={(e) => setAddress(p => ({...p, zip_code: e.target.value}))} className="rounded-sm mt-1" /></div></div>
              <Separator />
              <div className="grid grid-cols-2 gap-4"><div><Label>Latitud</Label><Input type="number" step="0.0000001" value={address.lat || ''} onChange={(e) => setAddress(p => ({...p, lat: parseFloat(e.target.value) || null}))} className="rounded-sm mt-1" placeholder="-12.123" /></div><div><Label>Longitud</Label><Input type="number" step="0.0000001" value={address.lng || ''} onChange={(e) => setAddress(p => ({...p, lng: parseFloat(e.target.value) || null}))} className="rounded-sm mt-1" placeholder="-77.123" /></div></div>
              <Button variant="outline" onClick={calculateShipping} className="rounded-sm" data-testid="calc-shipping">Calcular Envio</Button>
              {shippingCost && <div className={`p-3 rounded-sm ${shippingCost.is_free ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}><p className="font-medium">{shippingCost.message}</p></div>}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-sm"><CardHeader><CardTitle>Resumen del Pedido</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">{cart.items.map(item => (<div key={item.product_id} className="flex justify-between text-sm"><span className="truncate max-w-[60%]">{item.product?.name} x{item.quantity}</span><span className="font-medium">${(item.product?.price * item.quantity).toFixed(2)}</span></div>))}</div>
              <Separator className="my-4" />
              <div className="space-y-2"><div className="flex justify-between"><span>Subtotal</span><span>${cart.total?.toFixed(2)}</span></div><div className="flex justify-between"><span>Envio</span><span>{shippingCost ? (shippingCost.is_free ? 'Gratis' : `$${shippingCost.shipping_cost?.toFixed(2)}`) : 'Por calcular'}</span></div><Separator /><div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div></div>
              <Button onClick={handleCheckout} disabled={processing} className="w-full mt-6 rounded-sm bg-primary text-primary-foreground" data-testid="pay-btn">{processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Pagar ${total.toFixed(2)}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ==================== CHECKOUT SUCCESS ====================
const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    const checkPayment = async () => {
      try {
        const res = await axios.get(`${API}/payments/status/${sessionId}`, { withCredentials: true });
        if (res.data.payment_status === 'paid' || res.data.status === 'complete') { setStatus('success'); }
        else { setStatus('pending'); }
      } catch { setStatus('error'); }
    };
    checkPayment();
  }, [sessionId]);

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fadeIn" data-testid="checkout-success">
      {status === 'loading' && <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />}
      {status === 'success' && (<><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Package className="w-8 h-8 text-green-600" /></div><h1 className="text-2xl font-bold mb-2">Pago Exitoso!</h1><p className="text-muted-foreground mb-6">Tu pedido ha sido procesado correctamente.</p><Link to="/pedidos"><Button className="rounded-sm bg-primary">Ver Mis Pedidos</Button></Link></>)}
      {status === 'pending' && (<><h1 className="text-2xl font-bold mb-2">Pago Pendiente</h1><p className="text-muted-foreground mb-6">Tu pago esta siendo procesado.</p></>)}
      {status === 'error' && (<><h1 className="text-2xl font-bold mb-2">Error</h1><p className="text-muted-foreground mb-6">Hubo un problema con tu pago.</p><Link to="/carrito"><Button className="rounded-sm bg-primary">Volver al Carrito</Button></Link></>)}
    </div>
  );
};

// ==================== ORDERS PAGE ====================
const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      try { const res = await axios.get(`${API}/orders`, { withCredentials: true }); setOrders(res.data); }
      catch { console.error('Orders error'); } finally { setLoading(false); }
    };
    fetchOrders();
  }, [user]);

  const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };
  const statusColors = { pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', shipped: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };

  if (!user) return <div className="text-center py-20"><h2 className="text-xl mb-4">Inicia sesion para ver tus pedidos</h2><Link to="/auth"><Button className="rounded-sm bg-primary">Iniciar Sesion</Button></Link></div>;
  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn" data-testid="orders-page">
      <h1 className="text-2xl font-bold mb-6">Mis Pedidos</h1>
      {orders.length === 0 ? (
        <div className="text-center py-12"><Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground mb-4">No tienes pedidos</p><Link to="/"><Button className="rounded-sm bg-primary">Empezar a Comprar</Button></Link></div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.order_id} className="rounded-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3"><Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge><span className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString('es-ES')}</span></div>
                <div className="flex gap-2 overflow-x-auto mb-3">{order.items.map((item, idx) => (<img key={idx} src={item.image || 'https://via.placeholder.com/48'} alt={item.name} className="w-12 h-12 object-cover rounded-sm flex-shrink-0" />))}</div>
                <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{order.items.length} producto(s)</span><span className="font-bold text-primary">${order.total?.toFixed(2)}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== PROFILE PAGE ====================
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/auth" />;

  const handleLogout = async () => { await logout(); navigate('/'); toast.success('Sesion cerrada'); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn" data-testid="profile-page">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>
      <Card className="rounded-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16"><AvatarImage src={user.picture} /><AvatarFallback className="bg-primary text-primary-foreground text-xl">{user.name?.charAt(0)}</AvatarFallback></Avatar>
            <div><h2 className="text-xl font-bold">{user.name}</h2><p className="text-muted-foreground">{user.email}</p><Badge variant="secondary" className="mt-1">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</Badge></div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            <Link to="/pedidos" className="flex items-center justify-between p-3 hover:bg-muted rounded-sm transition-colors"><div className="flex items-center gap-3"><Package className="w-5 h-5 text-muted-foreground" /><span>Mis Pedidos</span></div><ChevronRight className="w-4 h-4 text-muted-foreground" /></Link>
            <Link to="/favoritos" className="flex items-center justify-between p-3 hover:bg-muted rounded-sm transition-colors"><div className="flex items-center gap-3"><Heart className="w-5 h-5 text-muted-foreground" /><span>Mis Favoritos</span></div><ChevronRight className="w-4 h-4 text-muted-foreground" /></Link>
            {user.role === 'admin' && <Link to="/admin" className="flex items-center justify-between p-3 hover:bg-muted rounded-sm transition-colors"><div className="flex items-center gap-3"><SettingsIcon className="w-5 h-5 text-primary" /><span className="text-primary font-medium">Panel de Administracion</span></div><ChevronRight className="w-4 h-4 text-primary" /></Link>}
          </div>
          <Separator className="my-4" />
          <Button variant="destructive" onClick={handleLogout} className="w-full rounded-sm" data-testid="logout-btn"><LogOut className="w-4 h-4 mr-2" /> Cerrar Sesion</Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== AUTH CALLBACK ====================
const AuthCallback = () => {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      googleLogin(sessionId).then(() => { toast.success('Bienvenido!'); navigate('/'); }).catch(() => { toast.error('Error de autenticacion'); navigate('/auth'); });
    }
  }, [searchParams, googleLogin, navigate]);

  return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
};

// ==================== PROTECTED ADMIN ROUTE ====================
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

// ==================== APP LAYOUT ====================
const AppLayout = () => {
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (!user) { setCartCount(0); setWishlistCount(0); return; }
    const fetchCounts = async () => {
      try {
        const [cartRes, wishRes] = await Promise.all([
          axios.get(`${API}/cart`, { withCredentials: true }),
          axios.get(`${API}/wishlist`, { withCredentials: true }),
        ]);
        setCartCount(cartRes.data.items?.reduce((sum, i) => sum + i.quantity, 0) || 0);
        setWishlistCount(wishRes.data.products?.length || 0);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout user={user} onLogout={async () => { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); window.location.href = '/'; }} /></ProtectedAdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="envios" element={<AdminShipping />} />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header cartCount={cartCount} wishlistCount={wishlistCount} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/producto/:productId" element={<ProductPage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/favoritos" element={<WishlistPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CartPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

// ==================== MAIN APP ====================
function App() {
  useEffect(() => {
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
