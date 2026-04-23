# 🎯 PATCH: Sistema de Inscritos vs Aprovados

## Problema
O sistema atual só mostra os **contemplados** que foram importados na planilha.  
Mas para análise de políticas públicas precisamos saber:
- Quantos tentaram participar (DEMANDA)
- Quantos ganharam (OFERTA)

## Solução
Adicionar campo `qtdTotalInscritos` opcional nos projetos que será capturado automaticamente ao criar os editais.

---

## ETAPA 1: Modificar processamento de projetos (linha ~540)

**Encontre este bloco:**
```typescript
      } else if (dataType === 'projetos') {
        processed = data.map((row: any) => ({
          editalNome: selectedEdital,
          editalAno: editalAno,
          nomeProponente: String(row[mapping.nomeProponente] || ''),
          cpfCnpj: String(row[mapping.cpfCnpj] || ''),
          nomeProjeto: String(row[mapping.nomeProjeto] || ''),
          categoria: String(row[mapping.categoria] || ''),
          valor: parseFloat(String(row[mapping.valor] || '0').replace(/[^\\d.-]/g, '')) || 0,
          status: normalizeStatus(row[mapping.status] || ''),
          bairro: String(row[mapping.bairro] || '')
        }));
```

**Substitua por:**
```typescript
      } else if (dataType === 'projetos') {
        processed = data.map((row: any) => {
          const qtdTotalInscritos = row[mapping.qtdTotalInscritos] ? 
            parseInt(String(row[mapping.qtdTotalInscritos]).replace(/[^\\d]/g, '')) || 0 : 
            0;
          
          return {
            editalNome: selectedEdital,
            editalAno: editalAno,
            nomeProponente: String(row[mapping.nomeProponente] || ''),
            cpfCnpj: String(row[mapping.cpfCnpj] || ''),
            nomeProjeto: String(row[mapping.nomeProjeto] || ''),
            categoria: String(row[mapping.categoria] || ''),
            valor: parseFloat(String(row[mapping.valor] || '0').replace(/[^\\d.-]/g, '')) || 0,
            status: normalizeStatus(row[mapping.status] || ''),
            bairro: String(row[mapping.bairro] || ''),
            qtdTotalInscritos: qtdTotalInscritos
          };
        });
```

---

## ETAPA 2: Capturar qtdTotalInscritos ao criar editais (linha ~735)

**Encontre este bloco:**
```typescript
            projetosPorEdital.set(key, {
              id: `edital-${projeto.editalAno}-${projeto.editalNome.toLowerCase().replace(/\\s+/g, '-')}`,
              nome: projeto.editalNome,
              ano: projeto.editalAno,
              valorTotal: 0,
              qtdInscritos: 0,
              qtdAprovados: 0,
              cor: '#0b57d0',
              projetos: []
            });
```

**Substitua por:**
```typescript
            projetosPorEdital.set(key, {
              id: `edital-${projeto.editalAno}-${projeto.editalNome.toLowerCase().replace(/\\s+/g, '-')}`,
              nome: projeto.editalNome,
              ano: projeto.editalAno,
              valorTotal: 0,
              qtdInscritos: 0,
              qtdAprovados: 0,
              qtdTotalInscritos: projeto.qtdTotalInscritos || 0,
              cor: '#0b57d0',
              projetos: []
            });
```

**Depois do bloco `editalData.qtdInscritos++;` adicione:**
```typescript
          // 🎯 ATUALIZA qtdTotalInscritos se não tinha antes e veio do projeto
          if (!editalData.qtdTotalInscritos && projeto.qtdTotalInscritos) {
            editalData.qtdTotalInscritos = projeto.qtdTotalInscritos;
          }
```

---

## ETAPA 3: Atualizar console.log (linha ~773)

**Encontre:**
```typescript
          console.log(`  → ${ed.nome} (${ed.ano}): ${ed.qtdInscritos} inscritos, ${ed.qtdAprovados} aprovados, R$ ${ed.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);\n        });
```

**Substitua por:**
```typescript
          const demandaInfo = ed.qtdTotalInscritos > 0 ? ` (demanda total: ${ed.qtdTotalInscritos} inscrições)` : '';
          console.log(`  → ${ed.nome} (${ed.ano}): ${ed.qtdInscritos} contemplados, ${ed.qtdAprovados} aprovados, R$ ${ed.valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}${demandaInfo}`);\n        });
```

---

## ETAPA 4: Atualizar visualização do card (linha ~2875)

**Encontre:**
```typescript
                                      <div className="p-3 bg-blue-50 rounded-lg">
                                        <div className="text-xs text-gray-600 font-semibold">📝 Inscritos</div>
                                        <div className="text-xl font-bold text-[#0b57d0]">{edital.qtdInscritos || projetosDoEdital.length}</div>
                                      </div>
```

**Substitua por:**
```typescript
                                      <div className="p-3 bg-blue-50 rounded-lg">
                                        <div className="text-xs text-gray-600 font-semibold">
                                          {edital.qtdTotalInscritos > 0 ? '📝 Demanda Total' : '📝 Contemplados'}
                                        </div>
                                        <div className="text-xl font-bold text-[#0b57d0]">
                                          {edital.qtdTotalInscritos > 0 ? edital.qtdTotalInscritos : (edital.qtdInscritos || projetosDoEdital.length)}
                                        </div>
                                        {edital.qtdTotalInscritos > 0 && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {edital.qtdInscritos} contemplados
                                          </div>
                                        )}
                                      </div>
```

---

## COMO USAR

### Para editais ANTIGOS (já importados):
Não precisa reimportar, o sistema vai continuar funcionando normal mostrando apenas os contemplados.

### Para editais NOVOS (com análise de demanda):
1. Adicione uma coluna **`qtdTotalInscritos`** na planilha Excel
2. Coloque o valor **87** (total de inscritos) em TODAS as linhas
3. Importe normalmente

**Exemplo da planilha do PEC:**
| editalNome | editalAno | nomeProponente | categoria | valor | status | qtdTotalInscritos |
|---|---|---|---|---|---|---|
| Programa de Estímulo à Cultura | 2024 | Associação X | Faixa 1 | 120000 | aprovado | 87 |
| Programa de Estímulo à Cultura | 2024 | Centro Y | Faixa 2 | 50000 | aprovado | 87 |
| Programa de Estímulo à Cultura | 2024 | Pessoa Z | Faixa 3 | 30000 | aprovado | 87 |

---

## RESULTADO ESPERADO

**No card do edital:**
```
📝 Demanda Total: 87
24 contemplados

✅ Aprovados: 24
💰 Valor Total: R$ 980.000,00
```

**No console:**
```
✅ Resumo de editais criado automaticamente: 1 editais
  → Programa de Estímulo à Cultura (2024): 24 contemplados, 24 aprovados, R$ 980.000,00 (demanda total: 87 inscrições)
```

---

## ANÁLISE DE POLÍTICAS PÚBLICAS

Com essas informações o dashboard vai mostrar:
- **Taxa de sucesso**: 24/87 = 27,6% dos inscritos foram contemplados
- **Demanda não atendida**: 63 proponentes tentaram mas não conseguiram
- **Competitividade**: Para cada vaga disponível, cerca de 3,6 pessoas concorreram
- **Gaps de oferta**: Comparação entre demanda vs oferta por categoria/bairro

Isso permite decisões como:
- "Precisamos aumentar o orçamento deste edital porque a demanda é 3x maior"
- "A categoria X tem 80% de demanda não atendida, precisamos criar mais editais para ela"
- "O bairro Y tem muita demanda mas poucos contemplados, precisamos facilitar o acesso"
