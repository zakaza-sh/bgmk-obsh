import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserPlus, 
  Download, 
  Users, 
  Eye,
  Trash2,
  FileText,
  LogOut,
  X,
  Search,
  GraduationCap,
  Calendar,
  Building2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API, BACKEND_URL } from '../context/AuthContext';
import { toast } from 'sonner';

const Admin = () => {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [residents, setResidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Resident form
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [residentForm, setResidentForm] = useState({
    full_name: '',
    floor: 2,
    block: 1,
    room_type: 'small',
    is_block_leader: false
  });

  // User form
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'floor_manager',
    floor_number: 2
  });

  // Export filters
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
      toast.error('Ошибка загрузки учащихся');
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
      toast.error('Ошибка загрузки пользователей');
    }
  };

  const handleAddResident = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API}/residents`,
        residentForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Учащийся добавлен!');
      setShowResidentForm(false);
      setResidentForm({
        full_name: '',
        floor: 2,
        block: 1,
        room_type: 'small',
        is_block_leader: false
      });
      fetchResidents();
    } catch (error) {
      console.error('Error adding resident:', error);
      toast.error('Ошибка добавления учащегося');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(
        `${API}/auth/register`,
        userForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Пользователь создан!');
      setShowUserForm(false);
      setUserForm({
        username: '',
        password: '',
        role: 'floor_manager',
        floor_number: 2
      });
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(error.response?.data?.detail || 'Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async (id, name) => {
    if (!window.confirm(`Удалить учащегося "${name}"?`)) return;

    try {
      await axios.delete(`${API}/residents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Учащийся удалён');
      fetchResidents();
    } catch (error) {
      console.error('Error deleting resident:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleExportPDF = async () => {
    if (!exportFloor) {
      toast.error('Выберите этаж для экспорта');
      return;
    }
    
    try {
      const params = new URLSearchParams();
      params.append('floor', exportFloor);
      if (exportStartDate) params.append('start_date', exportStartDate);
      if (exportEndDate) params.append('end_date', exportEndDate);

      const response = await axios.get(
        `${API}/admin/export/pdf?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
      link.setAttribute('download', `Отчет_этаж${exportFloor}_${dateStr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Отчёт скачан!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Ошибка экспорта');
    }
  };

  // Filter residents by search
  const filteredResidents = residents.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${r.floor}${String(r.block).padStart(2, '0')}`.includes(searchQuery)
  );

  // Group residents by floor for statistics
  const floorStats = residents.reduce((acc, r) => {
    acc[r.floor] = (acc[r.floor] || 0) + 1;
    return acc;
  }, {});

  const tabs = [
    { id: 'students', label: 'Учащиеся', icon: GraduationCap },
    { id: 'users', label: 'Старосты', icon: Users },
    { id: 'export', label: 'Отчёты PDF', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <div className="max-w-4xl mx-auto min-h-screen p-4 md:p-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl hover:bg-slate-100"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img 
              src="/logo-bgmk.jpg" 
              alt="БГМК" 
              className="w-12 h-12 rounded-xl object-cover shadow-md hidden md:block"
            />
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Админ-панель
              </h1>
              <p className="text-sm text-slate-500">
                Управление системой санитарного контроля
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              data-testid="admin-logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Выйти</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-md">
            <div className="text-2xl font-bold text-teal-600">{residents.length}</div>
            <div className="text-xs text-slate-500">Всего учащихся</div>
          </Card>
          <Card className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-md">
            <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'floor_manager').length}</div>
            <div className="text-xs text-slate-500">Старост</div>
          </Card>
          <Card className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-md">
            <div className="text-2xl font-bold text-violet-600">8</div>
            <div className="text-xs text-slate-500">Этажей</div>
          </Card>
          <Card className="p-4 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-md">
            <div className="text-2xl font-bold text-amber-600">{residents.filter(r => r.is_block_leader).length}</div>
            <div className="text-xs text-slate-500">Старост блоков</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 shadow-lg' 
                  : 'bg-white/80 border-slate-200'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Поиск по ФИО или номеру блока..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 border-slate-200"
                  data-testid="student-search-input"
                />
              </div>
              <Button
                onClick={() => setShowResidentForm(!showResidentForm)}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 shadow-md"
                data-testid="add-resident-button"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить учащегося
              </Button>
            </div>

            {showResidentForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-teal-600" />
                    Новый учащийся
                  </h3>
                  <form onSubmit={handleAddResident} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">ФИО учащегося</label>
                      <Input
                        type="text"
                        value={residentForm.full_name}
                        onChange={(e) => setResidentForm({ ...residentForm, full_name: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                        required
                        className="bg-slate-50 border-slate-200"
                        data-testid="resident-name-input"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Этаж</label>
                        <Select
                          value={residentForm.floor.toString()}
                          onValueChange={(val) => setResidentForm({ ...residentForm, floor: parseInt(val) })}
                        >
                          <SelectTrigger data-testid="resident-floor-select" className="bg-slate-50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                              <SelectItem key={f} value={f.toString()}>{f} этаж</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Блок</label>
                        <Select
                          value={residentForm.block.toString()}
                          onValueChange={(val) => setResidentForm({ ...residentForm, block: parseInt(val) })}
                        >
                          <SelectTrigger data-testid="resident-block-select" className="bg-slate-50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 15 }, (_, i) => i + 1).map(b => (
                              <SelectItem key={b} value={b.toString()}>Блок {b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Комната</label>
                      <Select
                        value={residentForm.room_type}
                        onValueChange={(val) => setResidentForm({ ...residentForm, room_type: val })}
                      >
                        <SelectTrigger data-testid="resident-room-select" className="bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Маленькая комната</SelectItem>
                          <SelectItem value="large">Большая комната</SelectItem>
                          <SelectItem value="common">Общее пространство</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <input
                        type="checkbox"
                        id="is_block_leader"
                        checked={residentForm.is_block_leader}
                        onChange={(e) => setResidentForm({ ...residentForm, is_block_leader: e.target.checked })}
                        className="w-4 h-4 rounded text-teal-600"
                        data-testid="resident-leader-checkbox"
                      />
                      <label htmlFor="is_block_leader" className="text-sm text-slate-700">
                        Назначить старостой блока
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowResidentForm(false)}
                        className="flex-1 rounded-xl"
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0"
                        data-testid="resident-submit-button"
                      >
                        {loading ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* Residents List */}
            <Card className="rounded-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <p className="text-sm text-slate-500">
                  Найдено: {filteredResidents.length} учащихся
                </p>
              </div>
              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                {filteredResidents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет учащихся'}
                  </div>
                ) : (
                  filteredResidents.map((resident) => (
                    <div key={resident.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                          resident.is_block_leader ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}>
                          {resident.floor}{String(resident.block).padStart(2, '0')}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{resident.full_name}</h3>
                          <p className="text-xs text-slate-500">
                            {resident.floor} этаж, Блок {resident.block} • {
                              resident.room_type === 'small' ? 'Малая' :
                              resident.room_type === 'large' ? 'Большая' : 'Общая'
                            }
                            {resident.is_block_leader && <span className="text-amber-600 ml-1">★ Староста</span>}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteResident(resident.id, resident.full_name)}
                        className="rounded-xl hover:bg-red-50 hover:text-red-600"
                        data-testid={`delete-resident-${resident.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowUserForm(!showUserForm)}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 shadow-md"
              data-testid="add-user-button"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Добавить старосту
            </Button>

            {showUserForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" />
                    Новый пользователь
                  </h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Логин</label>
                      <Input
                        type="text"
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        placeholder="ivanov"
                        required
                        className="bg-slate-50 border-slate-200"
                        data-testid="user-username-input"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Пароль</label>
                      <Input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        className="bg-slate-50 border-slate-200"
                        data-testid="user-password-input"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">Роль</label>
                      <Select
                        value={userForm.role}
                        onValueChange={(val) => setUserForm({ ...userForm, role: val })}
                      >
                        <SelectTrigger data-testid="user-role-select" className="bg-slate-50 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Администратор</SelectItem>
                          <SelectItem value="floor_manager">Староста этажа</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {userForm.role === 'floor_manager' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Этаж</label>
                        <Select
                          value={userForm.floor_number?.toString() || '2'}
                          onValueChange={(val) => setUserForm({ ...userForm, floor_number: parseInt(val) })}
                        >
                          <SelectTrigger data-testid="user-floor-select" className="bg-slate-50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                              <SelectItem key={f} value={f.toString()}>{f} этаж</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowUserForm(false)}
                        className="flex-1 rounded-xl"
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0"
                        data-testid="user-submit-button"
                      >
                        {loading ? 'Создание...' : 'Создать'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}

            {/* Users List */}
            <Card className="rounded-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
              <div className="divide-y divide-slate-100">
                {users.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                        u.role === 'admin' 
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600' 
                          : 'bg-gradient-to-br from-teal-500 to-emerald-500'
                      }`}>
                        {u.role === 'admin' ? '👑' : u.floor_number}
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{u.username}</h3>
                        <p className="text-xs text-slate-500">
                          {u.role === 'admin' ? 'Администратор' : `Староста ${u.floor_number} этажа`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Последний вход: {u.last_login ? new Date(u.last_login).toLocaleString('ru-RU') : 'Никогда'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <Card className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Экспорт отчётов</h2>
                <p className="text-sm text-slate-500">Выгрузка оценок за период в PDF</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Этаж для отчёта
                </label>
                <Select
                  value={exportFloor}
                  onValueChange={setExportFloor}
                >
                  <SelectTrigger data-testid="export-floor-select" className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Выберите этаж" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                      <SelectItem key={f} value={f.toString()}>{f} этаж</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Дата начала
                  </label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                    data-testid="export-start-date"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Дата окончания
                  </label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                    data-testid="export-end-date"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleExportPDF}
                  className="w-full h-14 text-base rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/30"
                  data-testid="export-pdf-button"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Скачать PDF отчёт
                </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="text-sm font-medium text-slate-700 mb-2">ℹ️ Что включает отчёт:</h4>
                <ul className="text-xs text-slate-500 space-y-1">
                  <li>• Все проверки за выбранный период</li>
                  <li>• Оценки по каждому блоку</li>
                  <li>• Имена проверяющих</li>
                  <li>• Даты и время проверок</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
