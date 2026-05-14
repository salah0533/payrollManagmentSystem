import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function RequestsPage() {
  // TODO: Connect this page when the backend adds HR request/document-request endpoints.
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Requests</h1>
        <p className="page-description">Document, certificate, and profile update requests.</p>
      </div>
      <EmptyState
        title="Request workflows are not enabled yet"
        description="The current backend has leave, attendance, payroll, and notification self-service. General HR request endpoints can be added next without changing this route."
      />
      <div className="hidden">
        <ClipboardList />
      </div>
    </div>
  );
}
