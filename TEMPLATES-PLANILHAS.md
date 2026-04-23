# 📊 Templates de Planilhas - Formato Visual

## Como usar este arquivo:
1. Copie as tabelas abaixo
2. Cole no Excel ou Google Sheets
3. Preencha com seus dados reais
4. Salve como .xlsx
5. Importe no painel Admin

---

## 🗺️ TEMPLATE 0: MAPEAMENTO_2020 (PRIORIDADE MÁXIMA)

### Copie esta tabela para o Excel:

```
nome	categoria	bairro	cpf_cnpj	email	telefone	edital_contemplado	ano
João Silva	Música	Vila	123.456.789-00	joao@email.com	(12) 98888-8888	PNAB 2024	2020
Maria Santos	Artesanato	Perequê	234.567.890-11	maria@email.com	(12) 97777-7777		2020
Coletivo Cultural	Dança	Barra Velha	26.664.171/0001-09	contato@coletivo.com	(12) 96666-6666	Lei Aldir Blanc	2020
```

### 📝 Instruções de Preenchimento:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|---------|
| **nome** | Texto | Nome completo do agente ou organização | `João da Silva`, `Associação Cultural` |
| **categoria** | Texto | Área cultural de atuação | `Música`, `Artesanato`, `Dança` |
| **bairro** | Texto | Bairro de Ilhabela (GPS automático) | `Vila`, `Perequê`, `Barra Velha` |
| **cpf_cnpj** | Texto | CPF ou CNPJ (com ou sem formatação) | `123.456.789-00`, `26.664.171/0001-09` |
| **email** | Texto | E-mail de contato | `contato@email.com` |
| **telefone** | Texto | Telefone/WhatsApp | `(12) 98888-8888` |
| **edital_contemplado** | Texto | Nome do edital (se foi contemplado) | `PNAB 2024`, `Lei Aldir Blanc` (deixe vazio se não foi contemplado) |
| **ano** | Número | Ano do mapeamento | `2020` |

### 💡 Categorias Culturais Aceitas:
- Música
- Artesanato
- Dança
- Teatro / Artes Cênicas
- Audiovisual / Cinema
- Literatura
- Artes Visuais
- Fotografia
- Cultura Caiçara
- Cultura Popular
- Patrimônio Imaterial
- Grupos e Coletivos
- Espaços Culturais
- Gestão Cultural
- Gastronomia Cultural

### 📍 Bairros com GPS Automático:
O sistema detecta automaticamente as coordenadas GPS dos seguintes bairros:
- Vila, Perequê, Barra Velha, Água Branca, Reino
- Itaquanduba, Cocaia, Saco da Capela, Armação
- Bonete, Castelhanos, São Pedro, Feiticeira
- Curral, Veloso, Portinho, Ilhote, Viana, Siriúba

**IMPORTANTE:** Use os nomes EXATOS dos bairros para geolocalização automática!

---

## 📋 TEMPLATE 1: EDITAIS_STATS

### Copie esta tabela para o Excel:

```
id	nome	ano	valorTotal	qtdProjetos	cor
pnab	PNAB 2024	2024	260000	13	#FFC857
lpg	Lei Paulo Gustavo	2023	380000	25	#db2777
lab	Lei Aldir Blanc	2020	400000	42	#00A38C
pec	PEC (Local)	2021	150000	15	#4f46e5
```

### 📝 Instruções de Preenchimento:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|------------|
| **id** | Texto | Identificador único (sem espaços) | `pnab`, `lpg`, `lab` |
| **nome** | Texto | Nome completo do edital | `PNAB 2024` |
| **ano** | Número | Ano do edital | `2024` |
| **valorTotal** | Número | Valor total SEM formatação | `260000` (= R$ 260.000) |
| **qtdProjetos** | Número | Quantidade de projetos contemplados | `13` |
| **cor** | Texto | Código hexadecimal da cor | `#FFC857` |

---

