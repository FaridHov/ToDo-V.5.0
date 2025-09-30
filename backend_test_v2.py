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
    
    def test_enhanced_category_crud_with_groups(self):
        """Test Enhanced Category CRUD operations with Groups & Ordering"""
        print("\n=== Testing Enhanced Category CRUD with Groups ===")
        
        # Test 1: Create categories with different groups
        test_categories_data = [
            {"name": f"Work Category {uuid.uuid4().hex[:8]}", "group": "work"},
            {"name": f"Personal Category {uuid.uuid4().hex[:8]}", "group": "personal"},
            {"name": f"Health Category {uuid.uuid4().hex[:8]}", "group": "health"},
            {"name": f"Learning Category {uuid.uuid4().hex[:8]}", "group": "learning"},
            {"name": f"Default Category {uuid.uuid4().hex[:8]}", "group": "default"}
        ]
        
        created_categories = []
        for category_data in test_categories_data:
            try:
                response = requests.post(f"{self.base_url}/categories", 
                                       json=category_data, headers=self.headers)
                if response.status_code == 200:
                    category = response.json()
                    if all(key in category for key in ["id", "name", "group", "order", "created_at"]):
                        created_categories.append(category)
                        self.test_categories.append(category)
                        self.log_result(f"Create Category with Group ({category_data['group']})", True, 
                                      f"Created category with group: {category['group']}")
                    else:
                        self.log_result(f"Create Category with Group ({category_data['group']})", False, 
                                      "Missing required fields in response")
                else:
                    self.log_result(f"Create Category with Group ({category_data['group']})", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"Create Category with Group ({category_data['group']})", False, f"Exception: {str(e)}")
        
        if len(created_categories) < 3:
            self.log_result("Enhanced Category Setup", False, f"Only created {len(created_categories)} categories")
            return
        
        # Test 2: Test /api/categories/grouped endpoint
        try:
            response = requests.get(f"{self.base_url}/categories/grouped")
            if response.status_code == 200:
                grouped_data = response.json()
                if isinstance(grouped_data, list):
                    groups_found = [group["group"] for group in grouped_data]
                    expected_groups = set(cat["group"] for cat in created_categories)
                    found_groups = set(groups_found)
                    
                    if expected_groups.issubset(found_groups):
                        # Check if each group has categories and total_progress
                        valid_groups = all("categories" in group and "total_progress" in group 
                                         for group in grouped_data)
                        if valid_groups:
                            self.log_result("Categories Grouped Endpoint", True, 
                                          f"Found {len(grouped_data)} groups with proper structure")
                        else:
                            self.log_result("Categories Grouped Endpoint", False, 
                                          "Groups missing required fields")
                    else:
                        self.log_result("Categories Grouped Endpoint", False, 
                                      f"Expected groups {expected_groups}, found {found_groups}")
                else:
                    self.log_result("Categories Grouped Endpoint", False, "Response is not a list")
            else:
                self.log_result("Categories Grouped Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Categories Grouped Endpoint", False, f"Exception: {str(e)}")
        
        # Test 3: Test /api/categories/reorder endpoint for drag & drop
        if len(created_categories) >= 2:
            try:
                # Prepare reorder data - swap order of first two categories
                reorder_data = [
                    {"id": created_categories[0]["id"], "order": created_categories[1]["order"]},
                    {"id": created_categories[1]["id"], "order": created_categories[0]["order"]}
                ]
                
                response = requests.put(f"{self.base_url}/categories/reorder", 
                                      json=reorder_data, headers=self.headers)
                if response.status_code == 200:
                    # Verify the reordering worked
                    response = requests.get(f"{self.base_url}/categories")
                    if response.status_code == 200:
                        categories = response.json()
                        # Find our reordered categories
                        cat1 = next((c for c in categories if c["id"] == created_categories[0]["id"]), None)
                        cat2 = next((c for c in categories if c["id"] == created_categories[1]["id"]), None)
                        
                        if cat1 and cat2:
                            if cat1["order"] == reorder_data[0]["order"] and cat2["order"] == reorder_data[1]["order"]:
                                self.log_result("Categories Reorder", True, "Categories reordered successfully")
                            else:
                                self.log_result("Categories Reorder", False, "Order not updated correctly")
                        else:
                            self.log_result("Categories Reorder", False, "Could not find reordered categories")
                    else:
                        self.log_result("Categories Reorder", False, "Failed to verify reordering")
                else:
                    self.log_result("Categories Reorder", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Categories Reorder", False, f"Exception: {str(e)}")
        
        # Test 4: Test group filtering and validation
        try:
            # Test duplicate category name in same group (should fail)
            duplicate_data = {"name": created_categories[0]["name"], "group": created_categories[0]["group"]}
            response = requests.post(f"{self.base_url}/categories", 
                                   json=duplicate_data, headers=self.headers)
            if response.status_code == 400:
                self.log_result("Duplicate Category in Group Validation", True, 
                              "Correctly rejected duplicate name in same group")
            else:
                self.log_result("Duplicate Category in Group Validation", False, 
                              f"Should have rejected duplicate, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Duplicate Category in Group Validation", False, f"Exception: {str(e)}")
        
        # Test 5: Test same name in different group (should succeed)
        try:
            different_group_data = {"name": created_categories[0]["name"], "group": "learning"}
            response = requests.post(f"{self.base_url}/categories", 
                                   json=different_group_data, headers=self.headers)
            if response.status_code == 200:
                category = response.json()
                self.test_categories.append(category)
                self.log_result("Same Name Different Group", True, 
                              "Allowed same name in different group")
            else:
                self.log_result("Same Name Different Group", False, 
                              f"Should have allowed same name in different group, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Same Name Different Group", False, f"Exception: {str(e)}")

    def test_enhanced_task_crud_with_priority_pinning(self):
        """Test Enhanced Task CRUD operations with Priority & Pinning"""
        print("\n=== Testing Enhanced Task CRUD with Priority & Pinning ===")
        
        if not self.test_categories:
            self.log_result("Enhanced Task CRUD Setup", False, "No test categories available")
            return
        
        category_id = self.test_categories[0]["id"]
        
        # Test 1: Create tasks with different priorities
        test_tasks_data = [
            {"title": f"High Priority Task {uuid.uuid4().hex[:8]}", "weight": 10, 
             "category_id": category_id, "priority": "high"},
            {"title": f"Medium Priority Task {uuid.uuid4().hex[:8]}", "weight": 15, 
             "category_id": category_id, "priority": "medium"},
            {"title": f"Low Priority Task {uuid.uuid4().hex[:8]}", "weight": 5, 
             "category_id": category_id, "priority": "low"}
        ]
        
        created_tasks = []
        for task_data in test_tasks_data:
            try:
                response = requests.post(f"{self.base_url}/tasks", 
                                       json=task_data, headers=self.headers)
                if response.status_code == 200:
                    task = response.json()
                    if all(key in task for key in ["id", "title", "weight", "priority", "pinned", "order", "created_at"]):
                        created_tasks.append(task)
                        self.test_tasks.append(task)
                        self.log_result(f"Create Task with Priority ({task_data['priority']})", True, 
                                      f"Created task with priority: {task['priority']}")
                    else:
                        self.log_result(f"Create Task with Priority ({task_data['priority']})", False, 
                                      "Missing required fields in task response")
                else:
                    self.log_result(f"Create Task with Priority ({task_data['priority']})", False, 
                                  f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"Create Task with Priority ({task_data['priority']})", False, f"Exception: {str(e)}")
        
        if len(created_tasks) < 2:
            self.log_result("Enhanced Task Setup", False, f"Only created {len(created_tasks)} tasks")
            return
        
        # Test 2: Test invalid priority validation
        try:
            invalid_priority_data = {
                "title": "Invalid Priority Task",
                "weight": 5,
                "category_id": category_id,
                "priority": "invalid"
            }
            response = requests.post(f"{self.base_url}/tasks", 
                                   json=invalid_priority_data, headers=self.headers)
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Priority Validation", True, "Correctly rejected invalid priority")
            else:
                self.log_result("Invalid Priority Validation", False, 
                              f"Should have rejected invalid priority, got status: {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Priority Validation", False, f"Exception: {str(e)}")
        
        # Test 3: Test task pinning functionality
        task_id = created_tasks[0]["id"]
        try:
            # Pin the task
            response = requests.put(f"{self.base_url}/tasks/{task_id}", 
                                  json={"pinned": True}, headers=self.headers)
            if response.status_code == 200:
                updated_task = response.json()
                if updated_task["pinned"] == True:
                    self.log_result("Pin Task", True, "Task pinned successfully")
                    
                    # Unpin the task
                    response = requests.put(f"{self.base_url}/tasks/{task_id}", 
                                          json={"pinned": False}, headers=self.headers)
                    if response.status_code == 200:
                        updated_task = response.json()
                        if updated_task["pinned"] == False:
                            self.log_result("Unpin Task", True, "Task unpinned successfully")
                        else:
                            self.log_result("Unpin Task", False, "Task pinning status not updated")
                    else:
                        self.log_result("Unpin Task", False, f"Status: {response.status_code}")
                else:
                    self.log_result("Pin Task", False, "Task pinning status not updated")
            else:
                self.log_result("Pin Task", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Pin/Unpin Task", False, f"Exception: {str(e)}")
        
        # Test 4: Test task priority update
        try:
            response = requests.put(f"{self.base_url}/tasks/{task_id}", 
                                  json={"priority": "low"}, headers=self.headers)
            if response.status_code == 200:
                updated_task = response.json()
                if updated_task["priority"] == "low":
                    self.log_result("Update Task Priority", True, "Task priority updated successfully")
                else:
                    self.log_result("Update Task Priority", False, "Task priority not updated")
            else:
                self.log_result("Update Task Priority", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Task Priority", False, f"Exception: {str(e)}")
        
        # Test 5: Test /api/tasks/reorder endpoint for drag & drop
        if len(created_tasks) >= 2:
            try:
                # Prepare reorder data - swap order of first two tasks
                reorder_data = [
                    {"id": created_tasks[0]["id"], "order": created_tasks[1]["order"]},
                    {"id": created_tasks[1]["id"], "order": created_tasks[0]["order"]}
                ]
                
                response = requests.put(f"{self.base_url}/tasks/reorder", 
                                      json=reorder_data, headers=self.headers)
                if response.status_code == 200:
                    # Verify the reordering worked
                    response = requests.get(f"{self.base_url}/tasks?category_id={category_id}")
                    if response.status_code == 200:
                        tasks = response.json()
                        # Find our reordered tasks
                        task1 = next((t for t in tasks if t["id"] == created_tasks[0]["id"]), None)
                        task2 = next((t for t in tasks if t["id"] == created_tasks[1]["id"]), None)
                        
                        if task1 and task2:
                            if task1["order"] == reorder_data[0]["order"] and task2["order"] == reorder_data[1]["order"]:
                                self.log_result("Tasks Reorder", True, "Tasks reordered successfully")
                            else:
                                self.log_result("Tasks Reorder", False, "Order not updated correctly")
                        else:
                            self.log_result("Tasks Reorder", False, "Could not find reordered tasks")
                    else:
                        self.log_result("Tasks Reorder", False, "Failed to verify reordering")
                else:
                    self.log_result("Tasks Reorder", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Tasks Reorder", False, f"Exception: {str(e)}")
        
        # Test 6: Test task sorting (pinned first, then priority, then order)
        try:
            # Create a pinned high priority task
            pinned_task_data = {
                "title": f"Pinned High Priority {uuid.uuid4().hex[:8]}",
                "weight": 20,
                "category_id": category_id,
                "priority": "high"
            }
            response = requests.post(f"{self.base_url}/tasks", 
                                   json=pinned_task_data, headers=self.headers)
            if response.status_code == 200:
                pinned_task = response.json()
                # Pin it
                requests.put(f"{self.base_url}/tasks/{pinned_task['id']}", 
                           json={"pinned": True}, headers=self.headers)
                
                # Get all tasks and verify sorting
                response = requests.get(f"{self.base_url}/tasks?category_id={category_id}")
                if response.status_code == 200:
                    tasks = response.json()
                    # Check if pinned tasks come first
                    pinned_tasks = [t for t in tasks if t.get("pinned", False)]
                    if pinned_tasks and pinned_tasks[0]["id"] == pinned_task["id"]:
                        self.log_result("Task Sorting (Pinned First)", True, 
                                      "Pinned tasks appear first in list")
                    else:
                        self.log_result("Task Sorting (Pinned First)", False, 
                                      "Pinned tasks not sorted correctly")
                else:
                    self.log_result("Task Sorting (Pinned First)", False, "Failed to get tasks for sorting test")
        except Exception as e:
            self.log_result("Task Sorting (Pinned First)", False, f"Exception: {str(e)}")

    def test_enhanced_progress_calculation(self):
        """Test Enhanced Progress calculation with new fields"""
        print("\n=== Testing Enhanced Progress Calculation ===")
        
        if not self.test_categories:
            self.log_result("Enhanced Progress Setup", False, "No test categories available")
            return
        
        category_id = self.test_categories[0]["id"]
        
        # Test 1: Enhanced progress response with new fields
        try:
            response = requests.get(f"{self.base_url}/categories/{category_id}/progress")
            if response.status_code == 200:
                progress = response.json()
                required_fields = ["category_id", "category_name", "category_group", 
                                 "progress_percentage", "completed_weight", "total_weight",
                                 "task_count", "completed_task_count"]
                
                if all(field in progress for field in required_fields):
                    self.log_result("Enhanced Progress Fields", True, 
                                  f"All enhanced fields present: task_count={progress['task_count']}, "
                                  f"completed_task_count={progress['completed_task_count']}")
                else:
                    missing_fields = [field for field in required_fields if field not in progress]
                    self.log_result("Enhanced Progress Fields", False, 
                                  f"Missing fields: {missing_fields}")
            else:
                self.log_result("Enhanced Progress Fields", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Enhanced Progress Fields", False, f"Exception: {str(e)}")
        
        # Test 2: Group-based progress in /api/categories/grouped
        try:
            response = requests.get(f"{self.base_url}/categories/grouped")
            if response.status_code == 200:
                grouped_data = response.json()
                if isinstance(grouped_data, list) and len(grouped_data) > 0:
                    # Check if each group has total_progress calculated
                    valid_progress = all("total_progress" in group and 
                                       isinstance(group["total_progress"], (int, float))
                                       for group in grouped_data)
                    if valid_progress:
                        self.log_result("Group-based Progress Averaging", True, 
                                      "All groups have calculated total_progress")
                    else:
                        self.log_result("Group-based Progress Averaging", False, 
                                      "Groups missing or invalid total_progress")
                else:
                    self.log_result("Group-based Progress Averaging", False, "No grouped data returned")
            else:
                self.log_result("Group-based Progress Averaging", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Group-based Progress Averaging", False, f"Exception: {str(e)}")
        
        # Test 3: Progress calculation with priority and pinned tasks
        if self.test_tasks:
            try:
                # Mark some tasks as completed and verify progress calculation
                completed_tasks = 0
                total_weight_completed = 0
                
                for i, task in enumerate(self.test_tasks[:2]):  # Complete first 2 tasks
                    response = requests.put(f"{self.base_url}/tasks/{task['id']}", 
                                          json={"completed": True}, headers=self.headers)
                    if response.status_code == 200:
                        completed_tasks += 1
                        total_weight_completed += task["weight"]
                
                # Check progress calculation
                response = requests.get(f"{self.base_url}/categories/{category_id}/progress")
                if response.status_code == 200:
                    progress = response.json()
                    if (progress["completed_task_count"] >= completed_tasks and 
                        progress["completed_weight"] >= total_weight_completed):
                        self.log_result("Progress with Priority Tasks", True, 
                                      f"Progress calculated correctly with {progress['completed_task_count']} completed tasks")
                    else:
                        self.log_result("Progress with Priority Tasks", False, 
                                      f"Expected >= {completed_tasks} completed tasks, got {progress['completed_task_count']}")
                else:
                    self.log_result("Progress with Priority Tasks", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Progress with Priority Tasks", False, f"Exception: {str(e)}")

    def test_mongodb_backward_compatibility(self):
        """Test MongoDB backward compatibility with existing data"""
        print("\n=== Testing MongoDB Backward Compatibility ===")
        
        # Test 1: Create category without group (should default to "default")
        try:
            category_data = {"name": f"Legacy Category {uuid.uuid4().hex[:8]}"}
            response = requests.post(f"{self.base_url}/categories", 
                                   json=category_data, headers=self.headers)
            if response.status_code == 200:
                category = response.json()
                if category.get("group") == "default":
                    self.test_categories.append(category)
                    self.log_result("Category Default Group", True, 
                                  "Category without group defaults to 'default'")
                else:
                    self.log_result("Category Default Group", False, 
                                  f"Expected 'default' group, got '{category.get('group')}'")
            else:
                self.log_result("Category Default Group", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Category Default Group", False, f"Exception: {str(e)}")
        
        # Test 2: Create task without priority (should default to "medium")
        if self.test_categories:
            try:
                task_data = {
                    "title": f"Legacy Task {uuid.uuid4().hex[:8]}",
                    "weight": 10,
                    "category_id": self.test_categories[-1]["id"]
                }
                response = requests.post(f"{self.base_url}/tasks", 
                                       json=task_data, headers=self.headers)
                if response.status_code == 200:
                    task = response.json()
                    if (task.get("priority") == "medium" and 
                        task.get("pinned") == False and 
                        "order" in task):
                        self.test_tasks.append(task)
                        self.log_result("Task Default Values", True, 
                                      "Task without priority/pinned gets correct defaults")
                    else:
                        self.log_result("Task Default Values", False, 
                                      f"Unexpected defaults: priority={task.get('priority')}, "
                                      f"pinned={task.get('pinned')}, order={task.get('order')}")
                else:
                    self.log_result("Task Default Values", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("Task Default Values", False, f"Exception: {str(e)}")
        
        # Test 3: Verify existing data structure compatibility
        try:
            response = requests.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                categories = response.json()
                # Check if all categories have the new fields with proper defaults
                compatible = all(
                    "group" in cat and "order" in cat 
                    for cat in categories
                )
                if compatible:
                    self.log_result("Category Structure Compatibility", True, 
                                  "All categories have required v2.0 fields")
                else:
                    self.log_result("Category Structure Compatibility", False, 
                                  "Some categories missing v2.0 fields")
            else:
                self.log_result("Category Structure Compatibility", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Category Structure Compatibility", False, f"Exception: {str(e)}")
        
        try:
            response = requests.get(f"{self.base_url}/tasks")
            if response.status_code == 200:
                tasks = response.json()
                # Check if all tasks have the new fields with proper defaults
                compatible = all(
                    "priority" in task and "pinned" in task and "order" in task
                    for task in tasks
                )
                if compatible:
                    self.log_result("Task Structure Compatibility", True, 
                                  "All tasks have required v2.0 fields")
                else:
                    self.log_result("Task Structure Compatibility", False, 
                                  "Some tasks missing v2.0 fields")
            else:
                self.log_result("Task Structure Compatibility", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Task Structure Compatibility", False, f"Exception: {str(e)}")

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

    def run_all_tests(self):
        """Run all enhanced v2.0 tests"""
        print("🚀 Starting Progress Tracker Backend API v2.0 Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_health_check()
        self.test_enhanced_category_crud_with_groups()
        self.test_enhanced_task_crud_with_priority_pinning()
        self.test_enhanced_progress_calculation()
        self.test_mongodb_backward_compatibility()
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
        
        return self.results

if __name__ == "__main__":
    tester = ProgressTrackerTesterV2()
    results = tester.run_all_tests()