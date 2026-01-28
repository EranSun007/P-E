# DevOps Bug Dashboard - Implementation Package for Claude Code

## 📦 Package Contents

This package contains everything needed for Claude Code to implement a full-featured bug dashboard in your P&E application.

### Files Included:

1. **CLAUDE_CODE_PROMPT.md** - Complete implementation instructions for Claude Code
2. **KPI_SPECIFICATION.md** - Detailed KPI formulas and calculation logic
3. **jira_export_sample.csv** - Sample data showing exact CSV format (50 rows)
4. **README.md** - This file with usage instructions

## 🚀 How to Use This Package

### Step 1: Prepare Your Answers

Before giving these files to Claude Code, prepare answers to these questions:

**Required Information:**

1. **Database ORM/Library:**
   - Example: "Prisma", "TypeORM", "Drizzle", "raw PostgreSQL queries"
   - Location of database config

2. **API Framework:**
   - Example: "Next.js API routes", "tRPC", "Express with REST"
   - Where API routes are located (e.g., `/pages/api/` or `/app/api/`)

3. **Component Library:**
   - Example: "shadcn/ui", "Chakra UI", "Material-UI", "custom components"
   - Location of components (e.g., `/components/ui/`)

4. **Chart Library (if you have one):**
   - Example: "Recharts", "Chart.js", "Victory", "Apache ECharts", "none yet"
   - If "none", Claude Code will recommend and install one

5. **Existing Dashboard Example:**
   - Path to an existing dashboard page that Claude Code should match for styling
   - Example: `/app/engineering/performance/page.tsx`

6. **Table Component:**
   - Show Claude Code an example of your table component usage
   - Example file path

7. **Form Components:**
   - Where are Input, Select, Button, DatePicker, FileUpload components?
   - Example usage

8. **File Upload Pattern:**
   - How do you currently handle file uploads?
   - Example: "tRPC with uploadthing", "Next.js API route with formidable", etc.

### Step 2: Create Your Prompt for Claude Code

Open Claude Code and create a new prompt with this structure:

```
I need you to implement a DevOps Bug Dashboard in our P&E application.

Here is my tech stack information:
- Database: [YOUR ANSWER]
- API Framework: [YOUR ANSWER]
- Component Library: [YOUR ANSWER]
- Chart Library: [YOUR ANSWER]
- File location for existing dashboard: [PATH]

Please read these files I'm uploading:
1. CLAUDE_CODE_PROMPT.md - Complete implementation guide
2. KPI_SPECIFICATION.md - All KPI calculation formulas
3. jira_export_sample.csv - Sample data format

Before you start implementing, please:
1. Read all three files carefully
2. Show me one example of our existing dashboard page
3. Show me one example of our table component
4. Confirm you understand the requirements
5. Ask any clarifying questions

Then, implement the complete dashboard following the specifications.
```

### Step 3: Upload Files to Claude Code

Drag and drop these files into Claude Code:
- ✅ CLAUDE_CODE_PROMPT.md
- ✅ KPI_SPECIFICATION.md
- ✅ jira_export_sample.csv

### Step 4: Let Claude Code Work

Claude Code will:
1. Ask clarifying questions about your codebase
2. Create database migrations
3. Implement API endpoints
4. Build UI components
5. Add navigation menu item
6. Test with sample data
7. Provide you with all files

### Step 5: Review & Test

After implementation:
- [ ] Review all generated files
- [ ] Run database migrations
- [ ] Test CSV upload with the sample file
- [ ] Verify KPI calculations are correct
- [ ] Test component and week filtering
- [ ] Check that styling matches your app
- [ ] Verify permissions work

## 📊 Expected Results

After uploading `jira_export_sample.csv`, you should see:

| Metric | Expected Value | Status |
|--------|---------------|--------|
| Bug Inflow Rate | ~5.0 bugs/week | ✅ Green |
| Time to First Response | ~125 hours (5.2 days) | 🔴 Red |
| SLA Compliance (VH) | ~37% | 🔴 Red |
| Backlog Health Score | 20/100 | 🔴 Red |
| Total Open Bugs | 19 | 🟡 Yellow |
| Aging High Bugs | 12 bugs | 🔴 Red |

**Alert Box Should Show:**
- Backlog Health Score: 20/100 (RED ZONE)
- SLA Compliance: 36.7% (Target: 80%)
- 12 High priority bugs aging (avg 23 days)
- TTFR: 5.2 days median (Target: <1 day)

## 🔧 Customization Options

After basic implementation, you can ask Claude Code to:

