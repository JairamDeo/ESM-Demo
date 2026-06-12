import { useState, memo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, User, Phone, Shield, Star, MapPin, Mail, Edit2, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, useUserMe } from "@/hooks/useApi";

interface ProfileForm {
  name: string;
  rank: string;
  serviceNumber: string;
  email: string;
  address: string;
}

export default memo(function UserProfile() {
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: userMe, isLoading } = useUserMe();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    rank: "",
    serviceNumber: "",
    email: "",
    address: "",
  });

  // Populate form from live backend data whenever it loads
  useEffect(() => {
    if (userMe) {
      setForm({
        name: userMe.name || "",
        rank: userMe.rank || "",
        serviceNumber: userMe.serviceNumber || "",
        email: userMe.email || "",
        address: userMe.address || "",
      });
    }
  }, [userMe]);

  const handleSave = useCallback(async () => {
    await updateProfile.mutateAsync(form);
    updateUser({ name: form.name, email: form.email });
    setEditing(false);
  }, [form, updateProfile, updateUser]);

  const phone = userMe?.phone || user?.phone || "";

  const fields = [
    { icon: User,   label: "Full Name",       value: form.name,          key: "name"          as keyof ProfileForm },
    { icon: Phone,  label: "Phone Number",     value: phone ? `+91 ${phone}` : "—", key: null  as null },
    { icon: Star,   label: "Rank",             value: form.rank,          key: "rank"          as keyof ProfileForm },
    { icon: Shield, label: "Service Number",   value: form.serviceNumber, key: "serviceNumber" as keyof ProfileForm },
    { icon: Mail,   label: "Email",            value: form.email,         key: "email"         as keyof ProfileForm },
    { icon: MapPin, label: "Address",          value: form.address,       key: "address"       as keyof ProfileForm },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
            <ChevronLeft className="w-5 h-5" color="#FFFFFF" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        </div>

        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={updateProfile.isPending}
          className="flex items-center gap-1.5 text-sm text-[#826CF3] font-medium"
        >
          {editing
            ? (updateProfile.isPending
                ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                : <><Save className="w-4 h-4" />Save</>)
            : <><Edit2 className="w-4 h-4" />Edit</>}
        </button>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-3">
          <span className="text-primary text-2xl font-bold">
            {(form.name || user?.name || "V")[0].toUpperCase()}
          </span>
        </div>
        <h2 className="font-bold text-foreground">{form.name || user?.name || "Veteran"}</h2>
        <p className="text-sm text-muted-foreground">{phone ? `+91 ${phone}` : ""}</p>
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
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="mt-1 w-full bg-secondary rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50 border border-border"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">{value || "—"}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <button
          onClick={() => setEditing(false)}
          className="w-full py-3 bg-secondary text-foreground rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      )}
    </div>
  );
});
