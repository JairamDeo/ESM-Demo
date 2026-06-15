import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Shield, Star, MapPin, Mail, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile } from "@/hooks/useApi";
import { toast } from "sonner";

export default memo(function CompleteProfile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({
    name: "",
    rank: "",
    serviceNumber: "",
    email: "",
    address: "",
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    try {
      await updateProfile.mutateAsync(form);
      updateUser({ name: form.name, email: form.email || undefined });
      toast.success("Profile saved! Welcome aboard.");
      navigate("/user");
    } catch {
      // error handled by hook
    }
  }, [form, updateProfile, updateUser, navigate]);

  const phone = user?.phone || "";

  const fields: {
    icon: typeof User;
    label: string;
    key: keyof typeof form | null;
    placeholder: string;
    required: boolean;
    type: string;
  }[] = [
    { icon: User,   label: "Full Name",             key: "name",          placeholder: "Enter your full name",   required: true,  type: "text"  },
    { icon: Phone,  label: "Phone Number",           key: null,            placeholder: phone ? `+91 ${phone}` : "—", required: false, type: "text" },
    { icon: Star,   label: "Rank",                   key: "rank",          placeholder: "e.g. Colonel, Major",    required: false, type: "text"  },
    { icon: Shield, label: "Service / Army Number",  key: "serviceNumber", placeholder: "e.g. IC-12345",          required: false, type: "text"  },
    { icon: Mail,   label: "Email Address",          key: "email",         placeholder: "your@email.com",         required: false, type: "email" },
    { icon: MapPin, label: "Address",                key: "address",       placeholder: "Your current address",   required: false, type: "text"  },
  ];

  return (
    <div className="h-screen overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-center justify-center sm:p-6 p-0">
      <div className="flex flex-col w-full bg-background h-screen overflow-y-auto sm:h-[90vh] sm:max-w-sm sm:rounded-3xl sm:shadow-xl sm:dark:border sm:dark:border-border px-6 pt-10 pb-8">

        {/* Top controls */}
        <div className="flex justify-end mb-4 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground border border-border"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-[#826CF3]/15 flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-[#826CF3]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Fill in your details to get started. Only your name is required — all other fields are optional.
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-3 flex-1">
          {fields.map(({ icon: Icon, label, key, placeholder, required, type }) => (
            <div key={label}>
              <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className={`flex items-center gap-3 bg-[#EFEFEF] dark:bg-secondary border rounded-xl px-4 py-3.5 transition-colors ${
                key
                  ? "border-border focus-within:border-[#826CF3] focus-within:ring-1 focus-within:ring-[#826CF3]/20"
                  : "border-border/40 opacity-60"
              }`}>
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                {key ? (
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
                  />
                ) : (
                  <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.name.trim() || updateProfile.isPending}
          className="w-full mt-7 bg-[#826CF3] text-white font-bold py-4 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(130,108,243,0.35)] flex-shrink-0"
        >
          {updateProfile.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue to App
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Skip */}
        <button
          onClick={() => navigate("/user")}
          className="mt-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          Skip for now
        </button>

      </div>
    </div>
  );
});