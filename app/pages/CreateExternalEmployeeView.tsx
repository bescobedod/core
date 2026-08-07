import { useState } from 'react';
import { ArrowLeft, Save, UserPlus, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ExternalEmployee, ExternalArea } from './ExternalPersonnelView';

interface CreateExternalEmployeeViewProps {
  areas: ExternalArea[];
  onBack: () => void;
  onEmployeeCreated: (employee: ExternalEmployee) => void;
}

export function CreateExternalEmployeeView({ areas, onBack, onEmployeeCreated }: CreateExternalEmployeeViewProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    areaId: areas.length > 0 ? areas[0].id : '',
    identificationNumber: '',
    accessType: 'indefinite' as 'temporary' | 'indefinite',
    accessStartDate: new Date().toISOString().split('T')[0],
    accessEndDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (!formData.company || !formData.position || !formData.areaId) {
      alert('Por favor complete la información laboral');
      return;
    }

    if (!formData.identificationNumber) {
      alert('Por favor ingrese el número de identificación');
      return;
    }

    if (formData.accessType === 'temporary' && !formData.accessEndDate) {
      alert('Por favor ingrese la fecha de vencimiento para acceso temporal');
      return;
    }

    const newEmployee: ExternalEmployee = {
      id: `EXT-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      position: formData.position,
      areaId: formData.areaId,
      identificationNumber: formData.identificationNumber,
      accessType: formData.accessType,
      accessStartDate: new Date(formData.accessStartDate),
      accessEndDate: formData.accessEndDate ? new Date(formData.accessEndDate) : undefined,
      hireDate: new Date(formData.accessStartDate),
      status: 'active',
      profileImage: undefined
    };
    onEmployeeCreated(newEmployee);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleAccessTypeChange = (accessType: 'temporary' | 'indefinite') => {
    setFormData({
      ...formData,
      accessType,
      accessEndDate: accessType === 'indefinite' ? '' : formData.accessEndDate
    });
  };

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-gray-700 hover:text-[#2183AE] hover:bg-gray-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-white mb-0">Nuevo Personal Externo</h2>
                <p className="text-sm text-white/90">
                  Complete la información del nuevo colaborador externo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Nombre *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Ingrese el nombre"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Apellido *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Ingrese el apellido"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Correo Electrónico *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Teléfono *</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+502 5555-1234"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700 mb-1.5 block">DPI / Número de Identificación *</Label>
                <Input
                  value={formData.identificationNumber}
                  onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                  placeholder="Ingrese el número de identificación"
                  required
                />
              </div>
            </div>
          </div>

          {/* Información Laboral */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Información Laboral</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Empresa *</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Nombre de la empresa"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-1.5 block">Puesto *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Cargo o puesto"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700 mb-1.5 block">Área Asignada *</Label>
                <select
                  value={formData.areaId}
                  onChange={(e) => handleInputChange('areaId', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                  required
                >
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>
                      {area.name} - Jefe: {area.immediateManager}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de Acceso */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#2183AE]" />
              Configuración de Acceso
            </h3>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">Tipo de Acceso *</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => handleAccessTypeChange('indefinite')}
                    className={formData.accessType === 'indefinite'
                      ? 'bg-[#2183AE] text-white hover:bg-[#1a6a8f]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Tiempo Indefinido
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleAccessTypeChange('temporary')}
                    className={formData.accessType === 'temporary'
                      ? 'bg-[#2183AE] text-white hover:bg-[#1a6a8f]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Tiempo Temporal
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-700 mb-1.5 block">Fecha de Inicio *</Label>
                  <Input
                    type="date"
                    value={formData.accessStartDate}
                    onChange={(e) => handleInputChange('accessStartDate', e.target.value)}
                    required
                  />
                </div>

                {formData.accessType === 'temporary' && (
                  <div>
                    <Label className="text-sm text-gray-700 mb-1.5 block">Fecha de Vencimiento *</Label>
                    <Input
                      type="date"
                      value={formData.accessEndDate}
                      onChange={(e) => handleInputChange('accessEndDate', e.target.value)}
                      min={formData.accessStartDate}
                      required
                    />
                  </div>
                )}
              </div>

              {formData.accessType === 'indefinite' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    El acceso será indefinido. Puede modificar esto más adelante si es necesario.
                  </p>
                </div>
              )}

              {formData.accessType === 'temporary' && formData.accessEndDate && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    El acceso expirará automáticamente el {new Date(formData.accessEndDate).toLocaleDateString('es-GT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
            >
              <Save className="h-4 w-4 mr-2" />
              Crear Personal Externo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}