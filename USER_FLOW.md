# AI Analytics - User Flow Documentation

## Complete User Journey

### 1. **Landing Page** (`/` or `/home`)

**What user sees:**

- Centered hero section with title "AI Analysis Assistant"
- Large input box: "Ask me anything... (e.g., What can you do?)"
- Three upload buttons: PDF, CSV, JSON
- Feature cards below (Fast Analysis, Secure Processing, etc.)

**What user can do:**

- Type questions in the input → Get informative AI responses
- Ask: "What can you do?" → AI explains capabilities
- Ask: "What formats do you support?" → AI lists PDF, CSV, JSON
- Click upload button → Select file
- Drag & drop file onto page

---

### 2. **File Upload** → **Analysis Page** (`/analysis`)

**What happens:**
When user uploads a file (PDF, CSV, or JSON):

1. Session is created automatically (or uses existing session)
2. File is added to the session
3. User is redirected to `/analysis` page
4. File is analyzed and results are generated

**During Analysis (~3 seconds):**

- File name and size displayed at top
- Animated spinner icon (rotating)
- Progress bar: 0% → 100%
- Text: "Analyzing your file..."
- Subtitle: "Extracting data, identifying patterns, and preparing insights"

**After Analysis Complete:**

User sees comprehensive analysis results:

**📊 Key Statistics (file-type specific):**

- **PDF files:** Total Pages, Chapters Found, Total Words
- **CSV/JSON files:** Total Rows, Columns, Patterns Found

**💡 Key Insights:**

- Summary of file content
- 3-4 identified patterns or highlights
- Data trends and anomalies

**📄 Preview Data:**

- **PDF:** First 3 chapters with titles and page counts
- **CSV/JSON:** Column names and row count preview

**✨ Call-to-Action:**

- List of features available in Session Workspace:
  - 💬 Chat with AI about your data
  - 📈 Generate interactive visualizations
  - 🔍 Filter and explore all data
  - 💾 Download processed results
- **[Open Session Workspace]** button with arrow icon

---

### 3. **Review Results** → **User Decision**

**What user does:**
After seeing the analysis results preview:

1. Reviews the key statistics (pages, chapters, rows, columns, etc.)
2. Reads the AI-generated insights
3. Previews the data structure (chapters or columns)
4. Sees what features are available in the full workspace
5. Decides to proceed when ready

**User action:**
Clicks **[Open Session Workspace]** button to access full features

**Why this matters:**

- User gets immediate value from seeing analysis results
- Clear preview of what's inside the file
- Compelling reasons to proceed (chat, visualizations, filtering, download)
- User has control over when to proceed

---

### 4. **User Clicks Button** → **Session Page** (`/session/:sessionId`)

**What happens:**
When user clicks "Open Session Workspace":

1. Navigates to `/session/:sessionId`
2. Session ID is passed automatically

**User arrives at:** Full-featured session/analysis workspace

---

### 5. **Session Page** (`/session/:sessionId`) - Main Workspace

**What user sees:**

#### Top Section:

- **Back Button** → Returns to home
- **File Info** → Name, size, type with icon
- **Contextual Action Buttons:**
  - **PDF files show:** "Show Chapters" + "Download"
  - **CSV files show:** "Generate Graphic" + "View Table" + "Download"
  - **JSON files show:** "Generate Graphic" + "View Table" + "Download"

#### Middle Section:

- **Quick Action Chips:** Summary, Revenue, Trends, Customers
- **Chat Messages Area:**
  - Initial AI greeting with file analysis summary
  - Scroll able conversation history
  - User questions and AI responses

#### Display Areas (shown when buttons clicked):

- **Chapters View** (PDF): 6 chapters, highlights, keywords
- **Data Preview** (CSV/JSON): Table with rows or JSON objects
- **Chart Display** (CSV/JSON): 2-3 visualizations

#### Bottom Section:

- **Input box** (same style as home page)
- **Send button**

**What user can do:**

1. Ask questions about the file → Get smart AI responses
2. Click "Generate Graphic" → See charts below messages
3. Click "Show Chapters" → See chapter breakdown (PDFs)
4. Click "View Table" → See data preview (CSV/JSON)
5. Click "Download" → Get download options
6. Click quick action chips → Auto-fill common questions
7. Continue conversation with AI about the data

---

