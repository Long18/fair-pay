#!/usr/bin/env python3
"""
Parse Request.md and generate SQL for ALL transactions
Distinguishes between UNPAID (owes) and PAID (historical) transactions
"""

import re
from datetime import datetime

# User mapping
USERS = {
    'Long': '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'Hoàng Anh': '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'Anh Thắng': 'a90e67fa-d056-5163-a18e-7b3b63ec21ac',
    'Minh Hồ': 'a7df138a-2668-5aad-af91-224817db1669',
    'Minh': 'a7df138a-2668-5aad-af91-224817db1669',
    'Đức': '1c2e85b5-2db5-5da1-83fd-431337f840df',
    'Chị Kim (Ngân)': '9a6b9221-1f2f-5787-b557-d29084e9e1a4',  # Nguyễn Kim Ngân
    'Chị Ngân': '9a6b9221-1f2f-5787-b557-d29084e9e1a4',
    'Chị Kayen': '8708e18c-144f-58f0-b34a-a7ddc9324b4f',  # Đỗ Thị Tuyết Ngân
    'Thục Nghi': '1c66269b-d242-5ef0-afae-159b238ddf02',
    'Tuyến': '5836f6a6-2849-56cd-add9-03e1f8620ab5',
    'Thịnh (Arin)': 'be1fc676-78e0-5adf-b4ac-8b297d851f5b',
    'Thái': '05a7407e-c0d5-5707-8e7f-0344a63a0170',
    'Anh Đăng': 'e6a4c23e-e5a0-58ed-a5e5-5a8740428cf8',
    'Hải': '4fab7e3e-949d-5d6b-b997-9b45db0a9407',
    'Anh Phúc': '541d8243-68ae-53e2-9a98-06dbae0ae01d',
    'Anh Tâm': '259f239d-fc96-568a-a25b-561da5381407',
    'Anh Mike a.k.a Mai': '18441dda-4fdf-57fe-829e-5dd795f25937',
    'Anh Mike': '18441dda-4fdf-57fe-829e-5dd795f25937',
    'Music': '9ac73f98-d6ff-54dd-8337-e96816e855c1',  # Assuming Long's music account
}

GROUP_ID = '66630ca7-a0cd-4287-9c7f-727aed9cbaea'

