import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import axios from 'axios';
import { 
  Search, ShoppingCart, Heart, User, Menu, X, Plus, Minus, Trash2, 
  Star, ChevronRight, Facebook, Phone, MapPin, Wrench, Zap, Cable, 
  Droplets, ChefHat, Circle, ArrowRight, Check, Loader2, LogOut,
  Home as HomeIcon, Package, Clock, TrendingUp, Sparkles, Truck, Settings, Info,
  Eye, EyeOff, Grid3X3, List, Lock, CreditCard
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

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      toast.error('Inicia sesión para agregar al carrito');
      return;
    }
    await axios.post(`${API}/cart/add`, { product_id: productId, quantity }, { withCredentials: true });
    await fetchCart();
    toast.success('Producto añadido al carrito');
  };

  const updateQuantity = async (productId, quantity) => {
    await axios.put(`${API}/cart/update`, { product_id: productId, quantity }, { withCredentials: true });
    await fetchCart();
  };

  const removeFromCart = async (productId) => {
    await axios.delete(`${API}/cart/remove/${productId}`, { withCredentials: true });
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

  return (
    <Card 
      className="product-card group cursor-pointer overflow-hidden border-0 rounded-2xl hover-lift bg-white shadow-sm hover:shadow-xl transition-all duration-300"
      onClick={() => navigate(`/producto/${product.product_id}`)}
      data-testid={`product-card-${product.product_id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-2xl">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/400'} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_offer && <Badge className="badge-offer text-xs font-bold px-2.5 py-1 rounded-full">OFERTA</Badge>}
          {product.is_new && <Badge className="badge-new text-xs font-bold px-2.5 py-1 rounded-full">NUEVO</Badge>}
          {product.is_bestseller && <Badge className="badge-bestseller text-xs font-bold px-2.5 py-1 rounded-full">TOP</Badge>}
        </div>
        <button 
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className={`w-4 h-4 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500 hover:text-red-400'}`} />
        </button>
        {onQuickAdd && (
          <div className="quick-add absolute bottom-3 left-3 right-3">
            <Button 
              onClick={(e) => { e.stopPropagation(); onQuickAdd(product.product_id); }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase text-xs py-2.5 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
              data-testid={`quick-add-${product.product_id}`}
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5 mono">{product.sku}</p>
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 normal-case leading-snug" style={{ fontFamily: 'Manrope' }}>{product.name}</h3>
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">${product.price?.toFixed(2)}</span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para vista de lista
const ProductListItem = ({ product, onQuickAdd }) => {
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

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-0 rounded-2xl hover-lift bg-white shadow-sm hover:shadow-xl transition-all duration-300"
      onClick={() => navigate(`/producto/${product.product_id}`)}
      data-testid={`product-list-item-${product.product_id}`}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Imagen */}
        <div className="relative w-full sm:w-48 md:w-56 h-48 sm:h-auto flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <img 
            src={product.images?.[0] || 'https://via.placeholder.com/400'} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.is_offer && <Badge className="badge-offer text-xs font-bold px-2.5 py-1 rounded-full">OFERTA</Badge>}
            {product.is_new && <Badge className="badge-new text-xs font-bold px-2.5 py-1 rounded-full">NUEVO</Badge>}
            {product.is_bestseller && <Badge className="badge-bestseller text-xs font-bold px-2.5 py-1 rounded-full">TOP</Badge>}
          </div>
        </div>
        
        {/* Contenido */}
        <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 mono">{product.sku}</p>
                <h3 className="font-semibold text-base sm:text-lg line-clamp-2 mb-2 normal-case leading-snug" style={{ fontFamily: 'Manrope' }}>{product.name}</h3>
              </div>
              <button 
                onClick={handleWishlist}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 hover:scale-110 transition-all duration-200"
                data-testid={`list-wishlist-btn-${product.product_id}`}
              >
                <Heart className={`w-4 h-4 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500 hover:text-red-400'}`} />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 hidden sm:block">{product.description}</p>
            
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">({product.review_count || 0})</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4 mt-auto">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">${product.price?.toFixed(2)}</span>
              {product.original_price && (
                <span className="text-sm text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
              )}
            </div>
            {onQuickAdd && (
              <Button 
                onClick={(e) => { e.stopPropagation(); onQuickAdd(product.product_id); }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase text-xs px-4 py-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                data-testid={`list-quick-add-${product.product_id}`}
              >
                <Plus className="w-4 h-4 mr-1" /> Añadir
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

// Componente para toggle de vista
const ViewToggle = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-xl p-1" data-testid="view-toggle">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        className={`rounded-lg px-3 py-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-md' : ''}`}
        onClick={() => setViewMode('grid')}
        data-testid="view-toggle-grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        className={`rounded-lg px-3 py-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-md' : ''}`}
        onClick={() => setViewMode('list')}
        data-testid="view-toggle-list"
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
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
      <SheetContent className="w-full sm:w-full sm:max-w-full flex flex-col" side="right">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold">Tu Carrito</SheetTitle>
            {cart.items.length > 0 && (
              <span className="text-muted-foreground">{cart.items.length} productos</span>
            )}
          </div>
        </SheetHeader>
        {!user ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">Inicia sesión para ver tu carrito</p>
            <Button 
              onClick={() => { setIsOpen(false); navigate('/auth'); }} 
              className="bg-primary rounded-xl px-8 py-3"
              data-testid="cart-login-btn"
            >
              Iniciar Sesión
            </Button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">Tu carrito está vacío</p>
            <Button 
              onClick={() => setIsOpen(false)} 
              variant="outline" 
              className="rounded-xl px-8 py-3"
              data-testid="continue-shopping-btn"
            >
              Continuar Comprando
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 my-4 -mx-6 px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-4 p-4 bg-muted/50 rounded-2xl">
                    <img 
                      src={item.product?.images?.[0] || 'https://via.placeholder.com/80'} 
                      alt={item.product?.name}
                      className="w-24 h-24 object-cover rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{item.product?.name}</h4>
                      <p className="text-primary font-bold mt-1 text-lg">${item.product?.price?.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          data-testid={`cart-decrease-${item.product_id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 rounded-xl"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          data-testid={`cart-increase-${item.product_id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 ml-auto text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.product_id)}
                          data-testid={`cart-remove-${item.product_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="border-t pt-6 mt-auto">
              <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg text-muted-foreground">Total:</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">${cart.total?.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase px-12 py-3 shadow-lg shadow-primary/30"
                  onClick={handleCheckout}
                  data-testid="checkout-btn"
                >
                  Proceder al Pago
                </Button>
              </div>
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
    <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground shadow-xl backdrop-blur-lg bg-opacity-95">
      <div className="w-full px-4 md:px-8 lg:px-12">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all group-hover:scale-105">
              <Wrench className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight">FERRE INTI</span>
          </Link>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 h-12 bg-white text-foreground rounded-xl border-2 border-transparent focus:border-primary/30 shadow-inner"
                data-testid="search-input"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <CartDrawer />
            
            {user ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="user-menu-btn">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.picture} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-full sm:max-w-full" side="right">
                  <SheetHeader className="border-b pb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user.picture} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                          {user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-2xl font-bold text-left">{user.name}</SheetTitle>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </SheetHeader>
                  <div className="py-8 max-w-2xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user.role === 'admin' && (
                        <SheetTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="h-auto py-6 px-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all group"
                            onClick={() => navigate('/admin')}
                            data-testid="admin-menu-item"
                          >
                            <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary-foreground/20">
                              <Settings className="w-7 h-7" />
                            </div>
                            <span className="font-semibold">Panel Admin</span>
                          </Button>
                        </SheetTrigger>
                      )}
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-auto py-6 px-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all group"
                          onClick={() => navigate('/perfil')}
                          data-testid="profile-menu-item"
                        >
                          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary-foreground/20">
                            <User className="w-7 h-7" />
                          </div>
                          <span className="font-semibold">Mi Perfil</span>
                        </Button>
                      </SheetTrigger>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-auto py-6 px-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all group"
                          onClick={() => navigate('/pedidos')}
                          data-testid="orders-menu-item"
                        >
                          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary-foreground/20">
                            <Package className="w-7 h-7" />
                          </div>
                          <span className="font-semibold">Mis Pedidos</span>
                        </Button>
                      </SheetTrigger>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-auto py-6 px-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-all group"
                          onClick={() => navigate('/favoritos')}
                          data-testid="wishlist-menu-item"
                        >
                          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary-foreground/20">
                            <Heart className="w-7 h-7" />
                          </div>
                          <span className="font-semibold">Favoritos</span>
                        </Button>
                      </SheetTrigger>
                    </div>
                    <div className="mt-8 pt-8 border-t">
                      <SheetTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full h-auto py-4 rounded-2xl text-destructive hover:bg-destructive/10 flex items-center justify-center gap-3"
                          onClick={handleLogout}
                          data-testid="logout-menu-item"
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="font-semibold">Cerrar Sesión</span>
                        </Button>
                      </SheetTrigger>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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

  return (
    <footer className="bg-secondary text-secondary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
                <Wrench className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">FERRE INTI</span>
            </div>
            <p className="text-sm text-secondary-foreground/70 mb-4">
              Tu ferretería de confianza con las mejores herramientas y accesorios para el hogar y el trabajo profesional.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center hover:bg-primary transition-colors" data-testid="social-facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center hover:bg-primary transition-colors" data-testid="social-whatsapp">
                <Phone className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center hover:bg-primary transition-colors" data-testid="social-tiktok">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold mb-4">Categorías</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.category_id}>
                  <Link 
                    to={`/categoria/${cat.slug}`}
                    className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              {categories.length > 6 && (
                <li className="text-xs text-secondary-foreground/50 pt-1">
                  +{categories.length - 6} más categorías
                </li>
              )}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Enlaces</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-secondary-foreground/70 hover:text-primary">Inicio</Link></li>
              <li><Link to="/ofertas" className="text-sm text-secondary-foreground/70 hover:text-primary">Ofertas</Link></li>
              <li><Link to="/favoritos" className="text-sm text-secondary-foreground/70 hover:text-primary">Favoritos</Link></li>
              <li><Link to="/auth" className="text-sm text-secondary-foreground/70 hover:text-primary">Mi Cuenta</Link></li>
            </ul>
          </div>

          {/* Map */}
          <div>
            <h3 className="text-lg font-bold mb-4">Ubicación</h3>
            <div className="rounded-sm overflow-hidden h-40 bg-muted">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.5454574728677!2d-77.0349915!3d-12.1190285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c80d4aa11111%3A0x0!2zMTLCsDA3JzA4LjUiUyA3N8KwMDInMDYuMCJX!5e0!3m2!1sen!2spe!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación Ferre Inti"
              />
            </div>
            <div className="flex items-start gap-2 mt-3 text-sm text-secondary-foreground/70">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Visítanos en nuestra tienda física</span>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />
        
        <div className="text-center text-sm text-secondary-foreground/50">
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
            <div className="lg:col-span-2 lg:row-span-2 relative rounded-2xl overflow-hidden group cursor-pointer shadow-2xl" onClick={() => navigate('/categoria/herramientas-electricas')}>
              <img 
                src="https://images.unsplash.com/photo-1540103711724-ebf833bde8d1?w=1200&q=80"
                alt="Herramientas Profesionales"
                className="w-full h-64 md:h-96 lg:h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                <Badge className="badge-offer mb-4 px-4 py-1.5 rounded-full text-sm">HASTA 30% OFF</Badge>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">
                  Herramientas<br />Profesionales
                </h1>
                <p className="text-white/90 text-sm md:text-base mb-5 max-w-md">
                  Encuentra las mejores herramientas eléctricas y manuales para tu trabajo
                </p>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase px-6 py-3 shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 transition-all hover:scale-105" data-testid="hero-cta-btn">
                  Ver Ofertas <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
            
            {/* Side banners */}
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-2xl transition-shadow" onClick={() => navigate('/categoria/accesorios-bano')}>
              <img 
                src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80"
                alt="Accesorios Baño"
                className="w-full h-44 object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-xl font-bold text-white drop-shadow">Accesorios Baño</h3>
                <p className="text-white/80 text-sm">Renueva tu baño</p>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden group cursor-pointer shadow-xl hover:shadow-2xl transition-shadow" onClick={() => navigate('/categoria/conexiones-electricas')}>
              <img 
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"
                alt="Conexiones Eléctricas"
                className="w-full h-44 object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-xl font-bold text-white drop-shadow">Conexiones Eléctricas</h3>
                <p className="text-white/80 text-sm">Material certificado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Carousel */}
      <section className="py-10 md:py-16 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-4 md:px-8">
            <h2 className="text-2xl md:text-3xl font-bold">Categorías</h2>
            <Link to="/categorias" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide pb-4 -mb-4">
              <div className="flex gap-4 px-4 md:px-8" style={{ width: 'max-content' }}>
                {categories.map((cat) => (
                  <Link 
                    key={cat.category_id}
                    to={`/categoria/${cat.slug}`}
                    className="group flex-shrink-0"
                    data-testid={`category-card-${cat.slug}`}
                  >
                    <Card className="w-36 md:w-44 overflow-hidden rounded-2xl border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="aspect-square relative overflow-hidden">
                        <img 
                          src={cat.image} 
                          alt={cat.name}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <CategoryIcon icon={cat.icon} className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-1">{cat.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
            {/* Gradient fade indicators */}
            <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none hidden md:block" />
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none hidden md:block" />
          </div>
        </div>
      </section>

      {/* Offers */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-muted to-background relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-orange-500 to-primary" />
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Ofertas Especiales</h2>
                <p className="text-muted-foreground text-sm">Los mejores descuentos</p>
              </div>
            </div>
            <Link to="/ofertas" className="text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all group" data-testid="see-all-offers">
              Ver todas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
      <section className="py-12 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Los Más Vendidos</h2>
                <p className="text-muted-foreground text-sm">Favoritos de nuestros clientes</p>
              </div>
            </div>
            <Link to="/mas-vendidos" className="text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all group" data-testid="see-all-bestsellers">
              Ver todos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
      <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Lo Nuevo</h2>
                <p className="text-muted-foreground text-sm">Recién llegados</p>
              </div>
            </div>
            <Link to="/nuevos" className="text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all group" data-testid="see-all-new">
              Ver todos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
  const [viewMode, setViewMode] = useState('grid');
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
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">{products.length} productos encontrados</p>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay productos en esta categoría</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <ProductListItem key={product.product_id} product={product} onQuickAdd={addToCart} />
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
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();

  const inWishlist = product ? isInWishlist(product.product_id) : false;

  useEffect(() => {
    // Scroll to top when product changes
    window.scrollTo(0, 0);
    
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId]);

  const handleAddToCart = () => {
    addToCart(product.product_id, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product.product_id, quantity);
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
              <span className="text-3xl font-bold text-primary">${product.price?.toFixed(2)}</span>
              {product.original_price && (
                <span className="text-xl text-muted-foreground line-through">${product.original_price?.toFixed(2)}</span>
              )}
              {product.original_price && (
                <Badge variant="destructive" className="text-xs">
                  -{Math.round((1 - product.price / product.original_price) * 100)}%
                </Badge>
              )}
            </div>

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

              {/* Desktop buttons */}
              <div className="hidden sm:flex flex-row gap-3">
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
          <section className="mt-12 pt-8 border-t pb-24 sm:pb-0">
            <h2 className="text-2xl font-bold mb-6">Productos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {related.slice(0, 4).map((prod) => (
                <ProductCard key={prod.product_id} product={prod} onQuickAdd={addToCart} />
              ))}
            </div>
          </section>
        )}
      </div>
      
      {/* Mobile Fixed Bottom Buttons */}
      {product && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50 flex gap-2">
          <Button 
            onClick={handleAddToCart}
            variant="outline"
            className="flex-1 rounded-sm font-bold uppercase border-2 border-secondary h-12"
            data-testid="mobile-add-to-cart-btn"
          >
            <ShoppingCart className="w-4 h-4 mr-1" /> Carrito
          </Button>
          <Button 
            onClick={handleBuyNow}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm font-bold uppercase h-12"
            data-testid="mobile-buy-now-btn"
          >
            Comprar Ahora
          </Button>
        </div>
      )}
    </main>
  );
};

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Resultados de búsqueda</h1>
            <p className="text-muted-foreground">"{query}" - {products.length} productos encontrados</p>
          </div>
          {products.length > 0 && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No se encontraron productos</p>
            <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <ProductListItem key={product.product_id} product={product} onQuickAdd={addToCart} />
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center p-4" data-testid="auth-page">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-0">
        <CardContent className="p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <Wrench className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">FERRE INTI</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea una cuenta nueva'}
            </p>
          </div>

          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid grid-cols-2 mb-6 rounded-xl p-1 bg-muted">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:shadow-sm" data-testid="login-tab">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:shadow-sm" data-testid="register-tab">Registrarse</TabsTrigger>
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
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="rounded-sm pr-10"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold uppercase py-3 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
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
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              o continúa con
            </span>
          </div>

          <Button 
            variant="outline" 
            className="w-full rounded-xl py-3 border-2 hover:bg-muted transition-all"
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

// ==================== CREDIT CARD COMPONENT ====================

const CreditCardInput = ({ cardData, setCardData, isFlipped, setIsFlipped }) => {
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const getCardType = (number) => {
    const n = number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return 'generic';
  };

  const cardType = getCardType(cardData.number);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Animated Card */}
      <div 
        className="relative h-56 mb-8"
        style={{ perspective: '1000px' }}
      >
        <div 
          className={`relative w-full h-full transition-transform duration-700`}
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Card Front */}
          <div 
            className="absolute inset-0 rounded-2xl p-6 text-white"
            style={{ 
              backfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Card Chip */}
            <div className="flex justify-between items-start mb-8">
              <div 
                className="w-14 h-10 rounded-md"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 50%, #ff8c00 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)'
                }}
              >
                <div className="w-full h-full grid grid-cols-3 gap-0.5 p-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-yellow-600/50 rounded-sm" />
                  ))}
                </div>
              </div>
              {/* Card Type Logo */}
              <div className="text-2xl font-bold tracking-wider">
                {cardType === 'visa' && <span className="italic text-blue-300">VISA</span>}
                {cardType === 'mastercard' && (
                  <div className="flex">
                    <div className="w-8 h-8 rounded-full bg-red-500 -mr-3 opacity-90" />
                    <div className="w-8 h-8 rounded-full bg-yellow-500 opacity-90" />
                  </div>
                )}
                {cardType === 'amex' && <span className="text-blue-200">AMEX</span>}
                {cardType === 'generic' && <CreditCard className="w-10 h-10 text-gray-300" />}
              </div>
            </div>
            
            {/* Card Number */}
            <div className="mb-6">
              <div 
                className="text-2xl tracking-[0.2em] font-mono"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                {cardData.number || '•••• •••• •••• ••••'}
              </div>
            </div>
            
            {/* Card Holder & Expiry */}
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Titular</div>
                <div className="text-sm font-medium tracking-wider uppercase">
                  {cardData.name || 'NOMBRE COMPLETO'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Expira</div>
                <div className="text-sm font-medium tracking-wider">
                  {cardData.expiry || 'MM/YY'}
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div 
              className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
            />
          </div>
          
          {/* Card Back */}
          <div 
            className="absolute inset-0 rounded-2xl text-white"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Magnetic Strip */}
            <div className="w-full h-12 bg-gray-900 mt-8" />
            
            {/* CVV Section */}
            <div className="px-6 mt-6">
              <div className="bg-white h-10 rounded flex items-center justify-end px-4">
                <span className="text-gray-900 font-mono text-lg tracking-widest">
                  {cardData.cvv || '•••'}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 text-right mt-1">CVV</div>
            </div>
            
            {/* Back Text */}
            <div className="px-6 mt-6 text-[9px] text-gray-500 leading-relaxed">
              <p>Esta tarjeta es propiedad del banco emisor. El uso no autorizado está prohibido.</p>
            </div>
            
            {/* Card Type Logo Back */}
            <div className="absolute bottom-6 right-6 text-xl font-bold">
              {cardType === 'visa' && <span className="italic text-blue-300">VISA</span>}
              {cardType === 'mastercard' && (
                <div className="flex">
                  <div className="w-6 h-6 rounded-full bg-red-500 -mr-2 opacity-90" />
                  <div className="w-6 h-6 rounded-full bg-yellow-500 opacity-90" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="cardNumber">Número de Tarjeta</Label>
          <Input
            id="cardNumber"
            value={cardData.number}
            onChange={(e) => setCardData(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="rounded-sm mt-1 text-lg tracking-wider"
            data-testid="card-number-input"
            onFocus={() => setIsFlipped(false)}
          />
        </div>
        <div>
          <Label htmlFor="cardName">Nombre del Titular</Label>
          <Input
            id="cardName"
            value={cardData.name}
            onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
            placeholder="NOMBRE COMPLETO"
            className="rounded-sm mt-1 uppercase"
            data-testid="card-name-input"
            onFocus={() => setIsFlipped(false)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cardExpiry">Fecha de Expiración</Label>
            <Input
              id="cardExpiry"
              value={cardData.expiry}
              onChange={(e) => setCardData(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
              placeholder="MM/YY"
              maxLength={5}
              className="rounded-sm mt-1"
              data-testid="card-expiry-input"
              onFocus={() => setIsFlipped(false)}
            />
          </div>
          <div>
            <Label htmlFor="cardCvv">CVV</Label>
            <Input
              id="cardCvv"
              type="password"
              value={cardData.cvv}
              onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="•••"
              maxLength={4}
              className="rounded-sm mt-1"
              data-testid="card-cvv-input"
              onFocus={() => setIsFlipped(true)}
              onBlur={() => setIsFlipped(false)}
            />
          </div>
        </div>
      </div>
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
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  
  // Credit Card State
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // Truck Animation State
  const [truckPhase, setTruckPhase] = useState('idle'); // idle, drive-in, loading, drive-out, done
  const [buttonText, setButtonText] = useState('FINALIZAR COMPRA');

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Auto-geocode when address changes
  const geocodeAddress = async () => {
    const fullAddress = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.zip_code}`.trim();
    if (!shippingAddress.street || !shippingAddress.city) return;
    
    setGeocodingAddress(true);
    try {
      // Using OpenStreetMap Nominatim API (free)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setShippingAddress(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        }));
        toast.success('Ubicación encontrada automáticamente');
        
        // Auto-calculate shipping
        setTimeout(() => calculateShippingWithCoords(parseFloat(lat), parseFloat(lon)), 500);
      } else {
        toast.error('No se encontró la dirección. Verifica los datos.');
      }
    } catch (err) {
      toast.error('Error al buscar la dirección');
    } finally {
      setGeocodingAddress(false);
    }
  };

  const calculateShippingWithCoords = async (lat, lng) => {
    setCalculatingShipping(true);
    try {
      const response = await axios.post(`${API}/shipping/calculate`, {
        address: { ...shippingAddress, lat, lng }
      });
      setShippingCost(response.data);
    } catch (err) {
      toast.error('Error al calcular envío');
    } finally {
      setCalculatingShipping(false);
    }
  };

  const calculateShipping = async () => {
    if (!shippingAddress.lat || !shippingAddress.lng) {
      toast.error('Primero busca tu dirección');
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

  const validateCard = () => {
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 16) {
      toast.error('Ingresa un número de tarjeta válido');
      return false;
    }
    if (!cardData.name) {
      toast.error('Ingresa el nombre del titular');
      return false;
    }
    if (!cardData.expiry || cardData.expiry.length < 5) {
      toast.error('Ingresa la fecha de expiración');
      return false;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      toast.error('Ingresa el CVV');
      return false;
    }
    return true;
  };

  const runTruckAnimation = () => {
    setButtonText('PROCESANDO...');
    setTruckPhase('drive-in');
    
    setTimeout(() => setTruckPhase('loading'), 700);
    setTimeout(() => setTruckPhase('drive-out'), 2400);
    setTimeout(() => {
      setTruckPhase('done');
      setButtonText('¡PEDIDO ENVIADO!');
    }, 3000);
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
    
    if (!validateCard()) {
      return;
    }
    
    setLoading(true);
    runTruckAnimation();
    
    try {
      const response = await axios.post(`${API}/payments/checkout`, {
        origin_url: window.location.origin,
        shipping_address: shippingAddress
      }, { withCredentials: true });
      
      // Wait for animation then redirect
      setTimeout(() => {
        window.location.href = response.data.url;
      }, 3500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al procesar el pago');
      setLoading(false);
      setTruckPhase('idle');
      setButtonText('FINALIZAR COMPRA');
    }
  };

  if (!user) return null;

  const total = cart.total + (shippingCost?.shipping_cost || 0);

  // Truck animation styles
  const truckStyles = `
    .truck-animation-zone {
      position: relative;
      width: 100%;
      height: 120px;
      overflow: hidden;
      pointer-events: none;
    }
    .truck {
      position: absolute;
      bottom: 5px;
      right: -140px;
      width: 110px;
      height: 70px;
      transition: right 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      transform: scaleX(-1);
    }
    .truck.drive-in { right: calc(50% - 55px); }
    .truck.drive-out { 
      right: -140px; 
      transition: right 0.5s cubic-bezier(0.6, 0.1, 1, 1); 
    }
    .truck.is-moving .wheel-rim { animation: spin 0.3s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .cargo-inside {
      position: absolute; left: 2px; bottom: 12px;
      width: 78px; height: 52px;
      background: #0a0f14;
      box-shadow: inset 0px 10px 15px rgba(0,0,0,0.9);
      border-radius: 4px 0 0 4px;
    }
    .cargo-body-fg {
      position: absolute; left: 8px; bottom: 12px;
      width: 72px; height: 52px;
      background: linear-gradient(180deg, #f59f18 0%, #e08a0a 100%);
      box-shadow: 2px -2px 5px rgba(0,0,0,0.2);
      display: flex; align-items: center; justify-content: center;
      border-radius: 2px 0 0 2px;
      overflow: hidden;
    }
    .logo-ferre {
      width: 45px; height: 45px;
      background-image: url('/logo-ferre.png');
      background-size: contain; background-repeat: no-repeat; background-position: center;
      filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.4));
    }
    .rear-door {
      position: absolute; left: 2px; bottom: 12px;
      width: 6px; height: 52px;
      background: linear-gradient(to right, #95a5a6, #7f8c8d);
      border-right: 1px solid #111; border-radius: 4px 0 0 4px;
      transform-origin: top;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .truck.open .rear-door { transform: scaleY(0); }
    .cab {
      position: absolute; left: 80px; bottom: 12px;
      width: 32px; height: 42px;
      background: linear-gradient(180deg, #f39c12 0%, #e67e22 100%);
      border-radius: 0 12px 6px 0;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
    }
    .window {
      position: absolute; right: 4px; top: 6px; width: 16px; height: 18px;
      background: linear-gradient(135deg, #d6eaf8 0%, #aed6f1 100%);
      border-radius: 0 8px 0 0; border: 1px solid #e67e22;
    }
    .headlight {
      position: absolute; right: 0px; top: 26px; width: 4px; height: 8px;
      background: #f1c40f; border-radius: 4px 0 0 4px; box-shadow: 0 0 5px #f1c40f;
    }
    .taillight {
      position: absolute; left: 1px; bottom: 16px; width: 3px; height: 10px;
      background: #e74c3c; box-shadow: 0 0 5px #e74c3c;
    }
    .bumper {
      position: absolute; left: 0; bottom: 8px; width: 112px; height: 5px;
      background: linear-gradient(to bottom, #333, #111); border-radius: 3px;
    }
    .wheel {
      position: absolute; bottom: 0; width: 24px; height: 24px;
      background: #1a1a1a; border-radius: 50%;
      box-shadow: 0 3px 5px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .wheel.back { left: 14px; }
    .wheel.front { left: 80px; }
    .wheel-rim {
      width: 14px; height: 14px;
      background: linear-gradient(135deg, #bdc3c7, #7f8c8d);
      border: 2px solid #333; border-radius: 50%;
    }
    .smoke {
      position: absolute; background: #eee; border-radius: 50%; opacity: 0;
    }
    .smoke-1 { width: 28px; height: 28px; bottom: -5px; left: 0px; }
    .smoke-2 { width: 20px; height: 20px; bottom: 2px; left: -12px; }
    .truck.drive-out .smoke-1 { animation: puff 0.6s ease-out; }
    .truck.drive-out .smoke-2 { animation: puff 0.5s 0.1s ease-out; }
    @keyframes puff { 
      0% { transform: scale(0.5); opacity: 0.7; } 
      100% { transform: scale(2.5) translateX(-25px); opacity: 0; } 
    }
    .box {
      position: absolute; bottom: -25px; left: 0px; width: 26px; height: 26px;
      background: #f59f18;
      border: 2px solid #d4850d; border-radius: 3px; opacity: 0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .box::before {
      content: '';
      width: 18px; height: 18px;
      background-image: url('/logo-ferre.png');
      background-size: contain; background-repeat: no-repeat; background-position: center;
    }
    .box.slide-up { animation: enterRear 0.9s forwards ease-in-out; }
    @keyframes enterRear {
      0% { transform: translate(0, 0); opacity: 0; }
      15% { opacity: 1; }
      45% { transform: translate(0, -46px); opacity: 1; }
      80% { transform: translate(32px, -46px) scale(0.8); opacity: 1; }
      100% { transform: translate(42px, -46px) scale(0.6); opacity: 0; }
    }
  `;

  const getTruckClasses = () => {
    let classes = 'truck';
    if (truckPhase === 'drive-in' || truckPhase === 'loading') classes += ' drive-in is-moving';
    if (truckPhase === 'loading') classes += ' open';
    if (truckPhase === 'drive-out' || truckPhase === 'done') classes += ' drive-out is-moving';
    return classes;
  };

  return (
    <main className="min-h-screen bg-muted" data-testid="checkout-page">
      <style>{truckStyles}</style>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Finalizar Compra</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Address & Cart */}
          <div className="space-y-6">
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
                  
                  {/* Auto Geocoding Button */}
                  <div className="p-4 bg-muted rounded-sm">
                    <Button 
                      onClick={geocodeAddress}
                      variant="outline"
                      className="w-full rounded-sm"
                      disabled={geocodingAddress || !shippingAddress.street || !shippingAddress.city}
                      data-testid="geocode-btn"
                    >
                      {geocodingAddress ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      {geocodingAddress ? 'Buscando ubicación...' : 'Buscar mi ubicación y calcular envío'}
                    </Button>
                    
                    {shippingAddress.lat && shippingAddress.lng && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Ubicación encontrada: {shippingAddress.lat.toFixed(4)}, {shippingAddress.lng.toFixed(4)}
                      </p>
                    )}
                    
                    {shippingCost && (
                      <Alert className={`mt-3 ${shippingCost.is_free ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold">
                                {shippingCost.is_free ? (
                                  <span className="text-green-600">¡Envío Gratis!</span>
                                ) : (
                                  <span className="text-blue-600">Costo de envío: ${shippingCost.shipping_cost?.toFixed(2)}</span>
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
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.product_id} className="flex gap-4">
                      <img 
                        src={item.product?.images?.[0] || 'https://via.placeholder.com/80'} 
                        alt={item.product?.name}
                        className="w-14 h-14 object-cover rounded-sm"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product?.name}</h4>
                        <p className="text-sm text-muted-foreground">Cant: {item.quantity}</p>
                        <p className="text-primary font-bold text-sm">${(item.product?.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Credit Card & Payment */}
          <div className="space-y-6">
            {/* Animated Credit Card */}
            <Card className="rounded-sm">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Datos de Pago
                </h2>
                <CreditCardInput 
                  cardData={cardData}
                  setCardData={setCardData}
                  isFlipped={isCardFlipped}
                  setIsFlipped={setIsCardFlipped}
                />
              </CardContent>
            </Card>

            {/* Payment Summary with Truck Animation */}
            <Card className="rounded-sm overflow-hidden">
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">Resumen de Pago</h2>
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
                        <span className="text-xs text-muted-foreground">Busca tu dirección</span>
                      )}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Truck Animation Zone */}
                <div className="relative w-full">
                  <div className="truck-animation-zone">
                    {/* Background truck layer */}
                    <div className={getTruckClasses()} style={{ zIndex: 10 }}>
                      <div className="cargo-inside"></div>
                    </div>
                    
                    {/* Box */}
                    <div className={`box ${truckPhase === 'loading' ? 'slide-up' : ''}`} style={{ zIndex: 20 }}></div>
                    
                    {/* Foreground truck layer */}
                    <div className={getTruckClasses()} style={{ zIndex: 30 }}>
                      <div className="smoke smoke-1"></div>
                      <div className="smoke smoke-2"></div>
                      <div className="bumper"></div>
                      <div className="cargo-body-fg">
                        <div className="logo-ferre"></div>
                      </div>
                      <div className="rear-door"></div>
                      <div className="taillight"></div>
                      <div className="cab">
                        <div className="window"></div>
                        <div className="headlight"></div>
                      </div>
                      <div className="wheel back"><div className="wheel-rim"></div></div>
                      <div className="wheel front"><div className="wheel-rim"></div></div>
                    </div>
                  </div>
                  
                  {/* Pay Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={loading || cart.items.length === 0}
                    className={`w-full py-4 text-white border-none rounded-xl font-bold text-base cursor-pointer transition-all duration-300 ${
                      truckPhase === 'done' 
                        ? 'bg-gradient-to-r from-green-600 to-green-500' 
                        : 'bg-gradient-to-r from-gray-800 to-gray-600 hover:shadow-lg hover:-translate-y-1'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                      borderTop: '1px solid rgba(255,255,255,0.1)'
                    }}
                    data-testid="pay-now-btn"
                  >
                    {buttonText}
                  </button>
                </div>
                
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Pago 100% seguro con encriptación SSL</span>
                </div>
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
  const [viewMode, setViewMode] = useState('grid');
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Ofertas Especiales</h1>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <ProductListItem key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const BestsellersPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Los Más Vendidos</h1>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <ProductListItem key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const NewProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Lo Nuevo</h1>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {products.map((product) => (
              <ProductListItem key={product.product_id} product={product} onQuickAdd={addToCart} />
            ))}
          </div>
        )}
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
