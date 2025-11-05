# RFID Laundry Dashboard

## Overview
The RFID Dashboard provides real-time tracking and analytics for RFID-tagged laundry items in your RSL Express operations.

## Features

### 📤 CSV File Upload
- Drag-and-drop file upload interface
- Support for standard CSV format
- Real-time parsing and validation
- Error handling and feedback

### 📊 Data Visualization
The dashboard provides comprehensive visualizations including:

1. **Status Distribution** (Pie Chart)
   - Visual breakdown of items by status (Procured, Issued to Customer, Received Into Laundry, Damaged, Lost/Stolen)
   
2. **Category Distribution** (Bar Chart)
   - Count of different linen categories (Bath Towels, Bed Sheets, Duvet Covers, etc.)
   
3. **Condition Analysis** (Pie Chart)
   - Item condition breakdown (Good, Average, Bad, Teared, Stained)
   
4. **Current Location** (Horizontal Bar Chart)
   - Distribution across current physical locations
   
5. **Assigned Locations** (Horizontal Bar Chart)
   - Distribution of items by assigned hotels/customers
   
6. **Activity Timeline** (Line Chart)
   - Track item assignments and movements over time

### 📈 Key Metrics
- **Total Records**: Complete count of RFID-tagged items
- **Unique RFID Tags**: Number of unique RFID identifiers
- **Total Washes**: Cumulative wash count across all items
- **Avg Washes Left**: Average washes remaining before replacement

### 📋 Data Preview
- Table view of raw CSV data
- Display first 10 records for quick verification
- Full column visibility

### 💾 Export Functionality
- Export processed analysis as JSON
- Timestamped file naming for easy tracking

## Access
Navigate to: **`/dashboard/rfid`** or use the **"RFID Tracking"** link in the main navigation menu.

## CSV Format
The system expects CSV files with the following columns:

```csv
RFID Number,Category,Status,Condition,Location,User,QTY Washed,Washes Remaining,Assigned Location,Date Assigned,Date/Time
RFID001234567890,Bath Towels,Procured,Good,Warehouse,John Smith,0,100,91 Loop Hostel,2025-10-01,2025-10-01 08:30:00
```

### Required Columns:
- **RFID Number**: Unique RFID tag identifier (Required)
- **Category**: Linen category (Bath Towels, Bed Sheets, Duvet Covers, etc.) (Required)
- **Status**: Current status (Procured, Issued to Customer, Received Into Laundry, Damaged, Lost/Stolen) (Required)
- **Condition**: Item condition (Good, Average, Bad, Teared, Stained)
- **Location**: Current physical location
- **User**: User who last handled the item
- **QTY Washed**: Number of times item has been washed
- **Washes Remaining**: Estimated washes remaining before replacement
- **Assigned Location**: Location item is assigned to (hotel/customer)
- **Date Assigned**: Date item was assigned
- **Date/Time**: Timestamp of record

## Sample Data
A sample CSV file is included at `/public/sample-rfid-laundry-data.csv` with 50 records demonstrating the expected format. This includes examples of:
- Multiple linen categories
- Various status types
- Different condition states
- Wash cycle tracking data
- Location assignments

## Technologies Used
- **React 19** - UI framework
- **Next.js 15** - App framework
- **Recharts** - Data visualization library
- **Papaparse** - CSV parsing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Usage Instructions

1. **Upload CSV File**
   - Click "Select CSV File" or drag and drop your file
   - Wait for processing confirmation

2. **View Analytics**
   - Review the statistics cards at the top
   - Explore different chart visualizations
   - Check the data preview table

3. **Export Results**
   - Click "Export Analysis" to download JSON format
   - Use for reporting or further analysis

## Security
- Protected by AuthGuard component
- Requires authentication to access
- All processing happens client-side (no data uploaded to server)

## Files Created
```
/src/app/dashboard/rfid/page.tsx       - Main RFID dashboard page
/src/components/navigation.tsx         - Updated with RFID link
/public/sample-rfid-data.csv          - Sample data file
/RFID_DASHBOARD.md                     - This documentation
```

## Dependencies Added
```json
{
  "recharts": "^2.x",
  "papaparse": "^5.x",
  "@types/papaparse": "^5.x"
}
```

## Future Enhancements
- Real-time RFID reader integration
- Database storage for historical tracking
- Advanced filtering and search
- Automated alerts for anomalies
- Integration with batch management system
- PDF report generation

