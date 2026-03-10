import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Calendar } from 'lucide-react';
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

  useEffect(() => {
    fetchBlocksData();
  }, [floor]);

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

  const getBlockStatus = (block) => {
    const ratings = [
      block.small_room_rating,
      block.large_room_rating,
      block.common_room_rating
    ].filter(r => r);
    
    if (ratings.length === 0) return 'default';
    
    const hasProblems = ratings.some(r => r <= 3);
    return hasProblems ? 'problem' : 'good';
  };

  const filteredBlocks = blocks.filter(block => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      block.block.toString().includes(searchLower) ||
      block.residents?.some(r => r.full_name.toLowerCase().includes(searchLower))
    );
  });

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
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight">
                {floor} этаж
              </h1>
              <p className="text-sm text-muted-foreground">Блоки 1-15</p>
            </div>
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
                return (
                  <motion.button
                    key={block.block}
                    onClick={() => navigate(`/floor/${floor}/block/${block.block}`)}
                    className="aspect-[4/3] flex flex-col items-center justify-center rounded-xl bg-white border border-border shadow-sm hover:border-primary/20 transition-all cursor-pointer relative"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`block-card-${block.block}`}
                  >
                    {/* Status indicator */}
                    <div
                      className={`w-2 h-2 rounded-full absolute top-2 right-2 ${
                        status === 'problem'
                          ? 'bg-bad'
                          : status === 'good'
                          ? 'bg-good'
                          : 'bg-muted'
                      }`}
                    />
                    
                    <div className="text-center">
                      <div className="text-2xl font-display font-bold">{block.block}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {block.residents?.length || 0} чел.
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
