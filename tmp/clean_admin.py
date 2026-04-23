#!/usr/bin/env python3
# Script para remover código duplicado do AdminPage.tsx

with open('/tmp/sandbox/src/app/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Mantém linhas 1-46 (imports e início) e 565-fim (código principal)
cleaned_lines = lines[0:46] + ['\n'] + lines[564:]

with open('/tmp/sandbox/src/app/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print(f"Arquivo limpo! Total de linhas: {len(cleaned_lines)}")
print(f"Linhas removidas: {len(lines) - len(cleaned_lines)}")
