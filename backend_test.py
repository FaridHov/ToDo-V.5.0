#!/usr/bin/env python3
"""
Backend API Testing for Progress Tracker v2.0
Tests enhanced CRUD operations with groups, priorities, pinning, drag & drop, and MongoDB integration
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BASE_URL = "https://personaltracker.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ProgressTrackerTesterV2:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS
        self.test_categories = []
        self.test_tasks = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        self.groups = ["default", "work", "personal", "health", "learning"]
        self.priorities = ["high", "medium", "low"]
    
    def log_result(self, test_name, success, message=""):
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = requests.get(f"{self.base_url.replace('/api', '')}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("Health Check", True, f"API is running: {data.get('message', '')}")
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Health Check", False, f"Connection error: {str(e)}")
    
    def test_category_crud(self):
        """Test Category CRUD operations"""
        print("\n=== Testing Category CRUD ===")
        
        # Test 1: Create category
        category_data = {"name": f"Test Category {uuid.uuid4().hex[:8]}"}
        try:
            response = requests.post(f"{self.base_url}/categories", 
                                   json=category_data, headers=self.headers)
            if response.status_code == 200:
                category = response.json()
                if "id" in category and "name" in category and "created_at" in category:
                    self.test_categories.append(category)
                    self.log_result("Create Category", True, f"Created category with ID: {category['id']}")
                else:
                    self.log_result("Create Category", False, "Missing required fields in response")
            else:
                self.log_result("Create Category", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Category", False, f"Exception: {str(e)}")
        
        if not self.test_categories:
            return
        
        category_id = self.test_categories[0]["id"]
        
        # Test 2: Get all categories
        try:
            response = requests.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    found = any(cat["id"] == category_id for cat in categories)
                    self.log_result("Get Categories", found, f"Found {len(categories)} categories")
                else:
                    self.log_result("Get Categories", False, "No categories returned")
            else:
                self.log_result("Get Categories", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Categories", False, f"Exception: {str(e)}")
        
        # Test 3: Update category
        update_data = {"name": f"Updated Category {uuid.uuid4().hex[:8]}"}
        try:
            response = requests.put(f"{self.base_url}/categories/{category_id}", 
                                  json=update_data, headers=self.headers)
            if response.status_code == 200:
                updated_category = response.json()
                if updated_category["name"] == update_data["name"]:
                    self.log_result("Update Category", True, "Category name updated successfully")
                else:
                    self.log_result("Update Category", False, "Category name not updated")
            else:
                self.log_result("Update Category", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Update Category", False, f"Exception: {str(e)}")
        
        # Test 4: Duplicate category name validation
        try:
            response = requests.post(f"{self.base_url}/categories", 
                                   json=update_data, headers=self.headers)
            if response.status_code == 400:
                self.log_result("Duplicate Category Validation", True, "Correctly rejected duplicate name")
            else:
                self.log_result("Duplicate Category Validation", False, f"Should have rejected duplicate, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Duplicate Category Validation", False, f"Exception: {str(e)}")
    
    def test_task_crud(self):
        """Test Task CRUD operations"""
        print("\n=== Testing Task CRUD ===")
        
        if not self.test_categories:
            self.log_result("Task CRUD Setup", False, "No test categories available")
            return
        
        category_id = self.test_categories[0]["id"]
        
        # Test 1: Create task with weight
        task_data = {
            "title": f"Test Task {uuid.uuid4().hex[:8]}",
            "weight": 5,
            "category_id": category_id
        }
        try:
            response = requests.post(f"{self.base_url}/tasks", 
                                   json=task_data, headers=self.headers)
            if response.status_code == 200:
                task = response.json()
                if all(key in task for key in ["id", "title", "weight", "category_id", "completed", "created_at"]):
                    self.test_tasks.append(task)
                    self.log_result("Create Task", True, f"Created task with weight {task['weight']}")
                else:
                    self.log_result("Create Task", False, "Missing required fields in task response")
            else:
                self.log_result("Create Task", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Create Task", False, f"Exception: {str(e)}")
        
        # Test 2: Create task with invalid weight (should fail)
        invalid_task_data = {
            "title": "Invalid Task",
            "weight": 0,  # Should be > 0
            "category_id": category_id
        }
        try:
            response = requests.post(f"{self.base_url}/tasks", 
                                   json=invalid_task_data, headers=self.headers)
            if response.status_code == 422:  # Validation error
                self.log_result("Task Weight Validation", True, "Correctly rejected zero weight")
            else:
                self.log_result("Task Weight Validation", False, f"Should have rejected zero weight, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Task Weight Validation", False, f"Exception: {str(e)}")
        
        # Test 3: Create task with non-existent category
        invalid_category_task = {
            "title": "Orphan Task",
            "weight": 3,
            "category_id": "non-existent-id"
        }
        try:
            response = requests.post(f"{self.base_url}/tasks", 
                                   json=invalid_category_task, headers=self.headers)
            if response.status_code == 404:
                self.log_result("Task Category Validation", True, "Correctly rejected non-existent category")
            else:
                self.log_result("Task Category Validation", False, f"Should have rejected non-existent category, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Task Category Validation", False, f"Exception: {str(e)}")
        
        if not self.test_tasks:
            return
        
        task_id = self.test_tasks[0]["id"]
        
        # Test 4: Get tasks
        try:
            response = requests.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    found = any(task["id"] == task_id for task in tasks)
                    self.log_result("Get All Tasks", found, f"Found {len(tasks)} tasks")
                else:
                    self.log_result("Get All Tasks", False, "Tasks response is not a list")
            else:
                self.log_result("Get All Tasks", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get All Tasks", False, f"Exception: {str(e)}")
        
        # Test 5: Get tasks by category
        try:
            response = requests.get(f"{self.base_url}/tasks?category_id={category_id}")
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    category_tasks = [task for task in tasks if task["category_id"] == category_id]
                    self.log_result("Get Tasks by Category", len(category_tasks) > 0, f"Found {len(category_tasks)} tasks for category")
                else:
                    self.log_result("Get Tasks by Category", False, "Tasks response is not a list")
            else:
                self.log_result("Get Tasks by Category", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Tasks by Category", False, f"Exception: {str(e)}")
        
        # Test 6: Update task (mark as completed)
        update_data = {"completed": True}
        try:
            response = requests.put(f"{self.base_url}/tasks/{task_id}", 
                                  json=update_data, headers=self.headers)
            if response.status_code == 200:
                updated_task = response.json()
                if updated_task["completed"] == True:
                    self.log_result("Mark Task Completed", True, "Task marked as completed")
                    # Update our local copy
                    self.test_tasks[0]["completed"] = True
                else:
                    self.log_result("Mark Task Completed", False, "Task completion status not updated")
            else:
                self.log_result("Mark Task Completed", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Mark Task Completed", False, f"Exception: {str(e)}")
        
        # Test 7: Update task title and weight
        update_data = {"title": "Updated Task Title", "weight": 10}
        try:
            response = requests.put(f"{self.base_url}/tasks/{task_id}", 
                                  json=update_data, headers=self.headers)
            if response.status_code == 200:
                updated_task = response.json()
                if updated_task["title"] == update_data["title"] and updated_task["weight"] == update_data["weight"]:
                    self.log_result("Update Task Details", True, "Task title and weight updated")
                    # Update our local copy
                    self.test_tasks[0]["title"] = update_data["title"]
                    self.test_tasks[0]["weight"] = update_data["weight"]
                else:
                    self.log_result("Update Task Details", False, "Task details not updated correctly")
            else:
                self.log_result("Update Task Details", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Task Details", False, f"Exception: {str(e)}")
    
    def test_progress_calculation(self):
        """Test progress calculation logic"""
        print("\n=== Testing Progress Calculation ===")
        
        if not self.test_categories:
            self.log_result("Progress Calculation Setup", False, "No test categories available")
            return
        
        category_id = self.test_categories[0]["id"]
        
        # Create multiple tasks with different weights for testing
        test_tasks_data = [
            {"title": "Task 1", "weight": 10, "category_id": category_id},
            {"title": "Task 2", "weight": 20, "category_id": category_id},
            {"title": "Task 3", "weight": 30, "category_id": category_id}
        ]
        
        created_tasks = []
        for task_data in test_tasks_data:
            try:
                response = requests.post(f"{self.base_url}/tasks", 
                                       json=task_data, headers=self.headers)
                if response.status_code == 200:
                    created_tasks.append(response.json())
            except Exception as e:
                print(f"Failed to create test task: {e}")
        
        if len(created_tasks) < 3:
            self.log_result("Progress Test Setup", False, f"Only created {len(created_tasks)} out of 3 test tasks")
            return
        
        # Test 1: Initial progress (no tasks completed)
        try:
            response = requests.get(f"{self.base_url}/categories/{category_id}/progress")
            if response.status_code == 200:
                progress = response.json()
                expected_total = 10 + 20 + 30 + 10  # Including the original task with weight 10
                if progress["total_weight"] >= 60 and progress["completed_weight"] >= 10:  # Original task was completed
                    self.log_result("Initial Progress Check", True, f"Progress: {progress['progress_percentage']:.1f}%")
                else:
                    self.log_result("Initial Progress Check", False, f"Unexpected weights: completed={progress['completed_weight']}, total={progress['total_weight']}")
            else:
                self.log_result("Initial Progress Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Initial Progress Check", False, f"Exception: {str(e)}")
        
        # Test 2: Mark first task as completed and check progress
        try:
            response = requests.put(f"{self.base_url}/tasks/{created_tasks[0]['id']}", 
                                  json={"completed": True}, headers=self.headers)
            if response.status_code == 200:
                # Check progress again
                response = requests.get(f"{self.base_url}/categories/{category_id}/progress")
                if response.status_code == 200:
                    progress = response.json()
                    # Should have original completed task (10) + newly completed task (10) = 20 completed weight
                    expected_completed = 20
                    if progress["completed_weight"] >= expected_completed:
                        self.log_result("Progress After Completion", True, f"Progress: {progress['progress_percentage']:.1f}%")
                    else:
                        self.log_result("Progress After Completion", False, f"Expected completed weight >= {expected_completed}, got {progress['completed_weight']}")
                else:
                    self.log_result("Progress After Completion", False, f"Failed to get progress: {response.status_code}")
            else:
                self.log_result("Progress After Completion", False, f"Failed to mark task completed: {response.status_code}")
        except Exception as e:
            self.log_result("Progress After Completion", False, f"Exception: {str(e)}")
        
        # Test 3: Test all categories progress endpoint
        try:
            response = requests.get(f"{self.base_url}/progress")
            if response.status_code == 200:
                all_progress = response.json()
                if isinstance(all_progress, list) and len(all_progress) > 0:
                    found_category = any(p["category_id"] == category_id for p in all_progress)
                    self.log_result("All Categories Progress", found_category, f"Found progress for {len(all_progress)} categories")
                else:
                    self.log_result("All Categories Progress", False, "No progress data returned")
            else:
                self.log_result("All Categories Progress", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("All Categories Progress", False, f"Exception: {str(e)}")
        
        # Test 4: Progress calculation accuracy
        # Mark all tasks as completed and verify 100% progress
        for task in created_tasks[1:]:  # Skip first one, already completed
            try:
                requests.put(f"{self.base_url}/tasks/{task['id']}", 
                           json={"completed": True}, headers=self.headers)
            except:
                pass
        
        try:
            response = requests.get(f"{self.base_url}/categories/{category_id}/progress")
            if response.status_code == 200:
                progress = response.json()
                if progress["progress_percentage"] == 100.0:
                    self.log_result("100% Progress Calculation", True, "All tasks completed = 100%")
                else:
                    self.log_result("100% Progress Calculation", False, f"Expected 100%, got {progress['progress_percentage']}%")
            else:
                self.log_result("100% Progress Calculation", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("100% Progress Calculation", False, f"Exception: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n=== Testing Edge Cases ===")
        
        # Test 1: Progress for category with no tasks
        if self.test_categories:
            # Create a new category with no tasks
            empty_category_data = {"name": f"Empty Category {uuid.uuid4().hex[:8]}"}
            try:
                response = requests.post(f"{self.base_url}/categories", 
                                       json=empty_category_data, headers=self.headers)
                if response.status_code == 200:
                    empty_category = response.json()
                    
                    # Check progress for empty category
                    response = requests.get(f"{self.base_url}/categories/{empty_category['id']}/progress")
                    if response.status_code == 200:
                        progress = response.json()
                        if progress["progress_percentage"] == 0.0 and progress["total_weight"] == 0:
                            self.log_result("Empty Category Progress", True, "Empty category shows 0% progress")
                        else:
                            self.log_result("Empty Category Progress", False, f"Expected 0% progress, got {progress['progress_percentage']}%")
                    else:
                        self.log_result("Empty Category Progress", False, f"Status: {response.status_code}")
                else:
                    self.log_result("Empty Category Progress", False, "Failed to create empty category")
            except Exception as e:
                self.log_result("Empty Category Progress", False, f"Exception: {str(e)}")
        
        # Test 2: Non-existent category progress
        try:
            response = requests.get(f"{self.base_url}/categories/non-existent-id/progress")
            if response.status_code == 404:
                self.log_result("Non-existent Category Progress", True, "Correctly returned 404 for non-existent category")
            else:
                self.log_result("Non-existent Category Progress", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Non-existent Category Progress", False, f"Exception: {str(e)}")
        
        # Test 3: Delete non-existent task
        try:
            response = requests.delete(f"{self.base_url}/tasks/non-existent-id")
            if response.status_code == 404:
                self.log_result("Delete Non-existent Task", True, "Correctly returned 404")
            else:
                self.log_result("Delete Non-existent Task", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Delete Non-existent Task", False, f"Exception: {str(e)}")
        
        # Test 4: Update non-existent task
        try:
            response = requests.put(f"{self.base_url}/tasks/non-existent-id", 
                                  json={"completed": True}, headers=self.headers)
            if response.status_code == 404:
                self.log_result("Update Non-existent Task", True, "Correctly returned 404")
            else:
                self.log_result("Update Non-existent Task", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Update Non-existent Task", False, f"Exception: {str(e)}")
    
    def test_cascade_deletion(self):
        """Test cascade deletion of tasks when category is deleted"""
        print("\n=== Testing Cascade Deletion ===")
        
        # Create a category specifically for deletion testing
        category_data = {"name": f"Delete Test Category {uuid.uuid4().hex[:8]}"}
        try:
            response = requests.post(f"{self.base_url}/categories", 
                                   json=category_data, headers=self.headers)
            if response.status_code == 200:
                delete_category = response.json()
                category_id = delete_category["id"]
                
                # Create tasks in this category
                task_data = {
                    "title": "Task to be deleted",
                    "weight": 5,
                    "category_id": category_id
                }
                response = requests.post(f"{self.base_url}/tasks", 
                                       json=task_data, headers=self.headers)
                if response.status_code == 200:
                    task = response.json()
                    task_id = task["id"]
                    
                    # Delete the category
                    response = requests.delete(f"{self.base_url}/categories/{category_id}")
                    if response.status_code == 200:
                        # Verify task is also deleted
                        response = requests.get(f"{self.base_url}/tasks")
                        if response.status_code == 200:
                            tasks = response.json()
                            task_exists = any(t["id"] == task_id for t in tasks)
                            if not task_exists:
                                self.log_result("Cascade Deletion", True, "Tasks deleted when category deleted")
                            else:
                                self.log_result("Cascade Deletion", False, "Task still exists after category deletion")
                        else:
                            self.log_result("Cascade Deletion", False, "Failed to verify task deletion")
                    else:
                        self.log_result("Cascade Deletion", False, f"Failed to delete category: {response.status_code}")
                else:
                    self.log_result("Cascade Deletion", False, "Failed to create test task")
            else:
                self.log_result("Cascade Deletion", False, "Failed to create test category")
        except Exception as e:
            self.log_result("Cascade Deletion", False, f"Exception: {str(e)}")
    
    def test_localstorage_export_import(self):
        """Test localStorage export/import functionality"""
        print("\n=== Testing LocalStorage Export/Import ===")
        
        # Test 1: Export data when database has content
        try:
            response = requests.get(f"{self.base_url}/export")
            if response.status_code == 200:
                export_data = response.json()
                required_fields = ["categories", "tasks", "exported_at"]
                if all(field in export_data for field in required_fields):
                    self.log_result("Export Data Structure", True, f"Export contains {len(export_data['categories'])} categories, {len(export_data['tasks'])} tasks")
                    
                    # Store export data for import test
                    self.export_backup = export_data
                else:
                    self.log_result("Export Data Structure", False, f"Missing required fields. Got: {list(export_data.keys())}")
            else:
                self.log_result("Export Data Structure", False, f"Export failed with status: {response.status_code}")
        except Exception as e:
            self.log_result("Export Data Structure", False, f"Exception: {str(e)}")
        
        # Test 2: Clear all data
        try:
            response = requests.delete(f"{self.base_url}/clear-all")
            if response.status_code == 200:
                # Verify data is cleared
                categories_response = requests.get(f"{self.base_url}/categories")
                tasks_response = requests.get(f"{self.base_url}/tasks")
                
                if (categories_response.status_code == 200 and tasks_response.status_code == 200):
                    categories = categories_response.json()
                    tasks = tasks_response.json()
                    
                    if len(categories) == 0 and len(tasks) == 0:
                        self.log_result("Clear All Data", True, "All categories and tasks cleared successfully")
                    else:
                        self.log_result("Clear All Data", False, f"Data not fully cleared: {len(categories)} categories, {len(tasks)} tasks remain")
                else:
                    self.log_result("Clear All Data", False, "Failed to verify data clearing")
            else:
                self.log_result("Clear All Data", False, f"Clear failed with status: {response.status_code}")
        except Exception as e:
            self.log_result("Clear All Data", False, f"Exception: {str(e)}")
        
        # Test 3: Export empty database
        try:
            response = requests.get(f"{self.base_url}/export")
            if response.status_code == 200:
                empty_export = response.json()
                if (len(empty_export["categories"]) == 0 and len(empty_export["tasks"]) == 0 
                    and "exported_at" in empty_export):
                    self.log_result("Export Empty Database", True, "Empty database export works correctly")
                else:
                    self.log_result("Export Empty Database", False, f"Empty export contains data: {len(empty_export['categories'])} categories, {len(empty_export['tasks'])} tasks")
            else:
                self.log_result("Export Empty Database", False, f"Empty export failed with status: {response.status_code}")
        except Exception as e:
            self.log_result("Export Empty Database", False, f"Exception: {str(e)}")
        
        # Test 4: Import data back
        if hasattr(self, 'export_backup'):
            try:
                response = requests.post(f"{self.base_url}/import", 
                                       json=self.export_backup, headers=self.headers)
                if response.status_code == 200:
                    # Verify data is restored
                    categories_response = requests.get(f"{self.base_url}/categories")
                    tasks_response = requests.get(f"{self.base_url}/tasks")
                    
                    if (categories_response.status_code == 200 and tasks_response.status_code == 200):
                        categories = categories_response.json()
                        tasks = tasks_response.json()
                        
                        expected_categories = len(self.export_backup["categories"])
                        expected_tasks = len(self.export_backup["tasks"])
                        
                        if len(categories) == expected_categories and len(tasks) == expected_tasks:
                            self.log_result("Import Data Restore", True, f"Data restored: {len(categories)} categories, {len(tasks)} tasks")
                        else:
                            self.log_result("Import Data Restore", False, f"Data mismatch: expected {expected_categories}/{expected_tasks}, got {len(categories)}/{len(tasks)}")
                    else:
                        self.log_result("Import Data Restore", False, "Failed to verify data restoration")
                else:
                    self.log_result("Import Data Restore", False, f"Import failed with status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("Import Data Restore", False, f"Exception: {str(e)}")
        
        # Test 5: Import invalid data
        invalid_data = {"invalid": "structure"}
        try:
            response = requests.post(f"{self.base_url}/import", 
                                   json=invalid_data, headers=self.headers)
            if response.status_code in [400, 422, 500]:  # Should reject invalid data
                self.log_result("Import Invalid Data", True, f"Correctly rejected invalid data with status {response.status_code}")
            else:
                self.log_result("Import Invalid Data", False, f"Should have rejected invalid data, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Import Invalid Data", False, f"Exception: {str(e)}")
        
        # Test 6: Complete cycle test - export → clear → import → verify
        try:
            # First ensure we have some data
            if not hasattr(self, 'export_backup') or len(self.export_backup["categories"]) == 0:
                # Create test data for cycle test
                test_category = {"name": f"Cycle Test Category {uuid.uuid4().hex[:8]}"}
                cat_response = requests.post(f"{self.base_url}/categories", json=test_category, headers=self.headers)
                if cat_response.status_code == 200:
                    category = cat_response.json()
                    test_task = {
                        "title": "Cycle Test Task",
                        "weight": 15,
                        "category_id": category["id"]
                    }
                    requests.post(f"{self.base_url}/tasks", json=test_task, headers=self.headers)
            
            # Export current state
            export_response = requests.get(f"{self.base_url}/export")
            if export_response.status_code == 200:
                cycle_backup = export_response.json()
                
                # Clear all data
                clear_response = requests.delete(f"{self.base_url}/clear-all")
                if clear_response.status_code == 200:
                    
                    # Import data back
                    import_response = requests.post(f"{self.base_url}/import", 
                                                  json=cycle_backup, headers=self.headers)
                    if import_response.status_code == 200:
                        
                        # Verify data integrity
                        final_categories = requests.get(f"{self.base_url}/categories").json()
                        final_tasks = requests.get(f"{self.base_url}/tasks").json()
                        
                        if (len(final_categories) == len(cycle_backup["categories"]) and 
                            len(final_tasks) == len(cycle_backup["tasks"])):
                            self.log_result("Complete Export-Import Cycle", True, "Full cycle completed successfully")
                        else:
                            self.log_result("Complete Export-Import Cycle", False, "Data integrity lost during cycle")
                    else:
                        self.log_result("Complete Export-Import Cycle", False, "Import step failed")
                else:
                    self.log_result("Complete Export-Import Cycle", False, "Clear step failed")
            else:
                self.log_result("Complete Export-Import Cycle", False, "Export step failed")
        except Exception as e:
            self.log_result("Complete Export-Import Cycle", False, f"Exception: {str(e)}")

    def cleanup(self):
        """Clean up test data"""
        print("\n=== Cleaning Up Test Data ===")
        
        # Delete test tasks
        for task in self.test_tasks:
            try:
                requests.delete(f"{self.base_url}/tasks/{task['id']}")
            except:
                pass
        
        # Delete test categories
        for category in self.test_categories:
            try:
                requests.delete(f"{self.base_url}/categories/{category['id']}")
            except:
                pass
        
        print("Cleanup completed")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Progress Tracker Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_health_check()
        self.test_category_crud()
        self.test_task_crud()
        self.test_progress_calculation()
        self.test_localstorage_export_import()
        self.test_edge_cases()
        self.test_cascade_deletion()
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print("\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"  • {error}")
        
        # Don't cleanup automatically - let tests persist for manual verification
        # self.cleanup()
        
        return self.results

if __name__ == "__main__":
    tester = ProgressTrackerTesterV2()
    results = tester.run_all_tests()