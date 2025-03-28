import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center mb-8">Sistema de Lembretes de Medicamentos para Pets</h1>
      <p className="text-lg text-dark mb-8 text-center max-w-2xl">
        Gerencie lembretes de medicamentos para os pets de seus clientes e configure notificações automáticas.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
        <Link href="/reminders"
              className="card hover:shadow-lg flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-dark-dark mb-2">Gerenciar Lembretes</h3>
          <p className="text-dark-light">Visualize todos os lembretes ativos e finalizados</p>
        </Link>
        
        <Link href="/reminders/new"
              className="card hover:shadow-lg flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-dark-dark mb-2">Novo Lembrete</h3>
          <p className="text-dark-light">Cadastre um novo lembrete de medicamento para um pet</p>
        </Link>
        
        <Link href="/scheduler"
              className="card hover:shadow-lg flex flex-col items-center text-center h-full">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-dark-dark mb-2">Status do Agendador</h3>
          <p className="text-dark-light">Monitore o status do sistema de agendamento de notificações</p>
        </Link>
      </div>
      
      <div className="mt-12 text-center">
        <h2 className="mb-4">Como funciona</h2>
        <p className="text-dark-light max-w-3xl mx-auto">
          O sistema envia lembretes automáticos sobre medicamentos aos tutores de pets,
          ajudando a garantir que os tratamentos sejam seguidos corretamente e melhorando
          a saúde dos animais de estimação.
        </p>
      </div>
    </div>
  )
} 