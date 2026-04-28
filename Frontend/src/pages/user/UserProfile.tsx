import { useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Phone, Shield, MapPin, Mail, Edit2, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile } from "@/hooks/useApi";

export default memo(function UserProfile() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", rank: "", serviceNumber: "", email: user?.email || "", address: "" });

  const handleSave = useCallback(async () => {
    await updateProfile.mutateAsync(form);
    setEditing(false);
  }, [form, updateProfile]);

  const fields = [
    { icon: User, label: "Full Name", value: form.name, key: "name" },
    { icon: Phone, label: "Phone Number", value: user?.phone || "", key: null },
    { icon: Shield, label: "Rank", value: form.rank, key: "rank" },
    { icon: Shield, label: "Service Number", value: form.serviceNumber, key: "serviceNumber" },
    { icon: Mail, label: "Email", value: form.email, key: "email" },
    { icon: MapPin, label: "Address", value: form.address, key: "address" },
  ];

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
        </div>
        <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={updateProfile.isPending} className="flex items-center gap-1.5 text-sm text-primary font-medium">
          {editing ? (updateProfile.isPending ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <><Save className="w-4 h-4"/>Save</>) : <><Edit2 className="w-4 h-4"/>Edit</>}
        </button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-3">
          <span className="text-primary text-2xl font-bold">{(user?.name || "V")[0]}</span>
        </div>
        <h2 className="font-bold text-foreground">{user?.name || "Veteran"}</h2>
        <p className="text-sm text-muted-foreground">{user?.phone ? `+91 ${user.phone}` : ""}</p>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {fields.map(({ icon: Icon, label, value, key }) => (
          <div key={label} className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {editing && key ? (
                  <input value={(form as any)[key]} onChange={(e) => setForm({...form, [key]: e.target.value})} className="mt-1 w-full bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 border border-border" />
                ) : (
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value || "—"}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <button onClick={() => setEditing(false)} className="w-full py-3 bg-secondary text-foreground rounded-xl text-sm flex items-center justify-center gap-2">
          <X className="w-4 h-4" /> Cancel
        </button>
      )}
    </div>
  );
});
