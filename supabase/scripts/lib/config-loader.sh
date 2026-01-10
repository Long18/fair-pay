#!/bin/bash
# ============================================================================
# Configuration Loader Library
# ============================================================================
# Purpose: Load and parse JSON configuration with environment variable substitution
# Functions:
#   - load_config(): Load config.json and export as environment variables
#   - get_config_value(): Get a specific configuration value
# ============================================================================

# ============================================================================
# Function: load_config
# ============================================================================
# Loads configuration from config.json, substitutes environment variables,
# and exports configuration as environment variables with CONFIG_ prefix
#
# Arguments:
#   $1 - Config file path (optional, defaults to ../sync/config.json)
#
# Returns:
#   0 on success, 1 on failure
#
# Exports:
#   CONFIG_VERSION - Configuration version
#   CONFIG_PROD_PROJECT_REF - Production project reference
#   CONFIG_PROD_VERIFY_BEFORE_SYNC - Verify before sync flag
#   CONFIG_LOCAL_DATABASE_URL - Local database URL
#   CONFIG_LOCAL_DOCKER_CONTAINER - Local Docker container name
#   CONFIG_SYNC_INCLUDE_TABLES - Comma-separated list of tables to include
#   CONFIG_SYNC_EXCLUDE_TABLES - Comma-separated list of tables to exclude
#   CONFIG_SYNC_INCLUDE_AUTH_USERS - Include auth.users flag
#   CONFIG_SYNC_INCLUDE_STORAGE - Include storage flag
#   CONFIG_SYNC_ANONYMIZE - Anonymize data flag
#   CONFIG_ANONYMIZATION_ENABLED - Anonymization enabled flag
#   CONFIG_ANONYMIZATION_RULES - JSON array of anonymization rules
#   CONFIG_BACKUP_ENABLED - Backup enabled flag
#   CONFIG_BACKUP_RETENTION_DAYS - Backup retention days
#   CONFIG_BACKUP_MAX_BACKUPS - Maximum number of backups
#   CONFIG_BACKUP_COMPRESSION - Backup compression flag
#   CONFIG_OUTPUT_DIRECTORY - Output directory path
#   CONFIG_OUTPUT_COMPRESSION - Output compression flag
#
# Requirements: 3.1, 3.2
# ============================================================================
load_config() {
    local config_file="${1:-}"
    
    # Determine config file path
    if [ -z "$config_file" ]; then
        local script_dir
        script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        config_file="${script_dir}/../sync/config.json"
    fi
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        echo "❌ ERROR: Configuration file not found: ${config_file}"
        return 1
    fi
    
    echo "📋 Loading configuration from: ${config_file}"
    
    # Check if jq is available for JSON parsing
    local use_jq=false
    if command -v jq &> /dev/null; then
        use_jq=true
        echo "   Using jq for JSON parsing"
    else
        echo "   Using grep/sed for JSON parsing (jq not found)"
    fi
    
    # Load .env.local for environment variable substitution
    # Look for .env.local in project root (3 levels up from lib/)
    local project_root
    project_root="$(cd "${script_dir}/../../.." && pwd)"
    local env_file="${project_root}/.env.local"
    
    if [ -f "$env_file" ]; then
        echo "   Loading environment variables from: ${env_file}"
        # Export variables from .env.local (skip comments and empty lines)
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            [[ -z "$key" || "$key" =~ ^#.* ]] && continue
            # Remove any trailing carriage return
            value=$(echo "$value" | sed 's/\r$//')
            # Export the variable
            export "$key=$value"
        done < <(grep -v '^#' "$env_file" | grep -v '^$')
    else
        echo "⚠️  WARNING: .env.local not found at ${env_file}, using existing environment variables"
    fi
    
    # Function to substitute environment variables in a value
    substitute_env_vars() {
        local value="$1"
        local original_value="$value"
        
        # Find all ${VAR_NAME} patterns and substitute
        while [[ "$value" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)\} ]]; do
            local var_name="${BASH_REMATCH[1]}"
            local var_value="${!var_name:-}"
            
            # Replace ${VAR_NAME} with actual value
            value="${value//\$\{${var_name}\}/${var_value}}"
        done
        
        echo "$value"
    }
    
    # Function to parse JSON value using jq or grep/sed
    parse_json_value() {
        local json_path="$1"
        local default_value="${2:-}"
        local raw_value
        
        if [ "$use_jq" = true ]; then
            # Use jq for parsing
            raw_value=$(jq -r "$json_path // \"$default_value\"" "$config_file" 2>/dev/null)
        else
            # Use grep/sed for parsing (basic implementation)
            # This is a simplified parser and may not handle all JSON edge cases
            local key
            key=$(echo "$json_path" | sed 's/^\.//; s/\./ /g' | awk '{print $NF}')
            raw_value=$(grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$config_file" | sed "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/" | head -1)
            
            # Handle boolean and numeric values
            if [ -z "$raw_value" ]; then
                raw_value=$(grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\(true\|false\|[0-9]*\)" "$config_file" | sed "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\(true\|false\|[0-9]*\).*/\1/" | head -1)
            fi
            
            # Handle arrays (convert to comma-separated string)
            if [ -z "$raw_value" ]; then
                raw_value=$(grep -A 10 "\"${key}\"[[:space:]]*:[[:space:]]*\[" "$config_file" | grep -o '"[^"]*"' | tr -d '"' | tr '\n' ',' | sed 's/,$//')
            fi
            
            # Use default if still empty
            if [ -z "$raw_value" ]; then
                raw_value="$default_value"
            fi
        fi
        
        # Substitute environment variables
        substitute_env_vars "$raw_value"
    }
    
    # Parse and export configuration values
    echo "   Parsing configuration values..."
    
    # Version
    export CONFIG_VERSION
    CONFIG_VERSION=$(parse_json_value ".version" "1.0.0")
    
    # Production configuration
    export CONFIG_PROD_PROJECT_REF
    CONFIG_PROD_PROJECT_REF=$(parse_json_value ".production.projectRef" "")
    
    export CONFIG_PROD_VERIFY_BEFORE_SYNC
    CONFIG_PROD_VERIFY_BEFORE_SYNC=$(parse_json_value ".production.verifyBeforeSync" "true")
    
    # Local configuration
    export CONFIG_LOCAL_DATABASE_URL
    CONFIG_LOCAL_DATABASE_URL=$(parse_json_value ".local.databaseUrl" "postgresql://postgres:postgres@localhost:54322/postgres")
    
    export CONFIG_LOCAL_DOCKER_CONTAINER
    CONFIG_LOCAL_DOCKER_CONTAINER=$(parse_json_value ".local.dockerContainer" "supabase_db_FairPay")
    
    # Sync configuration
    export CONFIG_SYNC_INCLUDE_TABLES
    if [ "$use_jq" = true ]; then
        # Use jq to properly parse array and convert to comma-separated string
        CONFIG_SYNC_INCLUDE_TABLES=$(jq -r '.sync.includeTables | if type == "array" then join(",") else . end' "$config_file" 2>/dev/null)
    else
        CONFIG_SYNC_INCLUDE_TABLES=$(parse_json_value ".sync.includeTables" "*")
    fi
    
    export CONFIG_SYNC_EXCLUDE_TABLES
    if [ "$use_jq" = true ]; then
        # Use jq to properly parse array and convert to comma-separated string
        CONFIG_SYNC_EXCLUDE_TABLES=$(jq -r '.sync.excludeTables | if type == "array" then join(",") else . end' "$config_file" 2>/dev/null)
    else
        CONFIG_SYNC_EXCLUDE_TABLES=$(parse_json_value ".sync.excludeTables" "")
    fi
    
    export CONFIG_SYNC_INCLUDE_AUTH_USERS
    CONFIG_SYNC_INCLUDE_AUTH_USERS=$(parse_json_value ".sync.includeAuthUsers" "true")
    
    export CONFIG_SYNC_INCLUDE_STORAGE
    CONFIG_SYNC_INCLUDE_STORAGE=$(parse_json_value ".sync.includeStorage" "false")
    
    export CONFIG_SYNC_ANONYMIZE
    CONFIG_SYNC_ANONYMIZE=$(parse_json_value ".sync.anonymize" "false")
    
    # Anonymization configuration
    export CONFIG_ANONYMIZATION_ENABLED
    CONFIG_ANONYMIZATION_ENABLED=$(parse_json_value ".anonymization.enabled" "false")
    
    export CONFIG_ANONYMIZATION_RULES
    if [ "$use_jq" = true ]; then
        CONFIG_ANONYMIZATION_RULES=$(jq -c ".anonymization.rules // []" "$config_file" 2>/dev/null)
    else
        CONFIG_ANONYMIZATION_RULES="[]"
    fi
    
    # Backup configuration
    export CONFIG_BACKUP_ENABLED
    CONFIG_BACKUP_ENABLED=$(parse_json_value ".backup.enabled" "true")
    
    export CONFIG_BACKUP_RETENTION_DAYS
    CONFIG_BACKUP_RETENTION_DAYS=$(parse_json_value ".backup.retentionDays" "7")
    
    export CONFIG_BACKUP_MAX_BACKUPS
    CONFIG_BACKUP_MAX_BACKUPS=$(parse_json_value ".backup.maxBackups" "5")
    
    export CONFIG_BACKUP_COMPRESSION
    CONFIG_BACKUP_COMPRESSION=$(parse_json_value ".backup.compression" "false")
    
    # Output configuration
    export CONFIG_OUTPUT_DIRECTORY
    CONFIG_OUTPUT_DIRECTORY=$(parse_json_value ".output.directory" "supabase/scripts/sync/dumps")
    
    export CONFIG_OUTPUT_COMPRESSION
    CONFIG_OUTPUT_COMPRESSION=$(parse_json_value ".output.compression" "false")
    
    echo "✅ Configuration loaded successfully"
    echo ""
    
    return 0
}

# ============================================================================
# Function: get_config_value
# ============================================================================
# Gets a specific configuration value by key
#
# Arguments:
#   $1 - Configuration key (e.g., "CONFIG_PROD_PROJECT_REF")
#   $2 - Default value (optional)
#
# Returns:
#   Configuration value or default value
#
# Requirements: 3.1
# ============================================================================
get_config_value() {
    local key="$1"
    local default="${2:-}"
    local value="${!key:-$default}"
    
    echo "$value"
}

# ============================================================================
# Function: print_config
# ============================================================================
# Prints all loaded configuration values (for debugging)
#
# Arguments:
#   None
#
# Returns:
#   0 on success
# ============================================================================
print_config() {
    echo "============================================"
    echo " Current Configuration"
    echo "============================================"
    echo ""
    echo "Version: ${CONFIG_VERSION:-not set}"
    echo ""
    echo "Production:"
    echo "  Project Ref: ${CONFIG_PROD_PROJECT_REF:-not set}"
    echo "  Verify Before Sync: ${CONFIG_PROD_VERIFY_BEFORE_SYNC:-not set}"
    echo ""
    echo "Local:"
    echo "  Database URL: ${CONFIG_LOCAL_DATABASE_URL:-not set}"
    echo "  Docker Container: ${CONFIG_LOCAL_DOCKER_CONTAINER:-not set}"
    echo ""
    echo "Sync:"
    echo "  Include Tables: ${CONFIG_SYNC_INCLUDE_TABLES:-not set}"
    echo "  Exclude Tables: ${CONFIG_SYNC_EXCLUDE_TABLES:-not set}"
    echo "  Include Auth Users: ${CONFIG_SYNC_INCLUDE_AUTH_USERS:-not set}"
    echo "  Include Storage: ${CONFIG_SYNC_INCLUDE_STORAGE:-not set}"
    echo "  Anonymize: ${CONFIG_SYNC_ANONYMIZE:-not set}"
    echo ""
    echo "Anonymization:"
    echo "  Enabled: ${CONFIG_ANONYMIZATION_ENABLED:-not set}"
    echo "  Rules: ${CONFIG_ANONYMIZATION_RULES:-not set}"
    echo ""
    echo "Backup:"
    echo "  Enabled: ${CONFIG_BACKUP_ENABLED:-not set}"
    echo "  Retention Days: ${CONFIG_BACKUP_RETENTION_DAYS:-not set}"
    echo "  Max Backups: ${CONFIG_BACKUP_MAX_BACKUPS:-not set}"
    echo "  Compression: ${CONFIG_BACKUP_COMPRESSION:-not set}"
    echo ""
    echo "Output:"
    echo "  Directory: ${CONFIG_OUTPUT_DIRECTORY:-not set}"
    echo "  Compression: ${CONFIG_OUTPUT_COMPRESSION:-not set}"
    echo ""
    
    return 0
}

# ============================================================================
# Export functions for use in other scripts
# ============================================================================
export -f load_config
export -f get_config_value
export -f print_config