def parse_request_md(filename):
    """Parse Request.md and extract all transactions"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    transactions = []
    current_status = None
    
    # Split by sections
    lines = content.split('\n')
    
    for line in lines:
        # Check if we're in UNPAID or PAID section
        if '#### A) Outstanding debts' in line or '(còn nợ)' in line:
            current_status = 'owes'
            continue
        elif '#### B) Paid history' in line or '(đã thanh toán xong)' in line:
            current_status = 'paid'
            continue
        
        if not current_status:
            continue
        
        # Parse transaction lines
        # Format: Name - DD/MM/YYYY - Time - Amount - Purpose
        # or: - Name - ngày DD/MM/YYYY - Time: Amount Purpose
        
        # Pattern 1: * Name - Date - Time - Amount - Purpose
        match1 = re.match(r'\s*[\*\-]\s*([^-]+)\s*-\s*(\d{2}/\d{2}/\d{4})\s*-\s*([^-]+)\s*-\s*([\d,]+)đ\s*-\s*(.+)', line)
        if match1:
            name, date, time, amount, purpose = match1.groups()
            transactions.append({
                'name': name.strip(),
                'date': date.strip(),
                'time': time.strip(),
                'amount': int(amount.replace(',', '')),
                'purpose': purpose.strip(),
                'status': current_status
            })
            continue
        
        # Pattern 2: - Name - ngày DD/MM/YYYY - Time: Amount Purpose
        match2 = re.match(r'\s*-\s*([^-]+)\s*-\s*ngày\s*(\d{2}/\d{2}/\d{4})\s*-\s*([^:]+):\s*([\d,]+)đ\s*(.+)', line)
        if match2:
            name, date, time, amount, purpose = match2.groups()
            transactions.append({
                'name': name.strip(),
                'date': date.strip(),
                'time': time.strip(),
                'amount': int(amount.replace(',', '')),
                'purpose': purpose.strip(),
                'status': current_status
            })
            continue
    
    return transactions

def generate_sql(transactions):
    """Generate SQL from parsed transactions"""
    lines = []
    lines.append("-- Complete Transaction History from Request.md")
    lines.append("-- UNPAID (owes) + PAID (historical) transactions")
    lines.append("")
    lines.append("DELETE FROM expense_splits;")
    lines.append("DELETE FROM expenses;")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")
    lines.append("  eid UUID;")
    lines.append("  cnt_unpaid INT := 0;")
    lines.append("  cnt_paid INT := 0;")
    lines.append("BEGIN")
    lines.append("")
    
    for idx, txn in enumerate(transactions, 1):
        name = txn['name']
        date_str = txn['date']  # DD/MM/YYYY
        time_str = txn['time']
        amount = txn['amount']
        purpose = txn['purpose']
        status = txn['status']
        
        # Convert date format
        date_parts = date_str.split('/')
        if len(date_parts) == 3:
            day, month, year = date_parts
            iso_date = f"{year}-{month}-{day}"
        else:
            iso_date = "2025-12-01"  # Fallback
        
        # Guess time
        if 'sáng' in time_str:
            hour = '10:00:00'
        elif 'trưa' in time_str:
            hour = '12:00:00'
        elif 'tối' in time_str:
            hour = '19:00:00'
        elif 'không rõ' in time_str:
            hour = '09:00:00'
        else:
            hour = '12:00:00'
        
        datetime_str = f"{iso_date} {hour}"
        
        # Get user UUID
        user_var = USERS.get(name)
        if not user_var:
            print(f"Warning: Unknown user '{name}'")
            continue
        
        # Determine category
        purpose_lower = purpose.lower()
        if 'cà phê' in purpose_lower or 'coffee' in purpose_lower:
            category = 'Food & Drink'
        elif 'ăn' in purpose_lower or 'food' in purpose_lower:
            category = 'Food & Drink'
        elif 'karaoke' in purpose_lower or 'hát' in purpose_lower:
            category = 'Entertainment'
        elif 'emart' in purpose_lower or 'siêu thị' in purpose_lower:
            category = 'Shopping'
        elif 'grab' in purpose_lower:
            category = 'Transportation'
        elif 'icloud' in purpose_lower:
            category = 'Utilities'
        else:
            category = 'Other'
        
        # Escape quotes in purpose
        purpose_escaped = purpose.replace("'", "''")
        
        # Skip if Music/Long paying for themselves only (self-payment)
        if name in ['Music', 'Long'] and user_var == USERS['Long']:
            print(f"Skipping self-payment: {name} - {purpose}", file=__import__('sys').stderr)
            continue
        
        # For PAID transactions, we need to mark them as settled (using a payment record or flag)
        # In FairPay, we use `is_payment = true` for payment records
        # But here, we want to track them as expenses that are already settled
        # The best approach: create the expense, then immediately create a matching payment
        
        is_payment_flag = 'true' if status == 'paid' else 'false'
        
        lines.append(f"  -- {idx}. {status.upper()}: {name} - {date_str} - {purpose}")
        lines.append(f"  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)")
        lines.append(f"  VALUES ('group', '{GROUP_ID}', '{purpose_escaped}', {amount}, 'VND', '{category}', '{iso_date}', '{user_var}', {is_payment_flag}, '{USERS['Long']}', '{datetime_str}') RETURNING id INTO eid;")
        
        # Insert splits (2-person split: Long + paid_by_user)
        split_amount = amount // 2
        lines.append(f"  INSERT INTO expense_splits (expense_id, user_id, split_method, computed_amount)")
        lines.append(f"  VALUES (eid, '{user_var}', 'equal', {split_amount}), (eid, '{USERS['Long']}', 'equal', {split_amount});")
        
        if status == 'paid':
            lines.append(f"  cnt_paid := cnt_paid + 1;")
        else:
            lines.append(f"  cnt_unpaid := cnt_unpaid + 1;")
        lines.append("")
    
    lines.append("  RAISE NOTICE 'UNPAID transactions: %', cnt_unpaid;")
    lines.append("  RAISE NOTICE 'PAID transactions: %', cnt_paid;")
    lines.append("  RAISE NOTICE 'Total: %', cnt_unpaid + cnt_paid;")
    lines.append("END $$;")
    lines.append("")
    
    return '\n'.join(lines)

if __name__ == '__main__':
    # Parse Request.md
    transactions = parse_request_md('.cursor/plan/Request.md')
    
    print(f"Parsed {len(transactions)} transactions", file=__import__('sys').stderr)
    print(f"UNPAID: {sum(1 for t in transactions if t['status'] == 'owes')}", file=__import__('sys').stderr)
    print(f"PAID: {sum(1 for t in transactions if t['status'] == 'paid')}", file=__import__('sys').stderr)
    
    # Generate SQL
    sql = generate_sql(transactions)
    print(sql)

