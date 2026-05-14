import { EmptyState } from '@/components/common/EmptyState';

export default function HRRecordsPage() {
  // TODO: Wire employee document storage once backend document/record endpoints exist.
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">HR Records</h1>
        <p className="page-description">Employee documents and HR records.</p>
      </div>
      <EmptyState
        title="Document records are not configured"
        description="Employee documents need backend storage and access policies before upload/download actions are enabled."
      />
    </div>
  );
}
