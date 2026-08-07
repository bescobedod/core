import { useState } from 'react';
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Calendar, UserCircle2, CheckCircle, XCircle, Edit2, Save, X, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ExternalEmployee, ExternalArea } from './ExternalPersonnelView';

interface ExternalEmployeeDetailViewProps {
  employee: ExternalEmployee;
  areas: ExternalArea[];
  onBack: () => void;
}

export function ExternalEmployeeDetailView({ employee, areas, onBack }: ExternalEmployeeDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<ExternalEmployee>(employee);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-GT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAreaName = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || 'N/A';
  };

  const getAreaManager = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area?.immediateManager || 'N/A';
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedEmployee(employee);
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof ExternalEmployee, value: string) => {
    setEditedEmployee({
      ...editedEmployee,
      [field]: value
    });
  };

  const handleDateChange = (field: 'hireDate' | 'accessStartDate' | 'accessEndDate', value: string) => {
    if (value) {
      setEditedEmployee({
        ...editedEmployee,
        [field]: new Date(value)
      });
    } else if (field === 'accessEndDate') {
      const { accessEndDate, ...rest } = editedEmployee;
      setEditedEmployee(rest as ExternalEmployee);
    }
  };

  const handleAccessTypeChange = (accessType: 'temporary' | 'indefinite') => {
    if (accessType === 'indefinite') {
      const { accessEndDate, ...rest } = editedEmployee;
      setEditedEmployee({
        ...rest,
        accessType
      } as ExternalEmployee);
    } else {
      setEditedEmployee({
        ...editedEmployee,
        accessType
      });
    }
  };

  const displayEmployee = isEditing ? editedEmployee : employee;

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header con botón de regreso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-gray-700 hover:text-[#2183AE] hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la lista
            </Button>

            {!isEditing ? (
              <Button
                onClick={handleEdit}
                className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 sm:p-8 text-white">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Foto de perfil */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0 border-4 border-white/30">
                {displayEmployee.profileImage ? (
                  <img
                    src={displayEmployee.profileImage}
                    alt={`${displayEmployee.firstName} ${displayEmployee.lastName}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold">
                    {getInitials(displayEmployee.firstName, displayEmployee.lastName)}
                  </span>
                )}
              </div>

              {/* Información básica */}
              <div className="flex-1 text-center sm:text-left">
                {!isEditing ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      {displayEmployee.firstName} {displayEmployee.lastName}
                    </h1>
                    <p className="text-lg text-white/90 mb-1">{displayEmployee.position}</p>
                    <p className="text-sm text-white/80 mb-3">{displayEmployee.company}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        displayEmployee.status === 'active'
                          ? 'bg-green-500 text-white'
                          : displayEmployee.status === 'expired'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {displayEmployee.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Activo
                          </>
                        ) : displayEmployee.status === 'expired' ? (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            Expirado
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Inactivo
                          </>
                        )}
                      </span>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                        {displayEmployee.id}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-white/80 mb-1 block">Nombre</Label>
                        <Input
                          value={editedEmployee.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="bg-white/90 text-gray-900"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-white/80 mb-1 block">Apellido</Label>
                        <Input
                          value={editedEmployee.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="bg-white/90 text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-white/80 mb-1 block">Puesto</Label>
                      <Input
                        value={editedEmployee.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="bg-white/90 text-gray-900"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/80 mb-1 block">Empresa</Label>
                      <Input
                        value={editedEmployee.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="bg-white/90 text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-[#2183AE]" />
              </div>
              <h3 className="font-semibold text-gray-900">Correo Electrónico</h3>
            </div>
            {!isEditing ? (
              <a
                href={`mailto:${displayEmployee.email}`}
                className="text-[#2183AE] hover:text-[#1a6a8f] transition-colors break-all"
              >
                {displayEmployee.email}
              </a>
            ) : (
              <Input
                type="email"
                value={editedEmployee.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="text-sm"
              />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
                <Phone className="h-5 w-5 text-[#2183AE]" />
              </div>
              <h3 className="font-semibold text-gray-900">Teléfono</h3>
            </div>
            {!isEditing ? (
              <a
                href={`tel:${displayEmployee.phone}`}
                className="text-[#2183AE] hover:text-[#1a6a8f] transition-colors"
              >
                {displayEmployee.phone}
              </a>
            ) : (
              <Input
                type="tel"
                value={editedEmployee.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="text-sm"
              />
            )}
          </div>
        </div>

        {/* Información del área */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#2183AE]" />
            </div>
            <h3 className="font-semibold text-gray-900">Información del Área</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">Área Asignada</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">{getAreaName(displayEmployee.areaId)}</p>
              ) : (
                <select
                  value={editedEmployee.areaId}
                  onChange={(e) => handleInputChange('areaId', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                >
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <UserCircle2 className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">Jefe Inmediato</span>
              </div>
              <p className="text-gray-900 font-medium pl-6">{getAreaManager(displayEmployee.areaId)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <CreditCard className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">DPI / Identificación</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">{displayEmployee.identificationNumber}</p>
              ) : (
                <Input
                  value={editedEmployee.identificationNumber}
                  onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {/* Información de acceso */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#2183AE]" />
            </div>
            <h3 className="font-semibold text-gray-900">Información de Acceso</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Tipo de Acceso</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">
                  {displayEmployee.accessType === 'indefinite' ? 'Tiempo Indefinido' : 'Tiempo Temporal'}
                </p>
              ) : (
                <div className="flex gap-2 pl-6">
                  <Button
                    onClick={() => handleAccessTypeChange('indefinite')}
                    size="sm"
                    className={editedEmployee.accessType === 'indefinite'
                      ? 'bg-[#2183AE] text-white hover:bg-[#1a6a8f]'
                      : 'bg-white/50 text-gray-700 hover:bg-white/70'
                    }
                  >
                    Indefinido
                  </Button>
                  <Button
                    onClick={() => handleAccessTypeChange('temporary')}
                    size="sm"
                    className={editedEmployee.accessType === 'temporary'
                      ? 'bg-[#2183AE] text-white hover:bg-[#1a6a8f]'
                      : 'bg-white/50 text-gray-700 hover:bg-white/70'
                    }
                  >
                    Temporal
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-800">Fecha de Inicio de Acceso</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6 capitalize">
                  {formatDate(displayEmployee.accessStartDate)}
                </p>
              ) : (
                <Input
                  type="date"
                  value={formatDateForInput(editedEmployee.accessStartDate)}
                  onChange={(e) => handleDateChange('accessStartDate', e.target.value)}
                  className="text-sm max-w-xs"
                />
              )}
            </div>

            {(displayEmployee.accessType === 'temporary' || isEditing) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">Fecha de Vencimiento de Acceso</span>
                </div>
                {!isEditing ? (
                  displayEmployee.accessEndDate ? (
                    <p className="text-gray-900 font-medium pl-6 capitalize">
                      {formatDate(displayEmployee.accessEndDate)}
                    </p>
                  ) : (
                    <p className="text-gray-500 italic pl-6">No aplica</p>
                  )
                ) : (
                  editedEmployee.accessType === 'temporary' && (
                    <Input
                      type="date"
                      value={editedEmployee.accessEndDate ? formatDateForInput(editedEmployee.accessEndDate) : ''}
                      onChange={(e) => handleDateChange('accessEndDate', e.target.value)}
                      className="text-sm max-w-xs"
                    />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
