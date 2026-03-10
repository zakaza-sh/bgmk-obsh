import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
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

  // Calculate block number in format XXX
  const blockNumber = parseInt(floor) * 100 + parseInt(block);

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
    }
  };

  const handleRatingSubmit = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Выберите оценку от 1 до 5');
      return;
    }

    if (!token) {
      toast.error('Необходимо войти в систему для выставления оценок');
      navigate('/login');
      return;
    }

    try {
      await axios.post(
        `${API}/inspections`,
        {
          floor: parseInt(floor),
          block: parseInt(block),
          room_type: selectedRoom,
          rating: rating
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Оценка сохранена!');
      setSelectedRoom(null);
      setRating(null);
      fetchBlockData();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Ошибка сохранения оценки');
    }
  };

  const rooms = [
    { 
      type: 'small', 
      name: 'Маленькая комната', 
      rating: blockData?.small_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'small') || []
    },
    { 
      type: 'large', 
      name: 'Большая комната', 
      rating: blockData?.large_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'large') || []
    },
    { 
      type: 'common', 
      name: 'Общее пространство', 
      rating: blockData?.common_room_rating,
      residents: blockData?.residents?.filter(r => r.room_type === 'common') || []
    }
  ];

  const getRatingColor = (rating) => {
    if (!rating) return 'bg-muted text-muted-foreground border-muted';
    return rating <= 3 
      ? 'bg-red-50 text-red-600 border-red-200' 
      : 'bg-green-50 text-green-600 border-green-200';
  };

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
            <div>
              <h1 className="text-2xl font-display font-semibold tracking-tight">
                Блок {blockNumber}
              </h1>
              <p className="text-sm text-muted-foreground">{floor} этаж</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {rooms.map((room) => (
            <Card
              key={room.type}
              className={`p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                getRatingColor(room.rating)
              }`}
              onClick={() => handleRoomClick(room.type, room.rating)}
              data-testid={`room-card-${room.type}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{room.name}</h3>
                  <p className="text-sm opacity-75 mt-1">
                    {room.residents.length} проживающих
                  </p>
                </div>
                {room.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="text-xl font-bold">{room.rating}</span>
                  </div>
                )}
              </div>

              {room.residents.length > 0 && (
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

        {/* Rating Modal */}
        {selectedRoom && (user?.role === 'floor_manager' || user?.role === 'admin') && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3 }}
              className="bg-card w-full rounded-t-3xl p-6 max-w-md mx-auto md:max-w-lg"
            >
              <h3 className="text-xl font-semibold mb-4">
                Оцените комнату
              </h3>
              
              <div className="flex gap-2 items-center justify-center py-4" data-testid="rating-selector">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRating(num)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                      rating === num
                        ? 'bg-primary text-primary-foreground border-primary scale-110'
                        : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                    }`}
                    data-testid={`rating-${num}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setSelectedRoom(null);
                    setRating(null);
                  }}
                  data-testid="rating-cancel-button"
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleRatingSubmit}
                  data-testid="rating-submit-button"
                >
                  Сохранить
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockDetails;
