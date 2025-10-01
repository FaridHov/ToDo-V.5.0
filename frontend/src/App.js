import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import LocalStorageManager from './LocalStorageManager';
import ThemeManager, { THEMES } from './ThemeManager';

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
  // Initialize managers
  const [storageManager] = useState(() => new LocalStorageManager());
  const [themeManager] = useState(() => new ThemeManager());
  
  // State management
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentTheme());
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [notification, setNotification] = useState('');
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
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
  const fileInputRef = useRef(null);

  // Load data from localStorage
  const loadData = useCallback(() => {
    try {
      setLoading(true);
      const categoriesData = storageManager.getCategories();
      const tasksData = storageManager.getTasks();
      const progressData = storageManager.getProgress();
      
      setCategories(categoriesData);
      setTasks(tasksData);
      setProgress(progressData);
      
      // Auto-select first category if none selected
      if (categoriesData.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categoriesData[0].id);
      }
      
      setError('');
    } catch (err) {
      setError('Ошибка загрузки данных: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [storageManager, selectedCategoryId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Close theme selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showThemeSelector && !event.target.closest('.theme-selector-container')) {
        setShowThemeSelector(false);
      }
    };

    if (showThemeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeSelector]);

  // Import/Export functions
  const handleExportToFile = () => {
    try {
      storageManager.exportToFile();
      alert('📁 Данные экспортированы в файл!');
    } catch (err) {
      setError('Ошибка экспорта: ' + err.message);
    }
  };

  const handleImportFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    storageManager.importFromFile(file)
      .then(() => {
        loadData();
        alert('📁 Данные успешно импортированы из файла!');
        event.target.value = ''; // Reset file input
      })
      .catch(err => {
        setError('Ошибка импорта: ' + err.message);
        event.target.value = ''; // Reset file input
      });
  };

  const handleClearAllData = () => {
    if (!window.confirm('🗑️ Удалить ВСЕ данные? Это действие нельзя отменить!')) return;
    
    try {
      storageManager.clearAllData();
      loadData();
      alert('🗑️ Все данные удалены!');
    } catch (err) {
      setError('Ошибка очистки: ' + err.message);
    }
  };

  // Theme functions
  const handleThemeChange = (themeName) => {
    themeManager.setTheme(themeName);
    setCurrentTheme(themeName);
    setShowThemeSelector(false);
    playSound('create');
    showNotification(`Тема изменена на: ${THEMES[themeName]?.name}`);
  };

  // Notification function
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Category functions
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    try {
      storageManager.createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor
      });
      
      playSound('create');
      setNewCategoryName('');
      setNewCategoryColor('#3B82F6');
      showNotification(`✅ Категория "${newCategoryName.trim()}" создана`);
      loadData();
    } catch (err) {
      setError('Ошибка создания категории: ' + err.message);
    }
  };

  const handleUpdateCategory = (categoryId, updates) => {
    try {
      storageManager.updateCategory(categoryId, updates);
      playSound('create');
      setEditingCategory(null);
      loadData();
    } catch (err) {
      setError('Ошибка обновления категории: ' + err.message);
    }
  };

  const handleDeleteCategory = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (!window.confirm(`🗑️ Вы уверены? Это удалит категорию "${category?.name}" и все её задачи.`)) return;
    
    try {
      storageManager.deleteCategory(categoryId);
      playSound('delete');
      if (selectedCategoryId === categoryId) {
        const remaining = categories.filter(c => c.id !== categoryId);
        setSelectedCategoryId(remaining.length > 0 ? remaining[0].id : '');
      }
      showNotification(`✅ Категория "${category?.name}" успешно удалена`);
      loadData();
    } catch (err) {
      setError('Ошибка удаления категории: ' + err.message);
      showNotification('❌ Ошибка при удалении категории');
    }
  };

  // Task functions
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedCategoryId) return;
    
    try {
      storageManager.createTask({
        title: newTaskTitle.trim(),
        weight: newTaskWeight,
        category_id: selectedCategoryId,
        priority: newTaskPriority
      });
      
      playSound('create');
      setNewTaskTitle('');
      setNewTaskWeight(1);
      setNewTaskPriority('medium');
      loadData();
    } catch (err) {
      setError('Ошибка создания задачи: ' + err.message);
    }
  };

  const handleToggleTask = (taskId, completed) => {
    try {
      storageManager.updateTask(taskId, { completed });
      playSound(completed ? 'complete' : 'create');
      loadData();
    } catch (err) {
      setError('Ошибка обновления задачи: ' + err.message);
    }
  };

  const handleUpdateTask = (taskId, updates) => {
    try {
      storageManager.updateTask(taskId, updates);
      playSound('create');
      setEditingTask(null);
      loadData();
    } catch (err) {
      setError('Ошибка обновления задачи: ' + err.message);
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!window.confirm('🗑️ Удалить эту задачу?')) return;
    
    try {
      storageManager.deleteTask(taskId);
      playSound('delete');
      loadData();
    } catch (err) {
      setError('Ошибка удаления задачи: ' + err.message);
    }
  };

  const handleTogglePin = (taskId, pinned) => {
    try {
      storageManager.updateTask(taskId, { pinned });
      playSound('create');
      loadData();
    } catch (err) {
      setError('Ошибка закрепления задачи: ' + err.message);
    }
  };

  // Drag & Drop handlers
  const handleCategoryDragStart = (e, category, index) => {
    setDraggedCategory({ category, index });
    playSound('drag');
  };

  const handleCategoryDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.index === targetIndex) return;
    
    try {
      const newOrder = [...categories];
      const [movedCategory] = newOrder.splice(draggedCategory.index, 1);
      newOrder.splice(targetIndex, 0, movedCategory);
      
      const categoryIds = newOrder.map(c => c.id);
      storageManager.reorderCategories(categoryIds);
      
      setDraggedCategory(null);
      setDragOverIndex(null);
      playSound('complete');
      loadData();
    } catch (err) {
      setError('Ошибка перемещения категории: ' + err.message);
    }
  };

  const handleTaskDragStart = (e, task, index) => {
    setDraggedTask({ task, index });
    playSound('drag');
  };

  const handleTaskDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.index === targetIndex) return;
    
    try {
      const categoryTasks = filteredTasks;
      const newOrder = [...categoryTasks];
      const [movedTask] = newOrder.splice(draggedTask.index, 1);
      newOrder.splice(targetIndex, 0, movedTask);
      
      const taskIds = newOrder.map(t => t.id);
      storageManager.reorderTasks(selectedCategoryId, taskIds);
      
      setDraggedTask(null);
      setDragOverIndex(null);
      playSound('complete');
      loadData();
    } catch (err) {
      setError('Ошибка перемещения задачи: ' + err.message);
    }
  };

  // Helper functions
  const getPriorityClass = (priority, pinned) => {
    let classes = '';
    if (pinned) classes += 'ring-2 ring-red-400 ';
    
    switch (priority) {
      case 'high': return classes + 'border-l-4 border-red-400 bg-red-50';
      case 'medium': return classes + 'border-l-4 border-yellow-400 bg-yellow-50';
      case 'low': return classes + 'border-l-4 border-blue-400 bg-blue-50';
      default: return classes + 'border-l-4 border-gray-400 bg-gray-50';
    }
  };

  // Get filtered tasks for selected category
  const filteredTasks = selectedCategoryId 
    ? tasks.filter(task => task.category_id === selectedCategoryId)
    : [];

  // Get overall progress
  const overallProgress = storageManager.getOverallProgress();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Theme Selector and Import/Export */}
        <div className="glass-window p-6">
          <div className="flex flex-col gap-4">
            
            {/* Top row - Title and Theme */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold theme-text">📊 Трекер Прогресса</h1>
                <p className="theme-text-secondary">LocalStorage Edition - Без сервера!</p>
                {categories.length === 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      🚀 <strong>Как пользоваться:</strong> Создайте категории, добавьте задачи и отслеживайте прогресс. 
                      Все данные сохраняются автоматически в браузере!
                    </p>
                  </div>
                )}
              </div>
              
              {/* Theme Selector */}
              <div className="relative theme-selector-container">
                <button
                  onClick={() => setShowThemeSelector(!showThemeSelector)}
                  className="theme-button px-4 py-2 rounded-md"
                >
                  🎨 {THEMES[currentTheme]?.name || 'Тема'}
                </button>
                
                {showThemeSelector && (
                  <div className="fixed right-4 top-20 z-[9999] glass-window p-4 min-w-[350px] max-h-[500px] overflow-y-auto shadow-2xl border border-gray-300">
                    <h3 className="theme-text text-lg font-semibold mb-3">Выберите тему:</h3>
                    <div className="theme-selector grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2">
                      {Object.keys(THEMES).map(themeKey => (
                        <div
                          key={themeKey}
                          onClick={() => handleThemeChange(themeKey)}
                          className={`theme-option cursor-pointer text-center py-3 px-2 ${
                            currentTheme === themeKey ? 'active' : ''
                          }`}
                        >
                          {THEMES[themeKey].name}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowThemeSelector(false)}
                      className="theme-button w-full mt-4 py-2"
                    >
                      ✖️ Закрыть
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row - Import/Export Controls */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              <button
                onClick={handleExportToFile}
                className="theme-button theme-button-success px-4 py-2 rounded-md"
              >
                📁 Экспорт в файл
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFromFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="theme-button px-4 py-2 rounded-md"
              >
                📁 Импорт из файла
              </button>
              
              <button
                onClick={handleClearAllData}
                className="theme-button theme-button-danger px-4 py-2 rounded-md"
              >
                🗑️ Очистить всё
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 glass-window border-2 border-red-500 rounded">
              <div className="flex justify-between items-center">
                <span className="theme-text">❌ {error}</span>
                <button 
                  onClick={() => setError('')}
                  className="theme-button theme-button-danger px-3 py-1 text-sm"
                >
                  ✖️
                </button>
              </div>
            </div>
          )}

          {notification && (
            <div className="mt-4 p-3 glass-window border-2 border-green-500 rounded animate-pulse">
              <div className="flex justify-between items-center">
                <span className="theme-text">{notification}</span>
                <button 
                  onClick={() => setNotification('')}
                  className="theme-button theme-button-success px-3 py-1 text-sm"
                >
                  ✖️
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="glass-window p-6 text-center">
            <div className="theme-text text-xl">⏳ Загрузка данных...</div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="glass-window p-6">
          <h2 className="text-2xl font-semibold mb-6 theme-text">📈 Обзор прогресса</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(groupedProgress).map(group => (
              <div key={group.group} className="space-y-4">
                <h3 className="text-lg font-semibold theme-text">{group.name}</h3>
                
                {/* Group Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm theme-text-secondary">
                    <span>Общий прогресс группы</span>
                    <span>{group.total_progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-3">
                    <div
                      className="progress-bar-animated h-3 rounded-full transition-all duration-500"
                      style={{ width: `${group.total_progress}%` }}
                    />
                  </div>
                </div>

                {/* Individual Category Progress */}
                <div className="space-y-2">
                  {group.categories.map(categoryProgress => (
                    <div key={categoryProgress.category_id} className="space-y-1">
                      <div className="flex justify-between text-xs theme-text-secondary">
                        <span>{categoryProgress.category_name}</span>
                        <span>
                          {categoryProgress.completed_task_count}/{categoryProgress.task_count} задач
                          ({categoryProgress.progress_percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${categoryProgress.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Section */}
        <div className="glass-window p-6">
          <h2 className="text-2xl font-semibold mb-6 theme-text">📂 Категории</h2>
          
          {/* Create Category Form */}
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории"
              className="glass-input md:col-span-2 px-3 py-2 rounded-md focus:outline-none"
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
              className="px-4 py-2 theme-button focus:outline-none transition-colors"
            >
              ➕ Добавить
            </button>
          </form>

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <div
                key={category.id}
                draggable
                onDragStart={(e) => handleCategoryDragStart(e, category, index)}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                onDrop={(e) => handleCategoryDrop(e, index)}
                className={`group p-4 border rounded-lg cursor-move transition-all duration-300 hover:shadow-lg ${
                  selectedCategoryId === category.id
                    ? 'bg-blue-100 border-blue-400'
                    : 'bg-white border-gray-200'
                } ${dragOverIndex === index ? 'border-indigo-400 bg-indigo-50' : ''}`}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold theme-text">{category.name}</h3>
                    <p className="text-sm theme-text-secondary">
                      {category.group === 'work' && '💼 Работа'}
                      {category.group === 'personal' && '🏠 Личная'}
                      {category.group === 'health' && '💪 Здоровье'}
                    </p>
                  </div>
                  
                  <div className="flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategory(category);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md shadow-sm border border-blue-200"
                      title="Редактировать категорию"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-md shadow-sm border border-red-200"
                      title="Удалить категорию"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {/* Category Progress */}
                {progress.find(p => p.category_id === category.id) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs theme-text-secondary">
                      <span>Прогресс</span>
                      <span>
                        {progress.find(p => p.category_id === category.id)?.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progress.find(p => p.category_id === category.id)?.progress_percentage || 0}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Edit Category Modal */}
          {editingCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="glass-window p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4 theme-text">✏️ Редактировать категорию</h3>
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
                    className="px-4 py-2 theme-button transition-colors"
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
          <div className="glass-window p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold theme-text">📝 Задачи</h2>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="glass-input px-3 py-2 rounded-md focus:outline-none"
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
                className="glass-input md:col-span-2 px-3 py-2 rounded-md focus:outline-none"
              />
              <input
                type="number"
                min="1"
                value={newTaskWeight}
                onChange={(e) => setNewTaskWeight(parseInt(e.target.value) || 1)}
                placeholder="Вес"
                className="glass-input px-3 py-2 rounded-md focus:outline-none"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="glass-input px-3 py-2 rounded-md focus:outline-none"
              >
                <option value="high">🔴 Высокий</option>
                <option value="medium">🟡 Средний</option>
                <option value="low">🔵 Низкий</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 theme-button focus:outline-none transition-colors"
              >
                ➕
              </button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <p className="theme-text-secondary text-center py-8">Нет задач в этой категории</p>
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
                          className="px-2 py-1 theme-button theme-button-success text-sm transition-colors"
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
                          task.completed ? 'line-through text-gray-400' : 'theme-text'
                        }`}>
                          <div className="flex items-center gap-2">
                            {task.pinned && <span className="text-red-400">📌</span>}
                            <span className="font-medium">{task.title}</span>
                            <span className="text-sm font-bold px-2 py-1 rounded-full bg-blue-600 text-white">
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
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => setEditingTask(task)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2 py-1 text-xs theme-button theme-button-danger transition-colors"
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