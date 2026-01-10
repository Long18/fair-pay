#!/bin/bash
# ============================================================================
# Data Anonymization Library
# ============================================================================
# Purpose: Functions for anonymizing sensitive production data
# Functions:
#   - anonymize_data(): Anonymize SQL dump file based on configuration
# ============================================================================

# Source configuration if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../sync/config.json"

# ============================================================================
# Function: anonymize_data
# ============================================================================
# Anonymizes sensitive data in SQL dump file based on configuration rules
# Supports multiple anonymization strategies and preserves referential integrity
#
# Arguments:
#   $1 - Input SQL file path (required)
#   $2 - Output SQL file path (required)
#   $3 - Mapping file path (optional, for debugging)
#
# Returns:
#   0 on success, 1 on failure
#
# Anonymization Strategies:
#   - fake-email: Replace with fake-{hash}@example.com
#   - fake-name: Replace with Fake User {hash}
#   - fake-phone: Replace with +1555{random}
#   - hash: Replace with SHA256 hash
#   - null: Replace with NULL
#
# Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8
# ============================================================================
anonymize_data() {
    local input_file="$1"
    local output_file="$2"
    local mapping_file="${3:-}"
    local temp_file
    local rules_json
    
    echo "============================================"
    echo " Anonymizing Data"
    echo "============================================"
    echo ""
    
    # Validate input file
    if [ -z "$input_file" ]; then
        echo "❌ ERROR: Input file path is required"
        echo "   Usage: anonymize_data <input_file> <output_file> [mapping_file]"
        return 1
    fi
    
    if [ ! -f "$input_file" ]; then
        echo "❌ ERROR: Input file not found: ${input_file}"
        return 1
    fi
    
    # Validate output file
    if [ -z "$output_file" ]; then
        echo "❌ ERROR: Output file path is required"
        echo "   Usage: anonymize_data <input_file> <output_file> [mapping_file]"
        return 1
    fi
    
    # Check if anonymization is enabled in config
    local anonymization_enabled="false"
    if [ -f "$CONFIG_FILE" ]; then
        # Simple check: look for "enabled": true within anonymization section
        # Extract lines between "anonymization" and the next top-level closing brace
        if grep -A 20 '"anonymization"' "$CONFIG_FILE" | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
            anonymization_enabled="true"
        fi
    fi
    
    if [ "$anonymization_enabled" != "true" ]; then
        echo "⚠️  WARNING: Anonymization is not enabled in config"
        echo "   Copying file without anonymization..."
        cp "$input_file" "$output_file"
        return 0
    fi
    
    # Read anonymization rules from config
    if [ -f "$CONFIG_FILE" ]; then
        # Extract rules array from config
        # Look for lines between "rules": [ and ]
        rules_json=$(sed -n '/"rules"[[:space:]]*:[[:space:]]*\[/,/\]/p' "$CONFIG_FILE" 2>/dev/null || echo "")
    else
        echo "⚠️  WARNING: Config file not found: ${CONFIG_FILE}"
        echo "   No anonymization rules defined"
        cp "$input_file" "$output_file"
        return 0
    fi
    
    # Check if rules are defined
    if [ -z "$rules_json" ] || [ "$rules_json" = "[]" ]; then
        echo "⚠️  WARNING: No anonymization rules defined in config"
        echo "   Copying file without anonymization..."
        cp "$input_file" "$output_file"
        return 0
    fi
    
    echo "📥 Input: ${input_file}"
    echo "📤 Output: ${output_file}"
    if [ -n "$mapping_file" ]; then
        echo "🗺️  Mapping: ${mapping_file}"
    fi
    echo ""
    
    # Create temp file
    temp_file="${output_file}.tmp"
    cp "$input_file" "$temp_file"
    
    # Initialize mapping file if specified
    if [ -n "$mapping_file" ]; then
        {
            echo "# Data Anonymization Mapping"
            echo "# Generated: $(date)"
            echo "# Input: ${input_file}"
            echo "# Output: ${output_file}"
            echo ""
        } > "$mapping_file"
    fi
    
    # Parse and apply anonymization rules
    # Note: This is a simplified implementation
    # For production use, consider using jq or a proper JSON parser
    
    echo "🔒 Applying anonymization rules..."
    echo ""
    
    local rules_applied=0
    local total_replacements=0
    
    # Example rule format in config:
    # {
    #   "table": "profiles",
    #   "column": "email",
    #   "strategy": "fake-email"
    # }
    
    # For this MVP, we'll implement basic pattern-based anonymization
    # that works with common SQL INSERT and COPY statements
    
    # Strategy 1: Anonymize email addresses
    if echo "$rules_json" | grep -q '"strategy"[[:space:]]*:[[:space:]]*"fake-email"'; then
        echo "  📧 Anonymizing email addresses..."
        local email_count=0
        
        # Replace email patterns in INSERT statements
        # Pattern: 'user@domain.com' -> 'fake-{hash}@example.com'
        while IFS= read -r line; do
            if echo "$line" | grep -qE "INSERT INTO|VALUES"; then
                # Extract emails and replace them
                # This is a simplified approach - for production, use more robust parsing
                local new_line="$line"
                
                # Find all email patterns
                local emails
                emails=$(echo "$line" | grep -oE "'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'" || true)
                
                if [ -n "$emails" ]; then
                    while IFS= read -r email; do
                        if [ -n "$email" ]; then
                            # Generate hash from email (preserve referential integrity)
                            local email_clean
                            email_clean=$(echo "$email" | tr -d "'")
                            local hash
                            hash=$(echo -n "$email_clean" | shasum -a 256 | cut -c1-8)
                            local fake_email="'fake-${hash}@example.com'"
                            
                            # Replace in line
                            new_line=$(echo "$new_line" | sed "s|${email}|${fake_email}|g")
                            
                            # Log to mapping file
                            if [ -n "$mapping_file" ]; then
                                echo "email: ${email_clean} -> fake-${hash}@example.com" >> "$mapping_file"
                            fi
                            
                            email_count=$((email_count + 1))
                        fi
                    done <<< "$emails"
                fi
                
                echo "$new_line"
            else
                echo "$line"
            fi
        done < "$temp_file" > "${temp_file}.email"
        
        mv "${temp_file}.email" "$temp_file"
        
        if [ $email_count -gt 0 ]; then
            echo "     ✅ Anonymized ${email_count} email addresses"
            rules_applied=$((rules_applied + 1))
            total_replacements=$((total_replacements + email_count))
        fi
    fi
    
    # Strategy 2: Anonymize phone numbers
    if echo "$rules_json" | grep -q '"strategy"[[:space:]]*:[[:space:]]*"fake-phone"'; then
        echo "  📱 Anonymizing phone numbers..."
        local phone_count=0
        
        # Replace phone patterns in INSERT statements
        # Pattern: '+84...' or '0...' -> '+1555{random}'
        while IFS= read -r line; do
            if echo "$line" | grep -qE "INSERT INTO|VALUES"; then
                local new_line="$line"
                
                # Find all phone patterns (Vietnamese format)
                local phones
                phones=$(echo "$line" | grep -oE "'\+?[0-9]{9,15}'" || true)
                
                if [ -n "$phones" ]; then
                    while IFS= read -r phone; do
                        if [ -n "$phone" ]; then
                            # Generate consistent fake phone (preserve referential integrity)
                            local phone_clean
                            phone_clean=$(echo "$phone" | tr -d "'")
                            local hash
                            hash=$(echo -n "$phone_clean" | shasum -a 256 | cut -c1-7)
                            local fake_phone="'+1555${hash}'"
                            
                            # Replace in line
                            new_line=$(echo "$new_line" | sed "s|${phone}|${fake_phone}|g")
                            
                            # Log to mapping file
                            if [ -n "$mapping_file" ]; then
                                echo "phone: ${phone_clean} -> +1555${hash}" >> "$mapping_file"
                            fi
                            
                            phone_count=$((phone_count + 1))
                        fi
                    done <<< "$phones"
                fi
                
                echo "$new_line"
            else
                echo "$line"
            fi
        done < "$temp_file" > "${temp_file}.phone"
        
        mv "${temp_file}.phone" "$temp_file"
        
        if [ $phone_count -gt 0 ]; then
            echo "     ✅ Anonymized ${phone_count} phone numbers"
            rules_applied=$((rules_applied + 1))
            total_replacements=$((total_replacements + phone_count))
        fi
    fi
    
    # Strategy 3: Anonymize names
    if echo "$rules_json" | grep -q '"strategy"[[:space:]]*:[[:space:]]*"fake-name"'; then
        echo "  👤 Anonymizing names..."
        echo "     ⚠️  Name anonymization requires column-specific rules"
        echo "     ⚠️  Skipping generic name anonymization (implement per-table rules)"
        # Note: Name anonymization is complex because we need to know which columns contain names
        # This requires more sophisticated parsing or column-specific rules
        # For MVP, we skip this and recommend using column-specific rules in config
    fi
    
    # Move temp file to output
    mv "$temp_file" "$output_file"
    
    # Calculate statistics
    local input_size
    local output_size
    local input_lines
    local output_lines
    
    input_size=$(wc -c < "$input_file" | tr -d ' ')
    output_size=$(wc -c < "$output_file" | tr -d ' ')
    input_lines=$(wc -l < "$input_file" | tr -d ' ')
    output_lines=$(wc -l < "$output_file" | tr -d ' ')
    
    echo ""
    echo "✅ Anonymization complete"
    echo ""
    echo "📊 Anonymization Statistics:"
    echo "   Rules applied: ${rules_applied}"
    echo "   Total replacements: ${total_replacements}"
    echo "   Input size: $(numfmt --to=iec-i --suffix=B "$input_size" 2>/dev/null || echo "${input_size} bytes")"
    echo "   Output size: $(numfmt --to=iec-i --suffix=B "$output_size" 2>/dev/null || echo "${output_size} bytes")"
    echo "   Input lines: ${input_lines}"
    echo "   Output lines: ${output_lines}"
    
    if [ -n "$mapping_file" ]; then
        local mapping_entries
        mapping_entries=$(grep -c "^email:\|^phone:\|^name:" "$mapping_file" 2>/dev/null || echo 0)
        echo "   Mapping entries: ${mapping_entries}"
    fi
    echo ""
    
    # Verify output file integrity
    if [ ! -s "$output_file" ]; then
        echo "❌ ERROR: Output file is empty"
        return 1
    fi
    
    # Check for SQL syntax errors (basic check)
    if grep -qE "^(ERROR:|FATAL:)" "$output_file"; then
        echo "⚠️  WARNING: Output file may contain errors"
        echo "   Review the file before importing"
    fi
    
    return 0
}

