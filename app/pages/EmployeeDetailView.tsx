import { useState } from 'react';
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Grid3x3, Calendar, UserCircle2, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  area: string;
  department: string;
  hireDate: Date;
  terminationDate?: Date;
  profileImage?: string;
  status: 'active' | 'inactive';
}

interface EmployeeDetailViewProps {
  employee: Employee;
  onBack: () => void;
}

export function EmployeeDetailView({ employee, onBack }: EmployeeDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<Employee>(employee);

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

  const handleInputChange = (field: keyof Employee, value: string) => {
    setEditedEmployee({
      ...editedEmployee,
      [field]: value
    });
  };

  const handleDateChange = (field: 'hireDate' | 'terminationDate', value: string) => {
    if (value) {
      setEditedEmployee({
        ...editedEmployee,
        [field]: new Date(value)
      });
    } else if (field === 'terminationDate') {
      const { terminationDate, ...rest } = editedEmployee;
      setEditedEmployee(rest as Employee);
    }
  };

  const handleStatusChange = (status: 'active' | 'inactive') => {
    setEditedEmployee({
      ...editedEmployee,
      status
    });
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
                    <p className="text-lg text-white/90 mb-3">{displayEmployee.position}</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        displayEmployee.status === 'active'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}>
                        {displayEmployee.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Activo
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
                      <Label className="text-xs text-white/80 mb-1 block">Estado</Label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleStatusChange('active')}
                          size="sm"
                          className={editedEmployee.status === 'active'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-white/20 text-white hover:bg-white/30'
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activo
                        </Button>
                        <Button
                          onClick={() => handleStatusChange('inactive')}
                          size="sm"
                          className={editedEmployee.status === 'inactive'
                            ? 'bg-gray-500 text-white hover:bg-gray-600'
                            : 'bg-white/20 text-white hover:bg-white/30'
                          }
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Inactivo
                        </Button>
                      </div>
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

        {/* Información organizacional */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-[#2183AE]" />
            </div>
            <h3 className="font-semibold text-gray-900">Información Organizacional</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Building2 className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">Departamento</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">{displayEmployee.department}</p>
              ) : (
                <Input
                  value={editedEmployee.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Grid3x3 className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">Área</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">{displayEmployee.area}</p>
              ) : (
                <Input
                  value={editedEmployee.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <UserCircle2 className="h-4 w-4 text-[#2183AE]" />
                <span className="text-xs font-medium">Puesto</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6">{displayEmployee.position}</p>
              ) : (
                <Input
                  value={editedEmployee.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="text-sm"
                />
              )}
            </div>
          </div>
        </div>

        {/* Información de fechas */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 bg-[#2183AE]/10 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#2183AE]" />
            </div>
            <h3 className="font-semibold text-gray-900">Historial Laboral</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-800">Fecha de Alta</span>
              </div>
              {!isEditing ? (
                <p className="text-gray-900 font-medium pl-6 capitalize">
                  {formatDate(displayEmployee.hireDate)}
                </p>
              ) : (
                <Input
                  type="date"
                  value={formatDateForInput(editedEmployee.hireDate)}
                  onChange={(e) => handleDateChange('hireDate', e.target.value)}
                  className="text-sm max-w-xs"
                />
              )}
            </div>

            {(displayEmployee.terminationDate || isEditing) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-800">Fecha de Baja</span>
                </div>
                {!isEditing ? (
                  displayEmployee.terminationDate && (
                    <p className="text-gray-900 font-medium pl-6 capitalize">
                      {formatDate(displayEmployee.terminationDate)}
                    </p>
                  )
                ) : (
                  <Input
                    type="date"
                    value={editedEmployee.terminationDate ? formatDateForInput(editedEmployee.terminationDate) : ''}
                    onChange={(e) => handleDateChange('terminationDate', e.target.value)}
                    className="text-sm max-w-xs"
                  />
                )}
              </div>
            )}

            {!displayEmployee.terminationDate && !isEditing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Este empleado se encuentra actualmente en funciones
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
