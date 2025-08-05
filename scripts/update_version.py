# scripts/update_version.py
import os

version_file_path = 'VERSION'

# Initialize VERSION file if it doesn't exist
if not os.path.exists(version_file_path):
    with open(version_file_path, 'w') as f:
        f.write('0.0.0')

# Read current version, increment patch number
with open(version_file_path, 'r') as f:
    version = f.read().strip()

try:
    parts = version.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = '.'.join(parts)
except (ValueError, IndexError):
    print(f"Could not update version '{version}'. Resetting to '0.0.1'.")
    new_version = '0.0.1'

# Write the new version back to the file
with open(version_file_path, 'w') as f:
    f.write(new_version)

print(f"Version updated to {new_version}")
