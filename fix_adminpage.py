#!/usr/bin/env python3
"""
Script para corrigir o arquivo AdminPage.tsx corrompido
Remove linhas 975-1520 que contêm código órfão
"""

import sys

def fix_admin_page():
    file_path = '/src/app/pages/AdminPage.tsx'
    
    print(f"🔧 Lendo {file_path}...")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        print(f"📄 Arquivo tem {len(lines)} linhas")
        
        # Linhas para deletar: 975-1520 (índice 974-1519)
        # Mas precisamos inserir o JSX correto no lugar
        
        corrected_lines = lines[:974]  # Mantém até linha 974 (return ()
        
        # Adiciona o JSX correto
        corrected_lines.append('    <div className="min-h-screen bg-[#fdfcff] py-12 pb-32">\n')
        
        # Pula as linhas órfãs (975-1520) e continua do resto
        corrected_lines.extend(lines[1523:])  # Continua da linha 1523 em diante
        
        print(f"✂️  Removendo linhas 975-1520 (código órfão)")
        print(f"✅ Arquivo corrigido terá {len(corrected_lines)} linhas")
        
        # Salva o arquivo corrigido
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(corrected_lines)
        
        print(f"💾 Arquivo salvo com sucesso!")
        print(f"🎉 Correção concluída!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)

if __name__ == '__main__':
    fix_admin_page()
