import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Star, Calendar, CheckCircle2, AlertTriangle, X, Sparkles, Crown, Home, Sofa } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';

const BlockDetails = () => {
  const { floor, block } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [blockData, setBlockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rating, setRating] = useState(null);
  const [inspectionDate, setInspectionDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [ratingMode, setRatingMode] = useState('single');
  const [batchRatings, setBatchRatings] = useState({
    small: null,
    large: null,
    common: null
  });

  const blockNumber = parseInt(floor) * 100 + parseInt(block);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setInspectionDate(today);
  }, []);

  useEffect(() => {
    fetchBlockData();
  }, [floor, block]);

  const fetchBlockData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/blocks/${floor}/${block}`);
      setBlockData(response.data);
    } catch (error) {
      console.error('Error fetching block:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleRoomClick = (roomType, currentRating) => {
    if (user?.role === 'floor_manager' || user?.role === 'admin') {
      setSelectedRoom(roomType);
      setRating(currentRating || 0);
      setRatingMode('single');
    }
  };

  const openBatchRatingMode = () => {
    if (user?.role === 'floor_manager' || user?.role === 'admin') {
      setRatingMode('batch');
      setSelectedRoom('batch');
      setBatchRatings({
        small: blockData?.small_room_rating || null,
        large: blockData?.large_room_rating || null,
        common: blockData?.common_room_rating || null
      });
    }
  };

  const handleSingleRatingSubmit = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Выберите оценку от 1 до 5');
      return;
    }
    if (!inspectionDate) {
      toast.error('Выберите дату проверки');
      return;
    }
    if (!token) {
      toast.error('Необходимо войти в систему');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API}/inspections`,
        {
          floor: parseInt(floor),
          block: parseInt(block),
          room_type: selectedRoom,
          rating: rating,
          inspection_date: inspectionDate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Оценка сохранена!');
      closeModal();
      fetchBlockData();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Ошибка сохранения оценки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchRatingSubmit = async () => {
    const roomsToRate = Object.entries(batchRatings).filter(([_, r]) => r !== null && r >= 1 && r <= 5);
    if (roomsToRate.length === 0) {
      toast.error('Выберите хотя бы одну оценку');
      return;
    }
    if (!inspectionDate) {
      toast.error('Выберите дату проверки');
      return;
    }
    if (!token) {
      toast.error('Необходимо войти в систему');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        roomsToRate.map(([roomType, roomRating]) =>
          axios.post(
            `${API}/inspections`,
            {
              floor: parseInt(floor),
              block: parseInt(block),
              room_type: roomType,
              rating: roomRating,
              inspection_date: inspectionDate
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      toast.success(`Сохранено ${roomsToRate.length} оценок!`);
      closeModal();
      fetchBlockData();
    } catch (error) {
      console.error('Error submitting ratings:', error);
      toast.error('Ошибка сохранения оценок');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedRoom(null);
    setRating(null);
    setRatingMode('single');
    setBatchRatings({ small: null, large: null, common: null });
    setInspectionDate(new Date().toISOString().split('T')[0]);
  };

  // Найти старосту блока
  const blockLeader = blockData?.residents?.find(r => r.is_block_leader);
  
  // Разделить проживающих по комнатам (без старосты, он отображается отдельно)
  const smallRoomResidents = blockData?.residents?.filter(r => r.room_type === 'small' && !r.is_block_leader) || [];
  const largeRoomResidents = blockData?.residents?.filter(r => r.room_type === 'large' && !r.is_block_leader) || [];
  
  // Если староста в маленькой комнате, добавляем его туда тоже для подсчёта
  const smallRoomTotal = blockData?.residents?.filter(r => r.room_type === 'small') || [];
  const largeRoomTotal = blockData?.residents?.filter(r => r.room_type === 'large') || [];

  const getRatingStyle = (rating) => {
    if (!rating) return 'border-white/10';
    return rating <= 2 ? 'border-red-500/50' : 'border-emerald-500/50';
  };

  const getRatingBg = (rating) => {
    if (!rating) return 'bg-white/5';
    return rating <= 2 ? 'bg-red-500/10' : 'bg-emerald-500/10';
  };

  const getRatingTextColor = (rating) => {
    if (!rating) return 'text-slate-400';
    return rating <= 2 ? 'text-red-400' : 'text-emerald-400';
  };

  const getRatingLabel = (num) => {
    switch(num) {
      case 1: return 'Плохо';
      case 2: return 'Неуд.';
      case 3: return 'Удовл.';
      case 4: return 'Хорошо';
      case 5: return 'Отлично';
      default: return '';
    }
  };

  const canRate = user?.role === 'floor_manager' || user?.role === 'admin';

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
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative max-w-lg mx-auto min-h-screen">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/floor/${floor}`)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">
                Блок {blockNumber}
              </h1>
              <p className="text-sm text-slate-500">{floor} этаж</p>
            </div>
            
            {canRate && (
              <button
                onClick={openBatchRatingMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
                data-testid="batch-rate-button"
              >
                <Sparkles className="w-4 h-4" />
                Оценить всё
              </button>
            )}
          </div>

          {/* User info */}
          {user && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
              <span className="text-sm text-slate-300">
                {user.role === 'admin' ? 'Администратор' : `Староста ${user.floor_number} этажа`}
              </span>
            </div>
          )}
        </div>

        {/* Block Leader Card - Priority */}
        {blockLeader && (
          <div className="px-6 pb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
                    Староста блока
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {blockLeader.full_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content - Rooms */}
        <div className="px-6 pb-6 space-y-4">
          
          {/* Small Room Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Home className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                Маленькая комната
              </span>
              <span className="text-xs text-slate-500">({smallRoomTotal.length} чел.)</span>
            </div>
            <button
              onClick={() => handleRoomClick('small', blockData?.small_room_rating)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${getRatingStyle(blockData?.small_room_rating)} ${getRatingBg(blockData?.small_room_rating)} ${
                canRate ? 'hover:border-blue-500/50 cursor-pointer' : ''
              }`}
              data-testid="room-card-small"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {blockData?.small_room_rating ? (
                    <div className={`flex items-center gap-1 ${getRatingTextColor(blockData?.small_room_rating)}`}>
                      <Star className="w-5 h-5 fill-current" />
                      <span className="text-2xl font-bold">{blockData?.small_room_rating}</span>
                      <span className="text-sm ml-1 opacity-70">{getRatingLabel(blockData?.small_room_rating)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Нет оценки</span>
                  )}
                </div>
                {canRate && !blockData?.small_room_rating && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    Оценить
                  </span>
                )}
              </div>

              {smallRoomTotal.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {smallRoomTotal.map((resident) => (
                    <div key={resident.id} className="flex items-center gap-2 text-sm">
                      {resident.is_block_leader ? (
                        <Crown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Users className="w-4 h-4 text-slate-500" />
                      )}
                      <span className={resident.is_block_leader ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                        {resident.full_name}
                      </span>
                      {resident.is_block_leader && (
                        <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Староста
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>

          {/* Large Room Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Home className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                Большая комната
              </span>
              <span className="text-xs text-slate-500">({largeRoomTotal.length} чел.)</span>
            </div>
            <button
              onClick={() => handleRoomClick('large', blockData?.large_room_rating)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${getRatingStyle(blockData?.large_room_rating)} ${getRatingBg(blockData?.large_room_rating)} ${
                canRate ? 'hover:border-purple-500/50 cursor-pointer' : ''
              }`}
              data-testid="room-card-large"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {blockData?.large_room_rating ? (
                    <div className={`flex items-center gap-1 ${getRatingTextColor(blockData?.large_room_rating)}`}>
                      <Star className="w-5 h-5 fill-current" />
                      <span className="text-2xl font-bold">{blockData?.large_room_rating}</span>
                      <span className="text-sm ml-1 opacity-70">{getRatingLabel(blockData?.large_room_rating)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Нет оценки</span>
                  )}
                </div>
                {canRate && !blockData?.large_room_rating && (
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                    Оценить
                  </span>
                )}
              </div>

              {largeRoomTotal.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {largeRoomTotal.map((resident) => (
                    <div key={resident.id} className="flex items-center gap-2 text-sm">
                      {resident.is_block_leader ? (
                        <Crown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Users className="w-4 h-4 text-slate-500" />
                      )}
                      <span className={resident.is_block_leader ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                        {resident.full_name}
                      </span>
                      {resident.is_block_leader && (
                        <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          Староста
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>

          {/* Common Room Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Sofa className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                Общее пространство
              </span>
            </div>
            <button
              onClick={() => handleRoomClick('common', blockData?.common_room_rating)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${getRatingStyle(blockData?.common_room_rating)} ${getRatingBg(blockData?.common_room_rating)} ${
                canRate ? 'hover:border-emerald-500/50 cursor-pointer' : ''
              }`}
              data-testid="room-card-common"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {blockData?.common_room_rating ? (
                    <div className={`flex items-center gap-1 ${getRatingTextColor(blockData?.common_room_rating)}`}>
                      <Star className="w-5 h-5 fill-current" />
                      <span className="text-2xl font-bold">{blockData?.common_room_rating}</span>
                      <span className="text-sm ml-1 opacity-70">{getRatingLabel(blockData?.common_room_rating)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Нет оценки</span>
                  )}
                </div>
                {canRate && !blockData?.common_room_rating && (
                  <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                    Оценить
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Коридор, санузел, кухня
              </p>
            </button>
          </div>
        </div>

        {/* Rating Modal - Single Room */}
        <AnimatePresence>
          {selectedRoom && ratingMode === 'single' && canRate && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="bg-[#151b2e] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
              >
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-1">
                        <Star className="w-4 h-4" />
                        Оценка комнаты
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        {selectedRoom === 'small' ? 'Маленькая комната' :
                         selectedRoom === 'large' ? 'Большая комната' : 
                         'Общее пространство'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Блок {blockNumber} • {floor} этаж
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      data-testid="close-modal-button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 block mb-1">Дата проверки</label>
                      <Input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="h-9 bg-transparent border-0 p-0 text-base font-medium text-white focus-visible:ring-0 [color-scheme:dark]"
                        data-testid="inspection-date-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-3 block">Выберите оценку</label>
                    <div className="flex gap-2" data-testid="rating-selector">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = rating === num;
                        const isProblem = num <= 2;
                        return (
                          <motion.button
                            key={num}
                            onClick={() => setRating(num)}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center border transition-all ${
                              isSelected
                                ? isProblem 
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white/5 border-white/10 text-white hover:border-cyan-500/50'
                            }`}
                            data-testid={`rating-${num}`}
                          >
                            <span className="text-2xl font-bold">{num}</span>
                            <span className={`text-[10px] mt-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                              {getRatingLabel(num)}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {rating && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          rating <= 2 
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {rating <= 2 ? (
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">
                          {rating <= 2 ? 'Проблемная комната' : 'Хорошее состояние'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium transition-all disabled:opacity-50"
                    data-testid="rating-cancel-button"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSingleRatingSubmit}
                    disabled={!rating || isSubmitting}
                    className={`flex-1 h-12 rounded-xl font-medium transition-all disabled:opacity-50 ${
                      rating 
                        ? rating <= 2 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-white/10 text-slate-400'
                    }`}
                    data-testid="rating-submit-button"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mx-auto" />
                    ) : rating ? 'Сохранить' : 'Выберите оценку'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rating Modal - Batch Mode */}
        <AnimatePresence>
          {selectedRoom === 'batch' && ratingMode === 'batch' && canRate && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="bg-[#151b2e] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                <div className="p-6 pb-4 sticky top-0 bg-[#151b2e] z-10 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium mb-1">
                        <Sparkles className="w-4 h-4" />
                        Быстрая оценка
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        Оценить весь блок
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Блок {blockNumber} • {floor} этаж
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      data-testid="close-batch-modal-button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 block mb-1">Дата проверки</label>
                      <Input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="h-9 bg-transparent border-0 p-0 text-base font-medium text-white focus-visible:ring-0 [color-scheme:dark]"
                        data-testid="batch-inspection-date-input"
                      />
                    </div>
                  </div>

                  {/* Small Room */}
                  <div className="space-y-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">Маленькая комната</span>
                      </div>
                      {batchRatings.small && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          batchRatings.small <= 2 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {getRatingLabel(batchRatings.small)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2" data-testid="batch-rating-small">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = batchRatings.small === num;
                        const isProblem = num <= 2;
                        return (
                          <motion.button
                            key={num}
                            onClick={() => setBatchRatings(prev => ({ ...prev, small: num }))}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center border transition-all text-lg font-bold ${
                              isSelected
                                ? isProblem 
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white/5 border-white/10 text-white hover:border-blue-500/50'
                            }`}
                          >
                            {num}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Large Room */}
                  <div className="space-y-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">Большая комната</span>
                      </div>
                      {batchRatings.large && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          batchRatings.large <= 2 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {getRatingLabel(batchRatings.large)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2" data-testid="batch-rating-large">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = batchRatings.large === num;
                        const isProblem = num <= 2;
                        return (
                          <motion.button
                            key={num}
                            onClick={() => setBatchRatings(prev => ({ ...prev, large: num }))}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center border transition-all text-lg font-bold ${
                              isSelected
                                ? isProblem 
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white/5 border-white/10 text-white hover:border-purple-500/50'
                            }`}
                          >
                            {num}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Common Room */}
                  <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sofa className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-white">Общее пространство</span>
                      </div>
                      {batchRatings.common && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          batchRatings.common <= 2 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {getRatingLabel(batchRatings.common)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2" data-testid="batch-rating-common">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = batchRatings.common === num;
                        const isProblem = num <= 2;
                        return (
                          <motion.button
                            key={num}
                            onClick={() => setBatchRatings(prev => ({ ...prev, common: num }))}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center border transition-all text-lg font-bold ${
                              isSelected
                                ? isProblem 
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white/5 border-white/10 text-white hover:border-emerald-500/50'
                            }`}
                          >
                            {num}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-[#151b2e] border-t border-white/5">
                  <button
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium transition-all disabled:opacity-50"
                    data-testid="batch-cancel-button"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleBatchRatingSubmit}
                    disabled={!Object.values(batchRatings).some(r => r !== null) || isSubmitting}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium transition-all disabled:opacity-50"
                    data-testid="batch-submit-button"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mx-auto" />
                    ) : (
                      `Сохранить (${Object.values(batchRatings).filter(r => r !== null).length})`
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BlockDetails;
