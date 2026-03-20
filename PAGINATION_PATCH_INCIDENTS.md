# Pagination Patch for Incidents Page

Apply these changes to `frontend/src/app/[agencySlug]/incidents/page.tsx`:

## 1. Add Pagination import (after other imports)
```typescript
import { Pagination } from "@/components/ui/Pagination"
```

## 2. Add pagination state (after existing useState declarations around line 107)
```typescript
// Pagination state
const [currentPage, setCurrentPage] = useState(1)
const [pageSize, setPageSize] = useState(10)
const [totalRecords, setTotalRecords] = useState(0)
```

## 3. Update fetchData function to include pagination parameters
Replace the incidents API call:
```typescript
// OLD:
canManage ? api.get("/incidents") : api.get("/incidents/my-incidents"),

// NEW:
canManage ? api.get(`/incidents?page=${currentPage}&limit=${pageSize}`) : api.get("/incidents/my-incidents"),
```

## 4. Update the incidents data handling in fetchData
Replace:
```typescript
if (incRes.status === "fulfilled") setIncidents(incRes.value.data)
```

With:
```typescript
if (incRes.status === "fulfilled") {
    const incidentsResponse = incRes.value.data
    if (incidentsResponse.data && Array.isArray(incidentsResponse.data)) {
        setIncidents(incidentsResponse.data)
        setTotalRecords(incidentsResponse.pagination?.total || 0)
    } else {
        setIncidents(Array.isArray(incidentsResponse) ? incidentsResponse : [])
        setTotalRecords(Array.isArray(incidentsResponse) ? incidentsResponse.length : 0)
    }
}
```

## 5. Update useEffect to include pagination dependencies
Replace:
```typescript
useEffect(() => {
    fetchData()
}, [])
```

With:
```typescript
useEffect(() => {
    fetchData()
}, [currentPage, pageSize])
```

## 6. Add Pagination component after the DataTable closing tag
Add this before the "Report Incident Dialog" comment:
```typescript
{totalRecords > 0 && (
    <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalRecords / pageSize)}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
        }}
    />
)}
```

## Testing
After applying these changes:
1. Navigate to the incidents page
2. Verify pagination controls appear at the bottom
3. Test changing page size (10/25/50)
4. Test navigating between pages
5. Verify filters still work with pagination
