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
  LogOut 
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
  const [activeTab, setActiveTab] = useState('residents');
  const [residents, setResidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
      toast.error('Ошибка загрузки проживающих');
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
      
      toast.success('Проживающий добавлен!');
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
      toast.error('Ошибка добавления проживающего');
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

  const handleDeleteResident = async (id) => {
    if (!window.confirm('Удалить проживающего?')) return;

    try {
      await axios.delete(`${API}/residents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Проживающий удалён');
      fetchResidents();
    } catch (error) {
      console.error('Error deleting resident:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (exportFloor) params.append('floor', exportFloor);
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
      link.setAttribute('download', `report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Отчёт скачан!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Ошибка экспорта');
    }
  };

  const handleViewActivity = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/activity/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activity = response.data;
      const historyText = activity.login_history
        .map(h => `${new Date(h.timestamp).toLocaleString('ru-RU')} - ${h.ip}`)
        .join('\n');
      
      alert(`Активность пользователя ${activity.username}:\n\nПоследний вход: ${
        activity.last_login ? new Date(activity.last_login).toLocaleString('ru-RU') : 'Никогда'
      }\n\nИстория входов:\n${historyText || 'Нет данных'}`);
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Ошибка получения активности');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-xl"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-semibold tracking-tight">
              Админ-панель
            </h1>
            <p className="text-sm text-muted-foreground">
              Управление системой
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="rounded-xl"
            data-testid="admin-logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={activeTab === 'residents' ? 'default' : 'outline'}
            onClick={() => setActiveTab('residents')}
            className="rounded-xl whitespace-nowrap"
            data-testid="tab-residents"
          >
            <Users className="w-4 h-4 mr-2" />
            Проживающие
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
            className="rounded-xl whitespace-nowrap"
            data-testid="tab-users"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Пользователи
          </Button>
          <Button
            variant={activeTab === 'export' ? 'default' : 'outline'}
            onClick={() => setActiveTab('export')}
            className="rounded-xl whitespace-nowrap"
            data-testid="tab-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button
            variant={activeTab === 'activity' ? 'default' : 'outline'}
            onClick={() => setActiveTab('activity')}
            className="rounded-xl whitespace-nowrap"
            data-testid="tab-activity"
          >
            <Eye className="w-4 h-4 mr-2" />
            Активность
          </Button>
        </div>

        {/* Residents Tab */}
        {activeTab === 'residents' && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowResidentForm(!showResidentForm)}
              className="rounded-xl"
              data-testid="add-resident-button"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Добавить проживающего
            </Button>

            {showResidentForm && (
              <Card className="p-6 rounded-2xl">
                <form onSubmit={handleAddResident} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">ФИО</label>
                    <Input
                      type="text"
                      value={residentForm.full_name}
                      onChange={(e) => setResidentForm({ ...residentForm, full_name: e.target.value })}
                      required
                      data-testid="resident-name-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Этаж</label>
                      <Select
                        value={residentForm.floor.toString()}
                        onValueChange={(val) => setResidentForm({ ...residentForm, floor: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="resident-floor-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                            <SelectItem key={f} value={f.toString()}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Блок</label>
                      <Select
                        value={residentForm.block.toString()}
                        onValueChange={(val) => setResidentForm({ ...residentForm, block: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="resident-block-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 15 }, (_, i) => i + 1).map(b => (
                            <SelectItem key={b} value={b.toString()}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Комната</label>
                    <Select
                      value={residentForm.room_type}
                      onValueChange={(val) => setResidentForm({ ...residentForm, room_type: val })}
                    >
                      <SelectTrigger data-testid="resident-room-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Маленькая</SelectItem>
                        <SelectItem value="large">Большая</SelectItem>
                        <SelectItem value="common">Общее пространство</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_block_leader"
                      checked={residentForm.is_block_leader}
                      onChange={(e) => setResidentForm({ ...residentForm, is_block_leader: e.target.checked })}
                      className="rounded"
                      data-testid="resident-leader-checkbox"
                    />
                    <label htmlFor="is_block_leader" className="text-sm">
                      Староста блока
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowResidentForm(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading} data-testid="resident-submit-button">
                      Сохранить
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Residents List */}
            <div className="space-y-2">
              {residents.map((resident) => (
                <Card key={resident.id} className="p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{resident.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Блок {resident.floor * 100 + resident.block} ({resident.floor} этаж) - {
                        resident.room_type === 'small' ? 'Маленькая' :
                        resident.room_type === 'large' ? 'Большая' : 'Общее пространство'
                      }
                      {resident.is_block_leader && ' (Староста)'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteResident(resident.id)}
                    data-testid={`delete-resident-${resident.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <Button
              onClick={() => setShowUserForm(!showUserForm)}
              className="rounded-xl"
              data-testid="add-user-button"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Добавить пользователя
            </Button>

            {showUserForm && (
              <Card className="p-6 rounded-2xl">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Логин</label>
                    <Input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                      data-testid="user-username-input"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Пароль</label>
                    <Input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required
                      data-testid="user-password-input"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Роль</label>
                    <Select
                      value={userForm.role}
                      onValueChange={(val) => setUserForm({ ...userForm, role: val })}
                    >
                      <SelectTrigger data-testid="user-role-select">
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
                      <label className="text-sm font-medium mb-2 block">Этаж</label>
                      <Select
                        value={userForm.floor_number?.toString() || '2'}
                        onValueChange={(val) => setUserForm({ ...userForm, floor_number: parseInt(val) })}
                      >
                        <SelectTrigger data-testid="user-floor-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                            <SelectItem key={f} value={f.toString()}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowUserForm(false)}>
                      Отмена
                    </Button>
                    <Button type="submit" disabled={loading} data-testid="user-submit-button">
                      Создать
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Users List */}
            <div className="space-y-2">
              {users.map((u) => (
                <Card key={u.id} className="p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{u.username}</h3>
                    <p className="text-sm text-muted-foreground">
                      {u.role === 'admin' ? 'Администратор' : `Староста этажа ${u.floor_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Последний вход: {u.last_login ? new Date(u.last_login).toLocaleString('ru-RU') : 'Никогда'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewActivity(u.id)}
                    data-testid={`view-activity-${u.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <Card className="p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-6">Экспорт отчётов в PDF</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Этаж (опционально)</label>
                <Select
                  value={exportFloor}
                  onValueChange={setExportFloor}
                >
                  <SelectTrigger data-testid="export-floor-select">
                    <SelectValue placeholder="Все этажи" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все этажи</SelectItem>
                    {[2, 3, 4, 5, 6, 7, 8, 9].map(f => (
                      <SelectItem key={f} value={f.toString()}>{f} этаж</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Дата начала (опционально)</label>
                <Input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  data-testid="export-start-date"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Дата окончания (опционально)</label>
                <Input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  data-testid="export-end-date"
                />
              </div>

              <Button
                onClick={handleExportPDF}
                className="w-full h-12 text-base rounded-xl"
                data-testid="export-pdf-button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Скачать PDF
              </Button>
            </div>
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <Card className="p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-6">Активность пользователей</h2>
              
              <div className="space-y-2">
                {users.filter(u => u.role === 'floor_manager').map((u) => (
                  <Card key={u.id} className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{u.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          Этаж {u.floor_number}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewActivity(u.id)}
                        data-testid={`view-activity-detail-${u.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Подробнее
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Последний вход: {u.last_login ? new Date(u.last_login).toLocaleString('ru-RU') : 'Никогда'}
                    </div>
                    {u.login_history && u.login_history.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-medium mb-1">Последние 5 входов:</p>
                        {u.login_history.slice(-5).reverse().map((h, i) => (
                          <div key={i} className="text-xs text-muted-foreground">
                            • {new Date(h.timestamp).toLocaleString('ru-RU')} - {h.ip}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
