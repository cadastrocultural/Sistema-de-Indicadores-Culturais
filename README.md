# 🎭 Cadastro Cultural de Ilhabela - PNAB 2024-2029

Sistema de transparência e visualização de dados culturais com foco nos editais PNAB, Lei Paulo Gustavo, Lei Aldir Blanc e PEC Local de Ilhabela/SP.

---

## ✨ Funcionalidades Principais

### 📊 **Dashboard Interativo**
- Visualização de todos os projetos contemplados
- Filtros por categoria, bairro e edital
- Mapas georreferenciados das ações culturais
- Rankings de proponentes

### 📈 **Gráficos e Estatísticas**
- Evolução anual do investimento cultural (2020-2024)
- Distribuição por área cultural (Música, Audiovisual, Artesanato, etc.)
- Comparativo entre editais
- Dados consolidados em tempo real

### 🔍 **Transparência Total**
- Dados extraídos de fontes oficiais (Diários e Editais)
- Links para documentos públicos
- Informações verificáveis de cada projeto
- Histórico completo de fomento cultural

### ⚙️ **Painel Admin - NOVO!**
- **Importação automática de planilhas Excel**
- Templates prontos para download
- Preview dos dados antes de aplicar
- Atualização em tempo real dos gráficos

---

## 🚀 Como Usar

### Navegação

1. **Home** - Visão geral com estatísticas principais
2. **Painel** - Dashboard completo com filtros e mapas
3. **Conselho** - Informações sobre gestão participativa
4. **Transparência** - Links e documentos oficiais
5. **⚙️ Admin** - Importação de dados reais

---

## 📥 Importando Dados Reais

### Método Recomendado: Upload de Excel

1. Acesse **⚙️ Admin** no menu
2. Escolha o tipo de dado (Editais, Categorias ou Evolução)
3. Clique em **"Baixar Template"**
4. Preencha com seus dados reais no Excel
5. Faça **upload do arquivo**
6. Revise o **preview**
7. Clique em **"Aplicar Dados no Sistema"**

**📖 Guias Detalhados:**
- [GUIA-IMPORTACAO-EXCEL.md](./GUIA-IMPORTACAO-EXCEL.md) - Tutorial completo
- [GUIA-IMPORTACAO-DADOS.md](./GUIA-IMPORTACAO-DADOS.md) - Métodos alternativos

---

## 📂 Estrutura dos Dados

### ✅ Dados Reais Implementados

**PNAB 2024** (13 projetos - R$ 260.000,00)
- ✅ Lista completa de contemplados
- ✅ Valores, categorias e localizações
- ✅ Dados extraídos do edital oficial
- ✅ Georreferenciamento das ações

### ⚠️ Dados de Exemplo (Substituir)

- Lei Paulo Gustavo 2023
- Lei Aldir Blanc 2020
- PEC Local 2021
- Distribuição por categorias
- Evolução anual

---

## 🎨 Identidade Visual

### Paleta PNAB Oficial

| Cor | Uso | Hex |
|-----|-----|-----|
| Verde Principal | Botões, títulos | `#006C5B` |
| Verde Claro | Highlights | `#00A38C` |
| Amarelo/Dourado | Destaques PNAB | `#FFC857` |
| Rosa/Magenta | LPG | `#db2777` |
| Roxo | PEC | `#4f46e5` |

### Design System

- **Framework:** Material Design (MUI)
- **CSS:** Tailwind CSS v4
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Mapas:** Leaflet + React Leaflet

---

## 🛠️ Tecnologias

- **React** 18.3.1
- **TypeScript**
- **Vite** 6.3.5
- **Material-UI** 7.3.5
- **Recharts** 2.15.2
- **XLSX** (SheetJS) - Leitura de Excel
- **Motion** (Framer Motion) - Animações
- **Leaflet** - Mapas interativos

---

## 📊 Estrutura de Arquivos

