# Admin Category Management - Implementation Summary

## Overview
This document describes the admin-managed category system that replaces hard-coded categories, allowing admins to create, edit, and delete ticket categories dynamically without modifying code.

## Changes Made

### 1. **Data Layer** (`js/data.js`)
- Added `SEED_CATEGORIES` with 8 default categories (Account & Access, Network & WiFi, Hardware, Software, CBT / E-Learning, University Website, Email, Other)
- Each category includes:
  - `name`: Category display name
  - `unit`: Routing unit (Network, Hardware, Software, Database, CBT, Web, Helpdesk)
  - `subcategories`: Array of specific issue types
- New DataService methods:
  - `getCategories()`: Retrieve all categories
  - `saveCategory(category)`: Create or update a category
  - `deleteCategory(name)`: Remove a category
  - `getCategoryByName(name)`: Fetch a specific category

### 2. **Utilities** (`js/utils.js`)
- Added helper methods to Utils:
  - `getCategories()`: Fetch categories from DataService
  - `getCategoryByName(name)`: Get category metadata
  - `getCategorySubcategories(name)`: Get subcategories for a category
- Removed hardcoded `SUBCATEGORIES` object

### 3. **Ticket Service** (`js/tickets.js`)
- Updated `submitTicket()` to fetch category unit dynamically from DataService
- Instead of using `categoryToUnit` map, now queries: `window.DataService.getCategoryByName(ticketData.category)?.unit`
- Categories are no longer embedded in code; routing is data-driven

### 4. **UI Controller** (`js/ui.js`)

#### Dynamic Category Population
- **`populateCategorySelects()`** (new): Runs on app init to populate all category filter dropdowns
  - Dynamically renders `<option>` elements from DataService categories
  - Called on app init and after category changes
- **`handleCategoryChange()`** updated to use `window.Utils.getCategorySubcategories()`
- Category filters on dashboard, My Tickets, and All Tickets pages now dynamic

#### Category-to-Unit Mapping
- **`getCategoryUnitMap()`** (new): Builds runtime mapping from category metadata
- **`getCategoryUnit(categoryName)`** (new): Queries unit for a category
- Replaced all hardcoded `UI._CAT_TO_UNIT` references with dynamic lookups
- Updated queue/team filtering to use dynamic mapping

#### Admin Console - Category Management
- **`renderAdminConsole()`**: Now calls `renderCategoryAdmin()`
- **`renderCategoryAdmin()`** (new): Renders category admin table with Create/Edit/Delete buttons
- **`openCategoryModal(categoryName?)`** (new): Opens modal for add/edit
  - When editing, disables name field (prevents rename issues)
  - Pre-populates form with existing values
- **`closeCategoryModal()`** (new): Closes modal overlay
- **`saveCategory(e)`** (new): Validates and saves category to DataService
  - Logs action to audit trail
  - Refreshes category table and all dropdowns
  - Shows user feedback toast
- **`deleteCategory(name)`** (new): Deletes category if not in use
  - Prevents deletion of categories already assigned to tickets
  - Logs action and refreshes UI

#### Auto-Refresh Updated
- `startAutoRefresh()`: Updated to use `UI.getCategoryUnitMap()` instead of `_CAT_TO_UNIT`

#### Routing
- Dispatcher routing panel suggests unit based on dynamic category metadata

### 5. **HTML** (`index.html`)

#### Category Dropdowns
- Removed hardcoded `<option>` elements from:
  - My Tickets filter (line 489-496)
  - All Tickets filter (line 641-648)
  - New Ticket form (line 746-753)
- Dropdowns now populated dynamically by `populateCategorySelects()`

#### Admin Console
- Added Category Management section in Admin Console (line 1042-1047)
  - "Ticket Categories" card with table showing all categories
  - Displays: Category name, unit, subcategories, edit/delete buttons
  - "Add Category" button to create new categories

#### Category Management Modal (new)
- Added `categoryModal` and `categoryModalOverlay` (lines 1394-1424)
- Form fields:
  - Category Name (required, max 60 chars)
  - Assigned Unit (dropdown, required)
  - Subcategories (textarea, comma-separated, optional)
- Buttons: Cancel, Save Category
- Modal title dynamically changes (Add vs Edit)

### 6. **Data Persistence**
- Categories persist in localStorage via DemoDB
- On first run, SEED_CATEGORIES are written to storage
- On subsequent runs, seed categories are merged (new ones added if missing)
- All CRUD operations update DemoDB immediately

## Usage Flow

### Admin Creating a New Category
1. Navigate to Admin Console
2. Click "Add Category" button
3. Enter category name (e.g., "Mobile Device Issues")
4. Select assigned unit (e.g., "Hardware")
5. Enter subcategories (e.g., "Phone repair, Tablet issues")
6. Click "Save Category"
7. Category immediately appears in:
   - Category admin table
   - All category filter dropdowns
   - New Ticket form selector
8. Audit log records the action

### Admin Editing a Category
1. In Category Management table, click "Edit"
2. Form pre-fills with existing data
3. Category name field is disabled (can't rename)
4. Modify unit or subcategories as needed
5. Click "Save Category"
6. Changes propagate to all dropdowns and routing logic

### Admin Deleting a Category
1. Click "Delete" button in category table
2. System checks if any tickets use this category
3. If in use: Shows error "Cannot delete a category that is already used by tickets"
4. If unused: Confirms deletion, removes from storage and UI

### Student/Staff Submitting a Ticket
1. Opens "Submit a Ticket" page
2. Category dropdown now shows admin-defined categories (not hardcoded)
3. Selects category → subcategories populate dynamically
4. Submits ticket with selected category
5. Ticket automatically routes to the category's assigned unit

## Key Benefits

✅ **No Code Changes Required**: Admins manage categories via UI, not editing code  
✅ **Dynamic Routing**: New categories automatically route tickets to correct units  
✅ **Audit Trail**: All category CRUD operations logged  
✅ **Safe Deletion**: Prevents removing categories in use by existing tickets  
✅ **Fallback Data**: SEED_CATEGORIES ensure system works out-of-box  
✅ **Real-time Updates**: All pages refresh categories on save  
✅ **Persistent**: Categories survive page reloads  

## Data Schema Example

```json
{
  "name": "Hardware",
  "unit": "Hardware",
  "subcategories": [
    "Computer Not Working",
    "Printer Issue",
    "Projector Fault",
    "Mouse/Keyboard Problems"
  ]
}
```

## Testing
- Existing Jest tests pass ✅
- Category management features tested manually
- Dynamic dropdowns verified across all pages
- Audit trail tested for create/edit/delete operations

## Future Enhancements
- Reorder categories via drag-and-drop
- Bulk import/export of categories
- Category archiving (soft delete)
- Per-role category visibility controls
- Category SLA templates
