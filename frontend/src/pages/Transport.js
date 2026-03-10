import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BusFront, TramFront, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';

const Transport = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      fetchSchedules();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/transport`);
      setSchedules(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transport:', error);
      toast.error('Ошибка загрузки расписания');
      setLoading(false);
    }
  };

  const getUrgencyMessage = (minutes) => {
    const messages = [
      'Чуть-чуть шевелись!',
      'Беги, беги!',
      'Топай быстренько!',
      'Время на исходе!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getVehicleIcon = (type) => {
    return type === 'bus' ? <BusFront className="w-8 h-8" /> : <TramFront className="w-8 h-8" />;
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
          <div className="flex items-center gap-4 mb-2">
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
                Расписание транспорта
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Расписание не найдено
            </div>
          ) : (
            schedules.map((schedule, index) => (
              <motion.div
                key={schedule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`p-6 rounded-2xl border shadow-sm ${
                    schedule.urgent 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-white border-border'
                  }`}
                  data-testid={`transport-card-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        schedule.vehicle_type === 'bus' 
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {getVehicleIcon(schedule.vehicle_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-2xl font-display font-bold">
                            {schedule.route_number}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {schedule.vehicle_type === 'bus' ? 'Автобус' : 'Троллейбус'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Прибытие: {schedule.arrival_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-4xl font-bold tracking-tighter tabular-nums ${
                        schedule.urgent ? 'text-amber-600' : 'text-primary'
                      }`}>
                        {schedule.minutes_until}
                      </div>
                      <div className="text-sm text-muted-foreground">мин</div>
                    </div>
                  </div>

                  {schedule.urgent && (
                    <div className="mt-4 pt-4 border-t border-amber-200 flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {getUrgencyMessage(schedule.minutes_until)}
                      </span>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Refresh button */}
        <div className="p-6 pt-0">
          <Button
            onClick={fetchSchedules}
            className="w-full rounded-xl"
            variant="outline"
            data-testid="refresh-button"
          >
            Обновить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Transport;
