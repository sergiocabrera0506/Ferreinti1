import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Search, Loader2, Users, Eye, Shield, ShieldOff
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API}/admin/users?${params}`, { withCredentials: true });
      setUsers(response.data.users);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openUserDetail = async (user) => {
    try {
      const response = await axios.get(`${API}/admin/users/${user.user_id}`, { withCredentials: true });
      setSelectedUser(response.data);
      setDialogOpen(true);
    } catch (err) {
      toast.error('Error al cargar detalles');
    }
  };

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      await axios.put(`${API}/admin/users/${userId}/role?role=${newRole}`, {}, { withCredentials: true });
      toast.success(`Rol actualizado a: ${newRole === 'admin' ? 'Administrador' : 'Cliente'}`);
      fetchUsers();
      if (selectedUser?.user?.user_id === userId) {
        setSelectedUser(prev => ({
          ...prev,
          user: { ...prev.user, role: newRole }
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar rol');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">{users.length} usuarios registrados</p>
      </div>

      {/* Search */}
      <Card className="rounded-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-sm"
              data-testid="search-users"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-medium hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Registro</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.user_id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.picture} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[150px]">{user.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Cliente'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openUserDetail(user)}
                        data-testid={`view-user-${user.user_id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => toggleUserRole(user.user_id, user.role)}
                        title={user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      >
                        {user.role === 'admin' ? (
                          <ShieldOff className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Shield className="w-4 h-4 text-blue-500" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay usuarios</p>
          </div>
        )}
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={selectedUser.user.picture} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedUser.user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.user.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.user.email}</p>
                  <Badge variant={selectedUser.user.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                    {selectedUser.user.role === 'admin' ? 'Administrador' : 'Cliente'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-primary">{selectedUser.orders?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Pedidos</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedUser.orders?.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Comprado</p>
                </div>
              </div>

              {/* Recent Orders */}
              {selectedUser.orders?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Pedidos Recientes</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUser.orders.map((order) => (
                      <div key={order.order_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-sm">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground">{order.order_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${order.total?.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Registrado: {new Date(selectedUser.user.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
