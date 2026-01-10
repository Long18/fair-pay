#!/bin/bash
# ============================================================================
# Test script for anonymizer.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the anonymizer library
source "${SCRIPT_DIR}/anonymizer.sh"

echo "============================================"
echo " Testing Data Anonymization Library"
echo "============================================"
echo ""

# Create test data
TEST_DIR="${SCRIPT_DIR}/../sync/test-data"
mkdir -p "$TEST_DIR"

# Create sample SQL dump with sensitive data
cat > "${TEST_DIR}/test-input.sql" << 'EOF'
-- Test SQL dump with sensitive data
-- Generated for testing purposes

-- Insert test users
INSERT INTO public.profiles (id, email, full_name, phone) VALUES 
('123e4567-e89b-12d3-a456-426614174000', 'john.doe@example.com', 'John Doe', '+84901234567'),
('223e4567-e89b-12d3-a456-426614174001', 'jane.smith@example.com', 'Jane Smith', '+84901234568'),
('323e4567-e89b-12d3-a456-426614174002', 'bob.wilson@example.com', 'Bob Wilson', '+84901234569');

-- Insert test expenses
INSERT INTO public.expenses (id, description, amount, payer_id) VALUES
('423e4567-e89b-12d3-a456-426614174003', 'Lunch', 150000, '123e4567-e89b-12d3-a456-426614174000'),
('523e4567-e89b-12d3-a456-426614174004', 'Coffee', 50000, '223e4567-e89b-12d3-a456-426614174001');

-- COPY format test
COPY public.profiles (id, email, full_name, phone) FROM stdin;
423e4567-e89b-12d3-a456-426614174005	alice@test.com	Alice Brown	+84901234570
523e4567-e89b-12d3-a456-426614174006	charlie@test.com	Charlie Davis	+84901234571
\.
EOF

echo "✅ Created test input file: ${TEST_DIR}/test-input.sql"
echo ""

# Test 1: Anonymize data (requires config with anonymization enabled)
echo "Test 1: Testing anonymize_data function"
echo "----------------------------------------"

# Create temporary config with anonymization enabled
cat > "${SCRIPT_DIR}/../sync/config.test.json" << 'EOF'
{
  "anonymization": {
    "enabled": true,
    "rules": [
      {
        "table": "profiles",
        "column": "email",
        "strategy": "fake-email"
      },
      {
        "table": "profiles",
        "column": "phone",
        "strategy": "fake-phone"
      }
    ]
  }
}
EOF

# Temporarily override config file
export CONFIG_FILE="${SCRIPT_DIR}/../sync/config.test.json"

if anonymize_data \
    "${TEST_DIR}/test-input.sql" \
    "${TEST_DIR}/test-output-anonymized.sql" \
    "${TEST_DIR}/test-mapping.txt"; then
    echo "✅ Test 1 PASSED: anonymize_data executed successfully"
    echo ""
    
    # Verify anonymization
    if grep -q "fake-.*@example.com" "${TEST_DIR}/test-output-anonymized.sql"; then
        echo "✅ Email anonymization verified"
    else
        echo "❌ Email anonymization failed"
    fi
    
    if grep -q "+1555" "${TEST_DIR}/test-output-anonymized.sql"; then
        echo "✅ Phone anonymization verified"
    else
        echo "❌ Phone anonymization failed"
    fi
    
    if [ -f "${TEST_DIR}/test-mapping.txt" ]; then
        echo "✅ Mapping file created"
    else
        echo "❌ Mapping file not created"
    fi
else
    echo "❌ Test 1 FAILED: anonymize_data failed"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Filter tables (include mode)
echo "Test 2: Testing filter_tables function (include mode)"
echo "----------------------------------------"

if filter_tables \
    "${TEST_DIR}/test-input.sql" \
    "${TEST_DIR}/test-output-include.sql" \
    "include" \
    "profiles"; then
    echo "✅ Test 2 PASSED: filter_tables (include) executed successfully"
    echo ""
    
    # Verify filtering
    if grep -q "INSERT INTO public.profiles" "${TEST_DIR}/test-output-include.sql"; then
        echo "✅ Profiles table included"
    else
        echo "❌ Profiles table not found"
    fi
    
    if grep -q "INSERT INTO public.expenses" "${TEST_DIR}/test-output-include.sql"; then
        echo "❌ Expenses table should be excluded"
    else
        echo "✅ Expenses table correctly excluded"
    fi
else
    echo "❌ Test 2 FAILED: filter_tables (include) failed"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 3: Filter tables (exclude mode)
echo "Test 3: Testing filter_tables function (exclude mode)"
echo "----------------------------------------"

if filter_tables \
    "${TEST_DIR}/test-input.sql" \
    "${TEST_DIR}/test-output-exclude.sql" \
    "exclude" \
    "expenses"; then
    echo "✅ Test 3 PASSED: filter_tables (exclude) executed successfully"
    echo ""
    
    # Verify filtering
    if grep -q "INSERT INTO public.profiles" "${TEST_DIR}/test-output-exclude.sql"; then
        echo "✅ Profiles table included"
    else
        echo "❌ Profiles table not found"
    fi
    
    if grep -q "INSERT INTO public.expenses" "${TEST_DIR}/test-output-exclude.sql"; then
        echo "❌ Expenses table should be excluded"
    else
        echo "✅ Expenses table correctly excluded"
    fi
else
    echo "❌ Test 3 FAILED: filter_tables (exclude) failed"
fi

echo ""
echo "----------------------------------------"
echo ""

# Cleanup
echo "Cleaning up test files..."
rm -rf "$TEST_DIR"
rm -f "${SCRIPT_DIR}/../sync/config.test.json"

echo ""
echo "============================================"
echo " All Tests Complete"
echo "============================================"
