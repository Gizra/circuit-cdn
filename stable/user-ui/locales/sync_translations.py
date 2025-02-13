import json
import os
from typing import Dict, Any

def load_json_file(file_path: str) -> Dict[Any, Any]:
    """Load and parse a JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json_file(file_path: str, data: Dict[Any, Any]) -> None:
    """
    Save data to a JSON file while preserving original formatting where possible.
    Only changed or new lines will have new formatting.
    """
    # First load the original file to analyze its formatting
    original_text = ""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_text = f.read()
    except:
        pass

    # Detect indentation from original file
    indent_size = 2  # default
    for line in original_text.split('\n'):
        if line.startswith('  "'):  # Look for first indented line
            indent_size = len(line) - len(line.lstrip())
            break

    # Save with detected or default formatting
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=indent_size)

def process_nested_dict(en_dict: Dict[Any, Any], target_dict: Dict[Any, Any], path: str = "") -> tuple[Dict[Any, Any], bool]:
    """
    Recursively process nested dictionaries and add missing keys with translation markers.
    Returns (result, was_modified) tuple.
    """
    result = target_dict.copy()
    was_modified = False
    
    for key, value in en_dict.items():
        current_path = f"{path}.{key}" if path else key
        
        if isinstance(value, dict):
            if key not in result:
                result[key] = {}
                print(f"Added missing object: {current_path}")
                was_modified = True
            elif not isinstance(result[key], dict):
                result[key] = {}
                print(f"Converted to object: {current_path}")
                was_modified = True
            
            sub_result, sub_modified = process_nested_dict(value, result[key], current_path)
            result[key] = sub_result
            was_modified = was_modified or sub_modified
        else:
            if key not in result:
                result[key] = f"[NEEDS_TRANSLATION]{value}"
                print(f"Added missing key: {current_path}")
                was_modified = True
    
    return result, was_modified

def sync_translation_files(en_file_path: str, lang_files: list[str]) -> None:
    """
    Synchronize all translation files with the English reference file.
    """
    try:
        print(f"\nLoading English reference file: {en_file_path}")
        en_data = load_json_file(en_file_path)
        
        for lang_file in lang_files:
            try:
                print(f"\n=== Processing {lang_file} ===")
                
                # Load the target translation file
                target_data = load_json_file(lang_file)
                
                # Process the file and check if it was modified
                print("Checking for missing translations...")
                updated_data, was_modified = process_nested_dict(en_data, target_data)
                
                if was_modified:
                    # Only save if changes were made
                    print(f"Saving updates to: {lang_file}")
                    save_json_file(lang_file, updated_data)
                    print(f"✓ Successfully updated {lang_file}")
                else:
                    print(f"✓ No changes needed for {lang_file}")
                
            except json.JSONDecodeError as e:
                print(f"Error parsing {lang_file}: {str(e)}")
            except Exception as e:
                print(f"Error processing {lang_file}: {str(e)}")
        
    except json.JSONDecodeError as e:
        print(f"Error parsing English reference file: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    json_files = [f for f in os.listdir(current_dir) if f.endswith('.json')]
    
    if 'en.json' not in json_files:
        print("Error: Could not find en.json reference file")
        exit(1)
    
    # Remove en.json from the list of files to process
    json_files.remove('en.json')
    
    if not json_files:
        print("No language files found to process")
        exit(0)
        
    print(f"Found {len(json_files)} language files to process:")
    for f in json_files:
        print(f"- {f}")
        
    # Process all language files
    en_file = os.path.join(current_dir, 'en.json')
    lang_files = [os.path.join(current_dir, f) for f in json_files]
    
    sync_translation_files(en_file, lang_files)
    print("\nTranslation sync complete!")