import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Star, Calendar, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
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
  
  // Multi-room rating mode
  const [ratingMode, setRatingMode] = useState('single'); // 'single' or 'batch'
  const [batchRatings, setBatchRatings] = useState({
    small: null,
    large: null,
    common: null
  });

  // Calculate block number in format XXX
  const blockNumber = parseInt(floor) * 100 + parseInt(block);

  useEffect(() => {
    // Set default date to today
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
      toast.error('Необходимо войти в систему для выставления оценок');
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
      // Submit all ratings in parallel
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
    const today = new Date().toISOString().split('T')[0];
    setInspectionDate(today);
  };

  const rooms = [
    { 
      type: 'small', 
      name: 'Маленькая комната', 
      shortName: 'Малая',
      rating: blockData?.small_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'small') || []
    },
    { 
      type: 'large', 
      name: 'Большая комната', 
      shortName: 'Большая',
      rating: blockData?.large_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'large') || []
    },
    { 
      type: 'common', 
      name: 'Общее пространство', 
      shortName: 'Общая',
      rating: blockData?.common_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'common') || []
    }
  ];

  const getRatingColor = (rating) => {
    if (!rating) return 'bg-muted text-muted-foreground border-muted';
    return rating <= 2 
      ? 'bg-red-50 text-red-600 border-red-200' 
      : 'bg-green-50 text-green-600 border-green-200';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto min-h-screen shadow-2xl md:max-w-lg md:border-x md:border-border">
        {/* Header */}
        <div className="bg-card border-b border-border p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/floor/${floor}`)}
              className="rounded-xl"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-semibold tracking-tight">
                Блок {blockNumber}
              </h1>
              <p className="text-sm text-muted-foreground">{floor} этаж</p>
            </div>
            
            {/* Quick Rate All Button for managers */}
            {canRate && (
              <Button
                onClick={openBatchRatingMode}
                size="sm"
                className="rounded-xl gap-2"
                data-testid="batch-rate-button"
              >
                <Sparkles className="w-4 h-4" />
                Оценить всё
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {rooms.map((room) => (
            <Card
              key={room.type}
              className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
                canRate ? 'cursor-pointer' : ''
              } ${getRatingColor(room.rating)}`}
              onClick={() => handleRoomClick(room.type, room.rating)}
              data-testid={`room-card-${room.type}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{room.name}</h3>
                  {room.type !== 'common' && (
                    <p className="text-sm opacity-75 mt-1">
                      {room.residents.length} проживающих
                    </p>
                  )}
                </div>
                {room.rating ? (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="text-xl font-bold">{room.rating}</span>
                  </div>
                ) : canRate && (
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                    Нажмите для оценки
                  </span>
                )}
              </div>

              {room.type !== 'common' && room.residents.length > 0 && (
                <div className="space-y-2">
                  {room.residents.map((resident) => (
                    <div
                      key={resident.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Users className="w-4 h-4 opacity-50" />
                      <span>{resident.full_name}</span>
                      {resident.is_block_leader && (
                        <span className="ml-auto text-xs bg-primary/20 px-2 py-1 rounded-full">
                          Староста
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Rating Modal - Single Room Mode */}
        <AnimatePresence>
          {selectedRoom && ratingMode === 'single' && canRate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
              >
                {/* Drag Handle (mobile) */}
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                        <Star className="w-4 h-4" />
                        Оценка комнаты
                      </div>
                      <h3 className="text-xl font-display font-semibold">
                        {selectedRoom === 'small' ? 'Маленькая комната' :
                         selectedRoom === 'large' ? 'Большая комната' : 
                         'Общее пространство'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Блок {blockNumber} • {floor} этаж
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      data-testid="close-modal-button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-5">
                  {/* Date Selection - Compact */}
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Дата проверки</label>
                      <Input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="h-9 bg-transparent border-0 p-0 text-base font-medium focus-visible:ring-0"
                        data-testid="inspection-date-input"
                      />
                    </div>
                  </div>

                  {/* Rating Selection - Large Buttons */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">
                      Выберите оценку
                    </label>
                    <div className="flex gap-2" data-testid="rating-selector">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isSelected = rating === num;
                        const isProblem = num <= 2;
                        return (
                          <motion.button
                            key={num}
                            onClick={() => setRating(num)}
                            whileTap={{ scale: 0.95 }}
                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                              isSelected
                                ? isProblem 
                                  ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                                  : 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30'
                                : 'bg-white border-border text-foreground hover:border-primary/50'
                            }`}
                            data-testid={`rating-${num}`}
                          >
                            <span className="text-2xl font-bold">{num}</span>
                            <span className={`text-[10px] mt-1 ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                              {getRatingLabel(num)}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating Status Hint */}
                  <AnimatePresence mode="wait">
                    {rating && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          rating <= 2 
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {rating <= 2 ? (
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">
                          {rating <= 2 ? 'Проблемная комната — требуется внимание' : 'Хорошее состояние'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl text-base"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    data-testid="rating-cancel-button"
                  >
                    Отмена
                  </Button>
                  <Button
                    className={`flex-1 h-14 rounded-2xl text-base font-semibold transition-all ${
                      rating 
                        ? rating <= 2 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-green-500 hover:bg-green-600'
                        : ''
                    }`}
                    onClick={handleSingleRatingSubmit}
                    disabled={!rating || isSubmitting}
                    data-testid="rating-submit-button"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : rating ? (
                      'Сохранить'
                    ) : (
                      'Выберите оценку'
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rating Modal - Batch Mode (Rate All Rooms) */}
        <AnimatePresence>
          {selectedRoom === 'batch' && ratingMode === 'batch' && canRate && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* Drag Handle (mobile) */}
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="p-6 pb-4 sticky top-0 bg-card z-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary text-sm font-medium mb-1">
                        <Sparkles className="w-4 h-4" />
                        Быстрая оценка
                      </div>
                      <h3 className="text-xl font-display font-semibold">
                        Оценить весь блок
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Блок {blockNumber} • {floor} этаж
                      </p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                      data-testid="close-batch-modal-button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-5">
                  {/* Date Selection */}
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">Дата проверки</label>
                      <Input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="h-9 bg-transparent border-0 p-0 text-base font-medium focus-visible:ring-0"
                        data-testid="batch-inspection-date-input"
                      />
                    </div>
                  </div>

                  {/* Rooms Rating Sections */}
                  {rooms.map((room) => (
                    <div key={room.type} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{room.name}</span>
                        {batchRatings[room.type] && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            batchRatings[room.type] <= 2 
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {getRatingLabel(batchRatings[room.type])}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2" data-testid={`batch-rating-${room.type}`}>
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isSelected = batchRatings[room.type] === num;
                          const isProblem = num <= 2;
                          return (
                            <motion.button
                              key={num}
                              onClick={() => setBatchRatings(prev => ({ ...prev, [room.type]: num }))}
                              whileTap={{ scale: 0.95 }}
                              className={`flex-1 py-3 rounded-xl flex items-center justify-center border-2 transition-all text-lg font-bold ${
                                isSelected
                                  ? isProblem 
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'bg-green-500 border-green-500 text-white'
                                  : 'bg-white border-border text-foreground hover:border-primary/50'
                              }`}
                              data-testid={`batch-rating-${room.type}-${num}`}
                            >
                              {num}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Summary */}
                  {Object.values(batchRatings).some(r => r !== null) && (
                    <div className="p-4 bg-muted/40 rounded-xl">
                      <div className="text-sm text-muted-foreground mb-2">Итого оценок:</div>
                      <div className="flex gap-4">
                        {rooms.map(room => (
                          <div key={room.type} className="text-center">
                            <div className="text-xs text-muted-foreground">{room.shortName}</div>
                            <div className={`text-lg font-bold ${
                              batchRatings[room.type] 
                                ? batchRatings[room.type] <= 2 ? 'text-red-500' : 'text-green-500'
                                : 'text-muted-foreground'
                            }`}>
                              {batchRatings[room.type] || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-card">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl text-base"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    data-testid="batch-cancel-button"
                  >
                    Отмена
                  </Button>
                  <Button
                    className="flex-1 h-14 rounded-2xl text-base font-semibold"
                    onClick={handleBatchRatingSubmit}
                    disabled={!Object.values(batchRatings).some(r => r !== null) || isSubmitting}
                    data-testid="batch-submit-button"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      `Сохранить (${Object.values(batchRatings).filter(r => r !== null).length})`
                    )}
                  </Button>
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
