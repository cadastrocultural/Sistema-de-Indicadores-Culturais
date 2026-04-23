# 📊 Como Importar Planilhas Excel - Guia Prático

## ✨ Novo Sistema de Importação Automática

Agora você pode importar seus dados diretamente de arquivos Excel (.xlsx ou .xls) através do painel Admin!

---

## 🎯 Acesso Rápido

1. Acesse: **Menu → ⚙️ Admin**
2. Ou digite: `http://localhost:5173` (clique em Admin no menu)

---

## 📋 Passo a Passo Completo

### **1️⃣ Baixe os Templates**

Na página Admin, você encontra 3 tipos de dados para importar:

#### 📊 **EDITAIS** (Informações Gerais dos Editais)
- Baixe o template "template-editais.xlsx"
- Colunas: `id` | `nome` | `ano` | `valorTotal` | `qtdProjetos` | `cor`

#### 🎭 **CATEGORIAS** (Distribuição por Área Cultural)
- Baixe o template "template-categorias.xlsx"
- Colunas: `nome` | `qtd` | `valor`

#### 📈 **EVOLUÇÃO** (Histórico Anual)
- Baixe o template "template-evolucao.xlsx"
- Colunas: `ano` | `valor` | `projetos`

---

### **2️⃣ Preencha os Templates no Excel**

#### Exemplo: EDITAIS

| id   | nome                  | ano  | valorTotal | qtdProjetos | cor      |
|------|-----------------------|------|------------|-------------|----------|
| pnab | PNAB 2024             | 2024 | 260000     | 13          | #FFC857  |
| lpg  | Lei Paulo Gustavo     | 2023 | 380000     | 25          | #db2777  |
| lab  | Lei Aldir Blanc 2020  | 2020 | 400000     | 42          | #00A38C  |
| pec  | PEC Ilhabela          | 2021 | 150000     | 15          | #4f46e5  |

