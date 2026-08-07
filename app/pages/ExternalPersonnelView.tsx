import { useState, useEffect } from 'react';
import { Users, Plus, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { ExternalEmployeeListView } from './ExternalEmployeeListView';
import { ExternalEmployeeDetailView } from './ExternalEmployeeDetailView';
import { CreateExternalEmployeeView } from './CreateExternalEmployeeView';

export interface ExternalArea {
  id: string;
  name: string;
  immediateManager: string;
  description: string;
}

export interface ExternalEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  areaId: string;
  accessType: 'temporary' | 'indefinite';
  accessStartDate: Date;
  accessEndDate?: Date;
  hireDate: Date;
  terminationDate?: Date;
  profileImage?: string;
  status: 'active' | 'inactive' | 'expired';
  identificationNumber: string;
}

type SubView = 'list' | 'detail' | 'create' | 'areas';

interface ExternalPersonnelViewProps {
  onBack: () => void;
}

export function ExternalPersonnelView({ onBack }: ExternalPersonnelViewProps) {
  const [currentSubView, setCurrentSubView] = useState<SubView>('list');
  const [selectedEmployee, setSelectedEmployee] = useState<ExternalEmployee | null>(null);
  const [areas, setAreas] = useState<ExternalArea[]>([
    {
      id: 'AREA-001',
      name: 'Seguridad',
      immediateManager: 'Carlos Méndez',
      description: 'Personal de seguridad y vigilancia'
    },
    {
      id: 'AREA-002',
      name: 'Limpieza',
      immediateManager: 'Ana López',
      description: 'Personal de limpieza y mantenimiento'
    },
    {
      id: 'AREA-003',
      name: 'Consultoría IT',
      immediateManager: 'Roberto García',
      description: 'Consultores externos de tecnología'
    }
  ]);

  const handleSelectEmployee = (employee: ExternalEmployee) => {
    setSelectedEmployee(employee);
    setCurrentSubView('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedEmployee(null);
    setCurrentSubView('list');
  };

  const handleCreateEmployee = () => {
    setCurrentSubView('create');
  };

  const handleBackFromCreate = () => {
    setCurrentSubView('list');
  };

  const handleEmployeeCreated = (employee: ExternalEmployee) => {
    setCurrentSubView('list');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

    return (
        <div>
            {currentSubView === 'list' && (
                <div>
                    <div className="py-1 sm:py-2 lg:py-0 px-2 sm:px-4">
                        <div className="w-full max-w-6xl mx-auto">
                            <div className="mb-2 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-white mb-0 text-lg">Personal Externo</h2>
                                        <p className="text-sm text-white/90">
                                          Gestiona personal externo y áreas
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <ExternalEmployeeListView
                            onSelectEmployee={handleSelectEmployee}
                            areas={areas}
                            onBack={onBack}
                            />
                        </div>
                    </div>
                </div>
            )}
            {currentSubView === 'detail' && selectedEmployee && (
                <ExternalEmployeeDetailView
                employee={selectedEmployee}
                areas={areas}
                onBack={handleBackFromDetail}
                />
            )}
            {currentSubView === 'create' && (
                <CreateExternalEmployeeView
                areas={areas}
                onBack={handleBackFromCreate}
                onEmployeeCreated={handleEmployeeCreated}
                />
            )}
        </div>
    );
}
