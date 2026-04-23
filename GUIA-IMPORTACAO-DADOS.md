# 📊 Guia de Importação de Dados Reais - Cadastro Cultural Ilhabela

## 🎯 Objetivo
Este guia explica como substituir os dados de exemplo pelos dados **reais** dos editais PEC, LPG, e outros editais culturais de Ilhabela.

---

## ✅ Status Atual dos Dados

| Edital | Status | Detalhes |
|--------|--------|----------|
| **PNAB 2024** | ✅ **DADOS REAIS** | 13 projetos com R$ 20.000 cada (total R$ 260.000) |
| **Lei Paulo Gustavo** | ⚠️ EXEMPLO | Precisa ser atualizado |
| **Lei Aldir Blanc 2020** | ⚠️ EXEMPLO | Precisa ser atualizado |
| **PEC Local 2021** | ⚠️ EXEMPLO | Precisa ser atualizado |

---

## 🔧 Método 1: Usando a Interface Admin (Recomendado)

### Passo a Passo:

1. **Acesse a página Admin**
   - No menu superior, clique em "⚙️ Admin"
   - URL: `http://localhost:5173/#admin` (ou similar)

2. **Prepare seus dados no Excel**
   - Organize em três tabelas separadas:
     - **EDITAIS_STATS**: informações gerais dos editais
     - **CATEGORIAS_GERAL**: distribuição por área cultural
     - **EVOLUCAO_INVESTIMENTO**: evolução ano a ano

3. **Cole os dados**
   - Selecione as células no Excel (com cabeçalho)
   - Copie (Ctrl+C)
   - Cole no campo de texto da página Admin (Ctrl+V)

4. **Gere o código**
   - Clique em "Gerar Código TypeScript"
   - Abra o Console do navegador (F12)
   - Copie o código gerado

5. **Atualize o arquivo**
   - Abra `/src/app/data/editais-data.ts`
   - Substitua os arrays pelos novos dados
   - Salve o arquivo

---

## 📝 Método 2: Forneça os Dados Diretamente (Mais Rápido)

**Me forneça os dados neste formato e eu atualizo para você:**

### Formato Esperado:

```
=== EDITAL PEC 2021 ===
Valor total investido: R$ XXX.XXX,XX
Quantidade de projetos contemplados: XX
Categorias:
- Música: X projetos
- Audiovisual: X projetos
- Artesanato: X projetos
(etc.)

=== LEI PAULO GUSTAVO 2023 ===
Valor total investido: R$ XXX.XXX,XX
Quantidade de projetos contemplados: XX
Categorias:
- Música: X projetos
- (etc.)

=== LEI ALDIR BLANC 2020 ===
Valor total: R$ XXX.XXX,XX
Projetos: XX
Categorias: (lista)

=== EVOLUÇÃO ANUAL (2020-2024) ===
2020: R$ XXX.XXX | XX projetos
2021: R$ XXX.XXX | XX projetos
2022: R$ XXX.XXX | XX projetos
2023: R$ XXX.XXX | XX projetos
2024: R$ 260.000 | 13 projetos (PNAB - já confirmado)
```

---

## 📂 Estrutura dos Arquivos de Dados

### `/src/app/data/editais-data.ts`

Contém três arrays principais:

#### 1. **EDITAIS_STATS** (Informações Gerais)
```typescript
export const EDITAIS_STATS: EditalStats[] = [
  { 
    id: 'pnab', 
    nome: 'PNAB 2024', 
    ano: 2024, 
    valorTotal: 260000, 
    qtdProjetos: 13, 
    cor: '#FFC857' 
  },
  // Adicione outros editais aqui
];
```

#### 2. **CATEGORIAS_GERAL** (Distribuição por Área)
```typescript
export const CATEGORIAS_GERAL: CategoriaStats[] = [
  { nome: 'Audiovisual', qtd: 35, valor: 450000 },
  { nome: 'Música', qtd: 28, valor: 280000 },
  // Continue com outras categorias
];
```

#### 3. **EVOLUCAO_INVESTIMENTO** (Histórico Anual)
```typescript
export const EVOLUCAO_INVESTIMENTO = [
  { ano: 2020, valor: 400000, projetos: 42 },
  { ano: 2021, valor: 150000, projetos: 15 },
  { ano: 2022, valor: 0, projetos: 0 },
  { ano: 2023, valor: 380000, projetos: 25 },
  { ano: 2024, valor: 260000, projetos: 13 },
];
```

---

## 🎨 Códigos de Cores Sugeridos

Use estas cores para manter a identidade visual:

| Edital | Cor Sugerida | Hex |
|--------|--------------|-----|
| PNAB 2024 | Amarelo/Dourado | `#FFC857` |
| Lei Paulo Gustavo | Rosa/Magenta | `#db2777` |
| Lei Aldir Blanc | Verde PNAB | `#00A38C` |
| PEC Local | Roxo | `#4f46e5` |
| Outros editais | Azul/Laranja | `#0ea5e9` / `#f97316` |

---

## ⚡ Atalho Rápido - Template Excel

**Cole este template no Excel e preencha:**

### EDITAIS_STATS
| id | nome | ano | valorTotal | qtdProjetos | cor |
|----|------|-----|------------|-------------|-----|
| pnab | PNAB 2024 | 2024 | 260000 | 13 | #FFC857 |
| lpg | Lei Paulo Gustavo | 2023 | 380000 | 25 | #db2777 |
| lab | Lei Aldir Blanc | 2020 | 400000 | 42 | #00A38C |
| pec | PEC (Local) | 2021 | 150000 | 15 | #4f46e5 |

### CATEGORIAS_GERAL
| nome | qtd | valor |
|------|-----|-------|
| Audiovisual | 35 | 450000 |
| Música | 28 | 280000 |
| Artesanato | 20 | 150000 |

### EVOLUCAO_INVESTIMENTO
| ano | valor | projetos |
|-----|-------|----------|
| 2020 | 400000 | 42 |
| 2021 | 150000 | 15 |
| 2022 | 0 | 0 |
| 2023 | 380000 | 25 |
| 2024 | 260000 | 13 |

---

## 📌 Notas Importantes

1. **Valores em Reais**: Use números inteiros (sem R$, sem pontos, sem vírgulas)
   - Exemplo: R$ 260.000,00 → `260000`

2. **Dados PNAB 2024**: Já estão corretos, não altere!

3. **Fontes Oficiais**: Certifique-se de usar dados dos Diários Oficiais e editais da prefeitura

4. **Transparência**: Todos os dados serão exibidos publicamente no portal

---

## 🆘 Precisa de Ajuda?

**Me envie:**
- ✅ PDFs dos editais oficiais
- ✅ Planilhas Excel com dados consolidados
- ✅ Links para publicações no Diário Oficial
- ✅ Qualquer documento oficial com os números reais

**Eu vou:**
- ✅ Extrair os dados corretamente
- ✅ Atualizar o arquivo `editais-data.ts`
- ✅ Garantir a precisão dos números
- ✅ Manter a integridade dos dados PNAB 2024

---

## 🔗 Fontes de Dados Mencionadas

Conforme informado, os editais estão disponíveis em:
- https://cadastrocultural.com.br/editais/

---

**Última atualização:** Fevereiro 2026
