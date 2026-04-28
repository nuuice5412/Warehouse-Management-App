import os

base_dir = r"c:\Users\AIZE\Downloads\Warehouse-Management-app-master\warehouse-mockup"
index_path = os.path.join(base_dir, "index.html")
css_dir = os.path.join(base_dir, "css")
js_dir = os.path.join(base_dir, "js")

os.makedirs(css_dir, exist_ok=True)
os.makedirs(js_dir, exist_ok=True)

with open(index_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find <style> and </style>
style_start = -1
style_end = -1
for i, line in enumerate(lines):
    if '<style>' in line:
        style_start = i
    elif '</style>' in line:
        style_end = i
        break

css_content = "".join(lines[style_start+1:style_end])
with open(os.path.join(css_dir, "style.css"), "w", encoding="utf-8") as f:
    f.write(css_content)

# Find <script> containing logic
script_start = -1
script_end = -1
for i in range(style_end, len(lines)):
    if '<script>' in lines[i] and 'const screenConfig' in lines[i+1]:
        script_start = i
    elif '</script>' in lines[i] and script_start != -1:
        script_end = i
        break

# Find split point for data.js and app.js
split_idx = -1
for i in range(script_start+1, script_end):
    if 'const menu = document.getElementById("menu");' in lines[i]:
        split_idx = i
        break

data_content = "".join(lines[script_start+1:split_idx])
app_content = "".join(lines[split_idx:script_end])

with open(os.path.join(js_dir, "data.js"), "w", encoding="utf-8") as f:
    f.write(data_content)

with open(os.path.join(js_dir, "app.js"), "w", encoding="utf-8") as f:
    f.write(app_content)

# Reconstruct index.html
new_html = lines[:style_start]
new_html.append('  <link rel="stylesheet" href="css/style.css">\n')
new_html.extend(lines[style_end+1:script_start])
new_html.append('  <script src="js/data.js" defer></script>\n')
new_html.append('  <script src="js/app.js" defer></script>\n')
new_html.extend(lines[script_end+1:])

with open(index_path, "w", encoding="utf-8") as f:
    f.writelines(new_html)

print("Refactoring complete.")
