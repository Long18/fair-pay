#!/bin/bash
# ============================================================================
# Configuration Loader and Validator Test Script
# ============================================================================
# Purpose: Test config-loader.sh and validator.sh functionality
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo " Testing Configuration Loader and Validator"
echo "============================================"
echo ""

# Source the libraries
echo "📦 Loading libraries..."
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/config-loader.sh"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/validator.sh"
echo ""

# Test 1: Load configuration
echo "Test 1: Loading configuration..."
echo "----------------------------------------"
if load_config; then
    echo "✅ Test 1 passed: Configuration loaded successfully"
else
    echo "❌ Test 1 failed: Configuration loading failed"
    exit 1
fi
echo ""

# Test 2: Print configuration
echo "Test 2: Printing configuration..."
echo "----------------------------------------"
print_config
echo "✅ Test 2 passed: Configuration printed successfully"
echo ""

# Test 3: Validate configuration
echo "Test 3: Validating configuration..."
echo "----------------------------------------"
if validate_config; then
    echo "✅ Test 3 passed: Configuration validation successful"
else
    echo "❌ Test 3 failed: Configuration validation failed"
    exit 1
fi
echo ""

# Test 4: Test get_config_value function
echo "Test 4: Testing get_config_value function..."
echo "----------------------------------------"
version=$(get_config_value "CONFIG_VERSION" "unknown")
echo "   Version: ${version}"
if [ -n "$version" ]; then
    echo "✅ Test 4 passed: get_config_value works"
else
    echo "❌ Test 4 failed: get_config_value returned empty"
    exit 1
fi
echo ""

# Test 5: Test table name validation
echo "Test 5: Testing table name validation..."
echo "----------------------------------------"
echo "   Testing valid table names..."
if validate_table_name "users" && \
   validate_table_name "public.users" && \
   validate_table_name "*" && \
   validate_table_name "my_table_123"; then
    echo "   ✅ Valid table names passed"
else
    echo "   ❌ Valid table names failed"
    exit 1
fi

echo "   Testing invalid table names..."
if ! validate_table_name "123invalid" 2>/dev/null && \
   ! validate_table_name "table-name" 2>/dev/null && \
   ! validate_table_name "table name" 2>/dev/null && \
   ! validate_table_name "" 2>/dev/null; then
    echo "   ✅ Invalid table names correctly rejected"
else
    echo "   ❌ Invalid table names not properly rejected"
    exit 1
fi
echo "✅ Test 5 passed: Table name validation works"
echo ""

# Test 6: Test anonymization strategy validation
echo "Test 6: Testing anonymization strategy validation..."
echo "----------------------------------------"
echo "   Testing valid strategies..."
if validate_anonymization_strategy "fake-email" && \
   validate_anonymization_strategy "fake-name" && \
   validate_anonymization_strategy "fake-phone" && \
   validate_anonymization_strategy "hash" && \
   validate_anonymization_strategy "null"; then
    echo "   ✅ Valid strategies passed"
else
    echo "   ❌ Valid strategies failed"
    exit 1
fi

echo "   Testing invalid strategies..."
if ! validate_anonymization_strategy "invalid-strategy" 2>/dev/null && \
   ! validate_anonymization_strategy "fake_email" 2>/dev/null; then
    echo "   ✅ Invalid strategies correctly rejected"
else
    echo "   ❌ Invalid strategies not properly rejected"
    exit 1
fi
echo "✅ Test 6 passed: Anonymization strategy validation works"
echo ""

# Test 7: Test boolean validation
echo "Test 7: Testing boolean validation..."
echo "----------------------------------------"
if validate_boolean "true" "test_field" && \
   validate_boolean "false" "test_field"; then
    echo "   ✅ Valid booleans passed"
else
    echo "   ❌ Valid booleans failed"
    exit 1
fi

if ! validate_boolean "yes" "test_field" 2>/dev/null && \
   ! validate_boolean "1" "test_field" 2>/dev/null; then
    echo "   ✅ Invalid booleans correctly rejected"
else
    echo "   ❌ Invalid booleans not properly rejected"
    exit 1
fi
echo "✅ Test 7 passed: Boolean validation works"
echo ""

# Test 8: Test number validation
echo "Test 8: Testing number validation..."
echo "----------------------------------------"
if validate_number "5" "test_field" 1 10 && \
   validate_number "1" "test_field" 1 10 && \
   validate_number "10" "test_field" 1 10; then
    echo "   ✅ Valid numbers passed"
else
    echo "   ❌ Valid numbers failed"
    exit 1
fi

if ! validate_number "0" "test_field" 1 10 2>/dev/null && \
   ! validate_number "11" "test_field" 1 10 2>/dev/null && \
   ! validate_number "abc" "test_field" 1 10 2>/dev/null; then
    echo "   ✅ Invalid numbers correctly rejected"
else
    echo "   ❌ Invalid numbers not properly rejected"
    exit 1
fi
echo "✅ Test 8 passed: Number validation works"
echo ""

# Summary
echo "============================================"
echo " All Tests Passed! ✅"
echo "============================================"
echo ""
echo "Summary:"
echo "  ✅ Configuration loading"
echo "  ✅ Configuration printing"
echo "  ✅ Configuration validation"
echo "  ✅ Get config value"
echo "  ✅ Table name validation"
echo "  ✅ Anonymization strategy validation"
echo "  ✅ Boolean validation"
echo "  ✅ Number validation"
echo ""
