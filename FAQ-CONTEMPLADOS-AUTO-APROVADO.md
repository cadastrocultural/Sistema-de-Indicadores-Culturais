# ❓ FAQ: Importação de Contemplados (Auto-Aprovado)

**Perguntas e Respostas sobre a correção da importação de contemplados**

---

## 🤔 PERGUNTAS GERAIS

### 1. O que mudou na importação de contemplados?

**Antes:** Planilhas sem coluna Status eram marcadas como "inscrito"  
**Agora:** Na aba "🏆 Contemplados de Editais", planilhas sem coluna Status são automaticamente marcadas como "aprovado"

### 2. Por que essa mudança foi necessária?

O sistema estava mostrando **"86 Contemplados Carregados"** quando na verdade eram apenas **24 contemplados aprovados** do PEC 2024. 

Isso acontecia porque:
- O sistema contava TODOS os projetos (incluindo inscritos não aprovados)
- A função `normalizeStatus` marcava como "inscrito" quando não havia coluna Status

### 3. Isso afeta outras importações?

**NÃO!** A correção é específica para a aba "🏆 Contemplados de Editais". Outras importações continuam funcionando normalmente.

---

## 📋 USO DA ABA CONTEMPLADOS

### 4. Preciso adicionar coluna Status na planilha de contemplados?

**NÃO!** Isso é exatamente o ponto da correção. 

Na aba Contemplados:
- ✅ **NÃO** precisa de coluna Status
- ✅ Todos são marcados como "aprovado" automaticamente
- ✅ Mais simples e rápido para importar

### 5. E se minha planilha já tiver coluna Status?

O sistema vai **IGNORAR** a coluna Status e marcar todos como "aprovado" mesmo assim.

Você verá este aviso no console:
```
⚠️ Planilha de CONTEMPLADOS contém coluna Status, mas será IGNORADA. 
Todos serão marcados como APROVADO automaticamente.
```

### 6. Quais colunas são obrigatórias na planilha de contemplados?

**Mínimo obrigatório:**
- Nome do Contemplado
- CPF/CNPJ
- Categoria
- Valor da Premiação

**Opcional (mas recomendado):**
- Bairro (para geolocalização no mapa)

---

## 🔧 IMPORTAÇÃO E PROCESSAMENTO

### 7. Como sei que a importação foi bem-sucedida?

Você verá:

**1. Alerta Verde:**
```
🏆 Planilha de contemplados processada! 
24 contemplados marcados como "APROVADOS" automaticamente. 
Revise e clique em "Aplicar Dados no Sistema".
```

**2. Console (F12):**
```
🎯 Modo de importação: CONTEMPLADOS (auto-aprovado)
🏆 Importação de CONTEMPLADOS: 24 de 24 marcados como APROVADO
```

**3. Preview:**
- Cards mostram "24 Contemplados" (verde)
- Tabela lista todos os 24 contemplados

### 8. Por que o console mostra "INSCRITOS (depende da coluna Status)"?

Você está importando na aba errada! 

Para importação de contemplados, use **APENAS** a aba:
> **🏆 Contemplados de Editais** (4ª aba)

Outras abas são para:
- Mapeamento Cultural 2020
- Grupos e Coletivos
- Espaços Culturais
- Editais com inscritos (não apenas contemplados)

### 9. Posso importar múltiplos editais de contemplados?

**SIM!** Repita o processo para cada edital:

1. Importar Edital 010/2020 → Aplicar no Sistema
2. Importar Edital 011/2020 → Aplicar no Sistema
3. Importar Edital 013/2020 → Aplicar no Sistema

Os dados serão **adicionados** (não substituídos) e organizados automaticamente por edital.

---

## 🐛 RESOLUÇÃO DE PROBLEMAS

### 10. O sistema ainda mostra "0 Contemplados" após importar

**Possíveis causas:**

#### Causa 1: Planilha tinha coluna Status com valores vazios
**Solução:** Remova completamente a coluna Status da planilha

#### Causa 2: Cache do navegador
**Solução:**
1. Abra console (F12)
2. Digite: `localStorage.clear()`
3. Recarregue (Ctrl+Shift+R)
4. Importe novamente

#### Causa 3: Erro na importação
**Solução:** Verifique o console (F12) para mensagens de erro

### 11. Como verifico quantos contemplados foram realmente salvos?

**No Console (F12):**
```javascript
const data = JSON.parse(localStorage.getItem('editais_imported_data'));
const aprovados = data.projetos?.filter(p => p.status === 'aprovado').length;
console.log('Contemplados aprovados salvos:', aprovados);
```

### 12. Importei na aba errada, como desfazer?

**Opção 1: Limpar apenas projetos**
1. Na aba Contemplados, clique em "Limpar Projetos"
2. Confirme a operação

**Opção 2: Limpar tudo**
```javascript
// No console (F12):
localStorage.clear();
window.location.reload();
```

### 13. Por que o banner mostra "86 Contemplados" ao invés de "24"?

Isso era o **bug antigo** que a correção resolve!

