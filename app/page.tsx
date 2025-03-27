import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-6">Sistema de Controle de Lembretes de Medicamentos</h2>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-3xl">
        Gerencie lembretes de medicamentos para os pets de seus clientes e configure notificações automáticas.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link href="/reminders"
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center">
          <div className="text-blue-500 font-bold text-xl mb-2">Ver Todos os Lembretes</div>
          <p className="text-gray-600 text-center">Visualize todos os lembretes ativos e finalizados</p>
        </Link>
        
        <Link href="/reminders/new"
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col items-center">
          <div className="text-green-500 font-bold text-xl mb-2">Adicionar Novo Lembrete</div>
          <p className="text-gray-600 text-center">Cadastre um novo lembrete de medicamento para um pet</p>
        </Link>
      </div>
    </div>
  )
} 