## 🎭 TEMPLATE 2: CATEGORIAS_GERAL

### Copie esta tabela para o Excel:

```
nome	qtd	valor
Audiovisual	35	450000
Música	28	280000
Artesanato	20	150000
Cultura Popular	15	120000
Dança	10	90000
Teatro	8	80000
Literatura	5	50000
```

### 📝 Instruções de Preenchimento:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|------------|
| **nome** | Texto | Nome da categoria/área cultural | `Audiovisual` |
| **qtd** | Número | Quantidade de projetos | `35` |
| **valor** | Número | Valor total investido (sem formatação) | `450000` |

---

## 📈 TEMPLATE 3: EVOLUCAO_INVESTIMENTO

### Copie esta tabela para o Excel:

```
ano	valor	projetos
2020	400000	42
2021	150000	15
2022	0	0
2023	380000	25
2024	260000	13
```

### 📝 Instruções de Preenchimento:

| Coluna | Tipo | Descrição | Exemplo |
|--------|------|-----------|------------|
| **ano** | Número | Ano (4 dígitos) | `2024` |
| **valor** | Número | Valor total investido no ano | `260000` |
| **projetos** | Número | Total de projetos contemplados | `13` |

### 💡 Dica:
Se não houve edital em determinado ano, use `0` para valor e projetos.

---

## ✅ EXEMPLO COMPLETO - MAPEAMENTO CULTURAL 2020

```
nome	categoria	bairro	cpf_cnpj	email	telefone	edital_contemplado	ano
Associação Castelhanos Vive	Cultura Caiçara	Castelhanos	26.664.171/0001-09	castelhanos@cultura.org	(12) 99111-2222	PNAB 2024	2020
Daniela de Aquino	Artesanato	Vila	***.***.**-79	daniela@artesanato.com	(12) 98333-4444		2020
Instituto Tie	Grupos e Coletivos	Água Branca	24.215.447/0001-46	contato@institutotie.org	(12) 97555-6666	Lei Aldir Blanc	2020
Felipe Santos	Música	Itaquanduba	37.524.032/0001-04	felipe.musica@gmail.com	(12) 96777-8888		2020
Jose Roberto Nobre	Música	Perequê	47.682.130/0001-15	joseroberto@musica.com	(12) 95999-0000	PNAB 2024	2020
```

---

## 🎨 CORES DISPONÍVEIS (Paleta Institucional)

Copie o código hexadecimal exato:

```
Cor                    | Código     | Uso Recomendado
-----------------------|------------|---------------------------
Azul Principal         | #0b57d0    | Editais principais/PNAB
Azul Claro             | #4285f4    | Editais secundários
Verde Água             | #00A38C    | Lei Aldir Blanc / Mapeamento
Amarelo/Dourado        | #FFC857    | Destaques / PNAB 2024
Rosa/Magenta           | #db2777    | Lei Paulo Gustavo
Roxo                   | #4f46e5    | PEC Local
Laranja                | #f97316    | Editais especiais
Vermelho               | #ef4444    | Editais emergenciais
```

---

## 🔄 CONVERSÃO DE VALORES

### De R$ para Número Inteiro:

| Valor Formatado | Digite no Excel |
|-----------------|-----------------|
| R$ 260.000,00   | `260000` |
| R$ 1.500,00     | `1500` |
| R$ 20.000,00    | `20000` |
| R$ 380.000,00   | `380000` |
| R$ 5.250,50     | `5250.5` ou `5251` |

**Regra:** Remove R$, remove pontos, troca vírgula por ponto (se houver centavos)

---

## 📥 WORKFLOW COMPLETO

### Passo 1: Prepare os Dados
```
1. Abra Excel ou Google Sheets
2. Copie a tabela template deste arquivo
3. Cole no Excel (Ctrl+V)
4. Preencha com dados reais
```

