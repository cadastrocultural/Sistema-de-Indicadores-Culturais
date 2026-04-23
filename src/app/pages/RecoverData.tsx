import React, { useEffect, useState } from 'react';

export function RecoverData() {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    // Tenta recuperar dados do localStorage
    const savedData = localStorage.getItem('editais_imported_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setData(parsed);
        console.log('✅ DADOS RECUPERADOS DO LOCALSTORAGE:', parsed);
      } catch (err) {
        console.error('Erro ao parsear:', err);
      }
    }
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Recuperação de Dados</h1>
      {data ? (
        <div>
          <h2>✅ Dados encontrados!</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <button onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data));
            alert('Dados copiados para clipboard!');
          }}>
            Copiar Dados
          </button>
        </div>
      ) : (
        <p>❌ Nenhum dado encontrado no localStorage</p>
      )}
    </div>
  );
}
