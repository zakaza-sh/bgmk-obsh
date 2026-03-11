import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Search, X, Users, MapPin, ChevronRight, Building2 } from 'lucide-react';
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
    }, 150);
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

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0f1c] via-[#111827] to-[#0a0f1c]"></div>
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative max-w-lg mx-auto min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30"></div>
              <img 
                src="/logo-bgmk.jpg" 
                alt="БГМК" 
                className="relative w-16 h-16 rounded-xl object-cover border border-white/10"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white tracking-tight">
                Общежитие БГМК
              </h1>
              <p className="text-sm text-slate-400">
                Система санитарного контроля
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>

          {/* User badge */}
          {user && (
            <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
              <span className="text-sm text-slate-300">
                {user.role === 'admin' ? 'Администратор' : `Староста ${user.floor_number} этажа`}
              </span>
            </div>
          )}

          {/* Search Panel */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Поиск по номеру блока или ФИО..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {searchQuery.length >= 2 && (
                  <div className="mt-3 bg-[#151b2e] border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent mx-auto"></div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        Ничего не найдено
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {searchResults.slice(0, 10).map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full p-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                          >
                            {result.type === 'block' ? (
                              <>
                                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-white">Блок {result.blockNumber}</div>
                                  <div className="text-xs text-slate-500">{result.floor} этаж</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                                  <Users className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-white truncate">{result.full_name}</div>
                                  <div className="text-xs text-slate-500">
                                    Блок {result.blockNumber}
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
        <div className="px-6 space-y-6">
          {/* Admin panel button */}
          {user?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={() => navigate('/admin')}
                className="w-full group relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-amber-500/50 via-orange-500/50 to-amber-500/50"
              >
                <div className="relative flex items-center justify-between p-4 rounded-2xl bg-[#151b2e] group-hover:bg-[#1a2235] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">Панель администратора</div>
                      <div className="text-xs text-slate-500">Управление системой</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
              </button>
            </motion.div>
          )}

          {/* Floors Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Этажи
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {floors.map((floor, index) => (
                <motion.button
                  key={floor}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFloorClick(floor)}
                  className={`
                    relative aspect-square rounded-2xl overflow-hidden
                    bg-gradient-to-br from-[#1e2a45] to-[#151b2e]
                    border border-white/10 hover:border-cyan-500/50
                    transition-all duration-200
                    ${selectedFloor === floor ? 'border-cyan-500 ring-2 ring-cyan-500/20' : ''}
                  `}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 hover:from-cyan-500/10 hover:to-blue-500/10 transition-all"></div>
                  
                  <div className="relative h-full flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{floor}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">этаж</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 space-y-3">
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all"
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Вход для старост</span>
              </button>
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Выйти из системы</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="py-6 text-center">
            <p className="text-xs text-slate-600">
              © 2024 БГМК • Санитарный контроль
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorsList;
