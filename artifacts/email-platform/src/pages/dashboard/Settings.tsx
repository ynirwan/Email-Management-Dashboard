import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Spinner } from "@/components/ui/core";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Save, Server, Globe, Shield } from "lucide-react";

const settingsSchema = z.object({
  siteName: z.string().min(1),
  supportEmail: z.string().email().optional().or(z.literal("")),
  maxEmailsPerDay: z.coerce.number().min(0),
  allowRegistrations: z.boolean(),
  maintenanceMode: z.boolean(),
  smtpHost: z.string().optional().or(z.literal("")),
  smtpPort: z.coerce.number().optional().or(z.literal("")),
  smtpUser: z.string().optional().or(z.literal("")),
  smtpPassword: z.string().optional(),
  smtpFromEmail: z.string().email().optional().or(z.literal("")),
  smtpFromName: z.string().optional().or(z.literal("")),
  awsRegion: z.string().optional().or(z.literal("")),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (settings) {
      reset({
        ...settings,
        supportEmail: settings.supportEmail || "",
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || undefined,
        smtpUser: settings.smtpUser || "",
        smtpPassword: "", // don't load password
        smtpFromEmail: settings.smtpFromEmail || "",
        smtpFromName: settings.smtpFromName || "",
        awsRegion: settings.awsRegion || "",
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: SettingsForm) => {
    // Remove empty strings from optional fields before sending
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== "" && v !== undefined)
    ) as any;
    
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Settings saved", description: "Platform configuration updated successfully." });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-20"><Spinner className="w-12 h-12" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure global application behavior and email providers.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <div className="flex justify-end sticky top-20 z-20 bg-background/80 backdrop-blur-md p-4 -mx-4 sm:-mx-8 rounded-b-2xl border-b border-border shadow-sm mb-6">
          <Button type="submit" isLoading={updateMutation.isPending} className="gap-2 shadow-lg">
            <Save className="w-4 h-4" /> Save All Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-1">
            <h3 className="text-lg font-bold font-display flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> General Options</h3>
            <p className="text-sm text-muted-foreground">Basic platform identity and access controls.</p>
          </div>
          <Card className="col-span-1 lg:col-span-2 border-border/50">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input {...register("siteName")} />
                  {errors.siteName && <p className="text-xs text-destructive">{errors.siteName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input {...register("supportEmail")} placeholder="support@domain.com" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Global Daily Email Limit</Label>
                <Input type="number" {...register("maxEmailsPerDay")} />
                <p className="text-xs text-muted-foreground">Maximum emails the entire platform can send per day (0 for unlimited).</p>
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" {...register("allowRegistrations")} className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20 accent-primary" />
                  <div>
                    <div className="font-semibold group-hover:text-primary transition-colors">Allow New Registrations</div>
                    <div className="text-xs text-muted-foreground">If disabled, only admins can create new accounts.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" {...register("maintenanceMode")} className="w-5 h-5 rounded border-input text-primary focus:ring-primary/20 accent-primary" />
                  <div>
                    <div className="font-semibold text-destructive group-hover:text-destructive/80 transition-colors">Maintenance Mode</div>
                    <div className="text-xs text-muted-foreground">Disables public access. Only admins can log in.</div>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-1">
            <h3 className="text-lg font-bold font-display flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> SMTP Configuration</h3>
            <p className="text-sm text-muted-foreground">Primary email delivery provider settings.</p>
          </div>
          <Card className="col-span-1 lg:col-span-2 border-border/50">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label>SMTP Host</Label>
                  <Input {...register("smtpHost")} placeholder="smtp.mailgun.org" />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input type="number" {...register("smtpPort")} placeholder="587" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input {...register("smtpUser")} placeholder="postmaster@domain.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input type="password" {...register("smtpPassword")} placeholder="Leave blank to keep existing" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                <div className="space-y-2">
                  <Label>Default From Email</Label>
                  <Input {...register("smtpFromEmail")} placeholder="hello@domain.com" />
                </div>
                <div className="space-y-2">
                  <Label>Default From Name</Label>
                  <Input {...register("smtpFromName")} placeholder="ZeniPost" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </form>
    </DashboardLayout>
  );
}
