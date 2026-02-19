import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderOpen, ShoppingBag, Users, Truck,
  Menu, X, LogOut, Wrench, Home
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/productos', icon: Package, label: 'Productos' },
  { path: '/admin/categorias', icon: FolderOpen, label: 'Categorias' },
  { path: '/admin/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { path: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { path: '/admin/envios', icon: Truck, label: 'Configurar Envios' },
];

export const AdminLayout = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/');
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="min-h-screen bg-muted flex" data-testid="admin-layout">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-secondary text-secondary-foreground sticky top-0 h-screen">
        <div className="p-4 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-lg">FERRE INTI</span>
            <p className="text-xs text-secondary-foreground/60">Panel Admin</p>
          </div>
        </div>
        <Separator className="bg-white/10" />
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${
                  isActive(item)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-secondary-foreground/70 hover:bg-white/10 hover:text-white'
                }`}
                data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <Separator className="bg-white/10" />
        <div className="p-4 space-y-2">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-secondary-foreground/70 hover:text-white transition-colors" data-testid="admin-nav-store">
            <Home className="w-5 h-5" />
            <span>Ver Tienda</span>
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 transition-colors w-full" data-testid="admin-logout-btn">
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-secondary text-secondary-foreground h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold">Admin</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 h-full bg-secondary text-secondary-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 pt-16">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors ${
                      isActive(item) ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground/70 hover:bg-white/10'
                    }`}>
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <Separator className="my-4 bg-white/10" />
              <Link to="/" className="flex items-center gap-3 px-3 py-2 text-secondary-foreground/70" onClick={() => setSidebarOpen(false)}>
                <Home className="w-5 h-5" />
                <span>Ver Tienda</span>
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-red-400 w-full">
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesion</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:overflow-auto">
        <div className="lg:hidden h-14" />
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
