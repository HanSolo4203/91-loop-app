-- ==============================================
-- SEED EMPLOYEE MOCK DATA (based on default schedule)
-- ==============================================
-- Jacque, Wowo (day shift), Noms, Minenhle, Mandisa (night shift)
-- ==============================================

INSERT INTO employees (
  full_name,
  phone,
  email,
  role,
  shift_type,
  bi_weekly_salary,
  bank_name,
  bank_account_number,
  bank_branch_code,
  account_type,
  id_number,
  status
)
SELECT * FROM (VALUES
  (
    'Jacque'::text,
    '+27 11 123 4501',
    'jacque@example.com',
    'Driver',
    'day',
    8500.00,
    'Standard Bank',
    '1234567890',
    '051001',
    'cheque',
    '8001015001081',
    'active'
  ),
  (
    'Wowo',
    '+27 11 123 4502',
    'wowo@example.com',
    'Driver',
    'day',
    7500.00,
    'FNB',
    '0987654321',
    '250655',
    'savings',
    '8502155102082',
    'active'
  ),
  (
    'Noms',
    '+27 11 123 4503',
    'noms@example.com',
    'Laundry',
    'night',
    7200.00,
    'Nedbank',
    '5566778899',
    '198765',
    'cheque',
    '9003036003083',
    'active'
  ),
  (
    'Minenhle',
    '+27 11 123 4504',
    'minenhle@example.com',
    'Laundry',
    'night',
    7200.00,
    'Capitec',
    '1122334455',
    '470010',
    'savings',
    '8804125504084',
    'active'
  ),
  (
    'Mandisa',
    '+27 11 123 4505',
    'mandisa@example.com',
    'Laundry',
    'night',
    6800.00,
    'ABSA',
    '9988776655',
    '632005',
    'cheque',
    '9205256505085',
    'active'
  )
) AS v(full_name, phone, email, role, shift_type, bi_weekly_salary, bank_name, bank_account_number, bank_branch_code, account_type, id_number, status)
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE LOWER(e.full_name) = LOWER(v.full_name));
