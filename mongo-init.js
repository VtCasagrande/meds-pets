// Selecionando o banco de dados
use lembrete-meds;

// Criando collection de lembretes
db.createCollection('reminders');

// Inserindo alguns lembretes de exemplo
db.reminders.insertMany([
  {
    tutorName: 'Maria Silva',
    petName: 'Rex',
    petBreed: 'Golden Retriever',
    phoneNumber: '11912345678',
    medicationProducts: [
      {
        title: 'Antibiótico',
        quantity: '1 comprimido',
        frequency: 'A cada 12 horas',
        startDateTime: new Date('2025-03-27T08:00:00.000Z')
      },
      {
        title: 'Anti-inflamatório',
        quantity: '10ml',
        frequency: 'Uma vez ao dia',
        startDateTime: new Date('2025-03-27T18:00:00.000Z')
      }
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tutorName: 'João Pereira',
    petName: 'Miau',
    petBreed: 'Siamês',
    phoneNumber: '11998765432',
    medicationProducts: [
      {
        title: 'Vermífugo',
        quantity: '1 comprimido',
        frequency: 'Dose única',
        startDateTime: new Date('2025-03-26T10:00:00.000Z')
      }
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    tutorName: 'Ana Oliveira',
    petName: 'Bolinha',
    petBreed: 'Yorkshire',
    phoneNumber: '11987654321',
    medicationProducts: [
      {
        title: 'Colírio',
        quantity: '2 gotas',
        frequency: '3 vezes ao dia',
        startDateTime: new Date('2025-03-25T09:00:00.000Z')
      }
    ],
    isActive: false,
    createdAt: new Date(Date.now() - 7*24*60*60*1000), // 7 dias atrás
    updatedAt: new Date()
  }
]);

// Verificando os documentos inseridos
db.reminders.find().pretty(); 