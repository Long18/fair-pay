#!/usr/bin/env python3
"""
Generate complete SQL for all FairPay transactions
Handles both UNPAID and PAID transactions
"""

# User IDs
USERS = {
    'Long': '9ac73f98-d6ff-54dd-8337-e96816e855c1',
    'Hoàng Anh': '57ee3bab-6970-599f-b0b0-e0bbb443a3ff',
    'Anh Thắng': 'a90e67fa-d056-5163-a18e-7b3b63ec21ac',
    'Minh Hồ': 'a7df138a-2668-5aad-af91-224817db1669',
    'Minh': 'a7df138a-2668-5aad-af91-224817db1669',
    'Đức': '1c2e85b5-2db5-5da1-83fd-431337f840df',
    'Chị Kim (Ngân)': '9a6b9221-1f2f-5787-b557-d29084e9e1a4',  # Nguyễn Kim Ngân
    'Chị Ngân': '9a6b9221-1f2f-5787-b557-d29084e9e1a4',  # Nguyễn Kim Ngân
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
}

GROUP_ID = '66630ca7-a0cd-4287-9c7f-727aed9cbaea'

# Transaction data: (paid_by, datetime, amount, description, participants_list)
# Format: (who_paid, 'YYYY-MM-DD HH:MM:SS', amount, description, [participants])

