import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InspectionCalendar = ({ floor, block, onDateSelect, selectedDate }) => {
  const [inspectionDates, setInspectionDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const API = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchInspectionDates();
  }, [floor, block, currentMonth]);

  const fetchInspectionDates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/blocks/${floor}/${block}/inspection-dates`);
      const data = await response.json();
      setInspectionDates(data.dates || []);
    } catch (error) {
      console.error('Error fetching inspection dates:', error);
      setInspectionDates([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const hasInspection = (day) => {
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return inspectionDates.includes(dateStr);
  };

  const formatDateForComparison = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isSelectedDate = (day) => {
    if (!selectedDate) return false;
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return selectedDate === dateStr;
  };

  const handleDateClick = (day) => {
    const dateStr = formatDateForComparison(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (hasInspection(day)) {
      onDateSelect(dateStr);
    }
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // Create calendar grid
  const calendarDays = [];
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(
      <motion.button
        key={day}
        onClick={() => handleDateClick(day)}
        disabled={!hasInspection(day)}
        whileHover={hasInspection(day) ? { scale: 1.1 } : {}}
        whileTap={hasInspection(day) ? { scale: 0.95 } : {}}
        className={`
          h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
          ${isSelectedDate(day)
            ? 'bg-blue-500 text-white ring-2 ring-blue-300'
            : hasInspection(day)
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer'
            : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        {day}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-4 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-white">
          {monthNames[month]} {year}
        </h3>
        
        <button
          onClick={() => changeMonth(1)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/20"></div>
          <span className="text-gray-400">Есть проверки</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span className="text-gray-400">Выбрана</span>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1 animate-pulse">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800/30 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays}
        </div>
      )}
    </motion.div>
  );
};

export default InspectionCalendar;