### Passo 2: Salve o Arquivo
```
1. Arquivo → Salvar Como
2. Escolha formato: "Pasta de Trabalho do Excel (.xlsx)"
3. Nome sugerido: "mapeamento-ilhabela-2020.xlsx" ou "editais-ilhabela-2024.xlsx"
```

### Passo 3: Importe no Sistema
```
1. Acesse o painel Admin (⚙️ Admin)
2. Escolha a aba correspondente (🗺️ Mapeamento 2020 é PRIORITÁRIA)
3. Clique "Upload Planilha Excel"
4. Selecione o arquivo salvo
5. O sistema detecta automaticamente as colunas
6. Clique "Recalcular GPS" se necessário
7. Revise o preview
8. Clique "Aplicar Dados no Sistema"
```

---

## 🆕 DETECÇÃO AUTOMÁTICA INTELIGENTE

O sistema detecta automaticamente variações de nomes de colunas:

### Para Mapeamento 2020:
- **nome**: aceita "nome", "name", "agente", "proponente", "razao_social"
- **categoria**: aceita "categoria", "area", "área", "segmento", "linguagem"
- **bairro**: aceita "bairro", "localidade", "local", "endereco", "regiao"
- **cpf_cnpj**: aceita "cpf", "cnpj", "documento", "cpf_cnpj", "cpf/cnpj"
- **email**: aceita "email", "e-mail", "mail"
- **telefone**: aceita "telefone", "tel", "fone", "celular", "whatsapp"

---

## ⚠️ ERROS COMUNS

### ❌ "Planilha vazia"
**Causa:** Arquivo sem dados ou apenas cabeçalho  
**Solução:** Certifique-se de ter pelo menos 1 linha de dados além do cabeçalho

### ❌ "Valores incorretos no preview"
**Causa:** Valores com formatação (R$, pontos, vírgulas)  
**Solução:** Use apenas números: `260000` não `R$ 260.000,00`

### ❌ "Sem coordenadas GPS"
**Causa:** Nome do bairro não reconhecido  
**Solução:** Use nomes EXATOS da lista de bairros. Depois clique em "Recalcular GPS"

### ❌ "Coluna não encontrada"
**Causa:** Nome do cabeçalho muito diferente  
**Solução:** O sistema aceita variações, mas use nomes próximos aos sugeridos

---

## 💾 BACKUP DOS DADOS

Sempre mantenha uma cópia das planilhas originais:

```
/backup-dados/
  ├── mapeamento-cultural-2020.xlsx      ✅ PRIORITÁRIO
  ├── editais-pnab-2024.xlsx            📥 Importar
  ├── editais-lpg-2023.xlsx             📥 Importar
  ├── editais-aldir-blanc-2020.xlsx     📥 Importar
  ├── categorias-geral.xlsx             📥 Importar
  └── evolucao-2020-2024.xlsx           📥 Importar
```

---

## 🎯 CHECKLIST FINAL

Antes de importar, confirme:

- [ ] Cabeçalhos na primeira linha
- [ ] Valores numéricos sem formatação (R$, pontos)
- [ ] Bairros com nomes EXATOS da lista
- [ ] Cores no formato hexadecimal (#RRGGBB) - apenas para editais
- [ ] CPF/CNPJ com ou sem formatação (ambos funcionam)
- [ ] Arquivo salvo como .xlsx
- [ ] Dados conferidos com fonte oficial
- [ ] Backup da planilha feito

---

## 🚀 ORDEM DE IMPORTAÇÃO RECOMENDADA

1. **PRIMEIRO**: Mapeamento Cultural 2020 (base de todos os agentes)
2. **SEGUNDO**: Editais (PNAB, Aldir Blanc, LPG)
3. **TERCEIRO**: Categorias Gerais
4. **QUARTO**: Evolução de Investimento

---

**Última atualização:** Fevereiro 2026  
**Arquivo:** Templates de Planilhas Excel - Versão 2.0 com Mapeamento Prioritário  
**Formato:** Tab-separated values (copie direto para Excel)