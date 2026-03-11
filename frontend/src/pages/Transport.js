import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BusFront, Zap, Clock, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
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
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching transport:', error);
      toast.error('Ошибка загрузки расписания');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
    toast.success('Расписание обновлено');
  };

  const getUrgencyMessage = (minutes) => {
    const messages = [
      '🏃 Беги скорее!',
      '⚡ Поторопись!',
      '🔥 Успеешь если поспешишь!',
      '💨 Давай быстрее!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getVehicleIcon = (type) => {
    if (type === 'trolleybus') {
      return <Zap className="w-7 h-7" />;
    }
    return <BusFront className="w-7 h-7" />;
  };

  const getVehicleLabel = (type) => {
    return type === 'trolleybus' ? 'Троллейбус' : 'Автобус';
  };

  const getVehicleColors = (type, urgent) => {
    if (urgent) {
      return {
        bg: 'bg-gradient-to-br from-orange-500 to-red-500',
        text: 'text-white',
        icon: 'bg-white/20 text-white'
      };
    }
    if (type === 'trolleybus') {
      return {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        text: 'text-white',
        icon: 'bg-white/20 text-white'
      };
    }
    return {
      bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      text: 'text-white',
      icon: 'bg-white/20 text-white'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/70">Загрузка расписания...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md mx-auto min-h-screen md:max-w-lg">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/10 p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl bg-white/10 hover:bg-white/20 text-white"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                🚌 Транспорт
              </h1>
              <p className="text-sm text-white/60">
                Остановка "Дом правосудия"
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white tabular-nums">
                {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-white/50">Минск</div>
            </div>
          </div>
        </div>

        {/* Stop info card */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Дом правосудия</h3>
                <p className="text-white/70 text-sm">
                  ул. Семашко • м. Петровщина
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transport cards */}
        <div className="px-4 pb-4 space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚌</div>
              <p className="text-white/60">Расписание не найдено</p>
            </div>
          ) : (
            schedules.map((schedule, index) => {
              const colors = getVehicleColors(schedule.vehicle_type, schedule.urgent);
              return (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`p-4 rounded-2xl border-0 shadow-lg ${colors.bg} ${colors.text}`}
                    data-testid={`transport-card-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${colors.icon}`}>
                          {getVehicleIcon(schedule.vehicle_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-black">
                              {schedule.route_number}
                            </span>
                            <span className="text-sm opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
                              {getVehicleLabel(schedule.vehicle_type)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm opacity-80 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{schedule.arrival_time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-5xl font-black tabular-nums leading-none">
                          {schedule.minutes_until}
                        </div>
                        <div className="text-sm opacity-80">мин</div>
                      </div>
                    </div>

                    {schedule.urgent && (
                      <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {getUrgencyMessage(schedule.minutes_until)}
                        </span>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Refresh button */}
        <div className="p-4 pt-0">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full rounded-xl bg-white/10 hover:bg-white/20 text-white border-0 h-12 text-base font-semibold backdrop-blur-sm"
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Обновление...' : 'Обновить расписание'}
          </Button>
          <p className="text-xs text-center text-white/40 mt-4">
            Маршруты: 38 • 57 • 103 • 123Э • 🚎 45
          </p>
        </div>
      </div>
    </div>
  );
};

export default Transport;
