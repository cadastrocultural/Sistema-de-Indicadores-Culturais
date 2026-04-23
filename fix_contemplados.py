#!/usr/bin/env python3
"""
Script para corrigir o AdminPage.tsx - Filtro de Contemplados
Uso: python3 fix_contemplados.py
"""

import re

# Lê o arquivo
with open('/src/app/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Padrão a ser substituído
old_pattern = r'''      // 🎯 LOG ESPECIAL PARA CONTEMPLADOS
      if \(dataType === 'projetos' && isContempladosImport\) \{
        const aprovados = processed\.filter\(\(p: any\) => p\.status === 'aprovado'\)\.length;
        console\.log\(`🏆 Importação de CONTEMPLADOS: \$\{aprovados\} de \$\{processed\.length\} marcados como APROVADO`\);
        if \(processed\.length > 0\) \{
          console\.log\(`   📋 Amostra \(primeiros 3\):`, processed\.slice\(0, 3\)\.map\(\(p: any\) => `\$\{p\.nomeProponente\} → status: "\\"\$\{p\.status\}\\""`\)\);
        \}
      \}'''

# Novo código
new_code = '''      // 🎯 FILTRO ESPECIAL: Se é importação de contemplados, mantém APENAS os aprovados
      if (dataType === 'projetos' && isContempladosImport) {
        const totalImportados = processed.length;
        const aprovados = processed.filter((p: any) => p.status === 'aprovado');
        
        console.log(`🏆 [FILTRO CONTEMPLADOS] ${totalImportados} projetos na planilha → ${aprovados.length} APROVADOS (filtrando os demais)`);
        
        if (aprovados.length === 0) {
          alert(`⚠️ ATENÇÃO: A planilha tem ${totalImportados} projetos, mas NENHUM está com status "Aprovado"!\\n\\nVerifique se a coluna "Status" tem valores como "Aprovado", "Contemplado" ou "Selecionado".`);
          return;
        }
        
        // Substitui os dados processados apenas pelos aprovados
        processed = aprovados;
        
        if (aprovados.length > 0) {
          console.log(`   📋 Amostra dos aprovados (primeiros 3):`, aprovados.slice(0, 3).map((p: any) => `${p.nomeProponente} → status: "${p.status}"`));
        }
      }'''

# Substitui
content = re.sub(old_pattern, new_code, content, flags=re.MULTILINE | re.DOTALL)

# Salva
with open('/src/app/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Correção aplicada com sucesso!")
