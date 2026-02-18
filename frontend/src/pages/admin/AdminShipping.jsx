import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Truck, MapPin, DollarSign, Loader2, Save, Info
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminShipping = () => {
  const [config, setConfig] = useState({
    store_lat: -12.1190285,
    store_lng: -77.0349915,
    free_radius_km: 5.0,
    price_per_km: 1.50,
    min_shipping_cost: 5.0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLat, setTestLat] = useState('');
  const [testLng, setTestLng] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API}/admin/shipping`, { withCredentials: true });
        setConfig(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/shipping`, config, { withCredentials: true });
      toast.success('Configuración de envío actualizada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testLat || !testLng) {
      toast.error('Ingresa las coordenadas para probar');
      return;
    }
    
    setTesting(true);
    try {
      const response = await axios.post(`${API}/shipping/calculate`, {
        address: {
          street: 'Test',
          city: 'Test',
          state: 'Test',
          zip_code: '00000',
          lat: parseFloat(testLat),
          lng: parseFloat(testLng)
        }
      });
      setTestResult(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al calcular');
    } finally {
      setTesting(false);
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
    <div className="space-y-6" data-testid="admin-shipping">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Envíos</h1>
        <p className="text-muted-foreground">Define las zonas de envío y precios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Ubicación de la Tienda
            </CardTitle>
            <CardDescription>
              Coordenadas del local para calcular distancias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitud</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={config.store_lat}
                  onChange={(e) => setConfig(prev => ({ ...prev, store_lat: parseFloat(e.target.value) }))}
                  className="rounded-sm mt-1"
                  data-testid="store-lat-input"
                />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input
                  type="number"
                  step="0.0000001"
                  value={config.store_lng}
                  onChange={(e) => setConfig(prev => ({ ...prev, store_lng: parseFloat(e.target.value) }))}
                  className="rounded-sm mt-1"
                  data-testid="store-lng-input"
                />
              </div>
            </div>
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Puedes obtener las coordenadas de Google Maps haciendo clic derecho en la ubicación.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" /> Zonas de Envío
            </CardTitle>
            <CardDescription>
              Configura el radio de envío gratis y precios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Radio de Envío Gratis (km)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.free_radius_km}
                onChange={(e) => setConfig(prev => ({ ...prev, free_radius_km: parseFloat(e.target.value) }))}
                className="rounded-sm mt-1"
                data-testid="free-radius-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Los clientes dentro de este radio recibirán envío gratis
              </p>
            </div>
            <div>
              <Label>Precio por Kilómetro (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.price_per_km}
                onChange={(e) => setConfig(prev => ({ ...prev, price_per_km: parseFloat(e.target.value) }))}
                className="rounded-sm mt-1"
                data-testid="price-per-km-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se cobra por cada km adicional fuera de la zona gratis
              </p>
            </div>
            <div>
              <Label>Costo Mínimo de Envío (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.min_shipping_cost}
                onChange={(e) => setConfig(prev => ({ ...prev, min_shipping_cost: parseFloat(e.target.value) }))}
                className="rounded-sm mt-1"
                data-testid="min-shipping-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Costo mínimo cuando hay cobro de envío
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <Card className="rounded-sm">
        <CardContent className="p-4">
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-primary rounded-sm"
            data-testid="save-shipping-config"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* Test Calculator */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Probar Cálculo
          </CardTitle>
          <CardDescription>
            Ingresa coordenadas para ver cuánto costaría el envío
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Latitud del cliente</Label>
              <Input
                type="number"
                step="0.0000001"
                placeholder="-12.123456"
                value={testLat}
                onChange={(e) => setTestLat(e.target.value)}
                className="rounded-sm mt-1"
              />
            </div>
            <div>
              <Label>Longitud del cliente</Label>
              <Input
                type="number"
                step="0.0000001"
                placeholder="-77.123456"
                value={testLng}
                onChange={(e) => setTestLng(e.target.value)}
                className="rounded-sm mt-1"
              />
            </div>
          </div>
          <Button 
            onClick={handleTest} 
            disabled={testing}
            variant="outline" 
            className="rounded-sm"
            data-testid="test-shipping-calc"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Calcular Envío
          </Button>

          {testResult && (
            <Alert className={testResult.is_free ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-bold text-lg">
                    {testResult.is_free ? (
                      <span className="text-green-600">¡Envío Gratis!</span>
                    ) : (
                      <span className="text-blue-600">Costo: ${testResult.shipping_cost?.toFixed(2)}</span>
                    )}
                  </p>
                  <p className="text-sm">Distancia: {testResult.distance_km} km</p>
                  <p className="text-sm text-muted-foreground">{testResult.message}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Visual Summary */}
      <Card className="rounded-sm bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4">Resumen de Configuración</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white rounded-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{config.free_radius_km} km</p>
              <p className="text-sm text-muted-foreground">Zona Gratis</p>
            </div>
            <div className="p-4 bg-white rounded-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">${config.price_per_km}/km</p>
              <p className="text-sm text-muted-foreground">Precio por km extra</p>
            </div>
            <div className="p-4 bg-white rounded-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">${config.min_shipping_cost}</p>
              <p className="text-sm text-muted-foreground">Costo Mínimo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShipping;