**⚠️ IMPORTANTE:**
- `valorTotal`: Use números inteiros SEM pontos ou vírgulas (ex: 260000 não R$ 260.000,00)
- `cor`: Use código hexadecimal (ex: #FFC857)
- Não deixe células vazias

---

#### Exemplo: CATEGORIAS

| nome            | qtd | valor   |
|-----------------|-----|---------|
| Audiovisual     | 35  | 450000  |
| Música          | 28  | 280000  |
| Artesanato      | 20  | 150000  |
| Cultura Popular | 15  | 120000  |
| Dança           | 10  | 90000   |

---

#### Exemplo: EVOLUÇÃO

| ano  | valor   | projetos |
|------|---------|----------|
| 2020 | 400000  | 42       |
| 2021 | 150000  | 15       |
| 2022 | 0       | 0        |
| 2023 | 380000  | 25       |
| 2024 | 260000  | 13       |

---

### **3️⃣ Importe no Sistema**

1. **Escolha a aba** correspondente (Editais, Categorias ou Evolução)
2. Clique em **"Upload Excel"**
3. Selecione seu arquivo .xlsx
4. **Aguarde o processamento** (alguns segundos)
5. **Revise o preview** dos dados importados

---

### **4️⃣ Aplicar os Dados**

Após revisar o preview:

1. Clique em **"Aplicar Dados no Sistema"**
2. Os dados serão salvos localmente
3. A página será recarregada automaticamente
4. **Pronto!** Os gráficos e estatísticas serão atualizados

---

## 🎨 Códigos de Cores Recomendados

Use estas cores para manter a identidade visual PNAB:

| Edital                | Cor Sugerida     | Código Hex |
|-----------------------|------------------|------------|
| PNAB 2024             | Amarelo/Dourado  | `#FFC857`  |
| Lei Paulo Gustavo     | Rosa/Magenta     | `#db2777`  |
| Lei Aldir Blanc       | Verde Água       | `#00A38C`  |
| PEC Local             | Roxo             | `#4f46e5`  |
| Outros editais        | Azul             | `#0ea5e9`  |
| Cultura Caiçara       | Verde Escuro     | `#006C5B`  |

---

## ✅ Checklist Antes de Importar

- [ ] Baixei o template correto
- [ ] Preenchi todas as colunas obrigatórias
- [ ] Valores numéricos estão sem formatação (sem R$, sem pontos)
- [ ] Não há células vazias
- [ ] As cores estão no formato hexadecimal (#RRGGBB)
- [ ] Salvei o arquivo como .xlsx ou .xls

---

## 🔍 Validação Automática

O sistema vai:
- ✅ Detectar automaticamente as colunas (mesmo com nomes diferentes)
- ✅ Converter valores para o formato correto
- ✅ Remover formatações de moeda
- ✅ Mostrar preview antes de aplicar
- ✅ Validar se há dados suficientes

**Nomes de colunas aceitos:**
- `valor` = valorTotal, valor, ValorTotal
- `projetos` = qtdProjetos, projetos, quantidade
- `categoria` = nome, Nome, categoria, Categoria

---

## 💡 Dicas Importantes

### ✅ Faça Assim:
- Use valores inteiros: `260000`
- Mantenha cabeçalhos na primeira linha
- Uma linha = um registro
- Salve como .xlsx

### ❌ Evite:
- Valores formatados: `R$ 260.000,00`
- Células mescladas
- Fórmulas complexas
- Múltiplas planilhas no mesmo arquivo

---

## 🆘 Solução de Problemas

### "Planilha vazia!"
- Certifique-se de que há dados além do cabeçalho
- A primeira linha deve conter os nomes das colunas
- As linhas seguintes devem conter os dados

### "Erro ao processar arquivo"
- Verifique se o arquivo é .xlsx ou .xls
- Tente abrir e salvar novamente no Excel
- Certifique-se de que não há células corrompidas

### "Valores estranhos no preview"
- Verifique se os números estão sem formatação de moeda
- Use ponto (.) para decimais, não vírgula
- Remova caracteres especiais (R$, %, etc.)

---

## 🎬 Exemplo Prático Completo

### Cenário: Você tem dados da Lei Paulo Gustavo 2023

**Passo 1:** Baixe o template "template-editais.xlsx"

**Passo 2:** No Excel, preencha:
```
id    | nome                     | ano  | valorTotal | qtdProjetos | cor
lpg   | Lei Paulo Gustavo 2023   | 2023 | 520000     | 38          | #db2777
```

**Passo 3:** Salve como "lpg-2023.xlsx"

**Passo 4:** No painel Admin:
- Aba "📊 Editais"
- Clique "Upload Excel"
- Selecione "lpg-2023.xlsx"

**Passo 5:** Revise o preview:
```
✅ Nome: Lei Paulo Gustavo 2023
✅ Valor: R$ 520.000
✅ Projetos: 38
✅ Cor: [rosa/magenta]
```

**Passo 6:** Clique "Aplicar Dados no Sistema"

**Resultado:** Os gráficos da página inicial serão atualizados automaticamente! 🎉

---

## 📊 Dados que Serão Atualizados

Ao importar, você verá mudanças em:

1. **Página Inicial (Home)**
   - Gráfico "Evolução Anual do Investimento"
   - Gráfico "Distribuição por Área Cultural"
   - Cards de estatísticas

2. **Painel (Dashboard)**
   - Dados consolidados
   - Filtros e visualizações

3. **Transparência**
   - Informações detalhadas dos editais

---

## 🔐 Segurança dos Dados

- Os dados ficam salvos **localmente no seu navegador** (localStorage)
- Não são enviados para servidores externos
- Você pode limpar clicando em "Limpar Dados Importados" (se implementado)
- Para resetar: limpe o cache do navegador (Ctrl+Shift+Delete)

---

## 📞 Precisa de Ajuda?

**Opção 1:** Me envie seus arquivos Excel e eu processo para você

**Opção 2:** Me forneça os dados em texto simples:
```
Edital X:
- Valor: R$ XXX.XXX
- Projetos: XX
- Categorias: (lista)
```

**Opção 3:** Compartilhe prints da planilha e eu te ajudo a formatar

---

## ✨ Recursos Extras

### Exportar Dados Atuais
- Em breve: botão para exportar dados atuais para Excel
- Útil para backup ou compartilhamento

### Múltiplas Planilhas
- Você pode importar uma de cada vez
- Os dados são mesclados automaticamente
- PNAB 2024 sempre será preservado

---

**Última atualização:** Fevereiro 2026  
**Versão:** 2.0 - Sistema de Importação Automática
