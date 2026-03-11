import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Calendar, Crown, Home, Sofa, Save, History, ChevronDown, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';
import InspectionCalendar from '../components/InspectionCalendar';

const BlockDetails = () => {
  const { floor, block } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Get token and user directly from localStorage for reliability
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  const currentUser = user || (savedUser ? JSON.parse(savedUser) : null);
  
  // Ratings state
  const [inspectionDate, setInspectionDate] = useState('');
  const [ratings, setRatings] = useState({
    small: null,
    large: null,
    common: null
  });

  const blockNumber = parseInt(floor) * 100 + parseInt(block);
  const canRate = currentUser?.role === 'floor_manager' || currentUser?.role === 'admin';

  useEffect(() => {
    setInspectionDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    fetchBlockData();
    fetchHistory();
  }, [floor, block]);

  const fetchBlockData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/blocks/${floor}/${block}`);
      setBlockData(response.data);
      // Pre-fill with current ratings
      setRatings({
        small: response.data?.small_room_rating || null,
        large: response.data?.large_room_rating || null,
        common: response.data?.common_room_rating || null
      });
    } catch (error) {
      console.error('Error fetching block:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/blocks/${floor}/${block}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSaveAll = async () => {
    const ratingsToSave = Object.entries(ratings).filter(([_, r]) => r !== null);
    
    if (ratingsToSave.length === 0) {
      toast.error('Выберите хотя бы одну оценку');
      return;
    }

    // Get fresh token from localStorage
    const freshToken = localStorage.getItem('token');
    
    if (!freshToken) {
      toast.error('Войдите в систему');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        ratingsToSave.map(([roomType, rating]) =>
          axios.post(
            `${API}/inspections`,
            {
              floor: parseInt(floor),
              block: parseInt(block),
              room_type: roomType,
              rating: rating,
              inspection_date: inspectionDate
            },
            { headers: { Authorization: `Bearer ${freshToken}` } }
          )
        )
      );
      toast.success('Оценки сохранены!');
      fetchBlockData();
      fetchHistory();
    } catch (error) {
      console.error('Save error:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInspection = async (date) => {
    if (!window.confirm(`Удалить проверку за ${formatDate(date)}?`)) return;
    
    // Get fresh token from localStorage
    const freshToken = localStorage.getItem('token');
    
    if (!freshToken) {
      toast.error('Войдите в систему');
      navigate('/login');
      return;
    }
    
    try {
      await axios.delete(`${API}/blocks/${floor}/${block}/inspection/${date}`, {
        headers: { Authorization: `Bearer ${freshToken}` }
      });
      toast.success('Проверка удалена');
      fetchBlockData();
      fetchHistory();
    } catch (error) {
      console.error('Delete error:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const blockLeader = blockData?.residents?.find(r => r.is_block_leader);
  const smallRoomResidents = blockData?.residents?.filter(r => r.room_type === 'small') || [];
  const largeRoomResidents = blockData?.residents?.filter(r => r.room_type === 'large') || [];

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const RatingButton = ({ value, selected, onClick, color }) => (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
        selected
          ? value <= 2 
            ? 'bg-red-500 text-white scale-110' 
            : 'bg-emerald-500 text-white scale-110'
          : `bg-white/5 text-white border border-white/10 hover:border-${color}-500/50`
      }`}
    >
      {value}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0f1c] via-[#111827] to-[#0a0f1c]"></div>
      
      <div className="relative max-w-lg mx-auto min-h-screen pb-32">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 sticky top-0 bg-[#0a0f1c]/90 backdrop-blur-sm z-10">
          <button
            onClick={() => navigate(`/floor/${floor}`)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Блок {blockNumber}</h1>
            <p className="text-sm text-slate-500">{floor} этаж</p>
          </div>
        </div>

        {/* Block Leader */}
        {blockLeader && (
          <div className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-amber-400" />
              <div>
                <div className="text-xs text-amber-400 font-medium">СТАРОСТА БЛОКА</div>
                <div className="text-white font-semibold">{blockLeader.full_name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Inspection Calendar - Visible for ALL users */}
        <div className="mx-4 mb-4">
          <InspectionCalendar
            floor={parseInt(floor)}
            block={parseInt(block)}
            selectedDate={inspectionDate}
            onDateSelect={(date) => {
              setInspectionDate(date);
            }}
          />
        </div>

        {/* Date Picker - Only for managers/admins */}
        {canRate && (
          <div className="mx-4 mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">Дата проверки</div>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="h-8 bg-transparent border-0 p-0 text-white font-medium focus-visible:ring-0 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rooms with Ratings */}
        <div className="px-4 space-y-4">
          
          {/* Small Room */}
          <div className="p-4 rounded-xl bg-[#151b2e] border border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-white">Маленькая комната</span>
              <span className="text-xs text-slate-500 ml-auto">{smallRoomResidents.length} чел.</span>
            </div>
            
            {/* Residents */}
            {smallRoomResidents.length > 0 && (
              <div className="mb-4 space-y-1">
                {smallRoomResidents.map(r => (
                  <div key={r.id} className="text-sm text-slate-400 flex items-center gap-2">
                    {r.is_block_leader && <Crown className="w-3 h-3 text-amber-400" />}
                    <span className={r.is_block_leader ? 'text-amber-400' : ''}>{r.full_name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Rating Buttons */}
            {canRate ? (
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(num => (
                  <RatingButton
                    key={num}
                    value={num}
                    selected={ratings.small === num}
                    onClick={() => setRatings(prev => ({ ...prev, small: num }))}
                    color="blue"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Star className={`w-6 h-6 ${ratings.small ? (ratings.small <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'} fill-current`} />
                <span className={`text-2xl font-bold ${ratings.small ? (ratings.small <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                  {ratings.small || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Large Room */}
          <div className="p-4 rounded-xl bg-[#151b2e] border border-purple-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-white">Большая комната</span>
              <span className="text-xs text-slate-500 ml-auto">{largeRoomResidents.length} чел.</span>
            </div>
            
            {/* Residents */}
            {largeRoomResidents.length > 0 && (
              <div className="mb-4 space-y-1">
                {largeRoomResidents.map(r => (
                  <div key={r.id} className="text-sm text-slate-400 flex items-center gap-2">
                    {r.is_block_leader && <Crown className="w-3 h-3 text-amber-400" />}
                    <span className={r.is_block_leader ? 'text-amber-400' : ''}>{r.full_name}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Rating Buttons */}
            {canRate ? (
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(num => (
                  <RatingButton
                    key={num}
                    value={num}
                    selected={ratings.large === num}
                    onClick={() => setRatings(prev => ({ ...prev, large: num }))}
                    color="purple"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Star className={`w-6 h-6 ${ratings.large ? (ratings.large <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'} fill-current`} />
                <span className={`text-2xl font-bold ${ratings.large ? (ratings.large <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                  {ratings.large || '—'}
                </span>
              </div>
            )}
          </div>

          {/* Common Room */}
          <div className="p-4 rounded-xl bg-[#151b2e] border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Sofa className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white">Общее пространство</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Коридор, санузел, кухня</p>
            
            {/* Rating Buttons */}
            {canRate ? (
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(num => (
                  <RatingButton
                    key={num}
                    value={num}
                    selected={ratings.common === num}
                    onClick={() => setRatings(prev => ({ ...prev, common: num }))}
                    color="emerald"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Star className={`w-6 h-6 ${ratings.common ? (ratings.common <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'} fill-current`} />
                <span className={`text-2xl font-bold ${ratings.common ? (ratings.common <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                  {ratings.common || '—'}
                </span>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span className="text-sm">История проверок ({history.length})</span>
                </div>
                {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}
              </button>
              
              {showHistory && (
                <div className="mt-2 rounded-xl bg-[#151b2e] border border-white/10 overflow-hidden">
                  <div className={`grid ${canRate ? 'grid-cols-5' : 'grid-cols-4'} gap-2 p-3 text-xs text-slate-500 border-b border-white/10`}>
                    <div>Дата</div>
                    <div className="text-center">Мал.</div>
                    <div className="text-center">Бол.</div>
                    <div className="text-center">Общ.</div>
                    {canRate && <div></div>}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {history.map((h, i) => (
                      <div key={i} className={`grid ${canRate ? 'grid-cols-5' : 'grid-cols-4'} gap-2 p-3 text-sm border-b border-white/5 last:border-0 items-center`}>
                        <div className="text-slate-400">{formatDate(h.date)}</div>
                        <div className={`text-center font-medium ${h.small ? (h.small <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                          {h.small || '—'}
                        </div>
                        <div className={`text-center font-medium ${h.large ? (h.large <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                          {h.large || '—'}
                        </div>
                        <div className={`text-center font-medium ${h.common ? (h.common <= 2 ? 'text-red-400' : 'text-emerald-400') : 'text-slate-600'}`}>
                          {h.common || '—'}
                        </div>
                        {canRate && (
                          <button
                            onClick={() => handleDeleteInspection(h.date)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 ml-auto"
                            title="Удалить проверку"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button - Fixed at bottom */}
        {canRate && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c] to-transparent">
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleSaveAll}
                disabled={isSubmitting || !Object.values(ratings).some(r => r !== null)}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold text-lg flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Сохранить оценки
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockDetails;
