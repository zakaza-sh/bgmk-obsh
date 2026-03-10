import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Shield, Search, X, Users, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const FloorsList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const floors = user?.role === 'floor_manager' 
    ? [user.floor_number] 
    : [2, 3, 4, 5, 6, 7, 8, 9];

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      // Search by resident name
      const response = await axios.get(`${API}/residents?search=${encodeURIComponent(searchQuery)}`);
      const residents = response.data;
      
      // Also check if query matches block number
      const blockMatches = [];
      const queryNum = parseInt(searchQuery);
      if (!isNaN(queryNum) && queryNum >= 201 && queryNum <= 915) {
        const floor = Math.floor(queryNum / 100);
        const block = queryNum % 100;
        if (floor >= 2 && floor <= 9 && block >= 1 && block <= 15) {
          blockMatches.push({ type: 'block', floor, block, blockNumber: queryNum });
        }
      }
      
      setSearchResults([
        ...blockMatches,
        ...residents.map(r => ({ 
          type: 'resident', 
          ...r, 
          blockNumber: r.floor * 100 + r.block 
        }))
      ]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

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

  const handleSearchResultClick = (result) => {
    if (result.type === 'block') {
      navigate(`/floor/${result.floor}/block/${result.block}`);
    } else {
      navigate(`/floor/${result.floor}/block/${result.block}`);
    }
    setShowSearch(false);
    setSearchQuery('');
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
            <div className="flex-1">
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="rounded-xl"
              data-testid="search-toggle-button"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {/* Search Panel */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Поиск по номеру блока или ФИО..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                    data-testid="global-search-input"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mt-3 bg-white border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Ничего не найдено
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {searchResults.slice(0, 10).map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                            data-testid={`search-result-${idx}`}
                          >
                            {result.type === 'block' ? (
                              <>
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">Блок {result.blockNumber}</div>
                                  <div className="text-xs text-muted-foreground">{result.floor} этаж</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.full_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Блок {result.blockNumber} • {result.room_type === 'small' ? 'Малая' : result.room_type === 'large' ? 'Большая' : 'Общая'}
                                  </div>
                                </div>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
