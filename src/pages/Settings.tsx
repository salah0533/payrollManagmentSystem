import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const [workSettings, setWorkSettings] = useState({
    entryTime: '08:00',
    exitTime: '17:00',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toTimeInput = (value?: string) => {
    if (!value) return '';
    return String(value).slice(0, 5);
  };

  const toIsoTime = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date.toISOString();
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/settings/');
        if (!response.ok) throw new Error('Failed to load settings');

        const json = await response.json();
        setWorkSettings({
          entryTime: toTimeInput(json?.data?.entry_time) || '08:00',
          exitTime: toTimeInput(json?.data?.exit_time) || '17:00',
        });
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load work hours settings.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSaveWorkSettings = async () => {
    if (!workSettings.entryTime || !workSettings.exitTime) {
      toast({
        title: 'Validation Error',
        description: 'Entry and exit time are required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entryTime: toIsoTime(workSettings.entryTime),
        exitTime: toIsoTime(workSettings.exitTime),
      };

      const response = await fetch('http://localhost:8000/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Settings saved',
        description: 'Work hours settings have been updated.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update work hours settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure work hours settings.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Work Hours Settings</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="entryTime">Entry Time</Label>
                <Input
                  id="entryTime"
                  type="time"
                  value={workSettings.entryTime}
                  onChange={(e) => setWorkSettings({ ...workSettings, entryTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitTime">Exit Time</Label>
                <Input
                  id="exitTime"
                  type="time"
                  value={workSettings.exitTime}
                  onChange={(e) => setWorkSettings({ ...workSettings, exitTime: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleSaveWorkSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
