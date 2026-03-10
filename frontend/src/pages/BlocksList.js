import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';

const BlocksList = () => {
  const { floor } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [isFilterActive, setIsFilterActive] = useState(false);

  useEffect(() => {
    fetchBlocksData();
  }, [floor]);

  // Fetch inspections when date filter changes
  useEffect(() => {
    if (startDate || endDate) {
      fetchFilteredInspections();
      setIsFilterActive(true);
    } else {
      setFilteredInspections([]);
      setIsFilterActive(false);
    }
  }, [startDate, endDate, floor]);

  const fetchBlocksData = async () => {
    try {
      setLoading(true);
      // Fetch data for all 15 blocks
      const blockPromises = Array.from({ length: 15 }, (_, i) => 
        axios.get(`${API}/blocks/${floor}/${i + 1}`).catch(() => null)
      );
      
      const results = await Promise.all(blockPromises);
      const blocksData = results.map((res, i) => {
        if (!res || !res.data) {
          return { floor: parseInt(floor), block: i + 1, residents: [], ratings: {} };
        }
        return {
          floor: parseInt(floor),
          block: i + 1,
          ...res.data
        };
      });
      
      setBlocks(blocksData);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredInspections = async () => {
    try {
      const params = new URLSearchParams();
      params.append('floor', floor);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await axios.get(`${API}/inspections?${params.toString()}`);
      setFilteredInspections(response.data);
    } catch (error) {
      console.error('Error fetching filtered inspections:', error);
    }
  };

  const getBlockStatus = (block) => {
    // If filter is active, use filtered inspections
    if (isFilterActive) {
      const blockInspections = filteredInspections.filter(
        i => i.block === block.block
      );
      if (blockInspections.length === 0) return 'no-data';
      const hasProblems = blockInspections.some(i => i.rating <= 3);
      return hasProblems ? 'problem' : 'good';
    }
    
    // Default behavior without filter
    const ratings = [
      block.small_room_rating,
      block.large_room_rating,
      block.common_room_rating
    ].filter(r => r);
    
    if (ratings.length === 0) return 'default';
    
    const hasProblems = ratings.some(r => r <= 3);
    return hasProblems ? 'problem' : 'good';
  };

  // Calculate block number in format XXX (floor + block number)
  const getBlockNumber = (block) => {
    return parseInt(floor) * 100 + block.block;
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setIsFilterActive(false);
    setShowDateFilter(false);
  };

  const filteredBlocks = blocks.filter(block => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const blockNum = getBlockNumber(block).toString();
    return (
      blockNum.includes(searchLower) ||
      block.residents?.some(r => r.full_name.toLowerCase().includes(searchLower))
    );
  });

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl md:max-w-lg md:border-x md:border-border">
        {/* Header */}
        <div className="bg-card border-b border-border p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-semibold tracking-tight">
                {floor} этаж
              </h1>
              <p className="text-sm text-muted-foreground">Блоки 1-15</p>
            </div>
            
            {/* Date Filter Toggle Button */}
            <Button
              variant={isFilterActive ? "default" : "outline"}
              size="icon"
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`rounded-xl relative ${isFilterActive ? 'bg-primary text-primary-foreground' : ''}`}
              data-testid="date-filter-toggle"
            >
              <Calendar className="w-5 h-5" />
              {isFilterActive && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по блоку или проживающему..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
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
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Фильтр по дате проверки</span>
                    </div>
                    {isFilterActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDateFilter}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        data-testid="clear-date-filter"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Сбросить
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">От</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate || new Date().toISOString().split('T')[0]}
                        className="h-10"
                        data-testid="start-date-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">До</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="h-10"
                        data-testid="end-date-input"
                      />
                    </div>
                  </div>

                  {isFilterActive && (
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                      <p className="text-xs text-primary">
                        Показаны проверки: {formatDateDisplay(startDate) || 'начало'} — {formatDateDisplay(endDate) || 'сейчас'}
                        {filteredInspections.length > 0 && (
                          <span className="ml-1 font-medium">
                            ({filteredInspections.length} записей)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredBlocks.map((block) => {
                const status = getBlockStatus(block);
                const blockNumber = getBlockNumber(block);
                
                // Get inspection count for this block when filter is active
                const blockInspectionCount = isFilterActive 
                  ? filteredInspections.filter(i => i.block === block.block).length 
                  : 0;
                
                return (
                  <motion.button
                    key={block.block}
                    onClick={() => navigate(`/floor/${floor}/block/${block.block}`)}
                    className={`aspect-[4/3] flex flex-col items-center justify-center rounded-xl border shadow-sm hover:border-primary/20 transition-all cursor-pointer relative ${
                      status === 'no-data' 
                        ? 'bg-gray-50 border-gray-200 opacity-60' 
                        : 'bg-white border-border'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`block-card-${block.block}`}
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full absolute top-2 right-2 ${
                        status === 'problem'
                          ? 'bg-red-500'
                          : status === 'good'
                          ? 'bg-green-500'
                          : status === 'no-data'
                          ? 'bg-gray-300'
                          : 'bg-muted'
                      }`}
                    />
                    
                    <div className="text-center">
                      <div className="text-xl font-display font-bold">{blockNumber}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {isFilterActive ? (
                          blockInspectionCount > 0 ? (
                            <span className="text-primary">{blockInspectionCount} проверок</span>
                          ) : (
                            <span className="text-gray-400">нет данных</span>
                          )
                        ) : (
                          `${block.residents?.length || 0} чел.`
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {!loading && filteredBlocks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlocksList;
