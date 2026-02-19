import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ShoppingBag, Eye, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = { pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', confirmed: 'bg-blue-100 text-blue-800 border-blue-200', shipped: 'bg-purple-100 text-purple-800 border-purple-200', delivered: 'bg-green-100 text-green-800 border-green-200', cancelled: 'bg-red-100 text-red-800 border-red-200' };
const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };
const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try { const params = new URLSearchParams(); if (statusFilter) params.append('status', statusFilter); const response = await axios.get(`${API}/admin/orders?${params}`, { withCredentials: true }); setOrders(response.data.orders); } catch (err) { toast.error('Error al cargar pedidos'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const openOrderDetail = async (order) => {
    try { const response = await axios.get(`${API}/admin/orders/${order.order_id}`, { withCredentials: true }); setSelectedOrder(response.data); setDialogOpen(true); } catch (err) { toast.error('Error al cargar detalles'); }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try { await axios.put(`${API}/admin/orders/${orderId}/status`, { status: newStatus }, { withCredentials: true }); toast.success(`Estado actualizado a: ${statusLabels[newStatus]}`); fetchOrders(); if (selectedOrder?.order_id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus })); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error al actualizar'); } finally { setUpdating(false); }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);

  return (
    <div className="space-y-6" data-testid="admin-orders">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 className="text-2xl font-bold">Pedidos</h1><p className="text-muted-foreground">{orders.length} pedidos</p></div></div>
      <Card className="rounded-sm"><CardContent className="p-4"><Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}><SelectTrigger className="w-full sm:w-48 rounded-sm"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{statusOptions.map(status => (<SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>))}</SelectContent></Select></CardContent></Card>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.order_id} className="rounded-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2"><Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge><span className="text-sm text-muted-foreground font-mono">{order.order_id}</span></div>
                  <p className="font-medium">{order.user_name || 'Cliente'}</p><p className="text-sm text-muted-foreground">{order.user_email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto py-2 lg:py-0">
                  {order.items?.slice(0, 3).map((item, idx) => (<img key={idx} src={item.image || 'https://via.placeholder.com/48'} alt={item.name} className="w-12 h-12 object-cover rounded-sm flex-shrink-0" />))}
                  {order.items?.length > 3 && <div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center text-sm font-medium">+{order.items.length - 3}</div>}
                </div>
                <div className="flex items-center justify-between lg:flex-col lg:items-end gap-2">
                  <div className="text-right"><p className="text-lg font-bold text-primary">${order.total?.toFixed(2)}</p>{order.shipping_cost > 0 && <p className="text-xs text-muted-foreground">Envio: ${order.shipping_cost?.toFixed(2)}</p>}</div>
                  <div className="flex gap-2">
                    <Select value={order.status} onValueChange={(val) => updateOrderStatus(order.order_id, val)} disabled={updating}><SelectTrigger className="w-36 rounded-sm text-sm"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map(status => (<SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>))}</SelectContent></Select>
                    <Button variant="outline" size="icon" onClick={() => openOrderDetail(order)} className="rounded-sm" data-testid={`view-order-${order.order_id}`}><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {orders.length === 0 && <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No hay pedidos</p></div>}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detalle del Pedido</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><p className="font-mono text-sm text-muted-foreground">{selectedOrder.order_id}</p><Badge className={statusColors[selectedOrder.status]}>{statusLabels[selectedOrder.status]}</Badge></div><div className="text-right"><p className="text-2xl font-bold text-primary">${selectedOrder.total?.toFixed(2)}</p><p className="text-sm text-muted-foreground">{new Date(selectedOrder.created_at).toLocaleDateString('es-ES')}</p></div></div>
              <Separator /><div><h4 className="font-semibold mb-2">Cliente</h4><p>{selectedOrder.user_name}</p><p className="text-sm text-muted-foreground">{selectedOrder.user_email}</p></div>
              {selectedOrder.shipping_address && <div><h4 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Direccion de Envio</h4><p className="text-sm">{selectedOrder.shipping_address.street}</p><p className="text-sm text-muted-foreground">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zip_code}</p></div>}
              <Separator /><div><h4 className="font-semibold mb-3">Productos</h4><div className="space-y-3">{selectedOrder.items?.map((item, idx) => (<div key={idx} className="flex items-center gap-3 p-2 bg-muted/50 rounded-sm"><img src={item.image || 'https://via.placeholder.com/48'} alt={item.name} className="w-12 h-12 object-cover rounded-sm" /><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{item.name}</p><p className="text-sm text-muted-foreground">Cantidad: {item.quantity}</p></div><p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p></div>))}</div></div>
              <Separator /><div className="space-y-2"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${selectedOrder.subtotal?.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Envio</span><span>{selectedOrder.shipping_cost > 0 ? `$${selectedOrder.shipping_cost?.toFixed(2)}` : 'Gratis'}</span></div><div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">${selectedOrder.total?.toFixed(2)}</span></div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
