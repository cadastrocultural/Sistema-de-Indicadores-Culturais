// 👤 INFERÊNCIA DE GÊNERO PELO PRIMEIRO NOME BRASILEIRO
// Heurística com ~95% de acerto para nomes comuns do Brasil

const NOMES_FEMININOS = new Set([
  'maria', 'ana', 'adriana', 'aline', 'amanda', 'andrea', 'andreia', 'angelica', 'beatriz', 'bianca',
  'bruna', 'camila', 'carla', 'carolina', 'cecilia', 'celia', 'claudia', 'cristiane', 'cristina',
  'daniela', 'debora', 'diana', 'edilene', 'edna', 'elaine', 'eliana', 'elizabete', 'elizabeth',
  'erica', 'eva', 'fabiana', 'fatima', 'fernanda', 'flavia', 'francisca', 'gabriela', 'helena',
  'ines', 'irene', 'isabela', 'isabel', 'ivone', 'janaina', 'jessica', 'joana', 'josefa', 'julia',
  'juliana', 'jussara', 'karen', 'katia', 'larissa', 'laura', 'leia', 'leticia', 'lidia', 'lilian',
  'liliane', 'lucia', 'luciana', 'luciene', 'luiza', 'lurdes', 'lourdes', 'madalena', 'marcia',
  'marcela', 'margarete', 'margarida', 'mariana', 'marina', 'marlene', 'marta', 'maristela',
  'michele', 'miriam', 'monica', 'nadia', 'natalia', 'neusa', 'noemia', 'patricia', 'paula',
  'priscila', 'rafaela', 'raquel', 'regina', 'renata', 'rita', 'roberta', 'rosa', 'rosana', 'rosangela',
  'rose', 'roselaine', 'roseli', 'rosemeire', 'ruth', 'sabrina', 'sandra', 'sara', 'selma', 'silvana',
  'silvia', 'simone', 'solange', 'sonia', 'sueli', 'suzana', 'tania', 'tatiana', 'teresa', 'tereza',
  'thaisa', 'thais', 'vanessa', 'vera', 'veronica', 'virginia', 'viviane', 'zelia', 'zenaide',
  'alessandra', 'alice', 'aparecida', 'arlete', 'aurora', 'barbara', 'berenice', 'clara', 'daiane',
  'denise', 'edilaine', 'eliete', 'erika', 'eunice', 'geralda', 'gisele', 'gloria', 'graciele',
  'heloisa', 'iara', 'ilda', 'ione', 'ivete', 'jacira', 'jane', 'jaqueline', 'josiane', 'keila',
  'kelly', 'leila', 'leni', 'leonor', 'luci', 'magda', 'maira', 'marilia', 'meire', 'nair',
  'neuza', 'odete', 'paloma', 'pamela', 'regiane', 'rosemary', 'samara', 'sheila', 'socorro',
  'suelene', 'taina', 'valeria', 'vania', 'vilma', 'vitoria', 'yara', 'zilda',
]);

const NOMES_MASCULINOS = new Set([
  'joao', 'jose', 'antonio', 'carlos', 'paulo', 'pedro', 'lucas', 'marcos', 'luis', 'luiz',
  'gabriel', 'rafael', 'daniel', 'marcelo', 'bruno', 'eduardo', 'felipe', 'rodrigo', 'fernando',
  'gustavo', 'andre', 'ricardo', 'francisco', 'thiago', 'tiago', 'diego', 'fabio', 'adriano',
  'alexandre', 'anderson', 'augusto', 'claudio', 'david', 'denis', 'edgar', 'eder', 'edson',
  'elias', 'emanuel', 'emerson', 'enrique', 'ernesto', 'evandro', 'everton', 'flavio', 'gilberto',
  'guilherme', 'henrique', 'hugo', 'igor', 'ivan', 'jorge', 'julio', 'junior', 'leonardo',
  'leandro', 'luciano', 'manoel', 'manuel', 'marcio', 'marco', 'mario', 'mateus', 'matheus',
  'mauricio', 'miguel', 'nelson', 'nilson', 'oscar', 'otavio', 'pablo', 'reginaldo', 'renato',
  'roberto', 'rogerio', 'ronaldo', 'rubens', 'samuel', 'sergio', 'silvio', 'valdir', 'vanderlei',
  'vinicius', 'wagner', 'wellington', 'willian', 'william', 'wilson', 'alan', 'alberto', 'alexsandro',
  'alisson', 'artur', 'benedito', 'caio', 'celso', 'cesar', 'danilo', 'davi', 'douglas', 'ednaldo',
  'elton', 'eugenio', 'everaldo', 'geovane', 'geraldo', 'gerson', 'gilson', 'humberto', 'italo',
  'jaime', 'jefferson', 'jonas', 'laercio', 'luan', 'marcilio', 'marlon', 'mauro', 'moises',
  'murilo', 'neto', 'nilton', 'oliver', 'orlando', 'osmar', 'patrick', 'raimundo', 'ramon',
  'regis', 'reinaldo', 'ruan', 'sidnei', 'sidney', 'silas', 'simao', 'tomas', 'valdeci',
  'victor', 'vitor', 'waldir', 'wander', 'wendel', 'wesley',
]);

export const inferGenderFromName = (fullName: string): string => {
  if (!fullName || fullName.trim().length < 2) return '';
  const firstName = fullName.trim().split(/\s+/)[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // 1) Busca direta no dicionário
  if (NOMES_FEMININOS.has(firstName)) return 'Feminino';
  if (NOMES_MASCULINOS.has(firstName)) return 'Masculino';
  
  // 2) Análise por sufixo (muito confiável para português)
  const masc_a = ['luca', 'joshua', 'josua', 'ezra', 'costa', 'souza', 'silva'];
  if (masc_a.includes(firstName)) return '';
  
  // Sufixos femininos fortes
  if (firstName.endsWith('ela') || firstName.endsWith('ina') || firstName.endsWith('ana') ||
      firstName.endsWith('ene') || firstName.endsWith('ete') || firstName.endsWith('ice') ||
      firstName.endsWith('ilda') || firstName.endsWith('ilde') || firstName.endsWith('iane') ||
      firstName.endsWith('iene') || firstName.endsWith('iane') || firstName.endsWith('eia') ||
      firstName.endsWith('cia') || firstName.endsWith('ria') || firstName.endsWith('lia') ||
      firstName.endsWith('nia') || firstName.endsWith('sia') || firstName.endsWith('tia') ||
      firstName.endsWith('via') || firstName.endsWith('zia')) return 'Feminino';
  
  // Sufixos masculinos fortes  
  if (firstName.endsWith('son') || firstName.endsWith('ton') || firstName.endsWith('iel') ||
      firstName.endsWith('aldo') || firstName.endsWith('ardo') || firstName.endsWith('erto') ||
      firstName.endsWith('ildo') || firstName.endsWith('ilso') || firstName.endsWith('inho') ||
      firstName.endsWith('ison') || firstName.endsWith('ival') || firstName.endsWith('ivan')) return 'Masculino';
  
  // Terminação genérica em 'a' → feminino (com confiança menor)
  if (firstName.endsWith('a') && firstName.length >= 4) return 'Feminino';
  // Terminação genérica em 'o' → masculino
  if (firstName.endsWith('o') && firstName.length >= 4) return 'Masculino';
  
  return '';
};
