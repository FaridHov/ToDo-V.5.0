import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Sound effects URLs (we'll create simple audio for demo)
const SOUNDS = {
  create: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFAlGn+DyvmEaBC6D0fPTgDUHHXzE7+OZSAR',
  complete: 'data:audio/wav;base64,UklGRp4DAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXoDAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFAlGn+DyvmEaBC6D0fPTgDUHHXzE7+OZSAR',
  delete: 'data:audio/wav;base64,UklGRp4DAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXoDAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFAlGn+DyvmEaBC6D0fPTgDUHHXzE7+OZSAR',
  drag: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N+QQAoUXrTp66hVFAlGn+DyvmEaBC6D0fPTgDUHHXzE7+OZSAR'
};

// Sound utility
const playSound = (soundType) => {
  try {
    const audio = new Audio(SOUNDS[soundType]);
    audio.volume = 0.3; // Keep sounds subtle
    audio.play().catch(() => {}); // Ignore errors in case user hasn't interacted with page yet
  } catch (e) {
    // Silently fail if audio doesn't work
  }
};

function App() {
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // LocalStorage functions
  const saveToLocalStorage = async () => {
    try {
      const response = await fetch(`${API_URL}/api/export`);
      if (!response.ok) throw new Error('Failed to export data');
      const data = await response.json();
      localStorage.setItem('progressTrackerData', JSON.stringify(data));
      alert('Данные сохранены в браузере!');
    } catch (err) {
      setError('Ошибка сохранения: ' + err.message);
    }
  };

  const loadFromLocalStorage = async () => {
    try {
      const savedData = localStorage.getItem('progressTrackerData');
      if (!savedData) {
        alert('Нет сохраненных данных в браузере');
        return;
      }
      
      const response = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: savedData
      });
      
      if (!response.ok) throw new Error('Failed to import data');
      
      await loadData();
      alert('Данные загружены из браузера!');
    } catch (err) {
      setError('Ошибка загрузки: ' + err.message);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Удалить ВСЕ данные? Это действие нельзя отменить!')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/clear-all`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear data');
      
      localStorage.removeItem('progressTrackerData');
      await loadData();
      alert('Все данные удалены!');
    } catch (err) {
      setError('Ошибка очистки: ' + err.message);
    }
  };
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState('default');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskWeight, setNewTaskWeight] = useState(1);
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  
  // Drag & Drop states
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  const draggedOverRef = useRef(null);

  // Fetch functions
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id);
      }
    } catch (err) {
      setError('Error loading categories: ' + err.message);
    }
  }, [selectedCategoryId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError('Error loading tasks: ' + err.message);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      setProgress(data);
    } catch (err) {
      setError('Error loading progress: ' + err.message);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchTasks(), fetchProgress()]);
    setLoading(false);
  }, [fetchCategories, fetchTasks, fetchProgress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Category functions
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategoryName.trim(),
          group: newCategoryGroup
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create category');
      }
      
      playSound('create');
      setNewCategoryName('');
      setNewCategoryGroup('default');
      await loadData();
    } catch (err) {
      setError('Error creating category: ' + err.message);
    }
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update category');
      }
      
      playSound('create');
      setEditingCategory(null);
      await loadData();
    } catch (err) {
      setError('Error updating category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Вы уверены? Это удалит категорию и все её задачи.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/categories/${categoryId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete category');
      
      playSound('delete');
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId('');
      }
      await loadData();
    } catch (err) {
      setError('Error deleting category: ' + err.message);
    }
  };

  // Task functions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedCategoryId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          weight: newTaskWeight,
          category_id: selectedCategoryId,
          priority: newTaskPriority
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create task');
      }
      
      playSound('create');
      setNewTaskTitle('');
      setNewTaskWeight(1);
      setNewTaskPriority('medium');
      await loadData();
    } catch (err) {
      setError('Error creating task: ' + err.message);
    }
  };

  const handleToggleTask = async (taskId, completed) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      playSound(completed ? 'complete' : 'create');
      await loadData();
    } catch (err) {
      setError('Error updating task: ' + err.message);
    }
  };

  const handleTogglePin = async (taskId, pinned) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned })
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      playSound('create');
      await loadData();
    } catch (err) {
      setError('Error updating task: ' + err.message);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update task');
      }
      
      playSound('create');
      setEditingTask(null);
      await loadData();
    } catch (err) {
      setError('Error updating task: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Удалить эту задачу?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      playSound('delete');
      await loadData();
    } catch (err) {
      setError('Error deleting task: ' + err.message);
    }
  };

  // Drag & Drop functions for categories
  const handleCategoryDragStart = (e, category, index) => {
    setDraggedCategory({ category, index });
    e.dataTransfer.effectAllowed = 'move';
    playSound('drag');
  };

  const handleCategoryDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleCategoryDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.index === dropIndex) {
      setDraggedCategory(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder categories
    const reorderedCategories = [...categories];
    const [removed] = reorderedCategories.splice(draggedCategory.index, 1);
    reorderedCategories.splice(dropIndex, 0, removed);

    // Update order in backend
    const orderUpdates = reorderedCategories.map((cat, index) => ({
      id: cat.id,
      order: index
    }));

    try {
      await fetch(`${API_URL}/api/categories/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderUpdates)
      });
      
      playSound('complete');
      await loadData();
    } catch (err) {
      setError('Error reordering categories: ' + err.message);
    }

    setDraggedCategory(null);
    setDragOverIndex(null);
  };

  // Drag & Drop functions for tasks
  const handleTaskDragStart = (e, task, index) => {
    setDraggedTask({ task, index });
    e.dataTransfer.effectAllowed = 'move';
    playSound('drag');
  };

  const handleTaskDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.index === dropIndex) {
      setDraggedTask(null);
      return;
    }

    const categoryTasks = tasks.filter(t => t.category_id === selectedCategoryId);
    const reorderedTasks = [...categoryTasks];
    const [removed] = reorderedTasks.splice(draggedTask.index, 1);
    reorderedTasks.splice(dropIndex, 0, removed);

    // Update order in backend
    const orderUpdates = reorderedTasks.map((task, index) => ({
      id: task.id,
      order: index
    }));

    try {
      await fetch(`${API_URL}/api/tasks/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderUpdates)
      });
      
      playSound('complete');
      await loadData();
    } catch (err) {
      setError('Error reordering tasks: ' + err.message);
    }

    setDraggedTask(null);
  };

  // Get priority class for visual cascading effect
  const getPriorityClass = (priority, pinned) => {
    if (pinned) return 'task-pinned';
    switch (priority) {
      case 'high': return 'task-high-priority';
      case 'medium': return 'task-medium-priority';
      case 'low': return 'task-low-priority';
      default: return 'task-medium-priority';
    }
  };

  // Get unique groups
  const getUniqueGroups = () => {
    const groups = new Set(categories.map(cat => cat.group || 'default'));
    return Array.from(groups);
  };

  // Filter tasks for selected category
  const filteredTasks = tasks.filter(task => task.category_id === selectedCategoryId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-window p-8">
          <div className="text-xl dark-blue-text">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Data Management Controls */}
        <div className="glass-window p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={saveToLocalStorage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              💾 Сохранить данные
            </button>
            <button
              onClick={loadFromLocalStorage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📁 Загрузить данные
            </button>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Очистить все
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="glass-window border-red-400 p-4 mb-6 relative">
            <div className="text-red-300">{error}</div>
            <button 
              onClick={() => setError('')}
              className="absolute top-2 right-2 text-red-300 hover:text-red-100 text-xl"
            >
              &times;
            </button>
          </div>
        )}

        {/* Progress Bars Section */}
        <div className="glass-window p-6 mb-8">
          
          {progress.length === 0 ? (
            <p className="dark-blue-text-secondary text-center py-8">Пока нет категорий. Создайте первую категорию ниже.</p>
          ) : (
            <div className="space-y-6">
              {/* Group by categories */}
              {getUniqueGroups().map(group => {
                const groupProgress = progress.filter(p => p.category_group === group);
                const avgProgress = groupProgress.reduce((sum, p) => sum + p.progress_percentage, 0) / groupProgress.length;
                
                return (
                  <div key={group} className="glass-card rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold dark-blue-text capitalize">📁 {group}</h3>
                      <span className="text-sm font-bold text-blue-300">
                        Средний: {Math.round(avgProgress)}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupProgress.map((prog, index) => (
                        <div 
                          key={prog.category_id}
                          draggable
                          onDragStart={(e) => handleCategoryDragStart(e, prog, index)}
                          onDragOver={(e) => handleCategoryDragOver(e, index)}
                          onDrop={(e) => handleCategoryDrop(e, index)}
                          className={`category-card rounded-lg p-4 transition-all duration-300 cursor-move ${
                            dragOverIndex === index ? 'border-blue-400' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold dark-blue-text">{prog.category_name}</h4>
                            <span className="text-sm font-bold text-blue-300">
                              {Math.round(prog.progress_percentage)}%
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
                            <div 
                              className="progress-bar-animated h-4 rounded-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: `${prog.progress_percentage}%`
                              }}
                            ></div>
                          </div>
                          
                          <div className="text-xs dark-blue-text-secondary mb-2">
                            {prog.completed_weight} из {prog.total_weight} очков
                          </div>
                          
                          <div className="text-xs dark-blue-text-secondary">
                            {prog.completed_task_count}/{prog.task_count} задач
                          </div>
                          
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => setSelectedCategoryId(prog.category_id)}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              Выбрать
                            </button>
                            <button
                              onClick={() => setEditingCategory({ id: prog.category_id, name: prog.category_name, group: prog.category_group })}
                              className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(prog.category_id)}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Management */}
        <div className="glass-window p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 dark-blue-text">🏷️ Управление категориями</h2>
          
          {/* Create Category Form */}
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название новой категории"
              className="glass-input md:col-span-2 px-3 py-2 rounded-md focus:outline-none transition-colors"
            />
            <select
              value={newCategoryGroup}
              onChange={(e) => setNewCategoryGroup(e.target.value)}
              className="glass-input px-3 py-2 rounded-md focus:outline-none"
            >
              <option value="work">Работа</option>
              <option value="personal">Личная</option>
              <option value="health">Здоровье</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none transition-colors"
            >
              ➕ Создать
            </button>
          </form>
          
          {/* Edit Category Modal */}
          {editingCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="glass-window p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 dark-blue-text">✏️ Редактировать категорию</h3>
                <input
                  type="text"
                  defaultValue={editingCategory.name}
                  className="glass-input w-full px-3 py-2 rounded-md focus:outline-none mb-3"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const name = e.target.value;
                      const groupSelect = e.target.parentElement.querySelector('select');
                      const group = groupSelect.value;
                      handleUpdateCategory(editingCategory.id, { name, group });
                    }
                  }}
                  autoFocus
                />
                <select
                  defaultValue={editingCategory.group}
                  className="glass-input w-full px-3 py-2 rounded-md focus:outline-none mb-4"
                >
                  <option value="work">Работа</option>
                  <option value="personal">Личная</option>
                  <option value="health">Здоровье</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      const form = e.target.parentElement.parentElement;
                      const nameInput = form.querySelector('input[type="text"]');
                      const groupSelect = form.querySelector('select');
                      handleUpdateCategory(editingCategory.id, {
                        name: nameInput.value,
                        group: groupSelect.value
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    💾 Сохранить
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    ❌ Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks Section */}
        {selectedCategoryId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">📝 Задачи</h2>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Выберите категорию</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.group !== 'default' ? `[${cat.group}] ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Task Form */}
            <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-6">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Название задачи"
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                min="1"
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(parseInt(e.target.value) || 1)}
                placeholder="Вес"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">🔴 Высокий</option>
                <option value="medium">🟡 Средний</option>
                <option value="low">🔵 Низкий</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                ➕
              </button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет задач в этой категории</p>
              ) : (
                filteredTasks.map((task, index) => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleTaskDragStart(e, task, index)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                    onDrop={(e) => handleTaskDrop(e, index)}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all duration-300 cursor-move ${
                      task.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    } ${getPriorityClass(task.priority, task.pinned)} ${
                      dragOverIndex === index ? 'border-indigo-400 bg-indigo-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => handleToggleTask(task.id, e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    
                    {editingTask?.id === task.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          defaultValue={task.title}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          ref={(input) => input && input.focus()}
                        />
                        <input
                          type="number"
                          min="1"
                          defaultValue={task.weight}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        />
                        <select
                          defaultValue={task.priority}
                          className="px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="high">🔴</option>
                          <option value="medium">🟡</option>
                          <option value="low">🔵</option>
                        </select>
                        <button
                          onClick={(e) => {
                            const form = e.target.parentElement;
                            const titleInput = form.querySelector('input[type="text"]');
                            const weightInput = form.querySelector('input[type="number"]');
                            const prioritySelect = form.querySelector('select');
                            handleUpdateTask(task.id, {
                              title: titleInput.value,
                              weight: parseInt(weightInput.value),
                              priority: prioritySelect.value
                            });
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm transition-colors"
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={`flex-1 ${
                          task.completed ? 'line-through text-gray-500' : 'text-gray-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            {task.pinned && <span className="text-red-500">📌</span>}
                            <span className="font-medium">{task.title}</span>
                            <span className="text-sm font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                              {task.weight} pts
                            </span>
                            <span className="text-xs">
                              {task.priority === 'high' && '🔴'}
                              {task.priority === 'medium' && '🟡'}
                              {task.priority === 'low' && '🔵'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleTogglePin(task.id, !task.pinned)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              task.pinned 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {task.pinned ? '📌' : '📌'}
                          </button>
                          <button
                            onClick={() => setEditingTask(task)}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;