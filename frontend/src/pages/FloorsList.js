import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, LogIn, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const FloorsList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedFloor, setSelectedFloor] = useState(null);

  const floors = user?.role === 'floor_manager' 
    ? [user.floor_number] 
    : [2, 3, 4, 5, 6, 7, 8, 9];

  const handleFloorClick = (floor) => {
    setSelectedFloor(floor);
    setTimeout(() => {
      navigate(`/floor/${floor}`);
    }, 200);
  };

  const handleLogout = () => {
    logout();
    toast.info('Вы вышли из системы');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl md:max-w-lg md:border-x md:border-border relative">
        {/* Header */}
        <div className="bg-card border-b border-border p-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight">
                Санитарный контроль
              </h1>
              <p className="text-sm text-muted-foreground">
                {user ? (
                  `${user.username} (${user.role === 'admin' ? 'Админ' : `Этаж ${user.floor_number}`})`
                ) : (
                  'Выберите этаж для просмотра'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Admin panel button - only for admin */}
          {user?.role === 'admin' && (
            <Button
              onClick={() => navigate('/admin')}
              className="w-full h-14 text-base rounded-2xl"
              variant="outline"
              data-testid="admin-panel-button"
            >
              <Shield className="w-4 h-4 mr-2" />
              Админ-панель
            </Button>
          )}

          {/* Floors */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-muted-foreground">Этажи общежития</h2>
            <div className="grid grid-cols-2 gap-4">
              {floors.map((floor) => (
                <motion.div
                  key={floor}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => handleFloorClick(floor)}
                    className={`
                      aspect-square w-full flex items-center justify-center
                      rounded-2xl bg-white border shadow-sm
                      hover:shadow-md transition-all cursor-pointer
                      text-2xl font-bold hover:bg-slate-50
                      ${
                        selectedFloor === floor
                          ? 'ring-2 ring-primary border-transparent'
                          : 'border-border'
                      }
                    `}
                    data-testid={`floor-card-${floor}`}
                  >
                    <div className="text-center">
                      <div className="text-4xl font-display font-bold mb-1">{floor}</div>
                      <div className="text-xs text-muted-foreground font-normal">этаж</div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Transport button */}
          <Button
            onClick={() => navigate('/transport')}
            className="w-full h-14 text-base rounded-2xl"
            variant="secondary"
            data-testid="transport-button"
          >
            Расписание транспорта
          </Button>

          {/* Manager login - subtle button at bottom */}
          {!user && (
            <Button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl"
              variant="ghost"
              size="sm"
              data-testid="manager-login-button"
            >
              <Shield className="w-4 h-4 mr-2" />
              Вход для старост
            </Button>
          )}

          {/* Logout button for logged in users */}
          {user && (
            <Button
              onClick={handleLogout}
              className="w-full rounded-xl"
              variant="ghost"
              size="sm"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloorsList;
