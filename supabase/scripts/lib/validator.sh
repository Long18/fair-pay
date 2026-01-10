#!/bin/bash
# ============================================================================
# Configuration Validator Library
# ============================================================================
# Purpose: Validate configuration schema and values
# Functions:
#   - validate_config(): Validate entire configuration
#   - validate_table_name(): Validate a single table name
#   - validate_anonymization_strategy(): Validate anonymization strategy
# ============================================================================

# ============================================================================
# Function: validate_table_name
# ============================================================================
# Validates a table name to prevent SQL injection and ensure valid identifiers
#
# Arguments:
#   $1 - Table name to validate
#
# Returns:
#   0 if valid, 1 if invalid
#
# Requirements: 3.9
# ============================================================================
validate_table_name() {
    local table_name="$1"
    
    # Check if empty
    if [ -z "$table_name" ]; then
        echo "❌ ERROR: Table name cannot be empty"
        return 1
    fi
    
    # Allow wildcard
    if [ "$table_name" = "*" ]; then
        return 0
    fi
    
    # Check for valid PostgreSQL identifier
    # Must start with letter or underscore
    # Can contain letters, numbers, underscores, and dots (for schema.table)
    # Max length 63 characters per identifier
    if ! [[ "$table_name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$ ]]; then
        echo "❌ ERROR: Invalid table name: ${table_name}"
        echo "   Table names must:"
        echo "   - Start with a letter or underscore"
        echo "   - Contain only letters, numbers, and underscores"
        echo "   - Optionally include schema prefix (e.g., public.users)"
        return 1
    fi
    
    # Check length (PostgreSQL limit is 63 characters per identifier)
    local name_part="${table_name##*.}"
    if [ ${#name_part} -gt 63 ]; then
        echo "❌ ERROR: Table name too long: ${table_name}"
        echo "   Maximum length is 63 characters"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Function: validate_anonymization_strategy
# ============================================================================
# Validates an anonymization strategy
#
# Arguments:
#   $1 - Strategy name to validate
#
# Returns:
#   0 if valid, 1 if invalid
#
# Requirements: 3.9
# ============================================================================
validate_anonymization_strategy() {
    local strategy="$1"
    
    # Valid strategies
    local valid_strategies=("fake-email" "fake-name" "fake-phone" "hash" "null")
    
    # Check if strategy is in valid list
    for valid in "${valid_strategies[@]}"; do
        if [ "$strategy" = "$valid" ]; then
            return 0
        fi
    done
    
    echo "❌ ERROR: Invalid anonymization strategy: ${strategy}"
    echo "   Valid strategies: ${valid_strategies[*]}"
    return 1
}

# ============================================================================
# Function: validate_boolean
# ============================================================================
# Validates a boolean value
#
# Arguments:
#   $1 - Value to validate
#   $2 - Field name (for error messages)
#
# Returns:
#   0 if valid, 1 if invalid
#
# Requirements: 3.9
# ============================================================================
validate_boolean() {
    local value="$1"
    local field_name="$2"
    
    if [ "$value" != "true" ] && [ "$value" != "false" ]; then
        echo "❌ ERROR: Invalid boolean value for ${field_name}: ${value}"
        echo "   Must be 'true' or 'false'"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Function: validate_number
# ============================================================================
# Validates a numeric value
#
# Arguments:
#   $1 - Value to validate
#   $2 - Field name (for error messages)
#   $3 - Minimum value (optional)
#   $4 - Maximum value (optional)
#
# Returns:
#   0 if valid, 1 if invalid
#
# Requirements: 3.9
# ============================================================================
validate_number() {
    local value="$1"
    local field_name="$2"
    local min="${3:-}"
    local max="${4:-}"
    
    # Check if numeric
    if ! [[ "$value" =~ ^[0-9]+$ ]]; then
        echo "❌ ERROR: Invalid numeric value for ${field_name}: ${value}"
        echo "   Must be a positive integer"
        return 1
    fi
    
    # Check minimum
    if [ -n "$min" ] && [ "$value" -lt "$min" ]; then
        echo "❌ ERROR: Value for ${field_name} is too small: ${value}"
        echo "   Minimum value is ${min}"
        return 1
    fi
    
    # Check maximum
    if [ -n "$max" ] && [ "$value" -gt "$max" ]; then
        echo "❌ ERROR: Value for ${field_name} is too large: ${value}"
        echo "   Maximum value is ${max}"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Function: validate_config
# ============================================================================
# Validates the entire configuration
# Assumes configuration has been loaded via load_config()
#
# Arguments:
#   None (uses CONFIG_* environment variables)
#
# Returns:
#   0 if valid, 1 if invalid
#
# Requirements: 3.9, 3.10
# ============================================================================
validate_config() {
    local errors=0
    
    echo "============================================"
    echo " Validating Configuration"
    echo "============================================"
    echo ""
    
    # Check if configuration is loaded
    if [ -z "${CONFIG_VERSION:-}" ]; then
        echo "❌ ERROR: Configuration not loaded"
        echo "   Run load_config() first"
        return 1
    fi
    
    echo "📋 Validating configuration values..."
    echo ""
    
    # Validate production configuration
    echo "Validating production configuration..."
    
    if [ -z "${CONFIG_PROD_PROJECT_REF:-}" ]; then
        echo "❌ ERROR: Production project reference is required"
        echo "   Set SUPABASE_PROD_PROJECT_REF in .env.local"
        ((errors++))
    fi
    
    if ! validate_boolean "${CONFIG_PROD_VERIFY_BEFORE_SYNC:-true}" "production.verifyBeforeSync"; then
        ((errors++))
    fi
    
    echo ""
    
    # Validate local configuration
    echo "Validating local configuration..."
    
    if [ -z "${CONFIG_LOCAL_DATABASE_URL:-}" ]; then
        echo "❌ ERROR: Local database URL is required"
        echo "   Set SUPABASE_LOCAL_DATABASE_URL in .env.local"
        ((errors++))
    fi
    
    if [ -z "${CONFIG_LOCAL_DOCKER_CONTAINER:-}" ]; then
        echo "❌ ERROR: Local Docker container name is required"
        echo "   Set SUPABASE_LOCAL_DOCKER_CONTAINER in .env.local"
        ((errors++))
    fi
    
    echo ""
    
    # Validate sync configuration
    echo "Validating sync configuration..."
    
    # Validate include tables
    if [ -n "${CONFIG_SYNC_INCLUDE_TABLES:-}" ]; then
        IFS=',' read -ra tables <<< "$CONFIG_SYNC_INCLUDE_TABLES"
        for table in "${tables[@]}"; do
            # Trim whitespace
            table=$(echo "$table" | xargs)
            if ! validate_table_name "$table"; then
                ((errors++))
            fi
        done
    fi
    
    # Validate exclude tables
    if [ -n "${CONFIG_SYNC_EXCLUDE_TABLES:-}" ]; then
        IFS=',' read -ra tables <<< "$CONFIG_SYNC_EXCLUDE_TABLES"
        for table in "${tables[@]}"; do
            # Trim whitespace
            table=$(echo "$table" | xargs)
            if [ -n "$table" ] && ! validate_table_name "$table"; then
                ((errors++))
            fi
        done
    fi
    
    if ! validate_boolean "${CONFIG_SYNC_INCLUDE_AUTH_USERS:-true}" "sync.includeAuthUsers"; then
        ((errors++))
    fi
    
    if ! validate_boolean "${CONFIG_SYNC_INCLUDE_STORAGE:-false}" "sync.includeStorage"; then
        ((errors++))
    fi
    
    if ! validate_boolean "${CONFIG_SYNC_ANONYMIZE:-false}" "sync.anonymize"; then
        ((errors++))
    fi
    
    echo ""
    
    # Validate anonymization configuration
    echo "Validating anonymization configuration..."
    
    if ! validate_boolean "${CONFIG_ANONYMIZATION_ENABLED:-false}" "anonymization.enabled"; then
        ((errors++))
    fi
    
    # Validate anonymization rules (if jq is available)
    if command -v jq &> /dev/null && [ -n "${CONFIG_ANONYMIZATION_RULES:-}" ]; then
        local rule_count
        rule_count=$(echo "$CONFIG_ANONYMIZATION_RULES" | jq 'length' 2>/dev/null || echo 0)
        
        if [ "$rule_count" -gt 0 ]; then
            echo "   Found ${rule_count} anonymization rule(s)"
            
            # Validate each rule
            for ((i=0; i<rule_count; i++)); do
                local table
                local column
                local strategy
                
                table=$(echo "$CONFIG_ANONYMIZATION_RULES" | jq -r ".[$i].table // empty" 2>/dev/null)
                column=$(echo "$CONFIG_ANONYMIZATION_RULES" | jq -r ".[$i].column // empty" 2>/dev/null)
                strategy=$(echo "$CONFIG_ANONYMIZATION_RULES" | jq -r ".[$i].strategy // empty" 2>/dev/null)
                
                if [ -z "$table" ]; then
                    echo "❌ ERROR: Anonymization rule $((i+1)) missing 'table' field"
                    ((errors++))
                fi
                
                if [ -z "$column" ]; then
                    echo "❌ ERROR: Anonymization rule $((i+1)) missing 'column' field"
                    ((errors++))
                fi
                
                if [ -z "$strategy" ]; then
                    echo "❌ ERROR: Anonymization rule $((i+1)) missing 'strategy' field"
                    ((errors++))
                else
                    if ! validate_anonymization_strategy "$strategy"; then
                        echo "   In anonymization rule $((i+1))"
                        ((errors++))
                    fi
                fi
                
                if [ -n "$table" ] && ! validate_table_name "$table"; then
                    echo "   In anonymization rule $((i+1))"
                    ((errors++))
                fi
            done
        fi
    fi
    
    echo ""
    
    # Validate backup configuration
    echo "Validating backup configuration..."
    
    if ! validate_boolean "${CONFIG_BACKUP_ENABLED:-true}" "backup.enabled"; then
        ((errors++))
    fi
    
    if ! validate_number "${CONFIG_BACKUP_RETENTION_DAYS:-7}" "backup.retentionDays" 1 365; then
        ((errors++))
    fi
    
    if ! validate_number "${CONFIG_BACKUP_MAX_BACKUPS:-5}" "backup.maxBackups" 1 100; then
        ((errors++))
    fi
    
    if ! validate_boolean "${CONFIG_BACKUP_COMPRESSION:-false}" "backup.compression"; then
        ((errors++))
    fi
    
    echo ""
    
    # Validate output configuration
    echo "Validating output configuration..."
    
    if [ -z "${CONFIG_OUTPUT_DIRECTORY:-}" ]; then
        echo "❌ ERROR: Output directory is required"
        ((errors++))
    fi
    
    if ! validate_boolean "${CONFIG_OUTPUT_COMPRESSION:-false}" "output.compression"; then
        ((errors++))
    fi
    
    echo ""
    
    # Summary
    if [ $errors -eq 0 ]; then
        echo "✅ Configuration validation passed"
        echo ""
        return 0
    else
        echo "❌ Configuration validation failed with ${errors} error(s)"
        echo ""
        return 1
    fi
}

# ============================================================================
# Export functions for use in other scripts
# ============================================================================
export -f validate_config
export -f validate_table_name
export -f validate_anonymization_strategy
export -f validate_boolean
export -f validate_number
