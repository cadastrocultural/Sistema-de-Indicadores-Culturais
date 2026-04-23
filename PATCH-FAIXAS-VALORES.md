# 🎯 PATCH: DETECÇÃO AUTOMÁTICA DE FAIXAS E VALORES

## CÓDIGO PARA SUBSTITUIR NA LINHA 497 DO AdminPage.tsx

Substitua o bloco completo de `} else if (dataType === 'projetos') {` até o fechamento `}` antes de `console.log('✅ Dados processados:')` por:

```typescript
      } else if (dataType === 'projetos') {
        processed = data.map((row: any) => {
          // 🎯 DETECÇÃO INTELIGENTE DE FAIXA E VALOR
          let valor = parseFloat(String(row[mapping.valor] || '0').replace(/[^\\d.-]/g, '')) || 0;
          let faixa = row[mapping.faixa] ? String(row[mapping.faixa]).trim() : '';
          let linguagem = row[mapping.linguagem] ? String(row[mapping.linguagem]).trim() : '';
          
          // 🎯 SE VALOR ESTÁ VAZIO MAS TEM FAIXA, PREENCHE AUTOMATICAMENTE
          if (valor === 0 && faixa) {
            const faixaLower = faixa.toLowerCase();
            if (faixaLower.includes('faixa 1') || faixaLower.includes('faixa1')) {
              valor = 120000; // R$ 120.000,00
              console.log(`💰 Faixa 1 detectada → Valor: R$ 120.000,00`);
            } else if (faixaLower.includes('faixa 2') || faixaLower.includes('faixa2')) {
              valor = 50000; // R$ 50.000,00
              console.log(`💰 Faixa 2 detectada → Valor: R$ 50.000,00`);
            } else if (faixaLower.includes('faixa 3') || faixaLower.includes('faixa3')) {
              valor = 30000; // R$ 30.000,00
              console.log(`💰 Faixa 3 detectada → Valor: R$ 30.000,00`);
            }
          }
          
          // 🎯 DETECÇÃO INTELIGENTE DE STATUS DE APROVAÇÃO
          let status = normalizeStatus(row[mapping.status] || '');
          let ehAprovado = false;
          
          // Método 1: Verifica se status contém palavras de aprovação
          const statusLower = status.toLowerCase();
          if (statusLower.includes('aprovado') || 
              statusLower.includes('classificado') || 
              statusLower.includes('selecionado') ||
              statusLower.includes('contemplado')) {
            ehAprovado = true;
          }
          
          // Método 2: Se tem "faixa" preenchida, considera aprovado
          if (faixa && faixa !== '' && faixa !== '-' && faixa !== 'null') {
            ehAprovado = true;
            if (!status) status = 'aprovado';
          }
          
          // Método 3: Se tem "linguagem" preenchida, considera aprovado
          if (linguagem && linguagem !== '' && linguagem !== '-') {
            ehAprovado = true;
            if (!status) status = 'aprovado';
          }
          
          return {
            editalNome: selectedEdital,
            editalAno: editalAno,
            nomeProponente: row[mapping.nomeProponente] || '',
            cpfCnpj: row[mapping.cpfCnpj] || '',
            nomeProjeto: row[mapping.nomeProjeto] || '',
            categoria: row[mapping.categoria] || '',
            linguagem: linguagem,
            faixa: faixa,
            valor: valor,
            status: status || (ehAprovado ? 'aprovado' : ''),
            bairro: row[mapping.bairro] || ''
          };
        });

        // 🎯 VALIDAÇÃO: Calcula totais por faixa
        const faixa1 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 1'));
        const faixa2 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 2'));
        const faixa3 = processed.filter((p: any) => p.faixa && p.faixa.toLowerCase().includes('faixa 3'));
        const totalValor = processed.reduce((sum: number, p: any) => sum + p.valor, 0);
        const totalAprovados = processed.filter((p: any) => {
          const st = (p.status || '').toLowerCase();
          return st.includes('aprovado') || st.includes('classificado') || st.includes('selecionado') || st.includes('contemplado');
        }).length;
        
        console.log('📊 RESUMO DO EDITAL:');
        console.log(`   Faixa 1: ${faixa1.length} projetos × R$ 120.000 = R$ ${(faixa1.length * 120000).toLocaleString('pt-BR')}`);
        console.log(`   Faixa 2: ${faixa2.length} projetos × R$ 50.000 = R$ ${(faixa2.length * 50000).toLocaleString('pt-BR')}`);
        console.log(`   Faixa 3: ${faixa3.length} projetos × R$ 30.000 = R$ ${(faixa3.length * 30000).toLocaleString('pt-BR')}`);
        console.log(`   TOTAL: ${processed.length} projetos (${totalAprovados} aprovados) = R$ ${totalValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

        code = `export const PROJETOS_EDITAIS: ProjetoEdital[] = [\\n${processed.slice(0, 3).map((item: any) => 
          `  { editalNome: '${item.editalNome}', editalAno: ${item.editalAno}, nomeProponente: '${item.nomeProponente}', cpfCnpj: '${item.cpfCnpj}', nomeProjeto: '${item.nomeProjeto}', categoria: '${item.categoria}', linguagem: '${item.linguagem}', faixa: '${item.faixa}', valor: ${item.valor}, status: '${item.status}', bairro: '${item.bairro}' }`
        ).join(',\\n')}\\n  // ... mais ${processed.length - 3} projetos\\n];`;
      }
