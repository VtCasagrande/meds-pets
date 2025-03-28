// Arquivo para inicialização automática do agendador
console.log('Carregando inicializador automático do agendador...');

// Verificar se estamos em ambiente Node.js (não Edge e não Browser)
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  console.log('Ambiente Node.js detectado, iniciando agendador automaticamente...');
  
  // Importar e iniciar o agendador
  import('./services/schedulerService')
    .then(({ startScheduler }) => {
      console.log('Serviço importado, iniciando agendador...');
      startScheduler();
      console.log('Agendador iniciado com sucesso via inicialização automática!');
    })
    .catch(error => {
      console.error('Erro ao iniciar agendador automaticamente:', error);
    });
} else {
  console.log('Ambiente não é Node.js, pulando inicialização automática do agendador');
}

export {}; // Para garantir que este seja tratado como um módulo 