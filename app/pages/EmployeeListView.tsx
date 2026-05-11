import { useState } from 'react';
import { Search, Users, Calendar, Filter, UserCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { UserModel } from '../types/UserModel';



interface EmployeeListViewProps {
  onSelectEmployee: (employee: UserModel) => void;
  onBack: () => void;
}

export function EmployeeListView({ onSelectEmployee }: EmployeeListViewProps) {
  const [filters, setFilters] = useState({
    firstName: "",
    lastName: "",
    position: "",
    area: "",
    department: "",
    hireDateFrom: "",
    hireDateTo: "",
    terminationDateFrom: "",
    terminationDateTo: ""
  });
  const [employees, setEmployees] = useState<UserModel[] | []>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<UserModel[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  const handleSearch = () => {
    let results = employees;

    if (filters.firstName) {
      results = results.filter(emp =>
        emp.first_name.toLowerCase().includes(filters.firstName.toLowerCase())
      );
    }

    if (filters.lastName) {
      results = results.filter(emp =>
        emp.first_last_name.toLowerCase().includes(filters.lastName.toLowerCase())
      );
    }

    if (filters.position) {
      results = results.filter(emp =>
        emp.puesto_trabajo.toLowerCase().includes(filters.position.toLowerCase())
      );
    }

    if (filters.area) {
      results = results.filter(emp =>
        emp.id_area.toLowerCase().includes(filters.area.toLowerCase())
      );
    }

    if (filters.department) {
      results = results.filter(emp =>
        emp.id_departamento.toLowerCase().includes(filters.department.toLowerCase())
      );
    }

    // if (filters.hireDateFrom) {
    //   const fromDate = new Date(filters.hireDateFrom);
    //   results = results.filter(emp => emp.hireDate >= fromDate);
    // }

    // if (filters.hireDateTo) {
    //   const toDate = new Date(filters.hireDateTo);
    //   results = results.filter(emp => emp.hireDate <= toDate);
    // }

    // if (filters.terminationDateFrom) {
    //   const fromDate = new Date(filters.terminationDateFrom);
    //   results = results.filter(emp => emp.terminationDate && emp.terminationDate >= fromDate);
    // }

    // if (filters.terminationDateTo) {
    //   const toDate = new Date(filters.terminationDateTo);
    //   results = results.filter(emp => emp.terminationDate && emp.terminationDate <= toDate);
    // }

    setFilteredEmployees(results);
    setCurrentPage(1);
    setHasSearched(true);
  };

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
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

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white mb-0">Administración de Personal</h2>
              <p className="text-sm text-white/90">
                Busca y consulta información de empleados
              </p>
            </div>
          </div>
        </div>

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
              <Label className="text-xs text-gray-600 mb-1.5 block">Puesto</Label>
              <Input
                value={filters.position}
                onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                placeholder="Buscar por puesto"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Área</Label>
              <Input
                value={filters.area}
                onChange={(e) => setFilters({ ...filters, area: e.target.value })}
                placeholder="Buscar por área"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Departamento</Label>
              <Input
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                placeholder="Buscar por departamento"
                className="text-sm"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1"></div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Fecha de Alta (Desde)</Label>
              <Input
                type="date"
                value={filters.hireDateFrom}
                onChange={(e) => setFilters({ ...filters, hireDateFrom: e.target.value })}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Fecha de Alta (Hasta)</Label>
              <Input
                type="date"
                value={filters.hireDateTo}
                onChange={(e) => setFilters({ ...filters, hireDateTo: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1"></div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Fecha de Baja (Desde)</Label>
              <Input
                type="date"
                value={filters.terminationDateFrom}
                onChange={(e) => setFilters({ ...filters, terminationDateFrom: e.target.value })}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1.5 block">Fecha de Baja (Hasta)</Label>
              <Input
                type="date"
                value={filters.terminationDateTo}
                onChange={(e) => setFilters({ ...filters, terminationDateTo: e.target.value })}
                className="text-sm"
              />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="font-semibold text-gray-900">
                Resultados ({filteredEmployees.length})
              </h3>
              {filteredEmployees.length > ITEMS_PER_PAGE && (
                <p className="text-sm text-gray-600">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} de {filteredEmployees.length}
                </p>
              )}
            </div>

            {filteredEmployees.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentEmployees.map((employee) => (
                  <div
                    key={employee.id_users}
                    onClick={() => onSelectEmployee(employee)}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#2183AE] hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2183AE] to-[#1a6a8f] text-white rounded-full flex items-center justify-center flex-shrink-0">
                        {employee.image_profile ? (
                          <img
                            src={employee.image_profile}
                            alt={`${employee.first_name} ${employee.first_last_name}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold">
                            {getInitials(employee.first_name, employee.first_last_name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {employee.first_name} {employee.first_last_name}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">{employee.puesto_trabajo}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                          employee.baja
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {employee.baja ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-3 w-3 text-[#2183AE]" />
                        <span className="truncate">{employee.id_departamento} - {employee.id_area}</span>
                      </div>
                      {/* <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-[#2183AE]" />
                        <span>Alta: {formatDate(employee.hireDate)}</span>
                      </div>
                      {employee.terminationDate && (
                        <div className="flex items-center gap-2 text-red-600">
                          <Calendar className="h-3 w-3" />
                          <span>Baja: {formatDate(employee.terminationDate)}</span>
                        </div>
                      )} */}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-[#2183AE] group-hover:text-[#1a6a8f] font-medium text-center">
                        Ver detalles →
                      </p>
                    </div>
                  </div>
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Anterior</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers().map((page, index) => (
                            <div key={index}>
                              {page === '...' ? (
                                <span className="px-3 py-1 text-gray-500">...</span>
                              ) : (
                                <Button
                                  onClick={() => handlePageClick(page as number)}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  className={currentPage === page
                                    ? "bg-[#2183AE] text-white hover:bg-[#1a6a8f] min-w-[40px]"
                                    : "border-gray-300 min-w-[40px]"
                                  }
                                >
                                  {page}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          className="border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="hidden sm:inline mr-1">Siguiente</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">No se encontraron empleados con los filtros seleccionados</p>
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-gray-900 mb-2">Realiza una búsqueda</h3>
            <p className="text-gray-600 text-sm">
              Utiliza los filtros para buscar empleados y ver sus detalles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}