// LocalStorage Manager for Progress Tracker
// Handles all data operations without backend

import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'progressTrackerData';

class LocalStorageManager {
  constructor() {
    this.initializeStorage();
  }

  // Initialize default data structure
  initializeStorage() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      const defaultData = {
        categories: [],
        tasks: [],
        settings: {
          version: '3.0',
          last_updated: new Date().toISOString()
        }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    }
  }

  // Get all data
  getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Save data
  saveData(data) {
    data.settings.last_updated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Categories CRUD
  getCategories() {
    const data = this.getData();
    return data.categories.sort((a, b) => a.order - b.order);
  }

  createCategory(categoryData) {
    const data = this.getData();
    const newCategory = {
      id: uuidv4(),
      name: categoryData.name,
      color: categoryData.color || '#3B82F6', // Default blue color
      order: Math.max(...data.categories.map(c => c.order), -1) + 1,
      created_at: new Date().toISOString()
    };
    data.categories.push(newCategory);
    this.saveData(data);
    return newCategory;
  }

  updateCategory(categoryId, updates) {
    const data = this.getData();
    const categoryIndex = data.categories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) throw new Error('Category not found');
    
    data.categories[categoryIndex] = { ...data.categories[categoryIndex], ...updates };
    this.saveData(data);
    return data.categories[categoryIndex];
  }

  deleteCategory(categoryId) {
    const data = this.getData();
    // Delete category tasks first
    data.tasks = data.tasks.filter(t => t.category_id !== categoryId);
    // Delete category
    data.categories = data.categories.filter(c => c.id !== categoryId);
    this.saveData(data);
  }

  reorderCategories(newOrder) {
    const data = this.getData();
    newOrder.forEach((categoryId, index) => {
      const category = data.categories.find(c => c.id === categoryId);
      if (category) category.order = index;
    });
    this.saveData(data);
  }

  // Tasks CRUD
  getTasks() {
    const data = this.getData();
    return data.tasks.sort((a, b) => {
      // Sort by pinned first, then by order, then by priority
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      if (a.order !== b.order) return a.order - b.order;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  getTasksByCategory(categoryId) {
    return this.getTasks().filter(t => t.category_id === categoryId);
  }

  createTask(taskData) {
    const data = this.getData();
    const categoryTasks = data.tasks.filter(t => t.category_id === taskData.category_id);
    const newTask = {
      id: uuidv4(),
      title: taskData.title,
      weight: taskData.weight || 1,
      category_id: taskData.category_id,
      priority: taskData.priority || 'medium',
      completed: false,
      pinned: false,
      order: Math.max(...categoryTasks.map(t => t.order), -1) + 1,
      created_at: new Date().toISOString()
    };
    data.tasks.push(newTask);
    this.saveData(data);
    return newTask;
  }

  updateTask(taskId, updates) {
    const data = this.getData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');
    
    data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
    this.saveData(data);
    return data.tasks[taskIndex];
  }

  deleteTask(taskId) {
    const data = this.getData();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    this.saveData(data);
  }

  reorderTasks(categoryId, newOrder) {
    const data = this.getData();
    newOrder.forEach((taskId, index) => {
      const task = data.tasks.find(t => t.id === taskId && t.category_id === categoryId);
      if (task) task.order = index;
    });
    this.saveData(data);
  }

  // Progress calculation
  getProgress() {
    const categories = this.getCategories();
    const tasks = this.getTasks();
    
    return categories.map(category => {
      const categoryTasks = tasks.filter(t => t.category_id === category.id);
      
      const totalWeight = categoryTasks.reduce((sum, task) => sum + task.weight, 0);
      const completedWeight = categoryTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + task.weight, 0);
      
      const taskCount = categoryTasks.length;
      const completedTaskCount = categoryTasks.filter(t => t.completed).length;
      
      const progressPercentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
      
      return {
        category_id: category.id,
        category_name: category.name,
        category_group: category.group,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
        completed_weight: completedWeight,
        total_weight: totalWeight,
        task_count: taskCount,
        completed_task_count: completedTaskCount
      };
    });
  }

  getGroupedProgress() {
    const progress = this.getProgress();
    const groups = {};
    
    Object.keys(DEFAULT_GROUPS).forEach(groupKey => {
      const groupProgress = progress.filter(p => {
        const category = this.getCategories().find(c => c.id === p.category_id);
        return category && category.group === groupKey;
      });
      
      const totalWeight = groupProgress.reduce((sum, p) => sum + p.total_weight, 0);
      const completedWeight = groupProgress.reduce((sum, p) => sum + p.completed_weight, 0);
      const avgProgress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
      
      groups[groupKey] = {
        group: groupKey,
        name: DEFAULT_GROUPS[groupKey],
        categories: groupProgress,
        total_progress: Math.round(avgProgress * 100) / 100
      };
    });
    
    return groups;
  }

  // Import/Export functionality
  exportData() {
    return this.getData();
  }

  importData(importedData) {
    // Validate data structure
    if (!importedData.categories || !importedData.tasks || !importedData.settings) {
      throw new Error('Неверная структура данных для импорта');
    }
    
    // Ensure all required fields exist
    const validatedData = {
      categories: importedData.categories.map(cat => ({
        id: cat.id || uuidv4(),
        name: cat.name || 'Unnamed Category',
        group: cat.group || 'work',
        order: cat.order || 0,
        created_at: cat.created_at || new Date().toISOString()
      })),
      tasks: importedData.tasks.map(task => ({
        id: task.id || uuidv4(),
        title: task.title || 'Unnamed Task',
        weight: task.weight || 1,
        category_id: task.category_id,
        priority: task.priority || 'medium',
        completed: Boolean(task.completed),
        pinned: Boolean(task.pinned),
        order: task.order || 0,
        created_at: task.created_at || new Date().toISOString()
      })),
      settings: {
        version: '2.0',
        last_updated: new Date().toISOString()
      }
    };
    
    this.saveData(validatedData);
    return validatedData;
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.initializeStorage();
  }

  // File Export/Import
  exportToFile() {
    const data = this.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          const result = this.importData(importedData);
          resolve(result);
        } catch (error) {
          reject(new Error('Ошибка чтения файла: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }
}

export default LocalStorageManager;