### 6. **Sidebar Navigation** (Available on all pages)

**What user sees:**

- "New Analysis" button at top
- List of all previous sessions grouped by date:
  - Today
  - Yesterday
  - X days ago
- Each session shows:
  - File name as title
  - Edit button (rename session)
  - Delete button (opens confirmation modal)

**What user can do:**

- Click "New Analysis" → Go to home page, create new session
- Click any previous session → Go to that session page
- Edit session name → Inline editing
- Delete session → Modal confirmation → Remove from history

---

## Complete Flow Diagram

```
┌─────────────────┐
│   Home Page     │ User lands here
│   /home         │
└────────┬────────┘
         │
         ├─→ Ask questions → Get AI info
         │
         └─→ Upload file (PDF/CSV/JSON)
                    │
                    ↓
         ┌──────────────────────────┐
         │  Analysis Page           │ Shows progress & results
         │   /analysis              │
         │                          │
         │  ⏳ Loading... (3s)      │
         │  ↓                       │
         │  ✅ Results Ready!       │
         │                          │
         │  📊 Statistics           │
         │  💡 Key Insights         │
         │  📄 Data Preview         │
         │                          │
         │  [Open Session] →        │ ← User reviews & clicks
         └──────────┬───────────────┘
                    │
                    │ User clicks when ready
                    ↓
         ┌──────────────────────┐
         │   Session Page       │ Full workspace
         │  /session/:id        │
         │                      │
         │  ✓ Chat with AI      │
         │  ✓ View chapters     │
         │  ✓ See data tables   │
         │  ✓ Generate charts   │
         │  ✓ Download results  │
         └──────────┬───────────┘
                    │
                    ├─→ Continue analyzing
                    ├─→ Back to home (new file)
                    └─→ Access from sidebar anytime
```

---

## Key Features of Enhanced Flow

### ✅ Before (Initial Issue):

- Upload → Analysis page → **STUCK**
- No way to access session features
- Analysis and Session pages were disconnected
- No immediate value shown to user

### ✅ After (Current - Enhanced):

- Upload → Analysis (loading + **comprehensive results**) → Session page (user clicks)
- **User immediately sees analysis value:**
  - File statistics (pages, chapters, rows, columns)
  - AI-generated insights and patterns
  - Preview of data structure
  - Clear list of advanced features available
- User has control over when to proceed
- Compelling call-to-action with feature list
- All sessions accessible via sidebar
- Smooth, logical progression with user engagement

### 🎯 Why This Matters:

1. **Immediate Value:** User sees results right away, not just a loading screen
2. **Informed Decision:** User knows exactly what they're getting in the Session Workspace
3. **Better UX:** Preview builds anticipation and demonstrates AI capabilities
4. **Reduced Bounce:** Users are more likely to proceed when they see actual results
5. **Progressive Enhancement:** Basic results on Analysis page → Full features in Session

---

## File Type Specific Experiences

### **PDF Files:**

```
Upload → Analysis → Session Page Shows:
├─ Show Chapters button
├─ AI chat about document
├─ Keywords extraction
├─ Page highlights
└─ Download button
```

### **CSV Files:**

```
Upload → Analysis → Session Page Shows:
├─ Generate Graphic button → 3 charts
├─ View Table button → Data preview
├─ AI chat about statistics
├─ Revenue/trends analysis
└─ Download button
```

### **JSON Files:**

```
Upload → Analysis → Session Page Shows:
├─ Generate Graphic button → 2 charts
├─ View Table button → JSON objects
├─ AI chat about data structure
├─ Field analysis
└─ Download button
```

---

## Navigation Summary

| From     | To          | How                             |
| -------- | ----------- | ------------------------------- |
| Any page | Home        | Click "Back to Home" or logo    |
| Home     | Session     | Upload file                     |
| Home     | Session     | Click session in sidebar        |
| Session  | Home        | Click "Back" button             |
| Any page | Any session | Click session in sidebar        |
| Any page | New session | Click "New Analysis" in sidebar |

---

## Session Persistence

- ✅ All sessions saved in localStorage
- ✅ Survives page refresh
- ✅ Accessible from sidebar
- ✅ Grouped by date (Today, Yesterday, etc.)
- ✅ Can be renamed/deleted with modal confirmation

---

**Status:** User flow is now complete and logical! 🎉