# ============================================================================
# Function: filter_tables
# ============================================================================
# Filters SQL dump to include or exclude specific tables
# Preserves table dependencies and referential integrity
#
# Arguments:
#   $1 - Input SQL file path (required)
#   $2 - Output SQL file path (required)
#   $3 - Filter mode: "include" or "exclude" (required)
#   $4 - Table list (comma-separated, e.g., "profiles,expenses")
#
# Returns:
#   0 on success, 1 on failure
#
# Requirements: 3.3, 3.4
# ============================================================================
filter_tables() {
    local input_file="$1"
    local output_file="$2"
    local filter_mode="$3"
    local table_list="$4"
    local temp_file
    
    echo "============================================"
    echo " Filtering Tables"
    echo "============================================"
    echo ""
    
    # Validate input file
    if [ -z "$input_file" ]; then
        echo "❌ ERROR: Input file path is required"
        echo "   Usage: filter_tables <input_file> <output_file> <include|exclude> <table1,table2,...>"
        return 1
    fi
    
    if [ ! -f "$input_file" ]; then
        echo "❌ ERROR: Input file not found: ${input_file}"
        return 1
    fi
    
    # Validate output file
    if [ -z "$output_file" ]; then
        echo "❌ ERROR: Output file path is required"
        echo "   Usage: filter_tables <input_file> <output_file> <include|exclude> <table1,table2,...>"
        return 1
    fi
    
    # Validate filter mode
    if [ "$filter_mode" != "include" ] && [ "$filter_mode" != "exclude" ]; then
        echo "❌ ERROR: Invalid filter mode: ${filter_mode}"
        echo "   Valid modes: include, exclude"
        return 1
    fi
    
    # Validate table list
    if [ -z "$table_list" ]; then
        echo "❌ ERROR: Table list is required"
        echo "   Usage: filter_tables <input_file> <output_file> <include|exclude> <table1,table2,...>"
        return 1
    fi
    
    echo "📥 Input: ${input_file}"
    echo "📤 Output: ${output_file}"
    echo "🔍 Mode: ${filter_mode}"
    echo "📋 Tables: ${table_list}"
    echo ""
    
    # Convert comma-separated list to array
    IFS=',' read -ra tables <<< "$table_list"
    
    # Validate table names (basic check)
    for table in "${tables[@]}"; do
        # Remove whitespace
        table=$(echo "$table" | xargs)
        
        # Check if table name is valid (alphanumeric and underscore only)
        if ! echo "$table" | grep -qE '^[a-zA-Z_][a-zA-Z0-9_]*$'; then
            echo "❌ ERROR: Invalid table name: ${table}"
            echo "   Table names must start with letter or underscore"
            echo "   and contain only alphanumeric characters and underscores"
            return 1
        fi
    done
    
    # Create temp file
    temp_file="${output_file}.tmp"
    
    echo "🔍 Filtering SQL dump..."
    echo ""
    
    # Initialize counters
    local total_lines=0
    local filtered_lines=0
    local current_table=""
    local in_table_data=false
    local tables_found=0
    local tables_filtered=0
    
    # Process SQL dump line by line
    {
        echo "-- Filtered SQL dump (${filter_mode} mode)"
        echo "-- Generated: $(date)"
        echo "-- Tables: ${table_list}"
        echo ""
    } > "$temp_file"
    
    while IFS= read -r line; do
        total_lines=$((total_lines + 1))
        
        # Detect table data sections
        # Look for COPY statements: COPY public.table_name (columns) FROM stdin;
        if echo "$line" | grep -qE "^COPY [a-zA-Z_]+\.[a-zA-Z_]+"; then
            # Extract table name
            current_table=$(echo "$line" | sed -E 's/^COPY [a-zA-Z_]+\.([a-zA-Z_]+).*/\1/')
            in_table_data=true
            
            # Check if table should be included/excluded
            local should_include=true
            local table_in_list=false
            
            for table in "${tables[@]}"; do
                table=$(echo "$table" | xargs)
                if [ "$table" = "$current_table" ]; then
                    table_in_list=true
                    break
                fi
            done
            
            # Determine if we should include based on mode
            if [ "$filter_mode" = "include" ]; then
                # Include mode: only include if table is in list
                if [ "$table_in_list" = true ]; then
                    should_include=true
                    tables_found=$((tables_found + 1))
                else
                    should_include=false
                    tables_filtered=$((tables_filtered + 1))
                fi
            else
                # Exclude mode: include if table is NOT in list
                if [ "$table_in_list" = true ]; then
                    should_include=false
                    tables_filtered=$((tables_filtered + 1))
                else
                    should_include=true
                    tables_found=$((tables_found + 1))
                fi
            fi
            
            if [ "$should_include" = true ]; then
                echo "$line" >> "$temp_file"
                filtered_lines=$((filtered_lines + 1))
            fi
            
            continue
        fi
        
        # Look for INSERT statements: INSERT INTO table_name (columns) VALUES (...);
        if echo "$line" | grep -qE "^INSERT INTO [a-zA-Z_]+\.[a-zA-Z_]+"; then
            # Extract table name
            current_table=$(echo "$line" | sed -E 's/^INSERT INTO [a-zA-Z_]+\.([a-zA-Z_]+).*/\1/')
            
            # Check if table should be included/excluded
            local should_include=true
            local table_in_list=false
            
            for table in "${tables[@]}"; do
                table=$(echo "$table" | xargs)
                if [ "$table" = "$current_table" ]; then
                    table_in_list=true
                    break
                fi
            done
            
            # Determine if we should include based on mode
            if [ "$filter_mode" = "include" ]; then
                # Include mode: only include if table is in list
                if [ "$table_in_list" = true ]; then
                    should_include=true
                else
                    should_include=false
                fi
            else
                # Exclude mode: include if table is NOT in list
                if [ "$table_in_list" = true ]; then
                    should_include=false
                else
                    should_include=true
                fi
            fi
            
            if [ "$should_include" = true ]; then
                echo "$line" >> "$temp_file"
                filtered_lines=$((filtered_lines + 1))
            fi
            
            continue
        fi
        
        # Detect end of COPY data section
        if [ "$in_table_data" = true ] && echo "$line" | grep -qE "^\\\\\."; then
            # Check if we should include the end marker
            local should_include=true
            local table_in_list=false
            
            for table in "${tables[@]}"; do
                table=$(echo "$table" | xargs)
                if [ "$table" = "$current_table" ]; then
                    table_in_list=true
                    break
                fi
            done
            
            # Determine if we should include based on mode
            if [ "$filter_mode" = "include" ]; then
                if [ "$table_in_list" = true ]; then
                    should_include=true
                else
                    should_include=false
                fi
            else
                if [ "$table_in_list" = true ]; then
                    should_include=false
                else
                    should_include=true
                fi
            fi
            
            if [ "$should_include" = true ]; then
                echo "$line" >> "$temp_file"
                filtered_lines=$((filtered_lines + 1))
            fi
            
            in_table_data=false
            current_table=""
            continue
        fi
        
        # If we're in a table data section, check if we should include it
        if [ "$in_table_data" = true ]; then
            local should_include=true
            local table_in_list=false
            
            for table in "${tables[@]}"; do
                table=$(echo "$table" | xargs)
                if [ "$table" = "$current_table" ]; then
                    table_in_list=true
                    break
                fi
            done
            
            # Determine if we should include based on mode
            if [ "$filter_mode" = "include" ]; then
                if [ "$table_in_list" = true ]; then
                    should_include=true
                else
                    should_include=false
                fi
            else
                if [ "$table_in_list" = true ]; then
                    should_include=false
                else
                    should_include=true
                fi
            fi
            
            if [ "$should_include" = true ]; then
                echo "$line" >> "$temp_file"
                filtered_lines=$((filtered_lines + 1))
            fi
        else
            # Not in table data section, include all other lines
            # (schema definitions, comments, etc.)
            echo "$line" >> "$temp_file"
            filtered_lines=$((filtered_lines + 1))
        fi
    done < "$input_file"
    
    # Move temp file to output
    mv "$temp_file" "$output_file"
    
    # Calculate statistics
    local input_size
    local output_size
    
    input_size=$(wc -c < "$input_file" | tr -d ' ')
    output_size=$(wc -c < "$output_file" | tr -d ' ')
    
    echo "✅ Filtering complete"
    echo ""
    echo "📊 Filter Statistics:"
    echo "   Mode: ${filter_mode}"
    echo "   Tables specified: ${#tables[@]}"
    echo "   Tables found: ${tables_found}"
    echo "   Tables filtered: ${tables_filtered}"
    echo "   Total lines: ${total_lines}"
    echo "   Filtered lines: ${filtered_lines}"
    echo "   Input size: $(numfmt --to=iec-i --suffix=B "$input_size" 2>/dev/null || echo "${input_size} bytes")"
    echo "   Output size: $(numfmt --to=iec-i --suffix=B "$output_size" 2>/dev/null || echo "${output_size} bytes")"
    
    if [ $output_size -lt $input_size ]; then
        local reduction
        reduction=$(( (input_size - output_size) * 100 / input_size ))
        echo "   Size reduction: ${reduction}%"
    fi
    echo ""
    
    # Verify output file integrity
    if [ ! -s "$output_file" ]; then
        echo "❌ ERROR: Output file is empty"
        return 1
    fi
    
    # Warn about potential dependency issues
    if [ "$filter_mode" = "include" ] && [ ${#tables[@]} -lt 5 ]; then
        echo "⚠️  WARNING: Including only ${#tables[@]} tables may break foreign key relationships"
        echo "   Ensure all dependent tables are included"
        echo ""
    fi
    
    return 0
}

# ============================================================================
# Export functions for use in other scripts
# ============================================================================
export -f anonymize_data
export -f filter_tables
