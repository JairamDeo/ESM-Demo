import { useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Shield, Star, MapPin, Mail, ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile } from "@/hooks/useApi";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default memo(function CompleteProfile() {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const { t } = useTranslation();

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
    { icon: User,   label: t("fullName"),          key: "name",          placeholder: t("enterFullName"),   required: true,  type: "text"  },
    { icon: Phone,  label: t("phoneNumberLabel"),   key: null,            placeholder: phone ? `+91 ${phone}` : "—", required: false, type: "text" },
    { icon: Star,   label: t("rank"),               key: "rank",          placeholder: t("rankPlaceholder"), required: false, type: "text"  },
    { icon: Shield, label: t("serviceNumber"),      key: "serviceNumber", placeholder: t("serviceNumberPlaceholder"), required: false, type: "text"  },
    { icon: Mail,   label: t("emailAddress"),       key: "email",         placeholder: t("emailPlaceholder"), required: false, type: "email" },
    { icon: MapPin, label: t("address"),            key: "address",       placeholder: t("addressPlaceholder"), required: false, type: "text"  },
  ];

  return (
    <div className="min-h-dvh h-dvh overflow-hidden bg-muted/40 dark:bg-zinc-950 flex items-center justify-center sm:p-6 p-0">
      <div className="flex flex-col w-full max-w-full bg-background scrollbar-none h-dvh sm:h-auto sm:max-w-sm sm:rounded-2xl sm:shadow-xl sm:dark:border sm:dark:border-border px-6 pt-5 pb-6">

        {/* Top Header Row with Profile Icon and Theme Toggle */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-[#826CF3]/15 flex items-center justify-center">
            <User className="w-6 h-6 text-[#826CF3]" />
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground border border-border"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Header Titles */}
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-foreground">{t("completeProfile")}</h1>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("completeProfileDesc")}
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-none">
          {fields.map(({ icon: Icon, label, key, placeholder, required, type }) => (
            <div key={label}>
              <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <div className={`flex items-center gap-2.5 bg-[#EFEFEF] dark:bg-secondary border rounded-xl px-3.5 py-2.5 transition-colors ${
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
          className="w-full mt-4 bg-[#826CF3] text-white font-bold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(130,108,243,0.35)] flex-shrink-0"
        >
          {updateProfile.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              {t("continueToApp")}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Skip */}
        {/* <button
          onClick={() => navigate("/user")}
          className="mt-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          {t("skipForNow")}
        </button> */}

      </div>
    </div>
  );
});