```

## O QUE ESSE CÓDIGO FAZ:

### 1. **Detecta automaticamente o valor pela faixa:**
- Se a coluna "Faixa" contém "Faixa 1" → Valor = R$ 120.000,00
- Se a coluna "Faixa" contém "Faixa 2" → Valor = R$ 50.000,00
- Se a coluna "Faixa" contém "Faixa 3" → Valor = R$ 30.000,00

### 2. **Marca automaticamente como aprovado se:**
- Coluna "status" contém: aprovado, classificado, selecionado ou contemplado
- Coluna "faixa" está preenchida
- Coluna "linguagem" está preenchida

### 3. **Mostra resumo no console:**
```
📊 RESUMO DO EDITAL:
   Faixa 1: 2 projetos × R$ 120.000 = R$ 240.000
   Faixa 2: 4 projetos × R$ 50.000 = R$ 200.000
   Faixa 3: 18 projetos × R$ 30.000 = R$ 540.000
   TOTAL: 24 projetos (24 aprovados) = R$ 980.000,00
```

### 4. **Salva os campos adicionais:**
- `linguagem` - Qual a linguagem do projeto
- `faixa` - Faixa de valores (Faixa 1, 2 ou 3)

## COMO USAR:

1. **Abra o arquivo** `/src/app/pages/AdminPage.tsx`
2. **Localize a linha 497** que contém `} else if (dataType === 'projetos') {`
3. **Substitua TODO o bloco** até a linha antes de `console.log('✅ Dados processados:')`
4. **Cole o código novo** acima
5. **Salve o arquivo**
6. **Recarregue a aplicação**

## DEPOIS DA ALTERAÇÃO:

1. **Vá em AdminPage → Tab 3**
2. **Delete o edital antigo** (se tiver)
3. **Faça upload da planilha PEC**
4. **Mapeie as colunas**:
   - Nome do Projeto
   - Proponente
   - CPF/CNPJ
   - Categoria
   - **Linguagem** → `Qual a linguagem` ✅
   - **Faixa** → `Faixa` ✅
   - Valor (pode deixar vazio, o sistema preenche automaticamente)
   - Status (pode deixar vazio se tiver faixa/linguagem)
   - Bairro

5. **Confirme a importação**
6. **Verifique o console do navegador** (F12) para ver o resumo:
   - Faixa 1: 2 projetos × R$ 120.000 = R$ 240.000
   - Faixa 2: 4 projetos × R$ 50.000 = R$ 200.000
   - Faixa 3: 18 projetos × R$ 30.000 = R$ 540.000
   - TOTAL: 24 projetos (24 aprovados) = R$ 980.000,00

7. **Verifique no card do edital**:
   - 📝 Inscritos: 24
   - ✅ Aprovados: 24
   - 💰 Valor Total: R$ 980.000,00

## ESTRUTURA DA PLANILHA:

Sua planilha pode ter essas colunas (não precisa de todas):

| Nome do Projeto | Qual a linguagem | Faixa | Valor | status | Bairro |
|-----------------|------------------|-------|-------|--------|--------|
| Projeto A | Arte Indígena | Faixa 1: 02 projetos | *vazio* | *vazio* | Vila |
| Projeto B | Aurora | Faixa 1 | *vazio* | *vazio* | Centro |
| Projeto C | Teatro | Faixa 2: 04 projetos | *vazio* | *vazio* | Perequê |
| Projeto D | Música | Faixa 3 | 30000 | aprovado | Bonete |

**⚠️ IMPORTANTE:**
- Coluna "Valor" pode estar vazia → sistema preenche pela faixa
- Coluna "status" pode estar vazia → sistema marca como "aprovado" se tiver faixa/linguagem
- Coluna "Faixa" deve conter "Faixa 1", "Faixa 2" ou "Faixa 3" (maiúscula/minúscula não importa)