```
/src
├── /app
│   ├── /components      # Componentes reutilizáveis
│   │   ├── Header.tsx
│   │   ├── Timeline.tsx
│   │   └── ...
│   ├── /data            # Dados dos editais
│   │   ├── pnab-data.ts      # ✅ Dados reais PNAB 2024
│   │   └── editais-data.ts   # ⚠️ Dados exemplo (importar!)
│   ├── /pages           # Páginas principais
│   │   ├── HomePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CouncilPage.tsx
│   │   ├── TransparenciaPage.tsx
│   │   └── AdminPage.tsx     # 🆕 Importação Excel
│   └── App.tsx          # Componente raiz
├── /styles              # CSS e temas
└── /imports             # Assets do Figma

/GUIA-IMPORTACAO-EXCEL.md    # 📖 Tutorial de importação
/GUIA-IMPORTACAO-DADOS.md    # 📖 Métodos alternativos
```

---

## 🎯 Próximos Passos

### Para Você Fazer Agora:

1. **Acesse o painel Admin** (`⚙️ Admin` no menu)
2. **Baixe os templates** de Excel
3. **Preencha com dados reais** dos editais:
   - Lei Paulo Gustavo 2023
   - Lei Aldir Blanc 2020
   - PEC Local 2021
   - Distribuição por categorias
4. **Importe os arquivos** através do painel
5. **Verifique os gráficos** atualizados na Home

### Dados Necessários:

- ✅ **PNAB 2024:** Já implementado
- 📥 **LPG 2023:** Valor total, quantidade, categorias
- 📥 **Aldir Blanc 2020:** Editais 01 e 02, valores e categorias
- 📥 **PEC 2021:** Edital local, valores e distribuição
- 📥 **Evolução anual:** Histórico 2020-2024

---

## 💡 Dicas Importantes

### ✅ Boas Práticas

- Use apenas dados oficiais (Diários Oficiais, editais publicados)
- Mantenha backup das planilhas originais
- Teste a importação com poucos dados primeiro
- Revise sempre o preview antes de aplicar

### ⚠️ Atenção

- Valores devem estar sem formatação (260000, não R$ 260.000)
- Não altere os dados PNAB 2024 (já corretos)
- Limpe cache do navegador se houver problemas
- Templates têm exemplos, substitua pelos dados reais

---

## 🔗 Fontes Oficiais

Conforme informado, os editais estão disponíveis em:
- https://cadastrocultural.com.br/editais/
- Diário Oficial do Município de Ilhabela
- Secretaria de Cultura de Ilhabela

---

## 📞 Suporte

**Precisa de ajuda com a importação?**

**Opção 1:** Use o painel Admin visual  
**Opção 2:** Me envie os arquivos Excel originais  
**Opção 3:** Me forneça os dados em texto e eu formato

**Para ajustar manualmente:**
- Edite `/src/app/data/editais-data.ts` diretamente
- Siga o formato dos dados de exemplo

---

## 📜 Licença e Créditos

**Projeto:** Cadastro Cultural de Ilhabela - PNAB 2024-2029  
**Município:** Ilhabela/SP  
**Órgão:** Secretaria de Cultura de Ilhabela  
**Programa:** Política Nacional Aldir Blanc (PNAB)  
**Período:** 2024-2029

---

## 🎉 Status do Projeto

- ✅ Design System implementado
- ✅ Dados PNAB 2024 completos (13 projetos)
- ✅ Dashboard com mapas e gráficos
- ✅ Sistema de importação Excel funcional
- ✅ Responsivo (mobile-first)
- ⏳ Aguardando dados reais LPG, Aldir Blanc e PEC

**Próxima Etapa:** Importar dados reais dos outros editais através do painel Admin!

---

**Última atualização:** Fevereiro 2026  
**Versão:** 2.0 - Sistema de Importação Automática  
**Desenvolvido com ❤️ para a cultura de Ilhabela**