Se você ainda vê isso:
1. Verifique se está na versão corrigida do código
2. Limpe o cache: `localStorage.clear()` e recarregue
3. Importe novamente pela aba Contemplados

---

## 📊 DIFERENÇA ENTRE ABAS

### 14. Qual a diferença entre "Contemplados" e outras abas de projetos?

| Característica | Aba Contemplados | Outras Abas |
|----------------|------------------|-------------|
| **Coluna Status obrigatória?** | ❌ NÃO | ✅ SIM (ou marca como "inscrito") |
| **Status padrão sem coluna** | `aprovado` | `inscrito` |
| **Uso típico** | Listas de premiados | Listas de inscritos + resultado |
| **Exemplo** | PEC 2024 - 24 contemplados | PNAB 2024 - 87 inscritos (13 aprovados) |

### 15. Quando devo usar a aba Contemplados?

Use quando você tem **APENAS** a lista dos contemplados/premiados, sem os inscritos não aprovados.

**Exemplos:**
- ✅ Edital 010/2020 - Agentes Culturais (144 contemplados)
- ✅ Programa de Estímulo à Cultura 2024 (24 contemplados)
- ✅ Lei Paulo Gustavo (lista de aprovados)

**NÃO use quando:**
- ❌ Você tem lista de TODOS os inscritos (aprovados + não aprovados)
- ❌ Você quer analisar taxa de aprovação de um edital
- ❌ Precisa diferenciar aprovados, suplentes e não aprovados

---

## 🎯 ANÁLISE DE DADOS

### 16. Como o sistema diferencia demanda de oferta?

**Demanda (quem tentou participar):**
- Campo `qtdTotalInscritos` no edital
- Exemplo: PEC 2024 teve 87 inscrições

**Oferta (quem foi contemplado):**
- Projetos com `status === 'aprovado'`
- Exemplo: PEC 2024 aprovou 24 contemplados

**Taxa de aprovação:**
```
24 aprovados / 87 inscritos = 27,6%
```

### 17. O que é "qtdTotalInscritos"?

É o **número total de pessoas/projetos que se inscreveram** no edital, independente de serem aprovados ou não.

**Exemplo PEC 2024:**
- `qtdTotalInscritos: 87` → 87 pessoas se inscreveram
- `qtdAprovados: 24` → 24 foram aprovadas
- `qtdInscritos: 24` → 24 estão na lista importada (os contemplados)

### 18. Por que "qtdInscritos" é diferente de "qtdTotalInscritos"?

- **qtdInscritos:** Quantidade de projetos **na lista importada** (ex: 24 contemplados)
- **qtdTotalInscritos:** Total de **TODAS as inscrições** do edital (ex: 87 inscrições)

Isso permite analisar:
```
Demanda (87) vs Oferta (24) = Precisamos de mais recursos!
```

---

## 🔍 VALIDAÇÃO E TESTES

### 19. Como testar se a correção está funcionando?

**Teste Simples:**
1. Criar Excel com 3 contemplados **SEM coluna Status**
2. Importar na aba "🏆 Contemplados de Editais"
3. Console deve mostrar: `CONTEMPLADOS (auto-aprovado)`
4. Todos devem ter `status: "aprovado"`

**Teste Completo:**
📄 Ver arquivo: `/TESTE-RAPIDO-CONTEMPLADOS.md`

### 20. Onde vejo os logs de debug?

Abra o **Console do Navegador (F12)** e procure por:

```
🔄 Processando com mapeamento: {...}
🎯 Modo de importação: CONTEMPLADOS (auto-aprovado)
📋 Amostra (primeiros 3): [...]
🏆 Importação de CONTEMPLADOS: 24 de 24 marcados como APROVADO
```

---

## 📖 DOCUMENTAÇÃO ADICIONAL

### 21. Onde encontro mais informações?

- **Detalhes Técnicos:** `/PATCH-CONTEMPLADOS-AUTO-APROVADO.md`
- **Guia de Teste:** `/TESTE-RAPIDO-CONTEMPLADOS.md`
- **Resumo Executivo:** `/RESUMO-CORRECAO-CONTEMPLADOS.md`
- **Este FAQ:** `/FAQ-CONTEMPLADOS-AUTO-APROVADO.md`

### 22. Como reportar um problema?

1. Verifique os logs no console (F12)
2. Tire screenshot da tela e do console
3. Anote os passos que fez antes do problema
4. Informe:
   - Quantos contemplados importou
   - Nome do edital
   - Se tinha coluna Status ou não
   - Mensagem de erro (se houver)

---

## 🎉 CONCLUSÃO

A correção torna a importação de contemplados:
- ✅ Mais simples (não precisa coluna Status)
- ✅ Mais rápida (menos colunas na planilha)
- ✅ Mais intuitiva (aba específica para contemplados)
- ✅ Mais precisa (contagem correta)

**Resultado:** Análise confiável de políticas públicas culturais! 🎭🎨🎪

---

**Última atualização:** 2026-02-25  
**Versão:** 1.0.0
