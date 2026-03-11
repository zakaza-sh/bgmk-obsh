import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Calendar, Filter, X, Users } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';
import InspectionCalendar from '../components/InspectionCalendar';

const BlocksList = () => {
  const { floor } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    fetchBlocksData();
  }, [floor]);

  useEffect(() => {
    if (filterDate) {
      fetchFilteredInspections();
      setIsFilterActive(true);
    } else {
      setFilteredInspections([]);
      setIsFilterActive(false);
    }
  }, [filterDate, floor]);

  const fetchBlocksData = async () => {
    try {
      setLoading(true);
      const blockPromises = Array.from({ length: 15 }, (_, i) => 
        axios.get(`${API}/blocks/${floor}/${i + 1}`).catch(() => null)
      );
      
      const results = await Promise.all(blockPromises);
      const blocksData = results.map((res, i) => {
        if (!res || !res.data) {
          return { floor: parseInt(floor), block: i + 1, residents: [], ratings: {} };
        }
        return { floor: parseInt(floor), block: i + 1, ...res.data };
      });
      
      setBlocks(blocksData);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredInspections = async () => {
    try {
      const params = new URLSearchParams();
      params.append('floor', floor);
      if (filterDate) {
        params.append('start_date', filterDate);
        params.append('end_date', filterDate + 'T23:59:59');
      }
      const response = await axios.get(`${API}/inspections?${params.toString()}`);
      setFilteredInspections(response.data);
    } catch (error) {
      console.error('Error fetching filtered inspections:', error);
    }
  };

  const getBlockStatus = (block) => {
    if (isFilterActive) {
      const blockInspections = filteredInspections.filter(i => i.block === block.block);
      if (blockInspections.length === 0) return 'no-data';
      const hasProblems = blockInspections.some(i => i.rating <= 2);
      return hasProblems ? 'problem' : 'good';
    }
    
    const ratings = [
      block.small_room_rating,
      block.large_room_rating,
      block.common_room_rating
    ].filter(r => r);
    
    if (ratings.length === 0) return 'default';
    const hasProblems = ratings.some(r => r <= 2);
    return hasProblems ? 'problem' : 'good';
  };

  const getBlockNumber = (block) => parseInt(floor) * 100 + block.block;

  const clearDateFilter = () => {
    setFilterDate('');
    setIsFilterActive(false);
    setShowDateFilter(false);
  };

  const filteredBlocks = blocks.filter(block => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const blockNum = getBlockNumber(block).toString();
    return blockNum.includes(searchLower) || block.residents?.some(r => r.full_name.toLowerCase().includes(searchLower));
  });

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0f1c] via-[#111827] to-[#0a0f1c]"></div>
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative max-w-lg mx-auto min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">
                {floor} этаж
              </h1>
              <p className="text-sm text-slate-500">Блоки 1-15</p>
            </div>
            
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors relative ${
                isFilterActive 
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              data-testid="date-filter-toggle"
            >
              <Calendar className="w-5 h-5" />
              {isFilterActive && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Поиск по блоку или ФИО..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
              data-testid="search-input"
            />
          </div>

          {/* Date Filter Panel */}
          <AnimatePresence>
            {showDateFilter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-xl bg-[#151b2e] border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">Фильтр по дате</span>
                    </div>
                    {isFilterActive && (
                      <button
                        onClick={clearDateFilter}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        data-testid="clear-date-filter"
                      >
                        <X className="w-3 h-3" />
                        Сбросить
                      </button>
                    )}
                  </div>
                  
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-10 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                    data-testid="filter-date-input"
                  />

                  {isFilterActive && (
                    <div className="mt-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <p className="text-xs text-cyan-400">
                        {formatDateDisplay(filterDate)} • {filteredInspections.length} записей
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredBlocks.map((block) => {
                const status = getBlockStatus(block);
                const blockNumber = getBlockNumber(block);
                const blockInspectionCount = isFilterActive 
                  ? filteredInspections.filter(i => i.block === block.block).length 
                  : 0;
                
                return (
                  <motion.button
                    key={block.block}
                    onClick={() => navigate(`/floor/${floor}/block/${block.block}`)}
                    className={`aspect-[4/3] flex flex-col items-center justify-center rounded-xl border transition-all relative ${
                      status === 'no-data' 
                        ? 'bg-white/5 border-white/5 opacity-50' 
                        : 'bg-[#151b2e] border-white/10 hover:border-cyan-500/50'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    data-testid={`block-card-${block.block}`}
                  >
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full absolute top-2 right-2 ${
                      status === 'problem' ? 'bg-red-500' :
                      status === 'good' ? 'bg-emerald-500' :
                      status === 'no-data' ? 'bg-slate-600' : 'bg-slate-600'
                    }`} />
                    
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{blockNumber}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                        {isFilterActive ? (
                          blockInspectionCount > 0 ? (
                            <span className="text-cyan-400">{blockInspectionCount} пров.</span>
                          ) : (
                            <span>нет данных</span>
                          )
                        ) : (
                          <>
                            <Users className="w-3 h-3" />
                            {block.residents?.length || 0}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {!loading && filteredBlocks.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlocksList;
