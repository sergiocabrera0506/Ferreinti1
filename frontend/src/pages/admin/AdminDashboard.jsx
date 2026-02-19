import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package, Users, ShoppingBag, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ title, value, icon: Icon, color = "primary" }) => (
  <Card className="rounded-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
          color === 'primary' ? 'bg-primary/10 text-primary' :
          color === 'green' ? 'bg-green-100 text-green-600' :
          color === 'blue' ? 'bg-blue-100 text-blue-600' :
          color === 'orange' ? 'bg-orange-100 text-orange-600' :
          'bg-muted text-muted-foreground'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/admin/dashboard`, { withCredentials: true });
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="admin-dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground" data-testid="admin-dashboard-error">Error al cargar estadisticas</div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de tu tienda</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas del Mes" value={`$${stats.revenue.month.toFixed(2)}`} icon={DollarSign} color="green" />
        <StatCard title="Total Pedidos" value={stats.total_orders} icon={ShoppingBag} color="blue" />
        <StatCard title="Productos" value={stats.total_products} icon={Package} color="primary" />
        <StatCard title="Usuarios" value={stats.total_users} icon={Users} color="orange" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">${stats.revenue.today.toFixed(2)}</p></CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ventas Semana</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">${stats.revenue.week.toFixed(2)}</p></CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ventas Totales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">${stats.revenue.total.toFixed(2)}</p></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.pending_orders > 0 && (
          <Card className="rounded-sm border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-sm flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-800">{stats.pending_orders} pedidos pendientes</p>
                <p className="text-sm text-yellow-600">Requieren atencion</p>
              </div>
            </CardContent>
          </Card>
        )}
        {stats.low_stock_products > 0 && (
          <Card className="rounded-sm border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-800">{stats.low_stock_products} productos con stock bajo</p>
                <p className="text-sm text-red-600">Menos de 10 unidades</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-sm">
          <CardHeader><CardTitle className="text-lg">Pedidos Recientes</CardTitle></CardHeader>
          <CardContent>
            {stats.recent_orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay pedidos</p>
            ) : (
              <div className="space-y-3">
                {stats.recent_orders.map((order) => (
                  <div key={order.order_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-sm">
                    <div>
                      <p className="font-medium text-sm">{order.user_name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">{order.order_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${order.total?.toFixed(2)}</p>
                      <Badge className={`text-xs ${statusColors[order.status] || 'bg-gray-100'}`}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-sm">
          <CardHeader><CardTitle className="text-lg">Productos Mas Vendidos</CardTitle></CardHeader>
          <CardContent>
            {stats.top_products.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {stats.top_products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-sm">
                    <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center text-primary font-bold">{idx + 1}</div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{product.name || product._id}</p></div>
                    <Badge variant="secondary">{product.total_sold} vendidos</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