1. **Add more KPIs** - The system supports 10 KPIs, only showing 4 prominently
2. **Customize categories** - Adjust bug categorization logic
3. **Add email alerts** - Weekly summary emails
4. **Export features** - Export data to Excel/PDF
5. **Advanced filtering** - Add more filter options
6. **Historical trends** - Add trend charts over multiple weeks

## 📝 Full Feature Checklist

### Core Features:
- [ ] CSV upload with validation
- [ ] Database persistence (3 tables)
- [ ] Component filtering
- [ ] Week filtering
- [ ] 10 KPI calculations
- [ ] Alert box with smart conditions
- [ ] Aging bugs table (sortable, searchable)
- [ ] 3 charts (MTTR, Categories, Trends)
- [ ] Navigation menu item
- [ ] Permission-based upload

### Advanced Features (Optional):
- [ ] Duplicate upload warning
- [ ] Replace existing upload
- [ ] Empty states
- [ ] Loading states
- [ ] Error states
- [ ] Success toasts
- [ ] JIRA links (clickable bug keys)
- [ ] Tooltips on hover
- [ ] Mobile responsive

## 🐛 Troubleshooting

### Issue: KPI calculations don't match expected values

**Solution:** Check these common issues:
1. Date parsing - JIRA format is "2025-01-15 10:30:45" (space, not T)
2. Resolution time calculation - Check timezone handling
3. Priority matching - Case sensitive: "Very High" vs "very high"
4. Status matching - Check for variations: "Open" vs "OPEN"

### Issue: Upload fails with "Missing columns" error

**Solution:** Verify CSV has these exact column names:
- Key, Summary, Priority, Status, Created, Resolved, Reporter, Assignee, Labels

### Issue: Charts not rendering

**Solution:** 
1. Check if chart library is installed
2. Verify data format matches library expectations
3. Check console for errors
4. Try with simpler data first

### Issue: Filtering doesn't work

**Solution:**
1. Verify KPIs are recalculated on filter change
2. Check database query includes filter parameters
3. Ensure component extraction logic works
4. Test with known components first

## 📚 Additional Resources

### Sample Queries for Testing:

**Get all bugs for a specific component:**
```sql
SELECT * FROM bugs 
WHERE upload_id = 'xxx' 
  AND component = 'deploy-metering'
ORDER BY created_date DESC;
```

**Get KPIs for a specific week and component:**
```sql
SELECT * FROM weekly_kpis
WHERE week_ending = '2026-01-26'
  AND component = 'all';
```

**Find aging High priority bugs:**
```sql
SELECT bug_key, summary, 
       EXTRACT(DAY FROM NOW() - created_date) as age_days
FROM bugs
WHERE status IN ('Open', 'Author Action')
  AND priority = 'High'
ORDER BY age_days DESC;
```

### Component Extraction Logic:

The system extracts components from bug labels using these patterns:

| Pattern | Component |
|---------|-----------|
| deploy, deployment | deploy-metering |
| broker, service-broker | service-broker |
| foss, vulnerability, CVE | foss-vulnerabilities |
| cm, convergent | cm-metering |
| sdm, document | sdm-metering |
| (default) | other |

## 🎯 Success Criteria

Your implementation is complete when:

1. ✅ You can upload a CSV and see all bugs in the database
2. ✅ Dashboard displays with correct KPI values
3. ✅ Filtering by component updates all KPIs and charts
4. ✅ Filtering by week shows historical data
5. ✅ Aging bugs table is sortable and searchable
6. ✅ Alert box shows/hides based on conditions
7. ✅ JIRA links are clickable and correct
8. ✅ Styling matches your existing app
9. ✅ Upload button only visible to authorized users
10. ✅ All charts render correctly

## 💡 Tips for Working with Claude Code

1. **Be specific about your stack** - The more details you provide, the better
2. **Show examples** - Share existing component code for Claude Code to match
3. **Start simple** - Get basic functionality working first, then add features
4. **Test incrementally** - Test each feature as it's implemented
5. **Ask for explanations** - If something is unclear, ask Claude Code to explain

## 📧 Support

If you encounter issues or need clarification on any KPI calculation, refer to:
- KPI_SPECIFICATION.md for detailed formulas
- Sample CSV for exact data format
- This README for common troubleshooting

## 🎉 Next Steps

After successful implementation:

1. **Weekly Upload Process:**
   - Export JIRA data every Monday
   - Upload via dashboard UI
   - Review KPIs in team standup

2. **Set Up Alerts:**
   - Configure email notifications for critical conditions
   - Set up Slack integration for weekly summaries

3. **Continuous Improvement:**
   - Collect feedback from team
   - Add requested features
   - Refine KPI thresholds based on team performance

Good luck with your implementation! 🚀
