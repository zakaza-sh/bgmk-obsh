import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserPlus, 
  Download, 
  Users, 
  Trash2,
  FileText,
  LogOut,
  Search,
  GraduationCap,
  Calendar,
  Building2,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API } from '../context/AuthContext';
import { toast } from 'sonner';

const Admin = () => {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [residents, setResidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [residentForm, setResidentForm] = useState({
    full_name: '',
    floor: 2,
    block: 1,
    room_type: 'small',
    is_block_leader: false
  });

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'floor_manager',
    floor_number: 2
  });

  const [exportFloor, setExportFloor] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchResidents();
    fetchUsers();
  }, []);

  const fetchResidents = async () => {
    try {
      const response = await axios.get(`${API}/residents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResidents(response.data);
    } catch (error) {
      console.error('Error fetching residents:', error);
      toast.error('Ошибка загрузки');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/residents`, residentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Учащийся добавлен');
      setShowResidentForm(false);
      setResidentForm({ full_name: '', floor: 2, block: 1, room_type: 'small', is_block_leader: false });
      fetchResidents();
    } catch (error) {
      toast.error('Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/register`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Пользователь создан');
      setShowUserForm(false);
      setUserForm({ username: '', password: '', role: 'floor_manager', floor_number: 2 });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async (id, name) => {
    if (!window.confirm(`Удалить "${name}"?`)) return;
    try {
      await axios.delete(`${API}/residents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Удалено');
      fetchResidents();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleExportPDF = async () => {
    if (!exportFloor) {
      toast.error('Выберите этаж');
      return;
    }
    try {
      const params = new URLSearchParams();
      params.append('floor', exportFloor);
      if (exportStartDate) params.append('start_date', exportStartDate);
      if (exportEndDate) params.append('end_date', exportEndDate);

      const response = await axios.get(`${API}/admin/export/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Отчет_этаж${exportFloor}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Отчёт скачан');
    } catch (error) {
      toast.error('Ошибка экспорта');
    }
  };

  const filteredResidents = residents.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${r.floor}${String(r.block).padStart(2, '0')}`.includes(searchQuery)
  );

  const tabs = [
    { id: 'students', label: 'Учащиеся', icon: GraduationCap, count: residents.length },
    { id: 'users', label: 'Старосты', icon: Users, count: users.filter(u => u.role === 'floor_manager').length },
    { id: 'export', label: 'Отчёты', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1c]">
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0f1c] via-[#111827] to-[#0a0f1c]"></div>
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.02%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="relative max-w-4xl mx-auto min-h-screen p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-white">
              Панель администратора
            </h1>
            <p className="text-sm text-slate-500">
              Управление системой
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Выйти</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-[#151b2e] border border-white/10">
            <div className="text-2xl font-bold text-cyan-400">{residents.length}</div>
            <div className="text-xs text-slate-500">Учащихся</div>
          </div>
          <div className="p-4 rounded-xl bg-[#151b2e] border border-white/10">
            <div className="text-2xl font-bold text-emerald-400">{users.filter(u => u.role === 'floor_manager').length}</div>
            <div className="text-xs text-slate-500">Старост</div>
          </div>
          <div className="p-4 rounded-xl bg-[#151b2e] border border-white/10">
            <div className="text-2xl font-bold text-amber-400">{residents.filter(r => r.is_block_leader).length}</div>
            <div className="text-xs text-slate-500">Старост блоков</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' 
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>
              <button
                onClick={() => setShowResidentForm(!showResidentForm)}
                className="flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </div>

            {showResidentForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-[#151b2e] border border-white/10"
              >
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  Новый учащийся
                </h3>
                <form onSubmit={handleAddResident} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">ФИО</label>
                    <Input
                      type="text"
                      value={residentForm.full_name}
                      onChange={(e) => setResidentForm({ ...residentForm, full_name: e.target.value })}
                      placeholder="Иванов Иван Иванович"
                      required
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Этаж</label>
                      <Select value={residentForm.floor.toString()} onValueChange={(val) => setResidentForm({ ...residentForm, floor: parseInt(val) })}>
                        <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2235] border-white/10">
                          {[2,3,4,5,6,7,8,9].map(f => <SelectItem key={f} value={f.toString()} className="text-white hover:bg-white/10">{f} этаж</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Блок</label>
                      <Select value={residentForm.block.toString()} onValueChange={(val) => setResidentForm({ ...residentForm, block: parseInt(val) })}>
                        <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2235] border-white/10">
                          {Array.from({length: 15}, (_, i) => i + 1).map(b => <SelectItem key={b} value={b.toString()} className="text-white hover:bg-white/10">Блок {b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Комната</label>
                    <Select value={residentForm.room_type} onValueChange={(val) => setResidentForm({ ...residentForm, room_type: val })}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2235] border-white/10">
                        <SelectItem value="small" className="text-white hover:bg-white/10">Маленькая</SelectItem>
                        <SelectItem value="large" className="text-white hover:bg-white/10">Большая</SelectItem>
                        <SelectItem value="common" className="text-white hover:bg-white/10">Общая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <input
                      type="checkbox"
                      id="is_block_leader"
                      checked={residentForm.is_block_leader}
                      onChange={(e) => setResidentForm({ ...residentForm, is_block_leader: e.target.checked })}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-cyan-500"
                    />
                    <label htmlFor="is_block_leader" className="text-sm text-slate-300">Староста блока</label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowResidentForm(false)} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium transition-all">
                      Отмена
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium disabled:opacity-50">
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="rounded-xl bg-[#151b2e] border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <p className="text-sm text-slate-500">Найдено: {filteredResidents.length}</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-white/5">
                {filteredResidents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {searchQuery ? 'Не найдено' : 'Нет учащихся'}
                  </div>
                ) : (
                  filteredResidents.map((resident) => (
                    <div key={resident.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          resident.is_block_leader 
                            ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400' 
                            : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}>
                          {resident.floor}{String(resident.block).padStart(2, '0')}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{resident.full_name}</h3>
                          <p className="text-xs text-slate-500">
                            {resident.floor} этаж, Блок {resident.block}
                            {resident.is_block_leader && <span className="text-amber-400 ml-1">★</span>}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteResident(resident.id, resident.full_name)}
                        className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowUserForm(!showUserForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Добавить старосту
            </button>

            {showUserForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-[#151b2e] border border-white/10"
              >
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Новый пользователь
                </h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Логин</label>
                    <Input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="ivanov"
                      required
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Пароль</label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Роль</label>
                    <Select value={userForm.role} onValueChange={(val) => setUserForm({ ...userForm, role: val })}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2235] border-white/10">
                        <SelectItem value="admin" className="text-white hover:bg-white/10">Администратор</SelectItem>
                        <SelectItem value="floor_manager" className="text-white hover:bg-white/10">Староста этажа</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {userForm.role === 'floor_manager' && (
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Этаж</label>
                      <Select value={userForm.floor_number?.toString() || '2'} onValueChange={(val) => setUserForm({ ...userForm, floor_number: parseInt(val) })}>
                        <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2235] border-white/10">
                          {[2,3,4,5,6,7,8,9].map(f => <SelectItem key={f} value={f.toString()} className="text-white hover:bg-white/10">{f} этаж</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium">
                      Отмена
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium disabled:opacity-50">
                      {loading ? 'Создание...' : 'Создать'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="rounded-xl bg-[#151b2e] border border-white/10 divide-y divide-white/5">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                      u.role === 'admin' 
                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400' 
                        : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400'
                    }`}>
                      {u.role === 'admin' ? '👑' : u.floor_number}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{u.username}</h3>
                      <p className="text-xs text-slate-500">
                        {u.role === 'admin' ? 'Администратор' : `Староста ${u.floor_number} этажа`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="rounded-xl bg-[#151b2e] border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-white">Экспорт отчётов</h2>
                <p className="text-sm text-slate-500">Выгрузка данных в PDF</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Этаж
                </label>
                <Select value={exportFloor} onValueChange={setExportFloor}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Выберите этаж" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2235] border-white/10">
                    {[2,3,4,5,6,7,8,9].map(f => <SelectItem key={f} value={f.toString()} className="text-white hover:bg-white/10">{f} этаж</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    С даты
                  </label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    По дату
                  </label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
              </div>

              <button
                onClick={handleExportPDF}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-5 h-5" />
                Скачать PDF
              </button>

              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-sm text-slate-400 mb-2">Содержимое отчёта:</p>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Проверки за период</li>
                  <li>• Оценки по блокам</li>
                  <li>• Имена проверяющих</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
