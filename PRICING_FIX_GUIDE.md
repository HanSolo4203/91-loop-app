# RFID Dashboard Pricing Fix Guide

## Issue
Prices were not showing because CSV category names didn't match the exact database category names.

## Solution
Updated the pricing lookup to handle common variations automatically.

## Supported Category Name Variations

### ✅ These Will Now Work:

**Old CSV Name** → **Maps To** → **Price**

- "Bath Towels" → "Towels - Bath Towel" → R8.62
- "Hand Towels" → "Towels - Hand Towel" → R6.60
- "Pool Towels" → "Towels - Pool Towel" → R15.05
- "Bed Sheets" → "Fitted Sheet - Double" → R8.10
- "Duvet Covers" → "Duvet Covers - Double" → R11.44
- "Pillow Cases" → "Pillow Cases - Standard" → R4.84
- "Tablecloths" → "Tablecloths - Medium" → R5.72
- "Napkin" → "Napkins" → R2.73
- "Bath Mat" / "Bath Mats" → "Bath Mats" → R12.81

### ⚠️ For Exact Pricing, Use Database Names:

For accurate pricing of specific sizes, use exact names:
- "Towels - Bath Towel" (R8.62)
- "Fitted Sheet - King" (R10.30) vs "Fitted Sheet - Double" (R8.10)
- "Duvet Covers - King" (R15.31) vs "Duvet Covers - Queen" (R13.38)

## Testing

### Quick Test:
1. Upload `sample-rfid-laundry-data.csv` (old file with generic names)
   - Should now show prices (R8.62, R8.10, R11.44, etc.)
   - Defaults to R10.00 if no match found

2. Upload `rfid-laundry-data-100-records.csv` (new file with exact names)
   - Shows exact prices from database
   - More accurate billing

### Check Browser Console
Open DevTools (F12) → Console tab
- Look for warnings: "Price not found for category: ..."
- This tells you which categories need exact names

## Files to Use

**Recommended**: `rfid-laundry-data-100-records.csv`
- Uses exact database category names
- 100 records
- Accurate pricing

**Also works**: `sample-rfid-laundry-data.csv`
- Uses generic names
- Will use default pricing for variations
- Good for quick testing

## Current Status
✅ Pricing integration complete
✅ Variation handling added
✅ Build successful
✅ Ready to test

