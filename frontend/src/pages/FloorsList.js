import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Search, X, Users, MapPin, ChevronRight } from 'lucide-react';
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
      const response = await axios.get(`${API}/residents?search=${encodeURIComponent(searchQuery)}`);
      const residents = response.data;
      
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
    navigate(`/floor/${result.floor}/block/${result.block}`);
    setShowSearch(false);
    setSearchQuery('');
  };

  // Floor colors for visual variety
  const floorColors = {
    2: 'from-blue-500 to-blue-600',
    3: 'from-emerald-500 to-emerald-600',
    4: 'from-violet-500 to-violet-600',
    5: 'from-orange-500 to-orange-600',
    6: 'from-pink-500 to-pink-600',
    7: 'from-cyan-500 to-cyan-600',
    8: 'from-amber-500 to-amber-600',
    9: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="max-w-md mx-auto min-h-screen md:max-w-lg relative">
        {/* Header with Logo */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-bgmk.jpg" 
              alt="БГМК" 
              className="w-16 h-16 rounded-2xl object-cover shadow-lg"
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Общежитие БГМК
              </h1>
              <p className="text-sm text-slate-500">
                Санитарный контроль
              </p>
              {user && (
                <p className="text-xs text-teal-600 font-medium mt-0.5">
                  {user.role === 'admin' ? '👑 Администратор' : `📋 Этаж ${user.floor_number}`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="rounded-xl hover:bg-slate-100"
              data-testid="search-toggle-button"
            >
              <Search className="w-5 h-5 text-slate-600" />
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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Поиск по номеру блока или ФИО..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 bg-white border-slate-200"
                    autoFocus
                    data-testid="global-search-input"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-lg">
                    {isSearching ? (
                      <div className="p-4 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500 mx-auto"></div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Ничего не найдено
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {searchResults.slice(0, 10).map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
                            data-testid={`search-result-${idx}`}
                          >
                            {result.type === 'block' ? (
                              <>
                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-teal-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">Блок {result.blockNumber}</div>
                                  <div className="text-xs text-slate-500">{result.floor} этаж</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                  <Users className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-slate-800 truncate">{result.full_name}</div>
                                  <div className="text-xs text-slate-500">
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
        <div className="p-5 space-y-5">
          {/* Admin panel button - only for admin */}
          {user?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button
                onClick={() => navigate('/admin')}
                className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 border-0"
                data-testid="admin-panel-button"
              >
                <Shield className="w-5 h-5 mr-2" />
                Админ-панель
                <ChevronRight className="w-5 h-5 ml-auto" />
              </Button>
            </motion.div>
          )}

          {/* Floors Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
              Выберите этаж
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {floors.map((floor, index) => (
                <motion.div
                  key={floor}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <button
                    onClick={() => handleFloorClick(floor)}
                    className={`
                      aspect-square w-full flex flex-col items-center justify-center
                      rounded-2xl bg-gradient-to-br ${floorColors[floor]}
                      shadow-lg hover:shadow-xl transition-all cursor-pointer
                      text-white relative overflow-hidden
                      ${selectedFloor === floor ? 'ring-4 ring-white/50' : ''}
                    `}
                    data-testid={`floor-card-${floor}`}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 right-2 w-20 h-20 rounded-full bg-white"></div>
                      <div className="absolute bottom-2 left-2 w-12 h-12 rounded-full bg-white"></div>
                    </div>
                    
                    <div className="relative z-10 text-center">
                      <div className="text-5xl font-black mb-1 drop-shadow-lg">{floor}</div>
                      <div className="text-sm font-medium text-white/80">этаж</div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 space-y-3">
            {/* Manager login - subtle button at bottom */}
            {!user && (
              <Button
                onClick={() => navigate('/login')}
                className="w-full rounded-xl h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
                data-testid="manager-login-button"
              >
                <Shield className="w-4 h-4 mr-2 text-teal-600" />
                Вход для старост
              </Button>
            )}

            {/* Logout button for logged in users */}
            {user && (
              <Button
                onClick={handleLogout}
                className="w-full rounded-xl h-12 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти из системы
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="pt-6 pb-4 text-center">
            <p className="text-xs text-slate-400">
              © 2024 БГМК • Санитарный контроль
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorsList;
