#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

errors=0
warnings=0

echo -e "${BLUE}🔗 Checking question dependencies and structure...${NC}\n"

# Create temporary files to track IDs and dependencies
temp_dir=$(mktemp -d)
all_ids_file="$temp_dir/all_ids.txt"
dependencies_file="$temp_dir/dependencies.txt"
starters_file="$temp_dir/starters.txt"

# Process all YAML files
for file in questions/curated/*.yaml; do
    if [ ! -f "$file" ]; then
        continue
    fi
    
    filename=$(basename "$file")
    
    # Check if file has valid quiz type
    quiz_type=$(yq eval '.type' "$file")
    if [ "$quiz_type" != "quiz" ]; then
        echo -e "${RED}❌ $filename: Not a valid quiz question (missing type: \"quiz\")${NC}"
        ((errors++))
        continue
    fi
    
    # Extract and validate ID
    id=$(yq eval '.id' "$file")
    if [ "$id" = "null" ] || [ -z "$id" ]; then
        echo -e "${RED}❌ $filename: Missing required 'id' field${NC}"
        ((errors++))
        continue
    fi
    
    # Check ID format (snake_case)
    if ! echo "$id" | grep -qE '^[a-z0-9_]+$'; then
        echo -e "${RED}❌ $filename: Invalid ID format '$id' (use snake_case: lowercase, numbers, underscores only)${NC}"
        ((errors++))
    fi
    
    # Check for duplicate IDs
    if grep -q "^$id$" "$all_ids_file" 2>/dev/null; then
        echo -e "${RED}❌ $filename: Duplicate question ID '$id'${NC}"
        ((errors++))
    else
        echo "$id" >> "$all_ids_file"
    fi
    
    # Check followup_to field
    followup_to=$(yq eval '.followup_to' "$file")
    if [ "$followup_to" != "null" ] && [ -n "$followup_to" ]; then
        echo "$id:$followup_to:$filename" >> "$dependencies_file"
    fi
    
    # Check starter questions
    starter=$(yq eval '.starter' "$file")
    if [ "$starter" = "true" ]; then
        level=$(yq eval '.level' "$file")
        echo "$id:$level:$filename" >> "$starters_file"
    fi
    
    # Check required fields
    title=$(yq eval '.title' "$file")
    if [ "$title" = "null" ] || [ -z "$title" ]; then
        echo -e "${RED}❌ $filename: Missing required 'title' field${NC}"
        ((errors++))
    fi
    
    question=$(yq eval '.question' "$file")
    if [ "$question" = "null" ] || [ -z "$question" ]; then
        echo -e "${RED}❌ $filename: Missing required 'question' field${NC}"
        ((errors++))
    fi
    
    # Check answers array
    answers_length=$(yq eval '.answers | length' "$file")
    if [ "$answers_length" = "null" ] || [ "$answers_length" = "0" ]; then
        echo -e "${RED}❌ $filename: Missing or empty 'answers' array${NC}"
        ((errors++))
        continue
    fi
    
    # Check each answer
    has_correct=false
    for ((i=0; i<answers_length; i++)); do
        answer_text=$(yq eval ".answers[$i].text" "$file")
        answer_correct=$(yq eval ".answers[$i].correct" "$file")
        answer_message=$(yq eval ".answers[$i].message" "$file")
        
        if [ "$answer_text" = "null" ] || [ -z "$answer_text" ]; then
            echo -e "${RED}❌ $filename: Answer $((i+1)) missing 'text' field${NC}"
            ((errors++))
        fi
        
        if [ "$answer_correct" != "true" ] && [ "$answer_correct" != "false" ]; then
            echo -e "${RED}❌ $filename: Answer $((i+1)) missing or invalid 'correct' field${NC}"
            ((errors++))
        fi
        
        if [ "$answer_message" = "null" ] || [ -z "$answer_message" ]; then
            echo -e "${RED}❌ $filename: Answer $((i+1)) missing 'message' field${NC}"
            ((errors++))
        fi
        
        if [ "$answer_correct" = "true" ]; then
            has_correct=true
        fi
    done
    
    if [ "$has_correct" = "false" ]; then
        echo -e "${RED}❌ $filename: No correct answers found${NC}"
        ((errors++))
    fi
done

# Check followup_to references
if [ -f "$dependencies_file" ]; then
    while IFS=':' read -r child_id parent_id filename; do
        if ! grep -q "^$parent_id$" "$all_ids_file"; then
            echo -e "${RED}❌ $filename: followup_to references non-existent question '$parent_id'${NC}"
            ((errors++))
        else
            echo -e "${BLUE}✓ $filename: Valid dependency chain: $parent_id → $child_id${NC}"
        fi
    done < "$dependencies_file"
fi

# Check starter questions
starter_count=0
if [ -f "$starters_file" ]; then
    while IFS=':' read -r id level filename; do
        ((starter_count++))
        if [ "$level" != "beginner" ]; then
            echo -e "${YELLOW}⚠️  $filename: Starter question '$id' is not beginner level ($level)${NC}"
            ((warnings++))
        fi
    done < "$starters_file"
fi

if [ "$starter_count" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No starter questions found (consider marking 2-3 beginner questions with starter: true)${NC}"
    ((warnings++))
elif [ "$starter_count" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Many starter questions ($starter_count) - consider limiting to 2-3 for better pacing${NC}"
    ((warnings++))
else
    echo -e "${GREEN}✓ Found $starter_count starter questions${NC}"
fi

# Check for circular dependencies (basic check)
if [ -f "$dependencies_file" ]; then
    # Create a simple check for immediate circular references
    while IFS=':' read -r child_id parent_id filename; do
        # Check if parent also has child as followup_to
        if grep -q "^$parent_id:$child_id:" "$dependencies_file" 2>/dev/null; then
            echo -e "${RED}❌ Circular dependency detected: $child_id ↔ $parent_id${NC}"
            ((errors++))
        fi
    done < "$dependencies_file"
fi

# Summary
total_questions=$(wc -l < "$all_ids_file" 2>/dev/null || echo "0")

echo ""
if [ "$errors" -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
else
    echo -e "${GREEN}✅ All dependency checks passed!${NC}"
fi

if [ "$warnings" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS FOUND${NC}"
fi

echo ""
echo "📊 Summary:"
echo "   Questions loaded: $total_questions"
echo "   Errors: $errors"
echo "   Warnings: $warnings"

# Cleanup
rm -rf "$temp_dir"

# Exit with error code if validation failed
if [ "$errors" -gt 0 ]; then
    exit 1
fi