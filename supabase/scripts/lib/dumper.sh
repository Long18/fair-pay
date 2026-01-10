#!/bin/bash
# ============================================================================
# Database Dumper Library
# ============================================================================
# Purpose: Functions for dumping production database schema and data
# Functions:
#   - dump_production_schema(): Dump schema-only from production
#   - dump_production_data(): Dump data from production (full or incremental)
# ============================================================================

# Source configuration if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../sync/config.json"

# ============================================================================
# Function: dump_production_schema
# ============================================================================
# Dumps schema-only from production database using Supabase CLI
# 
# Arguments:
#   $1 - Output directory (optional, defaults to config or supabase/scripts/sync/dumps)
#
# Returns:
#   0 on success, 1 on failure
#
# Output:
#   Creates timestamped schema dump file: schema-YYYYMMDD-HHMMSS.sql
#
# Requirements: 1.2
# ============================================================================
dump_production_schema() {
    local output_dir="${1:-}"
    local timestamp
    local output_file
    local temp_file
    
    echo "============================================"
    echo " Dumping Production Schema"
    echo "============================================"
    echo ""
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo "❌ ERROR: Supabase CLI not found"
        echo "   Install: brew install supabase/tap/supabase"
        return 1
    fi
    
    # Check if project is linked
    if ! supabase projects list &> /dev/null 2>&1; then
        echo "❌ ERROR: Project is not linked to production"
        echo "   Run: supabase link --project-ref <your-project-ref>"
        return 1
    fi
    
    # Determine output directory
    if [ -z "$output_dir" ]; then
        # Try to read from config
        if [ -f "$CONFIG_FILE" ]; then
            output_dir=$(grep -o '"directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"directory"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        fi
        # Fallback to default
        if [ -z "$output_dir" ]; then
            output_dir="supabase/scripts/sync/dumps"
        fi
    fi
    
    # Create output directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Generate timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    output_file="${output_dir}/schema-${timestamp}.sql"
    temp_file="${output_file}.tmp"
    
    echo "📥 Dumping schema from production..."
    echo "   Output: ${output_file}"
    echo ""
    
    # Dump schema using Supabase CLI
    # Note: Supabase CLI doesn't have --schema-only flag
    # We dump everything and filter out data statements
    # -s public: Only dump public schema (exclude auth, storage, etc.)
    if supabase db dump --linked -s public > "${temp_file}.full" 2>&1; then
        # Filter out data statements (INSERT, COPY) to get schema-only
        # Keep: CREATE, ALTER, COMMENT, GRANT, REVOKE, SET statements
        grep -v "^INSERT INTO\|^COPY\|^\\\\\\." "${temp_file}.full" > "$temp_file" || true
        rm -f "${temp_file}.full"
        # Validate dump file integrity
        if [ ! -s "$temp_file" ]; then
            echo "❌ ERROR: Schema dump file is empty"
            rm -f "$temp_file"
            return 1
        fi
        
        # Check for critical errors in dump (look for actual error messages, not SQL strings)
        # Look for lines starting with "ERROR:", "FATAL:", or "pg_dump: error:"
        if grep -E "^(ERROR:|FATAL:|pg_dump: error:)" "$temp_file" > /dev/null 2>&1; then
            echo "❌ ERROR: Schema dump contains errors"
            echo "   First few error lines:"
            grep -E "^(ERROR:|FATAL:|pg_dump: error:)" "$temp_file" | head -5 | sed 's/^/   /'
            rm -f "$temp_file"
            return 1
        fi
        
        # Move temp file to final location
        mv "$temp_file" "$output_file"
        
        # Calculate statistics
        local file_size
        local line_count
        local table_count
        local function_count
        local view_count
        local policy_count
        
        file_size=$(wc -c < "$output_file" | tr -d ' ')
        line_count=$(wc -l < "$output_file" | tr -d ' ')
        table_count=$(grep -c "^CREATE TABLE" "$output_file" || echo 0)
        function_count=$(grep -c "^CREATE FUNCTION\|^CREATE OR REPLACE FUNCTION" "$output_file" || echo 0)
        view_count=$(grep -c "^CREATE VIEW\|^CREATE OR REPLACE VIEW" "$output_file" || echo 0)
        policy_count=$(grep -c "^CREATE POLICY" "$output_file" || echo 0)
        
        echo "✅ Schema dump successful"
        echo ""
        echo "📊 Schema Statistics:"
        echo "   File: ${output_file}"
        echo "   Size: $(numfmt --to=iec-i --suffix=B "$file_size" 2>/dev/null || echo "${file_size} bytes")"
        echo "   Lines: ${line_count}"
        echo "   Tables: ${table_count}"
        echo "   Functions: ${function_count}"
        echo "   Views: ${view_count}"
        echo "   RLS Policies: ${policy_count}"
        echo ""
        
        # Export output file path for use by caller
        export DUMPER_SCHEMA_FILE="$output_file"
        
        return 0
    else
        echo "❌ ERROR: Schema dump failed"
        echo ""
        echo "Common issues:"
        echo "  - Project not linked (run: supabase link)"
        echo "  - Network connectivity"
        echo "  - Insufficient permissions"
        rm -f "$temp_file"
        return 1
    fi
}

# ============================================================================
# Function: dump_production_data
# ============================================================================
# Dumps data from production database using Supabase CLI
# Supports full and incremental dumps, auth.users handling, and compression
#
# Arguments:
#   $1 - Dump type: "full" or "incremental" (default: full)
#   $2 - Output directory (optional, defaults to config or supabase/scripts/sync/dumps)
#   $3 - Table list for incremental (comma-separated, e.g., "profiles,expenses")
#   $4 - Compression enabled: "true" or "false" (optional, defaults to config)
#
# Returns:
#   0 on success, 1 on failure
#
# Output:
#   Creates timestamped data dump file: data-YYYYMMDD-HHMMSS.sql[.gz]
#
# Requirements: 1.3, 6.2
# ============================================================================
dump_production_data() {
    local dump_type="${1:-full}"
    local output_dir="${2:-}"
    local table_list="${3:-}"
    local compression="${4:-}"
    local timestamp
    local output_file
    local temp_file
    local auth_users_file
    
    echo "============================================"
    echo " Dumping Production Data (${dump_type})"
    echo "============================================"
    echo ""
    
    # Validate dump type
    if [ "$dump_type" != "full" ] && [ "$dump_type" != "incremental" ]; then
        echo "❌ ERROR: Invalid dump type: ${dump_type}"
        echo "   Valid types: full, incremental"
        return 1
    fi
    
    # Validate incremental dump has table list
    if [ "$dump_type" = "incremental" ] && [ -z "$table_list" ]; then
        echo "❌ ERROR: Incremental dump requires table list"
        echo "   Usage: dump_production_data incremental <output_dir> <table1,table2,...>"
        return 1
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo "❌ ERROR: Supabase CLI not found"
        echo "   Install: brew install supabase/tap/supabase"
        return 1
    fi
    
    # Check if project is linked
    if ! supabase projects list &> /dev/null 2>&1; then
        echo "❌ ERROR: Project is not linked to production"
        echo "   Run: supabase link --project-ref <your-project-ref>"
        return 1
    fi
    
    # Determine output directory
    if [ -z "$output_dir" ]; then
        # Try to read from config
        if [ -f "$CONFIG_FILE" ]; then
            output_dir=$(grep -o '"directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"directory"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        fi
        # Fallback to default
        if [ -z "$output_dir" ]; then
            output_dir="supabase/scripts/sync/dumps"
        fi
    fi
    
    # Determine compression setting
    if [ -z "$compression" ]; then
        # Try to read from config
        if [ -f "$CONFIG_FILE" ]; then
            compression=$(grep -o '"compression"[[:space:]]*:[[:space:]]*\(true\|false\)' "$CONFIG_FILE" | tail -1 | sed 's/.*"compression"[[:space:]]*:[[:space:]]*\(true\|false\).*/\1/')
        fi
        # Fallback to false
        if [ -z "$compression" ]; then
            compression="false"
        fi
    fi
    
    # Create output directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Generate timestamp
    timestamp=$(date +%Y%m%d-%H%M%S)
    
    # Determine file extension based on compression
    local file_ext=".sql"
    if [ "$compression" = "true" ]; then
        file_ext=".sql.gz"
        # Check if gzip is available
        if ! command -v gzip &> /dev/null; then
            echo "⚠️  WARNING: gzip not found, disabling compression"
            compression="false"
            file_ext=".sql"
        fi
    fi
    
    output_file="${output_dir}/data-${dump_type}-${timestamp}${file_ext}"
    temp_file="${output_dir}/data-${dump_type}-${timestamp}.sql.tmp"
    auth_users_file="${output_dir}/auth-users-${timestamp}.sql.tmp"
    
    echo "📥 Dumping data from production..."
    echo "   Type: ${dump_type}"
    if [ "$dump_type" = "incremental" ]; then
        echo "   Tables: ${table_list}"
    fi
    echo "   Compression: ${compression}"
    echo "   Output: ${output_file}"
    echo ""
    
    # Step 1: Dump auth.users data (for foreign key relationships)
    # Note: This is optional and can be skipped if it causes issues
    echo "📥 Step 1/2: Dumping auth.users data (optional)..."
    local auth_success=false
    local skip_auth="${SKIP_AUTH_USERS:-false}"
    
    if [ "$skip_auth" = "true" ]; then
        echo "⚠️  Skipping auth.users dump (SKIP_AUTH_USERS=true)"
    else
        # Try to dump auth schema data-only with a quick timeout
        # This is optional and we continue without it if it fails
        echo "   Attempting to dump auth.users (this may take a moment)..."
        
        # Use a background process with timeout
        (
            supabase db dump --linked --data-only -s auth > "${auth_users_file}.full" 2>&1
        ) &
        local dump_pid=$!
        
        # Wait up to 15 seconds for the dump
        local wait_time=0
        while kill -0 $dump_pid 2>/dev/null && [ $wait_time -lt 15 ]; do
            sleep 1
            wait_time=$((wait_time + 1))
        done
        
        # If still running, kill it
        if kill -0 $dump_pid 2>/dev/null; then
            kill $dump_pid 2>/dev/null || true
            wait $dump_pid 2>/dev/null || true
            echo "⚠️  Auth dump timed out (continuing without it)"
        else
            # Process completed, check if successful
            wait $dump_pid
            if [ $? -eq 0 ] && [ -f "${auth_users_file}.full" ]; then
                # Extract only auth.users INSERT/COPY statements
                if grep -E "INSERT INTO.*auth\.users|COPY.*auth\.users" "${auth_users_file}.full" > "$auth_users_file" 2>/dev/null; then
                    if [ -s "$auth_users_file" ]; then
                        local auth_size
                        local auth_lines
                        auth_size=$(wc -c < "$auth_users_file" | tr -d ' ')
                        auth_lines=$(wc -l < "$auth_users_file" | tr -d ' ')
                        echo "✅ Auth users data extracted"
                        echo "   Size: $(numfmt --to=iec-i --suffix=B "$auth_size" 2>/dev/null || echo "${auth_size} bytes")"
                        echo "   Lines: ${auth_lines}"
                        auth_success=true
                    fi
                fi
            else
                echo "⚠️  Auth dump failed (continuing without it)"
            fi
        fi
        
        rm -f "${auth_users_file}.full"
    fi
    
    if [ "$auth_success" = false ]; then
        echo "⚠️  WARNING: Could not dump auth.users data"
        echo "   Foreign keys to auth.users may fail if users don't exist locally"
        rm -f "$auth_users_file" "${auth_users_file}.full"
    fi
    echo ""
    
    # Step 2: Dump public schema data
    echo "📥 Step 2/2: Dumping public schema data..."
    
    # Build dump command based on dump type
    local dump_cmd
    
    if [ "$dump_type" = "incremental" ]; then
        # For incremental dumps, we need to use pg_dump directly with table filters
        # Supabase CLI doesn't support table inclusion, only exclusion
        echo "⚠️  WARNING: Incremental dumps with specific tables require pg_dump"
        echo "   Supabase CLI doesn't support table inclusion (-t flag)"
        echo "   Falling back to full dump for now"
        echo ""
        
        # TODO: Implement pg_dump-based incremental dump
        # For now, fall back to full dump
        dump_cmd="supabase db dump --linked --data-only -s public"
    else
        # Full dump
        dump_cmd="supabase db dump --linked --data-only -s public"
    fi
    
    # Execute dump command
    if eval "$dump_cmd" > "$temp_file" 2>&1; then
        # Validate dump file integrity
        if [ ! -s "$temp_file" ]; then
            echo "❌ ERROR: Data dump file is empty"
            rm -f "$temp_file" "$auth_users_file"
            return 1
        fi
        
        # Check for critical errors in dump (look for actual error messages, not SQL strings)
        # Look for lines starting with "ERROR:", "FATAL:", or "pg_dump: error:"
        if grep -E "^(ERROR:|FATAL:|pg_dump: error:)" "$temp_file" > /dev/null 2>&1; then
            echo "❌ ERROR: Data dump contains errors"
            echo "   First few error lines:"
            grep -E "^(ERROR:|FATAL:|pg_dump: error:)" "$temp_file" | head -5 | sed 's/^/   /'
            rm -f "$temp_file" "$auth_users_file"
            return 1
        fi
        
        # Merge auth.users data with public data (auth.users must be imported first)
        local final_temp_file="${temp_file}.final"
        {
            echo "-- Production data dump (${dump_type})"
            echo "-- Generated: $(date)"
            echo "-- Dump type: ${dump_type}"
            if [ "$dump_type" = "incremental" ]; then
                echo "-- Tables: ${table_list}"
            fi
            echo ""
            
            if [ "$auth_success" = true ]; then
                echo "-- Auth users data (import first for foreign key relationships)"
                cat "$auth_users_file"
                echo ""
            fi
            
            echo "-- Public schema data"
            cat "$temp_file"
        } > "$final_temp_file"
        
        # Apply compression if enabled
        if [ "$compression" = "true" ]; then
            echo "🗜️  Compressing dump file..."
            if gzip -c "$final_temp_file" > "$output_file"; then
                echo "✅ Compression successful"
            else
                echo "❌ ERROR: Compression failed"
                rm -f "$temp_file" "$auth_users_file" "$final_temp_file"
                return 1
            fi
        else
            mv "$final_temp_file" "$output_file"
        fi
        
        # Clean up temp files
        rm -f "$temp_file" "$auth_users_file" "$final_temp_file"
        
        # Calculate statistics
        local file_size
        local line_count
        
        file_size=$(wc -c < "$output_file" | tr -d ' ')
        
        if [ "$compression" = "true" ]; then
            # For compressed files, get uncompressed line count
            line_count=$(gzip -cd "$output_file" | wc -l | tr -d ' ')
        else
            line_count=$(wc -l < "$output_file" | tr -d ' ')
        fi
        
        echo "✅ Data dump successful"
        echo ""
        echo "📊 Data Statistics:"
        echo "   File: ${output_file}"
        echo "   Size: $(numfmt --to=iec-i --suffix=B "$file_size" 2>/dev/null || echo "${file_size} bytes")"
        echo "   Lines: ${line_count}"
        if [ "$compression" = "true" ]; then
            echo "   Compressed: Yes"
        fi
        echo ""
        
        # Export output file path for use by caller
        export DUMPER_DATA_FILE="$output_file"
        
        return 0
    else
        echo "❌ ERROR: Data dump failed"
        echo ""
        echo "Common issues:"
        echo "  - Project not linked (run: supabase link)"
        echo "  - Network connectivity"
        echo "  - Insufficient permissions"
        if [ "$dump_type" = "incremental" ]; then
            echo "  - Invalid table names in list"
        fi
        rm -f "$temp_file" "$auth_users_file"
        return 1
    fi
}

# ============================================================================
# Export functions for use in other scripts
# ============================================================================
export -f dump_production_schema
export -f dump_production_data