TRANSACTIONS = [
    # ===== UNPAID TRANSACTIONS =====
    ('Anh Thắng', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Thắng', 'Long']),
    ('Anh Thắng', '2025-11-20 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Thắng', 'Long']),
    ('Hoàng Anh', '2025-12-04 12:00:00', 45000, 'Tiền ăn trưa', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-04 19:00:00', 33000, 'Tiền đi emart', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-12 12:00:00', 45000, 'Tiền ăn trưa', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa emart (Canh bí + Cơm)', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke Apple Mũi Né', ['Hoàng Anh', 'Anh Mike', 'Minh Hồ', 'Đức', 'Long']),
    ('Anh Mike', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke Apple Mũi Né', ['Hoàng Anh', 'Anh Mike', 'Minh Hồ', 'Đức', 'Long']),
    ('Minh Hồ', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke Apple Mũi Né', ['Hoàng Anh', 'Anh Mike', 'Minh Hồ', 'Đức', 'Long']),
    ('Đức', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke Apple Mũi Né', ['Hoàng Anh', 'Anh Mike', 'Minh Hồ', 'Đức', 'Long']),

    # ===== PAID TRANSACTIONS =====
    # April 2025
    ('Hoàng Anh', '2025-04-01 10:00:00', 30000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-02 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-02 12:00:00', 100000, 'Tiền ăn trưa', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-03 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-04 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-07 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-08 10:00:00', 30000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-09 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-10 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-11 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-15 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-16 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-17 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-18 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-22 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-23 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-24 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-04-25 10:00:00', 35000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),

    # June 2025
    ('Chị Kim (Ngân)', '2025-06-18 19:00:00', 100000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Chị Kim (Ngân)', '2025-06-18 23:00:00', 62000, 'Tiền hát karaoke', ['Chị Kim (Ngân)', 'Thục Nghi', 'Long']),
    ('Hoàng Anh', '2025-06-18 19:00:00', 100000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-06-18 19:00:00', 100000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-06-18 23:00:00', 62000, 'Tiền hát karaoke', ['Chị Kim (Ngân)', 'Thục Nghi', 'Long']),

    # July 2025
    ('Chị Kim (Ngân)', '2025-07-16 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Chị Kim (Ngân)', '2025-07-16 23:00:00', 70000, 'Tiền hát karaoke', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Hoàng Anh', '2025-07-16 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Hoàng Anh', '2025-07-16 23:00:00', 70000, 'Tiền hát karaoke', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-07-16 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-07-16 23:00:00', 70000, 'Tiền hát karaoke', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Chị Kim (Ngân)', '2025-07-23 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Hoàng Anh', '2025-07-23 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-07-23 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Chị Kim (Ngân)', '2025-07-30 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Hoàng Anh', '2025-07-30 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),
    ('Thục Nghi', '2025-07-30 19:00:00', 150000, 'Tiền ăn tối', ['Chị Kim (Ngân)', 'Hoàng Anh', 'Thục Nghi', 'Long']),

    # August 2025
    ('Hoàng Anh', '2025-08-01 09:00:00', 30000, 'Tiền Grab', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-01 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-05 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-08 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-11 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-12 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-13 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-15 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-18 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-19 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-08-22 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),

    # September 2025
    ('Hoàng Anh', '2025-09-01 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-02 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-05 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-08 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-09 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-12 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-15 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-16 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-19 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-22 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-23 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-09-26 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),

    # October 2025
    ('Hoàng Anh', '2025-10-01 09:00:00', 29000, 'Tiền iCloud', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-03 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-06 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-07 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-10 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-13 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-14 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-17 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-20 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-21 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-24 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-27 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-28 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-10-31 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),

    # November 2025 (Week 1-2)
    ('Hoàng Anh', '2025-11-03 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-11-04 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-11-07 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-11-10 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-11-11 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),
    ('Hoàng Anh', '2025-11-14 10:00:00', 25000, 'Tiền cà phê', ['Hoàng Anh', 'Long']),

    # November 2025 (Week 3) - Large group lunch
    ('Anh Mike a.k.a Mai', '2025-11-17 08:00:00', 15000, 'Tiền ăn sáng', ['Anh Mike a.k.a Mai', 'Long']),
    ('Hoàng Anh', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),
    ('Chị Kayen', '2025-11-18 08:00:00', 15000, 'Tiền ăn sáng', ['Chị Kayen', 'Long']),
    ('Chị Kayen', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),
    ('Long', '2025-11-18 12:00:00', 27000, 'Tiền ăn trưa (Ăn Chiều)', ['Long']),
    ('Long', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),
    ('Chị Ngân', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),
    ('Thịnh (Arin)', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),
    ('Tuyến', '2025-11-18 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Chị Ngân', 'Thịnh (Arin)', 'Tuyến']),

    # November 19, 2025 - dinner
    ('Hoàng Anh', '2025-11-19 19:00:00', 100000, 'Tiền ăn tối', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Chị Kayen', '2025-11-19 19:00:00', 100000, 'Tiền ăn tối', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-11-19 19:00:00', 100000, 'Tiền ăn tối', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-11-19 19:00:00', 100000, 'Tiền ăn tối', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-11-19 19:00:00', 100000, 'Tiền ăn tối', ['Hoàng Anh', 'Chị Kayen', 'Long', 'Thục Nghi', 'Tuyến']),

    # November 20, 2025
    ('Anh Mike a.k.a Mai', '2025-11-20 19:00:00', 50000, 'Tiền ăn tối', ['Anh Mike a.k.a Mai', 'Long']),
    ('Anh Tâm', '2025-11-20 19:00:00', 56000, 'Tiền ăn tối', ['Anh Tâm', 'Long']),
    ('Thục Nghi', '2025-11-20 19:00:00', 40000, 'Tiền ăn tối', ['Thục Nghi', 'Long']),
    ('Long', '2025-11-20 12:00:00', 45000, 'Tiền ăn trưa', ['Long', 'Hoàng Anh', 'Chị Kayen', 'Tuyến']),
    ('Hoàng Anh', '2025-11-20 12:00:00', 45000, 'Tiền ăn trưa', ['Long', 'Hoàng Anh', 'Chị Kayen', 'Tuyến']),
    ('Chị Kayen', '2025-11-20 12:00:00', 45000, 'Tiền ăn trưa', ['Long', 'Hoàng Anh', 'Chị Kayen', 'Tuyến']),
    ('Tuyến', '2025-11-20 12:00:00', 45000, 'Tiền ăn trưa', ['Long', 'Hoàng Anh', 'Chị Kayen', 'Tuyến']),

    # December 2025 Week 1
    ('Chị Kayen', '2025-12-02 12:00:00', 39000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Kayen', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-12-02 12:00:00', 49500, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Kayen', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thịnh (Arin)', '2025-12-02 12:00:00', 49500, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Kayen', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-12-02 12:00:00', 39000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Kayen', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-12-02 12:00:00', 39000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Kayen', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),

    ('Anh Mike a.k.a Mai', '2025-12-03 12:00:00', 50000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Chị Ngân', '2025-12-03 12:00:00', 50000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Hoàng Anh', '2025-12-03 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-12-03 12:00:00', 50000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-12-03 12:00:00', 35000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-12-03 12:00:00', 50000, 'Tiền ăn trưa (Ăn Trưa)', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Hoàng Anh', 'Long', 'Thục Nghi', 'Tuyến']),

    # December Week 2
    ('Chị Ngân', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Hoàng Anh', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thịnh (Arin)', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-12-08 12:00:00', 45000, 'Tiền ăn trưa (Ăn Chiều)', ['Chị Ngân', 'Hoàng Anh', 'Long', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),

    ('Hoàng Anh', '2025-12-09 12:00:00', 45000, 'Tiền ăn trưa (Ăn Trưa)', ['Hoàng Anh', 'Long']),

    ('Anh Mike a.k.a Mai', '2025-12-10 12:00:00', 50000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),
    ('Chị Ngân', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),
    ('Thái', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),
    ('Thịnh (Arin)', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),
    ('Thục Nghi', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),
    ('Tuyến', '2025-12-10 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Mike a.k.a Mai', 'Chị Ngân', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến', 'Long']),

    ('Hoàng Anh', '2025-12-11 19:00:00', 45000, 'Tiền đi siêu thị', ['Hoàng Anh', 'Long']),

    # December Week 3
    ('Chị Kayen', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thái', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thịnh (Arin)', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-12-15 12:00:00', 5000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-12-15 12:00:00', 45000, 'Tiền ăn trưa', ['Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),

    ('Anh Tâm', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Chị Kayen', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Long', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thái', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thịnh (Arin)', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Thục Nghi', '2025-12-16 12:00:00', 5000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),
    ('Tuyến', '2025-12-16 12:00:00', 45000, 'Tiền ăn trưa', ['Anh Tâm', 'Chị Kayen', 'Long', 'Thái', 'Thịnh (Arin)', 'Thục Nghi', 'Tuyến']),

    ('Hải', '2025-12-17 10:00:00', 35000, 'Tiền cà phê', ['Hải', 'Long']),
    ('Long', '2025-12-17 10:00:00', 35000, 'Tiền cà phê', ['Hải', 'Long']),

    ('Long', '2025-12-18 19:00:00', 201000, 'Tiền đi siêu thị', ['Long']),  # Music paid, assuming Long
    ('Long', '2025-12-18 19:00:00', 5000, 'Tiền ăn trưa', ['Long']),
    ('Thục Nghi', '2025-12-18 12:00:00', 5000, 'Tiền ăn trưa', ['Thục Nghi', 'Long']),
    ('Tuyến', '2025-12-18 12:00:00', 45000, 'Tiền ăn trưa', ['Tuyến', 'Long']),

    # December 19 - Karaoke party
    ('Anh Tâm', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke', ['Anh Tâm', 'Chị Ngân', 'Anh Đăng', 'Anh Phúc', 'Minh', 'Long']),
    ('Chị Ngân', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke', ['Anh Tâm', 'Chị Ngân', 'Anh Đăng', 'Anh Phúc', 'Minh', 'Long']),
    ('Anh Đăng', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke', ['Anh Tâm', 'Chị Ngân', 'Anh Đăng', 'Anh Phúc', 'Minh', 'Long']),
    ('Anh Phúc', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke', ['Anh Tâm', 'Chị Ngân', 'Anh Đăng', 'Anh Phúc', 'Minh', 'Long']),
    ('Minh', '2025-12-19 23:00:00', 85000, 'Tiền hát karaoke', ['Anh Tâm', 'Chị Ngân', 'Anh Đăng', 'Anh Phúc', 'Minh', 'Long']),
]

def generate_sql():
    lines = []
    lines.append("-- Complete Transaction History")
    lines.append("-- Generated from Python script")
    lines.append("")
    lines.append("DELETE FROM expense_splits;")
    lines.append("DELETE FROM expenses;")
    lines.append("")
    lines.append("DO $$")
    lines.append("DECLARE")

    # Add user variables
    for name, uuid in sorted(set(USERS.items())):
        var_name = name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('.', '')
        lines.append(f"  u_{var_name} UUID := '{uuid}';")

    lines.append(f"  g_new UUID := '{GROUP_ID}';")
    lines.append("  eid UUID;")
    lines.append("  cnt INT := 0;")
    lines.append("BEGIN")
    lines.append("")

    for idx, (paid_by, dt, amount, desc, participants) in enumerate(TRANSACTIONS, 1):
        paid_by_var = paid_by.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('.', '')

        # Determine category
        if 'cà phê' in desc.lower():
            category = 'Food & Drink'
        elif 'ăn' in desc.lower():
            category = 'Food & Drink'
        elif 'karaoke' in desc.lower() or 'hát' in desc.lower():
            category = 'Entertainment'
        elif 'siêu thị' in desc.lower() or 'emart' in desc.lower():
            category = 'Shopping'
        elif 'grab' in desc.lower():
            category = 'Transportation'
        elif 'icloud' in desc.lower():
            category = 'Utilities'
        else:
            category = 'Other'

        # Escape single quotes in description
        desc_escaped = desc.replace("'", "''")

        # Extract date from datetime
        date_part = dt.split(' ')[0]

        # Insert expense (using correct schema: context_type, group_id, friendship_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)
        lines.append(f"  -- {idx}. {desc} ({paid_by}, {dt})")
        lines.append(f"  INSERT INTO expenses (context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, is_payment, created_by, created_at)")
        lines.append(f"  VALUES ('group', g_new, '{desc_escaped}', {amount}, 'VND', '{category}', '{date_part}', u_{paid_by_var}, false, u_long, '{dt}') RETURNING id INTO eid;")

        # Insert splits
        split_amount = amount // len(participants)
        split_values = []
        for p in participants:
            p_var = p.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('.', '')
            split_values.append(f"(gen_random_uuid(), eid, u_{p_var}, 'equal', NULL, {split_amount}, now())")

        lines.append(f"  INSERT INTO expense_splits VALUES {', '.join(split_values)};")
        lines.append(f"  cnt := cnt + 1;")
        lines.append("")

    lines.append(f"  RAISE NOTICE 'Total: % transactions', cnt;")
    lines.append("END $$;")

    return '\n'.join(lines)

if __name__ == '__main__':
    print(generate_sql())
