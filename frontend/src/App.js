import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import axios from 'axios';
import { 
  Search, ShoppingCart, Heart, User, Menu, X, Plus, Minus, Trash2, 
  Star, ChevronRight, Facebook, Phone, MapPin, Wrench, Zap, Cable, 
  Droplets, ChefHat, Circle, ArrowRight, Check, Loader2, LogOut,
  Home as HomeIcon, Package, Clock, TrendingUp, Sparkles, Truck, Settings, Info, Ruler
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Card, CardContent } from './components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from './components/ui/sheet';
import { Separator } from './components/ui/separator';
import { Textarea } from './components/ui/textarea';
import { Label } from './components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from './components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ScrollArea } from './components/ui/scroll-area';
import { Alert, AlertDescription } from './components/ui/alert';
import { 
  AdminLayout, AdminDashboard, AdminProducts, AdminCategories, 
  AdminOrders, AdminUsers, AdminShipping 
} from './pages/admin';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ==================== CONTEXTS ====================

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const processGoogleSession = async (sessionId) => {
    const response = await axios.post(`${API}/auth/google-session`, {}, { 
      headers: { 'X-Session-ID': sessionId },
      withCredentials: true 
    });
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, processGoogleSession, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart({ items: [], total: 0 });
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${API}/cart`, { withCredentials: true });
      setCart(response.data);
    } catch {
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, selectedVariant = null) => {
    if (!user) {
      toast.error('Inicia sesión para agregar al carrito');
      return;
    }
    try {
      await axios.post(`${API}/cart/add`, { 
        product_id: productId, 
        quantity,
        selected_variant: selectedVariant 
      }, { withCredentials: true });
      await fetchCart();
      toast.success(selectedVariant 
        ? `Producto (${selectedVariant}) añadido al carrito` 
        : 'Producto añadido al carrito'
      );
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al agregar');
    }
  };

  const updateQuantity = async (productId, quantity, selectedVariant = null) => {
    await axios.put(`${API}/cart/update`, { 
      product_id: productId, 
      quantity,
      selected_variant: selectedVariant 
    }, { withCredentials: true });
    await fetchCart();
  };

  const removeFromCart = async (productId, selectedVariant = null) => {
    // Si tiene variante, necesitamos lógica especial
    await axios.delete(`${API}/cart/remove/${productId}${selectedVariant ? `?variant=${selectedVariant}` : ''}`, { withCredentials: true });
    await fetchCart();
    toast.success('Producto eliminado');
  };

  const clearCart = async () => {
    await axios.delete(`${API}/cart/clear`, { withCredentials: true });
    await fetchCart();
  };

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};

const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState({ products: [] });
  const { user } = useAuth();

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlist({ products: [] });
      return;
    }
    try {
      const response = await axios.get(`${API}/wishlist`, { withCredentials: true });
      setWishlist(response.data);
    } catch {
      setWishlist({ products: [] });
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = async (productId) => {
    if (!user) {
      toast.error('Inicia sesión para agregar a favoritos');
      return;
    }
    await axios.post(`${API}/wishlist/add/${productId}`, {}, { withCredentials: true });
    await fetchWishlist();
    toast.success('Añadido a favoritos');
  };

  const removeFromWishlist = async (productId) => {
    await axios.delete(`${API}/wishlist/remove/${productId}`, { withCredentials: true });
    await fetchWishlist();
    toast.success('Eliminado de favoritos');
  };

  const isInWishlist = (productId) => wishlist.products.some(p => p.product_id === productId);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

// ==================== COMPONENTS ====================

const CategoryIcon = ({ icon, className = "w-5 h-5" }) => {
  const icons = {
    Wrench: Wrench,
    Zap: Zap,
    Cable: Cable,
    Droplets: Droplets,
    ChefHat: ChefHat,
    Circle: Circle,
  };
  const IconComponent = icons[icon] || Circle;
  return <IconComponent className={className} />;
};

const ProductCard = ({ product, onQuickAdd }) => {
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.product_id);

  const handleWishlist = (e) => {
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.product_id);
    } else {
      addToWishlist(product.product_id);
    }
  };

  // Mostrar rango de precios si tiene variantes
  const getPriceDisplay = () => {
    if (product.has_variants && product.variants?.length > 0) {
      const prices = product.variants.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) {
        return <span className="text-lg font-bold text-secondary">${minPrice.toFixed(2)}</span>;
      }
      return <span className="text-lg font-bold text-secondary">${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</span>;
    }
    return <span className="text-lg font-bold text-secondary">${product.price?.toFixed(2)}</span>;
  };

  return (
    <Card 
      className="product-card group cursor-pointer overflow-hidden border border-border rounded-sm hover-lift bg-white"
      onClick={() => navigate(`/producto/${product.product_id}`)}
      data-testid={`product-card-${product.product_id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/400'} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_offer && <Badge className="badge-offer text-xs font-bold">OFERTA</Badge>}
          {product.is_new && <Badge className="badge-new text-xs font-bold">NUEVO</Badge>}
          {product.is_bestseller && <Badge className="badge-bestseller text-xs font-bold">TOP</Badge>}
          {product.has_variants && <Badge className="bg-blue-500 text-white text-xs font-bold">MEDIDAS</Badge>}
        </div>
        <button 
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        {onQuickAdd && !product.has_variants && (
          <div className="quick-add absolute bottom-2 left-2 right-2">
            <Button 
              onClick={(e) => { e.stopPropagation(); onQuickAdd(product.product_id); }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase text-xs"
              data-testid={`quick-add-${product.product_id}`}
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir
            </Button>
          </div>
        )}
        {product.has_variants && (
          <div className="quick-add absolute bottom-2 left-2 right-2">
            <Button 
              onClick={(e) => { e.stopPropagation(); navigate(`/producto/${product.product_id}`); }}
              className="w-full bg-blue-500 text-white hover:bg-blue-600 rounded-sm font-bold uppercase text-xs"
              data-testid={`select-size-${product.product_id}`}
            >
              <Ruler className="w-4 h-4 mr-1" /> Ver Medidas
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1 mono">{product.sku}</p>
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 normal-case" style={{ fontFamily: 'Manrope' }}>{product.name}</h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 fill-primary text-primary" />
          <span className="text-xs font-medium">{product.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
        </div>
        <div className="flex items-baseline gap-2">
          {getPriceDisplay()}
          {product.original_price && !product.has_variants && (
            <span className="text-sm text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CartDrawer = () => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="cart-button">
          <ShoppingCart className="w-5 h-5" />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
              {cart.items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-xl">Tu Carrito</SheetTitle>
        </SheetHeader>
        {!user ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <ShoppingCart className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">Inicia sesión para ver tu carrito</p>
            <Button onClick={() => { setIsOpen(false); navigate('/auth'); }} data-testid="cart-login-btn">
              Iniciar Sesión
            </Button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <ShoppingCart className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
            <Button onClick={() => setIsOpen(false)} variant="outline" data-testid="continue-shopping-btn">
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 my-4 -mx-6 px-6" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="space-y-4">
                {cart.items.map((item, idx) => {
                  // Calcular precio según variante
                  let itemPrice = item.product?.price || 0;
                  if (item.selected_variant && item.product?.variants) {
                    const variant = item.product.variants.find(v => v.size === item.selected_variant);
                    if (variant) itemPrice = variant.price;
                  }
                  
                  return (
                    <div key={`${item.product_id}-${item.selected_variant || idx}`} className="flex gap-4 p-3 bg-muted/50 rounded-sm">
                      <img 
                        src={item.product?.images?.[0] || 'https://via.placeholder.com/80'} 
                        alt={item.product?.name}
                        className="w-20 h-20 object-cover rounded-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{item.product?.name}</h4>
                        {/* Mostrar variante seleccionada */}
                        {item.selected_variant && (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            Medida: {item.selected_variant}
                          </p>
                        )}
                        <p className="text-primary font-bold mt-1">${itemPrice.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-sm"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.selected_variant)}
                            data-testid={`cart-decrease-${item.product_id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-sm"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.selected_variant)}
                            data-testid={`cart-increase-${item.product_id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 ml-auto text-destructive"
                            onClick={() => removeFromCart(item.product_id, item.selected_variant)}
                            data-testid={`cart-remove-${item.product_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <SheetFooter className="flex-col gap-3 sm:flex-col border-t pt-4">
              <div className="flex justify-between items-center w-full">
                <span className="text-lg font-medium">Total:</span>
                <span className="text-2xl font-bold text-primary">${cart.total?.toFixed(2)}</span>
              </div>
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase"
                onClick={handleCheckout}
                data-testid="checkout-btn"
              >
                Proceder al Pago
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/categories`).then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground shadow-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
              <Wrench className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight">FERRE INTI</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-11 bg-white text-foreground rounded-sm border-0"
                data-testid="search-input"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <CartDrawer />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="user-menu-btn">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.picture} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="admin-menu-item">
                        <Settings className="w-4 h-4 mr-2" /> Panel Admin
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/perfil')} data-testid="profile-menu-item">
                    <User className="w-4 h-4 mr-2" /> Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/pedidos')} data-testid="orders-menu-item">
                    <Package className="w-4 h-4 mr-2" /> Mis Pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/favoritos')} data-testid="wishlist-menu-item">
                    <Heart className="w-4 h-4 mr-2" /> Favoritos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-menu-item">
                    <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/auth')}
                data-testid="login-btn"
              >
                <User className="w-5 h-5" />
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Categories bar - Desktop */}
        <nav className="hidden md:flex items-center gap-6 pb-3 overflow-x-auto">
          {categories.map((cat) => (
            <Link 
              key={cat.category_id}
              to={`/categoria/${cat.slug}`}
              className="flex items-center gap-2 text-sm font-medium text-secondary-foreground/80 hover:text-primary whitespace-nowrap transition-colors"
              data-testid={`nav-category-${cat.slug}`}
            >
              <CategoryIcon icon={cat.icon} className="w-4 h-4" />
              {cat.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-white/10">
          <form onSubmit={handleSearch} className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-white text-foreground rounded-sm"
              />
            </div>
          </form>
          <nav className="px-4 pb-4 space-y-2">
            {categories.map((cat) => (
              <Link 
                key={cat.category_id}
                to={`/categoria/${cat.slug}`}
                className="flex items-center gap-3 p-2 text-sm font-medium hover:bg-white/10 rounded-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                <CategoryIcon icon={cat.icon} className="w-5 h-5" />
                {cat.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

const Footer = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    axios.get(`${API}/categories`).then(res => setCategories(res.data)).catch(() => {});
  }, []);

  // ============================================================
  // 📝 CONFIGURACIÓN DE REDES SOCIALES - EDITAR AQUÍ
  // ============================================================
  const socialLinks = {
    // WhatsApp: Reemplaza "51999999999" con tu número (código país + número sin espacios ni guiones)
    // Ejemplo Perú: 51987654321 | México: 521234567890 | Colombia: 573001234567
    whatsapp: "https://wa.me/51999999999?text=Hola,%20quiero%20información%20sobre%20sus%20productos",
    
    // Facebook: Reemplaza con tu página de Facebook
    facebook: "https://facebook.com/ferreinti",
    
    // TikTok: Reemplaza con tu usuario de TikTok
    tiktok: "https://tiktok.com/@ferreinti",
    
    // Instagram: Reemplaza con tu usuario de Instagram
    instagram: "https://instagram.com/ferreinti",
  };
  // ============================================================

  // Mostrar solo las primeras 6 categorías principales en el footer
  const mainCategories = categories.slice(0, 6);

  return (
    <footer className="bg-secondary text-secondary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          
          {/* Brand & Social */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-extrabold tracking-tight">FERRE INTI</span>
            </div>
            <p className="text-xs text-secondary-foreground/70 mb-4 leading-relaxed">
              Tu ferretería de confianza con las mejores herramientas.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {/* WhatsApp */}
              <a 
                href={socialLinks.whatsapp} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-500 transition-colors" 
                data-testid="social-whatsapp"
                title="WhatsApp"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a 
                href={socialLinks.facebook} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors" 
                data-testid="social-facebook"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              {/* Instagram */}
              <a 
                href={socialLinks.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity" 
                data-testid="social-instagram"
                title="Instagram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a 
                href={socialLinks.tiktok} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors border border-white/20" 
                data-testid="social-tiktok"
                title="TikTok"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Categories - Compact */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide">Categorías</h3>
            <ul className="space-y-1.5">
              {mainCategories.map((cat) => (
                <li key={cat.category_id}>
                  <Link 
                    to={`/categoria/${cat.slug}`}
                    className="text-xs text-secondary-foreground/70 hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              {categories.length > 6 && (
                <li>
                  <Link 
                    to="/"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver todas →
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide">Enlaces</h3>
            <ul className="space-y-1.5">
              <li><Link to="/" className="text-xs text-secondary-foreground/70 hover:text-primary">Inicio</Link></li>
              <li><Link to="/ofertas" className="text-xs text-secondary-foreground/70 hover:text-primary">Ofertas</Link></li>
              <li><Link to="/favoritos" className="text-xs text-secondary-foreground/70 hover:text-primary">Favoritos</Link></li>
              <li><Link to="/pedidos" className="text-xs text-secondary-foreground/70 hover:text-primary">Mis Pedidos</Link></li>
              <li><Link to="/auth" className="text-xs text-secondary-foreground/70 hover:text-primary">Mi Cuenta</Link></li>
            </ul>
          </div>

          {/* ============================================================
             📍 UBICACIÓN DEL MAPA - EDITAR AQUÍ
             ============================================================
             Para cambiar la ubicación del mapa:
             1. Obtén las coordenadas de Google Maps (clic derecho > copiar coordenadas)
             2. Reemplaza los valores en la URL del iframe:
                - 2d-96.70304... = LONGITUD (el segundo número)
                - 3d17.08050...  = LATITUD (el primer número)
             3. Cambia el texto "Oaxaca, México" por tu dirección
             ============================================================ */}
          <div>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wide">Ubicación</h3>
            {/* Mapa - Tamaño máximo: h-40 (160px) para no deformar el footer */}
            <div className="rounded-sm overflow-hidden h-40 mb-2">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d-96.70304047115394!3d17.08050992267924!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDA0JzQ5LjgiTiA5NsKwNDInMTEuMCJX!5e0!3m2!1ses!2smx!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación Ferre Inti"
              />
            </div>
            {/* Dirección - Cambia "Oaxaca, México" por tu dirección completa */}
            <div className="flex items-start gap-2 text-xs text-secondary-foreground/70">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Oaxaca, México</span>
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-white/10" />
        
        <div className="text-center text-xs text-secondary-foreground/50">
          © {new Date().getFullYear()} Ferre Inti. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

// ==================== PAGES ====================

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed data first
        await axios.post(`${API}/seed`).catch(() => {});
        
        const [catRes, offersRes, bestRes, newRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?is_offer=true&limit=8`),
          axios.get(`${API}/products?is_bestseller=true&limit=8`),
          axios.get(`${API}/products?is_new=true&limit=8`),
        ]);
        setCategories(catRes.data);
        setOffers(offersRes.data);
        setBestsellers(bestRes.data);
        setNewProducts(newRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen" data-testid="home-page">
      {/* Hero Banner */}
      <section className="relative bg-secondary overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Banner */}
            <div className="lg:col-span-2 lg:row-span-2 relative rounded-sm overflow-hidden group cursor-pointer" onClick={() => navigate('/categoria/herramientas-electricas')}>
              <img 
                src="https://images.unsplash.com/photo-1540103711724-ebf833bde8d1?w=1200&q=80"
                alt="Herramientas Profesionales"
                className="w-full h-64 md:h-96 lg:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <Badge className="badge-offer mb-3">HASTA 30% OFF</Badge>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-2">
                  Herramientas<br />Profesionales
                </h1>
                <p className="text-white/80 text-sm md:text-base mb-4 max-w-md">
                  Encuentra las mejores herramientas eléctricas y manuales para tu trabajo
                </p>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase" data-testid="hero-cta-btn">
                  Ver Ofertas <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            
            {/* Side banners */}
            <div className="relative rounded-sm overflow-hidden group cursor-pointer" onClick={() => navigate('/categoria/accesorios-bano')}>
              <img 
                src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80"
                alt="Accesorios Baño"
                className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-bold text-white">Accesorios Baño</h3>
                <p className="text-white/70 text-xs">Renueva tu baño</p>
              </div>
            </div>
            <div className="relative rounded-sm overflow-hidden group cursor-pointer" onClick={() => navigate('/categoria/conexiones-electricas')}>
              <img 
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"
                alt="Conexiones Eléctricas"
                className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg font-bold text-white">Conexiones Eléctricas</h3>
                <p className="text-white/70 text-xs">Material certificado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Carousel */}
      <section className="py-8 md:py-10 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Categorías</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const container = document.getElementById('categories-carousel');
                  if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                data-testid="categories-prev"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => {
                  const container = document.getElementById('categories-carousel');
                  if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                data-testid="categories-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div 
            id="categories-carousel"
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <Link 
                key={cat.category_id}
                to={`/categoria/${cat.slug}`}
                className="group flex-shrink-0"
                data-testid={`category-card-${cat.slug}`}
              >
                <div className="w-32 md:w-36 overflow-hidden rounded-sm border border-border hover:border-primary transition-colors bg-card">
                  <div className="h-20 md:h-24 relative overflow-hidden">
                    <img 
                      src={cat.image} 
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
                        <CategoryIcon icon={cat.icon} className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-xs line-clamp-1">{cat.name}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Offers */}
      <section className="py-12 md:py-16 bg-muted relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 caution-tape" />
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">Ofertas Especiales</h2>
            </div>
            <Link to="/ofertas" className="text-primary font-medium flex items-center gap-1 hover:underline" data-testid="see-all-offers">
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {offers.slice(0, 4).map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-12 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-sm flex items-center justify-center">
                <Star className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">Los Más Vendidos</h2>
            </div>
            <Link to="/mas-vendidos" className="text-primary font-medium flex items-center gap-1 hover:underline" data-testid="see-all-bestsellers">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {bestsellers.slice(0, 4).map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        </div>
      </section>

      {/* New Products */}
      <section className="py-12 md:py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-sm flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">Lo Nuevo</h2>
            </div>
            <Link to="/nuevos" className="text-primary font-medium flex items-center gap-1 hover:underline" data-testid="see-all-new">
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {newProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

const CategoryPage = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const catRes = await axios.get(`${API}/categories/${slug}`);
        setCategory(catRes.data);
        const prodRes = await axios.get(`${API}/products/category/${catRes.data.category_id}`);
        setProducts(prodRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Categoría no encontrada</p>
        <Button asChild><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-testid="category-page">
      {/* Header */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={category.image} 
          alt={category.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
            <Link to="/" className="hover:text-white">Inicio</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Categorías</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{category.name}</h1>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <p className="text-muted-foreground mb-6">{products.length} productos encontrados</p>
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay productos en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const ProductPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  // ============================================================
  // 📏 VARIANTE/TAMAÑO SELECCIONADO
  // ============================================================
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();

  const inWishlist = product ? isInWishlist(product.product_id) : false;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodRes, relatedRes, reviewsRes] = await Promise.all([
          axios.get(`${API}/products/${productId}`),
          axios.get(`${API}/products/related/${productId}`),
          axios.get(`${API}/reviews/${productId}`),
        ]);
        setProduct(prodRes.data);
        setRelated(relatedRes.data);
        setReviews(reviewsRes.data);
        setSelectedImage(0);
        // Si tiene variantes, seleccionar la primera por defecto
        if (prodRes.data.has_variants && prodRes.data.variants?.length > 0) {
          setSelectedVariant(prodRes.data.variants[0].size);
        } else {
          setSelectedVariant(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId]);

  // Obtener precio según variante seleccionada
  const getCurrentPrice = () => {
    if (product?.has_variants && product?.variants?.length > 0 && selectedVariant) {
      const variant = product.variants.find(v => v.size === selectedVariant);
      return variant?.price || product.price;
    }
    return product?.price || 0;
  };

  // Obtener stock según variante seleccionada
  const getCurrentStock = () => {
    if (product?.has_variants && product?.variants?.length > 0 && selectedVariant) {
      const variant = product.variants.find(v => v.size === selectedVariant);
      return variant?.stock ?? product.stock;
    }
    return product?.stock || 0;
  };

  const handleAddToCart = () => {
    if (product?.has_variants && !selectedVariant) {
      toast.error('Selecciona un tamaño/medida');
      return;
    }
    addToCart(product.product_id, quantity, selectedVariant);
  };

  const handleBuyNow = () => {
    if (product?.has_variants && !selectedVariant) {
      toast.error('Selecciona un tamaño/medida');
      return;
    }
    addToCart(product.product_id, quantity, selectedVariant);
    navigate('/checkout');
  };

  const handleWishlist = () => {
    if (inWishlist) {
      removeFromWishlist(product.product_id);
    } else {
      addToWishlist(product.product_id);
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast.error('Inicia sesión para comentar');
      return;
    }
    if (!reviewText.trim()) {
      toast.error('Escribe un comentario');
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/reviews`, {
        product_id: productId,
        rating: reviewRating,
        comment: reviewText
      }, { withCredentials: true });
      const reviewsRes = await axios.get(`${API}/reviews/${productId}`);
      setReviews(reviewsRes.data);
      setReviewText('');
      setReviewRating(5);
      toast.success('Comentario publicado');
    } catch (err) {
      toast.error('Error al publicar comentario');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button asChild><Link to="/">Volver al inicio</Link></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-testid="product-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-6">
          <Link to="/" className="hover:text-foreground">Inicio</Link>
          <ChevronRight className="w-4 h-4" />
          <span>{product.name}</span>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-sm overflow-hidden">
              <img 
                src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                    data-testid={`thumbnail-${idx}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.is_offer && <Badge className="badge-offer">OFERTA</Badge>}
              {product.is_new && <Badge className="badge-new">NUEVO</Badge>}
              {product.is_bestseller && <Badge className="badge-bestseller">TOP VENTAS</Badge>}
            </div>
            
            <p className="text-sm text-muted-foreground mono mb-1">{product.sku}</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ textTransform: 'none', fontFamily: 'Manrope' }}>
              {product.name}
            </h1>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(product.rating || 0) ? 'fill-primary text-primary' : 'text-muted'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.review_count || 0} reseñas)</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">${getCurrentPrice().toFixed(2)}</span>
              {product.original_price && !product.has_variants && (
                <span className="text-xl text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
              )}
              {product.original_price && !product.has_variants && (
                <Badge variant="destructive" className="text-xs">
                  -{Math.round((1 - product.price / product.original_price) * 100)}%
                </Badge>
              )}
            </div>

            {/* ============================================================
                📏 SELECTOR DE VARIANTES/TAMAÑOS
                ============================================================ */}
            {product.has_variants && product.variants?.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-sm border border-blue-200">
                <Label className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Selecciona la medida:
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.size}
                      onClick={() => setSelectedVariant(variant.size)}
                      className={`px-4 py-2 rounded-sm border-2 font-medium text-sm transition-all ${
                        selectedVariant === variant.size
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 bg-white hover:border-blue-300'
                      } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed line-through' : ''}`}
                      disabled={variant.stock === 0}
                      data-testid={`variant-${variant.size}`}
                    >
                      {variant.size}
                      <span className="ml-2 text-xs opacity-75">${variant.price?.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className="mt-3 text-sm text-blue-700">
                    Medida seleccionada: <strong>{selectedVariant}</strong> 
                    {getCurrentStock() > 0 ? (
                      <span className="ml-2">({getCurrentStock()} disponibles)</span>
                    ) : (
                      <span className="ml-2 text-red-500">(Sin stock)</span>
                    )}
                  </p>
                )}
              </div>
            )}

            <p className="text-muted-foreground mb-6">{product.description}</p>

            {/* Quantity & Actions */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4">
                <Label className="font-medium">Cantidad:</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    data-testid="decrease-qty"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-sm"
                    onClick={() => setQuantity(quantity + 1)}
                    data-testid="increase-qty"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">({product.stock} disponibles)</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleAddToCart}
                  variant="outline"
                  className="flex-1 rounded-sm font-bold uppercase border-2 border-secondary"
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Añadir al Carrito
                </Button>
                <Button 
                  onClick={handleBuyNow}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase"
                  data-testid="buy-now-btn"
                >
                  Comprar Ahora
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={handleWishlist}
                className="w-full justify-start"
                data-testid="wishlist-toggle"
              >
                <Heart className={`w-4 h-4 mr-2 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                {inWishlist ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              </Button>
            </div>

            {/* Features */}
            {product.features?.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-bold mb-4 text-lg">Características</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Opiniones de Clientes</h2>
          
          {/* Review Form */}
          <Card className="mb-8 rounded-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Escribe tu opinión</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Calificación</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                        data-testid={`rating-star-${star}`}
                      >
                        <Star className={`w-6 h-6 ${star <= reviewRating ? 'fill-primary text-primary' : 'text-muted'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review" className="mb-2 block">Comentario</Label>
                  <Textarea
                    id="review"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Comparte tu experiencia con este producto..."
                    className="rounded-sm"
                    data-testid="review-textarea"
                  />
                </div>
                <Button 
                  onClick={submitReview}
                  disabled={submittingReview}
                  className="bg-primary text-primary-foreground rounded-sm"
                  data-testid="submit-review-btn"
                >
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Publicar Opinión
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay opiniones aún. ¡Sé el primero en opinar!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.review_id} className="rounded-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{review.user_name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">Productos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.slice(0, 4).map((prod) => (
                <ProductCard key={prod.product_id} product={prod} onQuickAdd={addToCart} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products?search=${encodeURIComponent(query)}`);
        setProducts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (query) search();
  }, [query]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-testid="search-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Resultados de búsqueda</h1>
        <p className="text-muted-foreground mb-8">"{query}" - {products.length} productos encontrados</p>
        
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No se encontraron productos</p>
            <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const WishlistPage = () => {
  const { wishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" data-testid="wishlist-page">
        <Heart className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground">Inicia sesión para ver tus favoritos</p>
        <Button onClick={() => navigate('/auth')} data-testid="login-wishlist-btn">Iniciar Sesión</Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-testid="wishlist-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Mis Favoritos</h1>
        
        {wishlist.products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tienes productos en favoritos</p>
            <Button asChild variant="outline"><Link to="/">Explorar Productos</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {wishlist.products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('¡Bienvenido de vuelta!');
      } else {
        await register(email, password, name);
        toast.success('¡Cuenta creada exitosamente!');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted flex items-center justify-center p-4" data-testid="auth-page">
      <Card className="w-full max-w-md rounded-sm">
        <CardContent className="p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">FERRE INTI</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea una cuenta nueva'}
            </p>
          </div>

          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Registrarse</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="rounded-sm mt-1"
                    data-testid="name-input"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="rounded-sm mt-1"
                  data-testid="email-input"
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="rounded-sm mt-1"
                  data-testid="password-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase"
                disabled={loading}
                data-testid="auth-submit-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </form>
          </Tabs>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              o continúa con
            </span>
          </div>

          <Button 
            variant="outline" 
            className="w-full rounded-sm"
            onClick={loginWithGoogle}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionId = hash.split('session_id=')[1]?.split('&')[0];
      
      if (sessionId) {
        try {
          await processGoogleSession(sessionId);
          toast.success('¡Bienvenido!');
          navigate('/', { replace: true });
        } catch (err) {
          toast.error('Error de autenticación');
          navigate('/auth', { replace: true });
        }
      } else {
        navigate('/auth', { replace: true });
      }
    };
    
    processAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

const CheckoutPage = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip_code: '',
    lat: null,
    lng: null
  });
  const [shippingCost, setShippingCost] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const calculateShipping = async () => {
    if (!shippingAddress.lat || !shippingAddress.lng) {
      toast.error('Ingresa las coordenadas de tu ubicación');
      return;
    }
    
    setCalculatingShipping(true);
    try {
      const response = await axios.post(`${API}/shipping/calculate`, {
        address: shippingAddress
      });
      setShippingCost(response.data);
    } catch (err) {
      toast.error('Error al calcular envío');
    } finally {
      setCalculatingShipping(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast.error('Tu carrito está vacío');
      return;
    }
    
    if (!shippingAddress.street || !shippingAddress.city) {
      toast.error('Completa tu dirección de envío');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/payments/checkout`, {
        origin_url: window.location.origin,
        shipping_address: shippingAddress
      }, { withCredentials: true });
      
      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al procesar el pago');
      setLoading(false);
    }
  };

  if (!user) return null;

  const total = cart.total + (shippingCost?.shipping_cost || 0);

  return (
    <main className="min-h-screen bg-muted" data-testid="checkout-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Finalizar Compra</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Address & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card className="rounded-sm">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5" /> Dirección de Envío
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street">Calle y Número *</Label>
                    <Input
                      id="street"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="Av. Principal 123"
                      className="rounded-sm mt-1"
                      data-testid="shipping-street"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ciudad *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Lima"
                        className="rounded-sm mt-1"
                        data-testid="shipping-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado/Región</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Lima"
                        className="rounded-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="zip">Código Postal</Label>
                    <Input
                      id="zip"
                      value={shippingAddress.zip_code}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zip_code: e.target.value }))}
                      placeholder="15001"
                      className="rounded-sm mt-1"
                    />
                  </div>
                  
                  {/* Coordinates for shipping calculation */}
                  <div className="p-4 bg-muted rounded-sm">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Para calcular el costo de envío, ingresa las coordenadas de tu ubicación. 
                        Puedes obtenerlas de Google Maps haciendo clic derecho en tu ubicación.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lat">Latitud</Label>
                        <Input
                          id="lat"
                          type="number"
                          step="0.0000001"
                          value={shippingAddress.lat || ''}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, lat: parseFloat(e.target.value) || null }))}
                          placeholder="-12.123456"
                          className="rounded-sm mt-1"
                          data-testid="shipping-lat"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lng">Longitud</Label>
                        <Input
                          id="lng"
                          type="number"
                          step="0.0000001"
                          value={shippingAddress.lng || ''}
                          onChange={(e) => setShippingAddress(prev => ({ ...prev, lng: parseFloat(e.target.value) || null }))}
                          placeholder="-77.123456"
                          className="rounded-sm mt-1"
                          data-testid="shipping-lng"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={calculateShipping}
                      variant="outline"
                      className="mt-3 rounded-sm"
                      disabled={calculatingShipping || !shippingAddress.lat || !shippingAddress.lng}
                      data-testid="calculate-shipping-btn"
                    >
                      {calculatingShipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                      Calcular Envío
                    </Button>
                    
                    {shippingCost && (
                      <Alert className={`mt-3 ${shippingCost.is_free ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">
                                {shippingCost.is_free ? (
                                  <span className="text-green-600">¡Envío Gratis!</span>
                                ) : (
                                  <span className="text-blue-600">Costo: ${shippingCost.shipping_cost?.toFixed(2)}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">Distancia: {shippingCost.distance_km} km</p>
                            </div>
                            <Truck className={`w-6 h-6 ${shippingCost.is_free ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <Card className="rounded-sm">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">Resumen del Pedido</h2>
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="flex gap-4">
                      <img 
                        src={item.product?.images?.[0] || 'https://via.placeholder.com/80'} 
                        alt={item.product?.name}
                        className="w-16 h-16 object-cover rounded-sm"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product?.name}</h4>
                        <p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p>
                        <p className="text-primary font-bold">${(item.product?.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment */}
          <div>
            <Card className="rounded-sm sticky top-24">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">Resumen</h2>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${cart.total?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span className={shippingCost?.is_free ? 'text-green-500' : ''}>
                      {shippingCost ? (
                        shippingCost.is_free ? 'Gratis' : `$${shippingCost.shipping_cost?.toFixed(2)}`
                      ) : (
                        <span className="text-xs text-muted-foreground">Calcula tu envío</span>
                      )}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
                <Button 
                  onClick={handleCheckout}
                  disabled={loading || cart.items.length === 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase"
                  data-testid="pay-now-btn"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Pagar con Stripe
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Pago seguro con tarjeta de crédito o débito
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const polledRef = useRef(false);

  useEffect(() => {
    if (!sessionId || polledRef.current) return;
    polledRef.current = true;

    const pollStatus = async (attempts = 0) => {
      if (attempts >= 5) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API}/payments/status/${sessionId}`);
        setStatus(res.data);
        if (res.data.payment_status === 'paid') {
          await clearCart();
          setLoading(false);
        } else if (res.data.status === 'expired') {
          setLoading(false);
        } else {
          setTimeout(() => pollStatus(attempts + 1), 2000);
        }
      } catch {
        setTimeout(() => pollStatus(attempts + 1), 2000);
      }
    };
    pollStatus();
  }, [sessionId, clearCart]);

  return (
    <main className="min-h-screen bg-muted flex items-center justify-center p-4" data-testid="checkout-success-page">
      <Card className="w-full max-w-md rounded-sm text-center">
        <CardContent className="p-8">
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Procesando pago...</h1>
              <p className="text-muted-foreground">Por favor espera mientras verificamos tu pago</p>
            </>
          ) : status?.payment_status === 'paid' ? (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">¡Pago Exitoso!</h1>
              <p className="text-muted-foreground mb-6">Gracias por tu compra. Te enviaremos los detalles por correo.</p>
              <Button 
                onClick={() => navigate('/')}
                className="bg-primary text-primary-foreground rounded-sm"
                data-testid="continue-shopping-success"
              >
                Continuar Comprando
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Error en el Pago</h1>
              <p className="text-muted-foreground mb-6">Hubo un problema con tu pago. Por favor intenta nuevamente.</p>
              <Button 
                onClick={() => navigate('/checkout')}
                className="bg-primary text-primary-foreground rounded-sm"
              >
                Intentar de Nuevo
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

const CheckoutCancelPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-muted flex items-center justify-center p-4" data-testid="checkout-cancel-page">
      <Card className="w-full max-w-md rounded-sm text-center">
        <CardContent className="p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pago Cancelado</h1>
          <p className="text-muted-foreground mb-6">Tu pago fue cancelado. Tu carrito sigue disponible.</p>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate('/checkout')}
              className="bg-primary text-primary-foreground rounded-sm"
              data-testid="retry-checkout"
            >
              Volver al Checkout
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/')}
              className="rounded-sm"
            >
              Continuar Comprando
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/orders`, { withCredentials: true });
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background" data-testid="orders-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Mis Pedidos</h1>
        
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tienes pedidos aún</p>
            <Button asChild variant="outline"><Link to="/">Empezar a Comprar</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.order_id} className="rounded-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-mono text-sm text-muted-foreground">{order.order_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('es-ES', { 
                          year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                      {order.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {order.items.map((item, idx) => (
                      <img 
                        key={idx}
                        src={item.image || 'https://via.placeholder.com/60'} 
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-sm flex-shrink-0"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-muted-foreground">{order.items.length} productos</span>
                    <span className="font-bold text-primary">${order.total?.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-background" data-testid="profile-page">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Mi Perfil</h1>
        
        <Card className="rounded-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.picture} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                {user.role === 'admin' && (
                  <Badge className="mt-1 bg-primary">Administrador</Badge>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              {user.role === 'admin' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-sm border-primary text-primary hover:bg-primary/10"
                  onClick={() => navigate('/admin')}
                  data-testid="admin-panel-btn"
                >
                  <Settings className="w-4 h-4 mr-3" /> Panel de Administración
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-sm"
                onClick={() => navigate('/pedidos')}
              >
                <Package className="w-4 h-4 mr-3" /> Mis Pedidos
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-sm"
                onClick={() => navigate('/favoritos')}
              >
                <Heart className="w-4 h-4 mr-3" /> Mis Favoritos
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-sm text-destructive hover:text-destructive"
                onClick={handleLogout}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-3" /> Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

// ==================== ADMIN PROTECTED ROUTE ====================

const AdminProtectedRoute = () => {
  const { user, logout } = useAuth();
  
  if (!user) {
    return <AuthPage />;
  }
  
  if (user.role !== 'admin') {
    return (
      <main className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-sm text-center">
          <CardContent className="p-8">
            <Settings className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-muted-foreground mb-6">No tienes permisos de administrador.</p>
            <Button onClick={() => window.location.href = '/'} className="rounded-sm">
              Volver a la Tienda
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  return <AdminLayout user={user} onLogout={logout} />;
};

// ==================== MAIN LAYOUT ====================

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/categoria/:slug" element={<CategoryPage />} />
        <Route path="/producto/:productId" element={<ProductPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/favoritos" element={<WishlistPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/ofertas" element={<OffersPage />} />
        <Route path="/mas-vendidos" element={<BestsellersPage />} />
        <Route path="/nuevos" element={<NewProductsPage />} />
      </Routes>
      <Footer />
    </>
  );
};

// ==================== APP ROUTER ====================

const AppRouter = () => {
  const location = useLocation();
  
  // Check URL fragment for session_id (OAuth callback) - Must be synchronous!
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Admin routes */}
      <Route path="/admin/*" element={<AdminProtectedRoute />}>
        <Route index element={<AdminDashboard />} />
        <Route path="productos" element={<AdminProducts />} />
        <Route path="categorias" element={<AdminCategories />} />
        <Route path="pedidos" element={<AdminOrders />} />
        <Route path="usuarios" element={<AdminUsers />} />
        <Route path="envios" element={<AdminShipping />} />
      </Route>
      
      {/* Main store routes */}
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
};

// Additional filter pages
const OffersPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    axios.get(`${API}/products?is_offer=true&limit=50`)
      .then(res => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen bg-background" data-testid="offers-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Ofertas Especiales</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
          ))}
        </div>
      </div>
    </main>
  );
};

const BestsellersPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    axios.get(`${API}/products?is_bestseller=true&limit=50`)
      .then(res => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen bg-background" data-testid="bestsellers-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Los Más Vendidos</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
          ))}
        </div>
      </div>
    </main>
  );
};

const NewProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    axios.get(`${API}/products?is_new=true&limit=50`)
      .then(res => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <main className="min-h-screen bg-background" data-testid="new-products-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Lo Nuevo</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
          ))}
        </div>
      </div>
    </main>
  );
};

// ==================== MAIN APP ====================

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Toaster position="top-right" richColors />
            <AppRouter />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
