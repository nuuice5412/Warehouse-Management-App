# Proposal Analysis (from provided DOCX)

## UI screens extracted and mapped

This mockup maps the proposal to these screens:

1. Login/Register
2. Tactical Dashboard
3. User Management
4. Inventory Management
5. Vendor Registry
6. Purchase Orders
7. Receiving (from PO)
8. Product Search
9. Stock Issue
10. Delivery Management
11. Reports (Inventory summary, Issue history, Daily purchase summary)

All screens in `index.html` are editable and support add/update/delete mockup interactions.

## Problems and errors found in the proposal

1. **Desktop vs selected frontend stack conflict**
   - The document says this is a desktop application, but tools mention `React.js` and `Node.js` as typical web stack.
   - Recommendation: define packaging choice clearly (`Electron + React + Node`, `Tauri + React`, or native desktop).

2. **Report requirement inconsistency**
   - Earlier scope says at least these 3 reports: inventory summary, stock issue summary, delivery summary.
   - Later report section lists: inventory summary, issue history, daily purchase summary.
   - Recommendation: lock final required report list and keep it consistent in all sections.

3. **Missing explicit Sales Order source entity**
   - Stock issue requires linking to sales order number, but sales order management is not defined as a module/entity.
   - Recommendation: add `SalesOrder` entity/module or define integration source.

4. **Role-permission matrix not formalized**
   - Roles are listed, but exact CRUD permission per module is not clearly defined.
   - Recommendation: add one permission matrix table before implementation.

5. **Search requirement partially ambiguous**
   - Mentions searching by multiple fields, then says category is primary.
   - Recommendation: define priority behavior clearly (default category, optional advanced filters).

6. **Inventory update rules incomplete**
   - Receiving increases stock; issuing decreases stock.
   - But there is no explicit rule for returns, canceled documents, or quantity corrections.
   - Recommendation: add stock movement rules for reverse/correction flows.

7. **Database section wording issue**
   - Section contains both `MySQL` and `Data Stores` without definition.
   - Recommendation: clarify exact persistence design and remove vague label.

8. **Language/format consistency issues**
   - Mixed Thai/English terms and duplicated UX/UI contributor labels.
   - Recommendation: standardize naming (e.g., Thai-only or bilingual with glossary).

9. **Potential typo in advisor title**
   - `ผู้ช่วยศาตราจารย์` appears to be typo (likely `ผู้ช่วยศาสตราจารย์`).
   - Recommendation: proofread formal names/titles in final submission.

## What is implemented in the mockup now

- Desktop-like layout with left navigation
- CRUD-style editable forms for all major modules
- Login/Register is the first mandatory entry screen
- Sidebar icons are added for each module
- Thai-first UI labels are applied across major screens
- Role-based menu access control is added
- Linked process flow:
  - Purchase -> Receiving -> Inventory increased
  - Stock Issue -> Inventory decreased
  - Issue -> Delivery reference
- Dashboard KPIs and low-stock alert logic
- 3 reporting screens rendered from current mockup data

## Updated by latest request

- Removed selling-related direction from app behavior.
- Replaced "Sales Order No." concept in issue form with internal "Issue Document No." (management flow only).
- Removed `Sales` role option from registration/user management.
- Added local state persistence (`localStorage`) for all modules.
- Added password hashing in mockup (`SHA-256`) and migrated old plain passwords.
- Added auto issue document numbering format (`ISS-YYYYMMDD-XXX`).
- Added rule to prevent deletion of the last warehouse manager account.
- Created Electron shell scaffold in `warehouse-desktop-app/`.

## Current errors/risk left and how to fix

1. **Mockup authentication is local and plain-text only**
   - Risk: not secure for real use.
   - Fix: move auth to backend service, hash passwords (`bcrypt`), and issue session/JWT.

2. **Role permissions are UI-level only**
   - Risk: in real app, API can still be called directly without backend checks.
   - Fix: enforce the same role matrix in backend middleware.

3. **Data persistence is not implemented**
   - Risk: refresh page loses all edits.
   - Fix: connect to database (MySQL) through API; if Electron offline-first is needed, use SQLite local cache + sync strategy.

4. **Table headers still use technical keys in some places**
   - Risk: mixed readability for end users.
   - Fix: create a field-label map for Thai display names per module.

5. **Document numbering in issue process is manual**
   - Risk: duplicate document IDs.
   - Fix status: done in mockup.

6. **Environment toolchain issue on current machine**
   - Risk: cannot install/run Electron yet because `npm` is not available in current shell.
   - Fix: enable Node package manager (`npm`) in system PATH, then run `npm install` and `npm start` in `warehouse-desktop-app`.

## File to open

- `warehouse-mockup/index.html`
