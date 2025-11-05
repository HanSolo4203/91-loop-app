# RSL Express RFID Pricing Guide

## Linen Category Pricing (All prices in Rands)

### Front of House (13 items)
| Category | Price per Item |
|----------|----------------|
| Napkins | R2.73 |
| Overlays - Extra Large | R7.74 |
| Overlays - Large | R6.60 |
| Overlays - Medium | R5.72 |
| Overlays - Small | R5.28 |
| Round Tablecloths - Large | R6.50 |
| Round Tablecloths - Medium | R5.72 |
| Round Tablecloths - Small | R5.28 |
| Tablecloths - Large | R6.60 |
| Tablecloths - Medium | R5.72 |
| Tablecloths - Small | R5.28 |
| Waiter Aprons | R4.40 |
| Waiter Bibs | R4.40 |

### Housekeeping (34 items)
| Category | Price per Item |
|----------|----------------|
| Bath Mats | R12.81 |
| Blanket | R11.80 |
| Curtain | R145.20 |
| Cushion Cover | R11.62 |
| Duvet Covers - Cot | R7.57 |
| Duvet Covers - Double | R11.44 |
| Duvet Covers - King | R15.31 |
| Duvet Covers - Queen | R13.38 |
| Duvet Covers - Single | R9.50 |
| Duvet Inner - King | R48.40 |
| Duvet Inner - Single | R29.04 |
| Fitted Sheet - 3/4 | R7.92 |
| Fitted Sheet - Cot | R5.37 |
| Fitted Sheet - Double | R8.10 |
| Fitted Sheet - King | R10.30 |
| Fitted Sheet - Queen | R9.06 |
| Fitted Sheet - Single | R6.60 |
| Flat Sheet - 3/4 | R7.92 |
| Flat Sheet - Cot | R5.37 |
| Flat Sheet - Double | R8.10 |
| Flat Sheet - King | R10.30 |
| Flat Sheet - Queen | R9.06 |
| Flat Sheet - Single | R6.60 |
| Pillow Cases - Continental (Square) | R5.10 |
| Pillow Cases - Standard | R4.84 |
| Spa Gown | R15.75 |
| Towels - Bath Sheet | R10.56 |
| Towels - Bath Towel | R8.62 |
| Towels - Extra Large | R15.05 |
| Towels - Face Cloth | R3.78 |
| Towels - Gym Towel | R6.60 |
| Towels - Hand Towel | R6.60 |
| Towels - Head Band | R3.08 |
| Towels - Pool Towel | R15.05 |

### Kitchen (5 items)
| Category | Price per Item |
|----------|----------------|
| Chefs Aprons | R5.37 |
| Chefs Jackets | R5.81 |
| Chefs T-Shirts | R4.66 |
| Chefs Trousers | R5.81 |
| Kitchen Cloths | R4.40 |

## Price Ranges

- **Lowest Price**: R2.73 (Napkins)
- **Highest Price**: R145.20 (Curtain)
- **Front of House Average**: R5.54
- **Housekeeping Average**: R14.88
- **Kitchen Average**: R5.21

## Usage in RFID Dashboard

The RFID dashboard now uses the `LINEN_CATEGORY_PRICING` lookup to match CSV category names with actual RSL pricing. 

### Category Matching Rules:
1. Exact match (case-sensitive)
2. Case-insensitive match (if exact fails)
3. Fallback to R10.00 if category not found

### CSV Format
When creating RFID CSV files, use the exact category names from the table above in the "Category" column for accurate pricing.

Example:
```csv
RFID Number,Category,Status,...
RFID001,Towels - Bath Towel,Received Into Laundry,...
RFID002,Napkins,Issued to Customer,...
RFID003,Duvet Covers - King,Procured,...
```

## Billing Calculation
Total Billing = Sum of (Category Price × Quantity) for all items at laundry

