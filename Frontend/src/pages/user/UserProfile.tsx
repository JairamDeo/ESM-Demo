import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, User, Phone, Shield, Star, MapPin, Mail, Edit2, Save, X, BadgeCheck } from "lucide-react";
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

  const displayName = user?.name?.trim() || "Veteran";
  const initials = (user?.name?.trim() || user?.phone || "V")[0].toUpperCase();
  const phone = userMe?.phone || user?.phone || "";

  const profileComplete = useMemo(() => {
    const fields = [form.name, form.rank, form.serviceNumber, form.email, form.address, phone];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [form, phone]);

  const totalComplaints = 0; // replace with real data if available

  const handleSave = useCallback(async () => {
    await updateProfile.mutateAsync(form);
    updateUser({ name: form.name, email: form.email });
    setEditing(false);
  }, [form, updateProfile, updateUser]);

  const handleCancel = useCallback(() => {
    if (userMe) {
      setForm({
        name: userMe.name || "",
        rank: userMe.rank || "",
        serviceNumber: userMe.serviceNumber || "",
        email: userMe.email || "",
        address: userMe.address || "",
      });
    }
    setEditing(false);
  }, [userMe]);

  const fields: { icon: typeof User; label: string; value: string; key: keyof ProfileForm | null }[] = [
    { icon: User,   label: "Full Name",      value: form.name,          key: "name" },
    { icon: Phone,  label: "Phone Number",   value: phone ? `+91 ${phone}` : "—", key: null },
    { icon: Star,   label: "Rank",           value: form.rank,          key: "rank" },
    { icon: Shield, label: "Service Number", value: form.serviceNumber, key: "serviceNumber" },
    { icon: Mail,   label: "Email",          value: form.email,         key: "email" },
    { icon: MapPin, label: "Address",        value: form.address,       key: "address" },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#826CF3] px-3 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#826CF3] bg-[#826CF3]/10 px-3 py-1.5 rounded-full hover:bg-[#826CF3]/15 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Profile hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[#826CF3]/25 bg-gradient-to-br from-[#826CF3]/15 via-card to-[#4F81FF]/10 p-5">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#826CF3]/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col items-center text-center relative">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#826CF3] to-[#4F81FF] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#826CF3]/30 ring-4 ring-background">
              {initials}
            </div>
            {user?.phone && (
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <BadgeCheck className="w-4 h-4 text-white" />
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {phone ? `+91 ${phone}` : "Phone not linked"}
          </p>

          <div className="flex items-center gap-4 mt-4 w-full max-w-xs">
            <div className="flex-1 bg-background/60 backdrop-blur rounded-xl py-2.5 px-3 border border-border/50">
              <p className="text-lg font-bold text-foreground">{totalComplaints}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Complaints</p>
            </div>
            <div className="flex-1 bg-background/60 backdrop-blur rounded-xl py-2.5 px-3 border border-border/50">
              <p className="text-lg font-bold text-[#826CF3]">{profileComplete}%</p>
              <p className="text-[10px] text-muted-foreground font-medium">Profile</p>
            </div>
          </div>

          {/* Profile completion bar */}
          <div className="w-full mt-4">
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F81FF] to-[#826CF3] transition-all duration-500"
                style={{ width: `${profileComplete}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {profileComplete < 100 ? "Complete your profile for faster grievance processing" : "Profile complete"}
            </p>
          </div>
        </div>
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
                {key === null && editing && (
                  <p className="text-[10px] text-muted-foreground mt-1">Cannot be changed</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});