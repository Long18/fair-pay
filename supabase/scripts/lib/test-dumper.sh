#!/bin/bash
# ============================================================================
# Test Script for Database Dumper Library
# ============================================================================
# Purpose: Test dump_production_schema and dump_production_data functions
# Usage: ./supabase/scripts/lib/test-dumper.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================"
echo " Testing Database Dumper Library"
echo "============================================"
echo ""

# Skip auth.users dump for faster testing
export SKIP_AUTH_USERS=true

# Source the dumper library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/dumper.sh"

# Create test output directory
TEST_OUTPUT_DIR="supabase/scripts/sync/dumps/test"
mkdir -p "$TEST_OUTPUT_DIR"

# Test 1: dump_production_schema
echo -e "${BLUE}Test 1: dump_production_schema${NC}"
echo "Testing schema dump function..."
echo ""

if dump_production_schema "$TEST_OUTPUT_DIR"; then
    echo -e "${GREEN}✅ Test 1 PASSED: Schema dump successful${NC}"
    echo "   Output file: ${DUMPER_SCHEMA_FILE}"
    
    # Verify file exists and is not empty
    if [ -f "$DUMPER_SCHEMA_FILE" ] && [ -s "$DUMPER_SCHEMA_FILE" ]; then
        echo -e "${GREEN}✅ Schema file exists and is not empty${NC}"
    else
        echo -e "${RED}❌ Test 1 FAILED: Schema file is missing or empty${NC}"
        exit 1
    fi
    
    # Verify file contains SQL
    if grep -q "CREATE TABLE\|CREATE FUNCTION" "$DUMPER_SCHEMA_FILE"; then
        echo -e "${GREEN}✅ Schema file contains SQL statements${NC}"
    else
        echo -e "${RED}❌ Test 1 FAILED: Schema file does not contain SQL${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Test 1 FAILED: Schema dump failed${NC}"
    exit 1
fi
echo ""

# Test 2: dump_production_data (full)
echo -e "${BLUE}Test 2: dump_production_data (full)${NC}"
echo "Testing full data dump function..."
echo ""

if dump_production_data "full" "$TEST_OUTPUT_DIR" "" "false"; then
    echo -e "${GREEN}✅ Test 2 PASSED: Full data dump successful${NC}"
    echo "   Output file: ${DUMPER_DATA_FILE}"
    
    # Verify file exists and is not empty
    if [ -f "$DUMPER_DATA_FILE" ] && [ -s "$DUMPER_DATA_FILE" ]; then
        echo -e "${GREEN}✅ Data file exists and is not empty${NC}"
    else
        echo -e "${RED}❌ Test 2 FAILED: Data file is missing or empty${NC}"
        exit 1
    fi
    
    # Verify file contains data statements
    if grep -q "INSERT INTO\|COPY" "$DUMPER_DATA_FILE"; then
        echo -e "${GREEN}✅ Data file contains data statements${NC}"
    else
        echo -e "${RED}❌ Test 2 FAILED: Data file does not contain data statements${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Test 2 FAILED: Full data dump failed${NC}"
    exit 1
fi
echo ""

# Test 3: dump_production_data (full with compression)
echo -e "${BLUE}Test 3: dump_production_data (full with compression)${NC}"
echo "Testing full data dump with compression..."
echo ""

if dump_production_data "full" "$TEST_OUTPUT_DIR" "" "true"; then
    echo -e "${GREEN}✅ Test 3 PASSED: Compressed data dump successful${NC}"
    echo "   Output file: ${DUMPER_DATA_FILE}"
    
    # Verify file exists and is not empty
    if [ -f "$DUMPER_DATA_FILE" ] && [ -s "$DUMPER_DATA_FILE" ]; then
        echo -e "${GREEN}✅ Compressed data file exists and is not empty${NC}"
    else
        echo -e "${RED}❌ Test 3 FAILED: Compressed data file is missing or empty${NC}"
        exit 1
    fi
    
    # Verify file is gzipped
    if file "$DUMPER_DATA_FILE" | grep -q "gzip"; then
        echo -e "${GREEN}✅ Data file is properly compressed${NC}"
    else
        echo -e "${RED}❌ Test 3 FAILED: Data file is not compressed${NC}"
        exit 1
    fi
    
    # Verify compressed file can be decompressed and contains data
    if gzip -cd "$DUMPER_DATA_FILE" | grep -q "INSERT INTO\|COPY"; then
        echo -e "${GREEN}✅ Compressed data file contains data statements${NC}"
    else
        echo -e "${RED}❌ Test 3 FAILED: Compressed data file does not contain data statements${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Test 3 FAILED: Compressed data dump failed${NC}"
    exit 1
fi
echo ""

# Test 4: dump_production_data (incremental)
echo -e "${BLUE}Test 4: dump_production_data (incremental)${NC}"
echo "Testing incremental data dump function..."
echo ""

# Test with a few common tables
if dump_production_data "incremental" "$TEST_OUTPUT_DIR" "profiles,expenses" "false"; then
    echo -e "${GREEN}✅ Test 4 PASSED: Incremental data dump successful${NC}"
    echo "   Output file: ${DUMPER_DATA_FILE}"
    
    # Verify file exists and is not empty
    if [ -f "$DUMPER_DATA_FILE" ] && [ -s "$DUMPER_DATA_FILE" ]; then
        echo -e "${GREEN}✅ Incremental data file exists and is not empty${NC}"
    else
        echo -e "${RED}❌ Test 4 FAILED: Incremental data file is missing or empty${NC}"
        exit 1
    fi
    
    # Verify file contains data statements
    if grep -q "INSERT INTO\|COPY" "$DUMPER_DATA_FILE"; then
        echo -e "${GREEN}✅ Incremental data file contains data statements${NC}"
    else
        echo -e "${RED}❌ Test 4 FAILED: Incremental data file does not contain data statements${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Test 4 FAILED: Incremental data dump failed${NC}"
    exit 1
fi
echo ""

# Summary
echo "============================================"
echo -e "${GREEN}✅ All Tests Passed!${NC}"
echo "============================================"
echo ""
echo "📁 Test output directory: ${TEST_OUTPUT_DIR}"
echo ""
echo "Test files created:"
ls -lh "$TEST_OUTPUT_DIR" | tail -n +2 | sed 's/^/   /'
echo ""
echo "💡 Tip: You can inspect the dump files to verify their contents"
echo "   Schema: cat ${TEST_OUTPUT_DIR}/schema-*.sql | less"
echo "   Data: cat ${TEST_OUTPUT_DIR}/data-*.sql | less"
echo "   Compressed: gzip -cd ${TEST_OUTPUT_DIR}/data-*.sql.gz | less"
echo ""
