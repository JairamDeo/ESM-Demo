import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  User,
  Phone,
  Shield,
  MapPin,
  Mail,
  Edit2,
  Save,
  X,
  BadgeCheck,
  Hash,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyGrievances, useUpdateProfile, useUserMe } from "@/hooks/useApi";

interface ProfileForm {
  name: string;
  rank: string;
  serviceNumber: string;
  email: string;
  address: string;
}

function FieldCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  editing,
  onChange,
  readOnly,
  placeholder,
}: {
  icon: typeof User;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  editing: boolean;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          {editing && onChange && !readOnly ? (
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="mt-1.5 w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#826CF3]/50 focus:ring-1 focus:ring-[#826CF3]/20 transition-colors"
            />
          ) : (
            <p className="text-sm font-medium text-foreground mt-1 break-words">
              {value || <span className="text-muted-foreground font-normal">Not added</span>}
            </p>
          )}
          {readOnly && (
            <p className="text-[10px] text-muted-foreground mt-1">Cannot be changed</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(function UserProfile() {
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: userMe, isLoading } = useUserMe();
  const { data: grievances = [] } = useMyGrievances();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    rank: "",
    serviceNumber: "",
    email: "",
    address: "",
  });

  const phone = userMe?.phone || user?.phone || "";
  const totalComplaints = Array.isArray(grievances) ? grievances.length : 0;

  useEffect(() => {
    if (userMe) {
      setForm({
        name: userMe.name || user?.name || "",
        rank: userMe.rank || "",
        serviceNumber: userMe.serviceNumber || "",
        email: userMe.email || user?.email || "",
        address: userMe.address || "",
      });
    } else if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [userMe, user?.name, user?.email]);

  const displayName = form.name?.trim() || user?.name?.trim() || (phone ? "Veteran" : "Veteran");
  const initials = (form.name?.trim() || user?.name?.trim() || phone || "V")[0].toUpperCase();

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
    } else {
      setForm((prev) => ({
        ...prev,
        name: user?.name || "",
        email: user?.email || "",
      }));
    }
    setEditing(false);
  }, [userMe, user?.name, user?.email]);

  const setField = useCallback((key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const profileComplete = useMemo(() => {
    const filled = [form.name, form.rank, form.serviceNumber, form.email].filter(Boolean).length;
    return Math.round((filled / 4) * 100);
  }, [form.name, form.rank, form.serviceNumber, form.email]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-6 animate-fade-in">
      <div className="px-4 pt-2 pb-5 bg-gradient-to-b from-[#826CF3]/10 to-transparent">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/user"
              className="p-1.5 rounded-full hover:bg-secondary/80 text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Profile</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage your personal details</p>
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#826CF3] bg-[#826CF3]/10 px-3 py-1.5 rounded-full hover:bg-[#826CF3]/15 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#826CF3]/25 bg-gradient-to-br from-[#826CF3]/15 via-card to-[#4F81FF]/10 p-5">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#826CF3]/10 blur-2xl pointer-events-none" />
          <div className="flex flex-col items-center text-center relative">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#826CF3] to-[#4F81FF] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#826CF3]/30 ring-4 ring-background">
                {initials}
              </div>
              {phone && (
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

            <div className="w-full mt-4">
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4F81FF] to-[#826CF3] transition-all duration-500"
                  style={{ width: `${profileComplete}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {profileComplete < 100
                  ? "Complete your profile for faster grievance processing"
                  : "Profile complete"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Personal
          </p>
          <div className="space-y-2">
            <FieldCard
              icon={User}
              iconBg="bg-[#826CF3]/15"
              iconColor="text-[#826CF3]"
              label="Full Name"
              value={form.name}
              editing={editing}
              onChange={(v) => setField("name", v)}
              placeholder="Enter your full name"
            />
            <FieldCard
              icon={Phone}
              iconBg="bg-[#4F81FF]/15"
              iconColor="text-[#4F81FF]"
              label="Phone Number"
              value={phone ? `+91 ${phone}` : ""}
              editing={false}
              readOnly
            />
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Service Details
          </p>
          <div className="space-y-2">
            <FieldCard
              icon={Shield}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-500"
              label="Rank"
              value={form.rank}
              editing={editing}
              onChange={(v) => setField("rank", v)}
              placeholder="e.g. Havildar, Naik"
            />
            <FieldCard
              icon={Hash}
              iconBg="bg-emerald-500/15"
              iconColor="text-emerald-500"
              label="Army / Service Number"
              value={form.serviceNumber}
              editing={editing}
              onChange={(v) => setField("serviceNumber", v)}
              placeholder="Enter service number"
            />
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Contact
          </p>
          <div className="space-y-2">
            <FieldCard
              icon={Mail}
              iconBg="bg-[#4F81FF]/15"
              iconColor="text-[#4F81FF]"
              label="Email"
              value={form.email}
              editing={editing}
              onChange={(v) => setField("email", v)}
              placeholder="your@email.com"
            />
            <FieldCard
              icon={MapPin}
              iconBg="bg-rose-500/15"
              iconColor="text-rose-500"
              label="Address"
              value={form.address}
              editing={editing}
              onChange={(v) => setField("address", v)}
              placeholder="City, State, PIN"
            />
          </div>
        </section>

        {editing && (
          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-3.5 bg-secondary border border-border text-foreground rounded-2xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel changes
          </button>
        )}

        <Link
          to="/user/settings"
          className="block text-center text-xs text-muted-foreground hover:text-[#826CF3] transition-colors py-2"
        >
          Account settings →
        </Link>
      </div>
    </div>
  );
});
