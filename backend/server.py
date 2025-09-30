from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import os
import uuid

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# FastAPI app initialization
app = FastAPI(title="Progress Tracker API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client.progress_tracker

# Pydantic models
class CategoryBase(BaseModel):
    name: str
    group: Optional[str] = "default"  # Group for organizing categories

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    order: Optional[int] = None

class Category(CategoryBase):
    id: str
    order: int = 0  # For drag & drop ordering
    created_at: datetime
    
class TaskBase(BaseModel):
    title: str
    weight: int = Field(gt=0, description="Task weight must be positive")
    category_id: str
    priority: str = Field(default="medium", pattern="^(high|medium|low)$")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    weight: Optional[int] = Field(None, gt=0)
    completed: Optional[bool] = None
    priority: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    pinned: Optional[bool] = None
    order: Optional[int] = None

class Task(TaskBase):
    id: str
    completed: bool = False
    pinned: bool = False  # For pinning important tasks
    order: int = 0  # For drag & drop ordering within category
    created_at: datetime

class ProgressResponse(BaseModel):
    category_id: str
    category_name: str
    category_group: str
    progress_percentage: float
    completed_weight: int
    total_weight: int
    task_count: int
    completed_task_count: int

class CategoryGroup(BaseModel):
    group: str
    categories: List[Category]
    total_progress: float

# Utility functions
def generate_uuid():
    return str(uuid.uuid4())

async def calculate_category_progress(category_id: str):
    """Calculate progress for a specific category"""
    tasks = await db.tasks.find({"category_id": category_id}).to_list(length=None)
    
    if not tasks:
        return 0.0, 0, 0, 0, 0
    
    total_weight = sum(task["weight"] for task in tasks)
    completed_weight = sum(task["weight"] for task in tasks if task["completed"])
    task_count = len(tasks)
    completed_task_count = sum(1 for task in tasks if task["completed"])
    
    progress_percentage = (completed_weight / total_weight * 100) if total_weight > 0 else 0.0
    
    return progress_percentage, completed_weight, total_weight, task_count, completed_task_count

async def get_next_order(collection_name: str, filter_query: dict = None):
    """Get next order number for ordering items"""
    collection = getattr(db, collection_name)
    query = filter_query or {}
    
    # Get the highest order number, handling backward compatibility
    result = await collection.find(query).sort("order", -1).limit(1).to_list(length=1)
    if result and "order" in result[0]:
        return result[0]["order"] + 1
    
    # If no items with order field exist, count total items to get next order
    count = await collection.count_documents(query)
    return count

# API Routes

# Health check
@app.get("/")
async def health_check():
    return {"status": "OK", "message": "Progress Tracker API v2.0 is running"}

# Categories endpoints
@app.get("/api/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().sort("order", 1).to_list(length=None)
    return [Category(**category) for category in categories]

@app.get("/api/categories/grouped")
async def get_categories_grouped():
    """Get categories grouped by their group field"""
    categories = await db.categories.find().sort("order", 1).to_list(length=None)
    
    # Group categories by group field
    groups = {}
    for cat in categories:
        group_name = cat.get("group", "default")
        if group_name not in groups:
            groups[group_name] = []
        groups[group_name].append(Category(**cat))
    
    # Calculate group progress
    result = []
    for group_name, group_categories in groups.items():
        total_progress = 0
        category_count = len(group_categories)
        
        if category_count > 0:
            for cat in group_categories:
                progress, _, _, _, _ = await calculate_category_progress(cat.id)
                total_progress += progress
            total_progress = total_progress / category_count
        
        result.append(CategoryGroup(
            group=group_name,
            categories=group_categories,
            total_progress=total_progress
        ))
    
    return result

@app.post("/api/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    # Check if category name already exists in the same group
    existing = await db.categories.find_one({
        "name": category.name,
        "group": category.group
    })
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists in this group")
    
    order = await get_next_order("categories")
    
    category_data = {
        "id": generate_uuid(),
        "name": category.name,
        "group": category.group,
        "order": order,
        "created_at": datetime.now()
    }
    
    await db.categories.insert_one(category_data)
    return Category(**category_data)

@app.put("/api/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryUpdate):
    # Check if category exists
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Prepare update data
    update_data = {}
    if category.name is not None:
        # Check if new name already exists (excluding current category)
        name_exists = await db.categories.find_one({
            "name": category.name,
            "group": category.group or existing["group"],
            "id": {"$ne": category_id}
        })
        if name_exists:
            raise HTTPException(status_code=400, detail="Category with this name already exists in this group")
        update_data["name"] = category.name
    
    if category.group is not None:
        update_data["group"] = category.group
    if category.order is not None:
        update_data["order"] = category.order
    
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated_category = await db.categories.find_one({"id": category_id})
    return Category(**updated_category)

@app.put("/api/categories/reorder")
async def reorder_categories(category_orders: List[dict]):
    """Update order of multiple categories for drag & drop"""
    for item in category_orders:
        await db.categories.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    return {"message": "Categories reordered successfully"}

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: str):
    # Check if category exists
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Delete all tasks in this category first
    await db.tasks.delete_many({"category_id": category_id})
    
    # Delete the category
    result = await db.categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category and all its tasks deleted successfully"}

# Tasks endpoints
@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(category_id: Optional[str] = None):
    filter_query = {"category_id": category_id} if category_id else {}
    # Sort by pinned (pinned first), then priority, then order
    tasks = await db.tasks.find(filter_query).sort([
        ("pinned", -1),  # Pinned tasks first
        ("priority", 1),  # Then by priority (assuming we'll map high=1, medium=2, low=3)
        ("order", 1)     # Finally by order
    ]).to_list(length=None)
    
    # Manual priority sorting since MongoDB doesn't handle our string priorities well
    priority_order = {"high": 1, "medium": 2, "low": 3}
    tasks.sort(key=lambda x: (not x.get("pinned", False), priority_order.get(x.get("priority", "medium"), 2), x.get("order", 0)))
    
    return [Task(**task) for task in tasks]

@app.post("/api/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    # Verify category exists
    category = await db.categories.find_one({"id": task.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    order = await get_next_order("tasks", {"category_id": task.category_id})
    
    task_data = {
        "id": generate_uuid(),
        "title": task.title,
        "weight": task.weight,
        "category_id": task.category_id,
        "priority": task.priority,
        "completed": False,
        "pinned": False,
        "order": order,
        "created_at": datetime.now()
    }
    
    await db.tasks.insert_one(task_data)
    return Task(**task_data)

@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    # Check if task exists
    existing = await db.tasks.find_one({"id": task_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Prepare update data
    update_data = {}
    if task_update.title is not None:
        update_data["title"] = task_update.title
    if task_update.weight is not None:
        update_data["weight"] = task_update.weight
    if task_update.completed is not None:
        update_data["completed"] = task_update.completed
    if task_update.priority is not None:
        update_data["priority"] = task_update.priority
    if task_update.pinned is not None:
        update_data["pinned"] = task_update.pinned
    if task_update.order is not None:
        update_data["order"] = task_update.order
    
    if update_data:
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)

@app.put("/api/tasks/reorder")
async def reorder_tasks(task_orders: List[dict]):
    """Update order of multiple tasks for drag & drop within category"""
    for item in task_orders:
        await db.tasks.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    return {"message": "Tasks reordered successfully"}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# Progress endpoint
@app.get("/api/categories/{category_id}/progress", response_model=ProgressResponse)
async def get_category_progress(category_id: str):
    # Check if category exists
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    progress_percentage, completed_weight, total_weight, task_count, completed_task_count = await calculate_category_progress(category_id)
    
    return ProgressResponse(
        category_id=category_id,
        category_name=category["name"],
        category_group=category.get("group", "default"),
        progress_percentage=progress_percentage,
        completed_weight=completed_weight,
        total_weight=total_weight,
        task_count=task_count,
        completed_task_count=completed_task_count
    )

@app.get("/api/progress", response_model=List[ProgressResponse])
async def get_all_progress():
    """Get progress for all categories"""
    categories = await db.categories.find().sort("order", 1).to_list(length=None)
    progress_data = []
    
    for category in categories:
        progress_percentage, completed_weight, total_weight, task_count, completed_task_count = await calculate_category_progress(category["id"])
        progress_data.append(ProgressResponse(
            category_id=category["id"],
            category_name=category["name"],
            category_group=category.get("group", "default"),
            progress_percentage=progress_percentage,
            completed_weight=completed_weight,
            total_weight=total_weight,
            task_count=task_count,
            completed_task_count=completed_task_count
        ))
    
    return progress_data

# Data Export/Import endpoints for localStorage support
class ExportData(BaseModel):
    categories: List[dict]
    tasks: List[dict]
    exported_at: datetime

@app.get("/api/export", response_model=ExportData)
async def export_data():
    """Export all data for localStorage backup"""
    categories = await db.categories.find().sort("order", 1).to_list(length=None)
    tasks = await db.tasks.find().sort("order", 1).to_list(length=None)
    
    return ExportData(
        categories=categories,
        tasks=tasks,
        exported_at=datetime.utcnow()
    )

@app.post("/api/import")
async def import_data(data: ExportData):
    """Import data from localStorage backup"""
    try:
        # Clear existing data
        await db.categories.delete_many({})
        await db.tasks.delete_many({})
        
        # Import categories
        if data.categories:
            await db.categories.insert_many(data.categories)
        
        # Import tasks
        if data.tasks:
            await db.tasks.insert_many(data.tasks)
            
        return {"message": "Data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.delete("/api/clear-all")
async def clear_all_data():
    """Clear all data (for fresh start)"""
    try:
        await db.categories.delete_many({})
        await db.tasks.delete_many({})
        return {"message": "All data cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
