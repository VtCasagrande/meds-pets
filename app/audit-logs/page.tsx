// Este arquivo é um componente do lado do servidor (Server Component)
import { Suspense } from 'react';
import AuditLogsClient from './client';
import LoadingState from './loading';

// Componente principal do lado do servidor
export default function AuditLogsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuditLogsClient />
    </Suspense>
  );
} 