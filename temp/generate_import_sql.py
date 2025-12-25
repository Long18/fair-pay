import pandas as pd
import glob
import re
import uuid
import os
from datetime import datetime

# ==============================================================================
# 1. CONFIGURATION & MAPPING
# ==============================================================================

# Default payer email (Banker)
BANKER_EMAIL = "long.lnt@amanotes.com"
BANKER_NAME = "Long"

# Name mapping from CSV -> Standard Email
NAME_MAPPING = {
    "Anh Thắng": "thang.nguyen@amanotes.com", "Thắng": "thang.nguyen@amanotes.com",
    "Chị Ngân": "ngan.dtt@amanotes.com", "Ngân": "ngan.dtt@amanotes.com",
    "Anh Mike a.k.a Mai": "mai.vu@amanotes.com", "Mai": "mai.vu@amanotes.com", "Anh Mike": "mai.vu@amanotes.com", "Anh Mike a.k.a Mike": "mai.vu@amanotes.com",
    "Anh Tâm": "tam.nt2@amanotes.com",
    "Thục Nghi": "nghi.ct@amanotes.com", "Nghi": "nghi.ct@amanotes.com",
    "Hoàng Anh": "anh.th@amanotes.com",
    "Chị Kayen Kim Ngân": "ngan.nk@amanotes.com", "Chị Kim (Ngân)": "ngan.nk@amanotes.com", "Chị Kayen": "ngan.nk@amanotes.com",
    "Chị Hạ": "ha.ntn@amanotes.com",
    "Tuyến": "tuyen.ttk@amanotes.com",
    "Anh Phúc": "phuc.ph@amanotes.com",
    "Anh Tuấn": "tuan.dinh@amanotes.com",
    "Anh Đăng": "dang.lh@amanotes.com",
    "Anh Vũ": "vu.hoang@amanotes.com",
    "Thịnh (Arin)": "thinh.pp@amanotes.com", "Anh Thịnh": "thinh.pp@amanotes.com", "Thịnh": "thinh.pp@amanotes.com",
    "Hải": "hai.nd@amanotes.com",
    "Minh": "minh.hn@amanotes.com",
    "Kapu (Quốc)": "quoc.th@amanotes.com", "Kapu": "quoc.th@amanotes.com",
    "Nhi": "nhi.htt@amanotes.com", "Nhi Phan": "nhi.htt@amanotes.com",
    "Đức": "duc.nh@amanotes.com",
    "Thái": "thai.nb@amanotes.com", "Anh Thái": "thai.nb@amanotes.com",
    "Thuần": "thuan.dlc@amanotes.com",
    "Chị Hảo": "hao.lnn@amanotes.com",
    "Chị Ngọc": "ngoc.hb@amanotes.com",
    "Bảo": "bao.nq@amanotes.com",
    "Long": "long.lnt@amanotes.com"
}

# UUID namespace for deterministic UUID generation
UUID_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_DNS, "amanotes-expenses-import")

# ==============================================================================
# 2. HELPER FUNCTIONS
# ==============================================================================

def get_uuid(key_string):
    """Generate UUID v5 from a string (email or group name)"""
    if not key_string:
        return None
    return str(uuid.uuid5(UUID_NAMESPACE, str(key_string).lower().strip()))

def escape_sql_string(val):
    """Escape single quotes in SQL strings to prevent injection"""
    if not val:
        return ""
    return str(val).replace("'", "''")

def clean_money(val):
    """Convert currency string (e.g. '20,000 đ') to float"""
    if pd.isna(val):
        return 0.0
    s = str(val).replace(',', '').replace(' đ', '').replace('đ', '').strip()
    # Handle Excel formula errors (#ERROR, #NAME)
    if not s or s.startswith('#') or s.lower() == 'nan':
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0

def parse_csv_metadata(filename):
    """
    Extract Year and Group info from filename.
    Example: "[NewGames] Ăn chơi... - Tuần 03 - 06/2025.csv" -> 2025
    """
    # Find year (4 digits at the end of date pattern)
    year_match = re.search(r'(\d{4})\.csv$', filename)
    year = int(year_match.group(1)) if year_match else datetime.now().year

    # Find group name (in first square brackets)
    group_match = re.search(r'^\[(.*?)\]', filename)
    group_name = group_match.group(1) if group_match else "General"

    return group_name, year

