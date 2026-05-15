import { useState } from 'react';
import { Search, Users, Calendar, Filter, UserCircle2, AlertCircle, Clock, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ExternalEmployee, ExternalArea } from './ExternalPersonnelView';

interface ExternalEmployeeListViewProps {
  onSelectEmployee: (employee: ExternalEmployee) => void;
  onBack: () => void;
  areas: ExternalArea[];
}

// Mock data
const mockEmployees: ExternalEmployee[] = [
  {
    id: "EXT-001",
    firstName: "Luis",
    lastName: "Ramírez",
    email: "luis.ramirez@seguridadgt.com",
    phone: "+502 5555-1111",
    company: "Seguridad GT",
    position: "Guardia de Seguridad",
    areaId: "AREA-001",
    accessType: "indefinite",
    accessStartDate: new Date("2024-01-15"),
    hireDate: new Date("2024-01-15"),
    status: "active",
    identificationNumber: "2345678901234"
  },
  {
    id: "EXT-002",
    firstName: "María",
    lastName: "Hernández",
    email: "maria.hernandez@limpiezapro.com",
    phone: "+502 5555-2222",
    company: "Limpieza Profesional",
    position: "Supervisora de Limpieza",
    areaId: "AREA-002",
    accessType: "temporary",
    accessStartDate: new Date("2024-11-01"),
    accessEndDate: new Date("2025-06-30"),
    hireDate: new Date("2024-11-01"),
    status: "active",
    identificationNumber: "3456789012345"
  },
  {
    id: "EXT-003",
    firstName: "Roberto",
    lastName: "Morales",
    email: "roberto.morales@itconsult.com",
    phone: "+502 5555-3333",
    company: "IT Consulting Solutions",
    position: "Consultor Senior",
    areaId: "AREA-003",
    accessType: "temporary",
    accessStartDate: new Date("2024-10-01"),
    accessEndDate: new Date("2024-12-31"),
    hireDate: new Date("2024-10-01"),
    terminationDate: new Date("2024-12-31"),
    status: "expired",
    identificationNumber: "4567890123456"
  }
];

export function ExternalEmployeeListView({ onSelectEmployee, areas, onBack }: ExternalEmployeeListViewProps) {
  const [filters, setFilters] = useState({
    firstName: "",
    lastName: "",
    company: "",
    areaId: "",
    accessType: "",
    status: ""
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<ExternalEmployee[]>([]);

  const handleSearch = () => {
    let results = mockEmployees;

    if (filters.firstName) {
      results = results.filter(emp =>
        emp.firstName.toLowerCase().includes(filters.firstName.toLowerCase())
      );
    }

    if (filters.lastName) {
      results = results.filter(emp =>
        emp.lastName.toLowerCase().includes(filters.lastName.toLowerCase())
      );
    }

    if (filters.company) {
      results = results.filter(emp =>
        emp.company.toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    if (filters.areaId) {
      results = results.filter(emp => emp.areaId === filters.areaId);
    }

    if (filters.accessType) {
      results = results.filter(emp => emp.accessType === filters.accessType);
    }

    if (filters.status) {
      results = results.filter(emp => emp.status === filters.status);
    }

    setFilteredEmployees(results);
    setHasSearched(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAreaName = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area?.name || 'N/A';
  };

  const getStatusBadge = (employee: ExternalEmployee) => {
    if (employee.status === 'active') {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
          Activo
        </span>
      );
    } else if (employee.status === 'expired') {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
          Expirado
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
          Inactivo
        </span>
      );
    }
  };

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-[#2183AE]" />
          <h3 className="font-semibold text-gray-900">Filtros de Búsqueda</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Nombre</Label>
            <Input
              value={filters.firstName}
              onChange={(e) => setFilters({ ...filters, firstName: e.target.value })}
              placeholder="Buscar por nombre"
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Apellido</Label>
            <Input
              value={filters.lastName}
              onChange={(e) => setFilters({ ...filters, lastName: e.target.value })}
              placeholder="Buscar por apellido"
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Empresa</Label>
            <Input
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              placeholder="Buscar por empresa"
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Área</Label>
            <select
              value={filters.areaId}
              onChange={(e) => setFilters({ ...filters, areaId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todas las áreas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Tipo de Acceso</Label>
            <select
              value={filters.accessType}
              onChange={(e) => setFilters({ ...filters, accessType: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="temporary">Temporal</option>
              <option value="indefinite">Indefinido</option>
            </select>
          </div>

          <div>
            <Label className="text-xs text-gray-600 mb-1.5 block">Estado</Label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="expired">Expirado</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSearch}
            className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
          >
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {hasSearched && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Resultados ({filteredEmployees.length})
            </h3>
          </div>

          {filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  onClick={() => onSelectEmployee(employee)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#2183AE] hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2183AE] to-[#1a6a8f] text-white rounded-full flex items-center justify-center flex-shrink-0">
                      {employee.profileImage ? (
                        <img
                          src={employee.profileImage}
                          alt={`${employee.firstName} ${employee.lastName}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold">
                          {getInitials(employee.firstName, employee.lastName)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {employee.firstName} {employee.lastName}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">{employee.position}</p>
                      <p className="text-xs text-gray-500 truncate">{employee.company}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-[#2183AE]" />
                      <span className="truncate">{getAreaName(employee.areaId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-[#2183AE]" />
                      <span>
                        {employee.accessType === 'indefinite' ? 'Indefinido' : 'Temporal'}
                      </span>
                    </div>
                    {employee.accessType === 'temporary' && employee.accessEndDate && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Vence: {formatDate(employee.accessEndDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {getStatusBadge(employee)}
                    <p className="text-xs text-[#2183AE] group-hover:text-[#1a6a8f] font-medium">
                      Ver detalles →
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No se encontró personal externo con los filtros seleccionados</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
          <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-gray-900 mb-2">Realiza una búsqueda</h3>
          <p className="text-gray-600 text-sm">
            Utiliza los filtros para buscar personal externo y ver sus detalles
          </p>
        </div>
      )}
    </div>
  );
}