# ==============================================================================
# 3. MAIN ETL PROCESS
# ==============================================================================

def generate_migration_sql():
    sql_statements = []

    # SQL header
    sql_statements.append("BEGIN;")
    sql_statements.append("-- Import NewGames expense data from CSV files")
    sql_statements.append("-- Generated at: " + datetime.now().isoformat())
    sql_statements.append("")

    processed_groups = set()
    processed_emails = set()
    processed_group_members = set()  # Track (group_id, user_id) pairs

    # 1. CREATE BANKER PROFILE (LONG)
    banker_id = get_uuid(BANKER_EMAIL)
    sql_statements.append(f"-- Banker Profile: {BANKER_NAME}")
    sql_statements.append(
        f"INSERT INTO public.profiles (id, full_name, created_at, updated_at) "
        f"VALUES ('{banker_id}', '{escape_sql_string(BANKER_NAME)}', NOW(), NOW()) "
        f"ON CONFLICT (id) DO NOTHING;"
    )
    processed_emails.add(BANKER_EMAIL)

    # Get list of CSV files
    csv_files = glob.glob("*.csv")
    print(f"--> Found {len(csv_files)} CSV files.")

    for filepath in csv_files:
        filename = os.path.basename(filepath)
        print(f"Processing: {filename}...")

        try:
            group_name_from_file, file_year = parse_csv_metadata(filename)

            # --- Read CSV file ---
            # Header is at rows 2 and 3 (index 1, 2). Row 1 (index 0) is subtitle
            df = pd.read_csv(filepath, header=[1, 2], index_col=0, encoding='utf-8')

            # --- Handle MultiIndex Header (merged date cells) ---
            # Level 0 is Date (e.g., 16/06, NaN, NaN, 17/06...) -> Need forward fill
            # Level 1 is Type (Coffee, Lunch...)

            # Clean level 0 (Date)
            dates_level = pd.Series(df.columns.get_level_values(0))
            # Replace Unnamed/NaN columns with nearest previous date
            dates_level = dates_level.replace(to_replace=r'^Unnamed.*', value=pd.NA, regex=True).ffill()

            # Reassign fixed MultiIndex
            df.columns = pd.MultiIndex.from_arrays([dates_level, df.columns.get_level_values(1)])

            # --- Create Group in DB ---
            group_id = get_uuid(group_name_from_file)
            if group_name_from_file not in processed_groups:
                sql_statements.append(f"\n-- Group: {group_name_from_file}")
                sql_statements.append(
                    f"INSERT INTO public.groups (id, name, created_by, created_at) "
                    f"VALUES ('{group_id}', '{escape_sql_string(group_name_from_file)}', '{banker_id}', NOW()) "
                    f"ON CONFLICT (id) DO NOTHING;"
                )
                processed_groups.add(group_name_from_file)

                # Add banker as group admin
                member_key = (group_id, banker_id)
                if member_key not in processed_group_members:
                    sql_statements.append(
                        f"INSERT INTO public.group_members (id, group_id, user_id, role, joined_at) "
                        f"VALUES ('{uuid.uuid4()}', '{group_id}', '{banker_id}', 'admin', NOW()) "
                        f"ON CONFLICT (group_id, user_id) DO NOTHING;"
                    )
                    processed_group_members.add(member_key)

            # Track latest expense date for payment date
            latest_expense_date = None

            # --- Split data into 2 parts: Details (Expenses) and Summary (Payments) ---

            # 1. Process Payments based on "Tổng kết" -> "Đã chuyển"
            if 'Tổng kết' in df.columns.get_level_values(0):
                summary_df = df.xs('Tổng kết', axis=1, level=0, drop_level=False)
                # Flatten columns for easy access
                summary_df.columns = summary_df.columns.droplevel(0)

                for user_name, row in summary_df.iterrows():
                    user_name = str(user_name).strip()
                    if user_name not in NAME_MAPPING:
                        continue  # Skip garbage rows (Total, Note...)

                    email = NAME_MAPPING[user_name]
                    is_paid = str(row.get('Đã chuyển', 'FALSE')).strip().upper() == 'TRUE'
                    total_amount = clean_money(row.get('Tổng tiền', 0))

                    if is_paid and total_amount > 0:
                        payer_id = get_uuid(email)
                        # Use latest expense date or fallback to year-end
                        payment_date = latest_expense_date if latest_expense_date else f"{file_year}-12-31"

                        sql_statements.append(
                            f"INSERT INTO public.payments (id, context_type, group_id, from_user, to_user, amount, currency, payment_date, created_by) "
                            f"VALUES ('{uuid.uuid4()}', 'group', '{group_id}', '{payer_id}', '{banker_id}', {total_amount}, 'VND', '{payment_date}', '{banker_id}');"
                        )

            # 2. Process Expenses
            # Remove "Tổng kết" column to keep only date data
            if 'Tổng kết' in df.columns.get_level_values(0):
                expense_df = df.drop('Tổng kết', axis=1, level=0)
            else:
                expense_df = df

            # Melt data: Convert from wide to long format
            melted = expense_df.melt(ignore_index=False)
            melted.reset_index(inplace=True)  # Move User Name (index) to column
            melted.columns = ['User Name', 'Date', 'Category', 'Amount']

            for _, row in melted.iterrows():
                user_name = str(row['User Name']).strip()
                amount = clean_money(row['Amount'])
                category = str(row['Category']).strip()
                date_str = str(row['Date']).strip()

                # Skip garbage rows or zero amounts
                if amount <= 0 or user_name not in NAME_MAPPING or pd.isna(date_str):
                    continue

                user_email = NAME_MAPPING[user_name]
                user_id = get_uuid(user_email)

                # Create Profile if not exists
                if user_email not in processed_emails:
                    sql_statements.append(
                        f"INSERT INTO public.profiles (id, full_name, created_at, updated_at) "
                        f"VALUES ('{user_id}', '{escape_sql_string(user_name)}', NOW(), NOW()) "
                        f"ON CONFLICT (id) DO NOTHING;"
                    )
                    processed_emails.add(user_email)

                # Add user to group_members if not already added
                member_key = (group_id, user_id)
                if member_key not in processed_group_members:
                    sql_statements.append(
                        f"INSERT INTO public.group_members (id, group_id, user_id, role, joined_at) "
                        f"VALUES ('{uuid.uuid4()}', '{group_id}', '{user_id}', 'member', NOW()) "
                        f"ON CONFLICT (group_id, user_id) DO NOTHING;"
                    )
                    processed_group_members.add(member_key)

                # Parse date: "16/06" + Year 2025 -> "2025-06-16"
                try:
                    # Parse dd/mm format
                    day, month = map(int, date_str.split('/'))
                    expense_date = f"{file_year}-{month:02d}-{day:02d}"

                    # Track latest date for payment date
                    if not latest_expense_date or expense_date > latest_expense_date:
                        latest_expense_date = expense_date
                except:
                    # Fallback if date format error
                    expense_date = f"{file_year}-01-01"

                # Create Expense Record
                expense_id = uuid.uuid4()
                desc = f"{category} ({date_str})"

                # Insert into Expenses (Long paid the money)
                sql_statements.append(
                    f"INSERT INTO public.expenses (id, context_type, group_id, description, amount, currency, category, expense_date, paid_by_user_id, created_by) "
                    f"VALUES ('{expense_id}', 'group', '{group_id}', '{escape_sql_string(desc)}', {amount}, 'VND', '{escape_sql_string(category)}', '{expense_date}', '{banker_id}', '{banker_id}');"
                )

                # Insert into Expense Splits (User owes money)
                sql_statements.append(
                    f"INSERT INTO public.expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount) "
                    f"VALUES ('{uuid.uuid4()}', '{expense_id}', '{user_id}', 'exact', {amount}, {amount});"
                )

        except Exception as e:
            print(f"❌ Error processing file {filename}: {e}")
            continue

    sql_statements.append("\nCOMMIT;")

    # Write to file
    output_file = "import_data.sql"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"\n✅ Done! SQL file created at: {output_file}")
    print(f"👉 Open Supabase SQL Editor and copy the file content to run.")
    print(f"\n📊 Statistics:")
    print(f"   - Profiles created: {len(processed_emails)}")
    print(f"   - Groups created: {len(processed_groups)}")
    print(f"   - Group memberships: {len(processed_group_members)}")

if __name__ == "__main__":
    generate_migration_sql()
