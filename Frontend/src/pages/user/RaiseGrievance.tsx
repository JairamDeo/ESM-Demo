import { useState, memo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, Paperclip, X, FileText, Image } from "lucide-react";
import { useCreateGrievance, useCaseTypes, useStations } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SelectRow = ({ label, value, onChange, children, required = false, disabled = false }: any) => (
  <div className="py-1.5 border-[#1f1f23]">
    <label className="block text-sm text-foreground font-normal text-[#FFFFFF] mb-2">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={disabled}
        className={`w-full bg-[#242424] rounded-md px-4 py-3 text-sm appearance-none outline-none focus:border-[#826CF3] transition-colors cursor-pointer
          ${value ? "text-white" : "text-[#75717D]"}
          ${disabled ? "opacity-70 cursor-not-allowed" : ""}
        `}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#75717D] pointer-events-none" />
      {/* Show QR badge if pre-selected from QR */}
      {disabled && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] bg-[#826CF3]/20 text-[#826CF3] px-1.5 py-0.5 rounded-full">
          QR
        </span>
      )}
    </div>
  </div>
);

const InputRow = ({ label, value, onChange, placeholder, required = false }: any) => (
  <div className="py-1.5 border-[#1f1f23]">
    <label className="block text-sm text-foreground font-normal text-[#FFFFFF] mb-2">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#242424] rounded-md px-4 py-3 text-sm text-white placeholder:text-[#75717D] outline-none focus:border-[#826CF3] transition-colors"
    />
  </div>
);

export default memo(function RaiseGrievance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: caseTypesList = [] } = useCaseTypes({ status: "active" });
  const { data: stationsData } = useStations({ limit: 100 });
  const stationHQsList = stationsData?.data || [];

  // ── Read QR params from URL ──────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const stationFromQR = urlParams.get("station") || (location.state as any)?.station || "";
  const preselectedType = (location.state as any)?.caseType || "";
  const isFromQR = !!stationFromQR;

  const [form, setForm] = useState({
    concernType:  "",
    caseType:     preselectedType || "",
    stationHQ:    stationFromQR  || "",
    description:  "",
    armyNumber:   "",
    rank:         "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const createGrievance = useCreateGrievance();

  // ── Handle file selection ────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      if (!isValidType) toast.error(`${file.name} — only JPG, PNG, PDF allowed`);
      if (!isValidSize) toast.error(`${file.name} — file must be under 5MB`);
      return isValidType && isValidSize;
    });
    setAttachments((prev) => [...prev, ...validFiles].slice(0, 3)); // max 3 files
    e.target.value = ""; // reset input
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.concernType || !form.caseType || !form.stationHQ) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("type", form.caseType);
      formData.append("veteranName", user?.name || "Veteran");
      if (user?.phone) formData.append("veteranPhone", user.phone);
      if (form.rank) formData.append("veteranRank", form.rank);
      if (form.armyNumber) formData.append("veteranArmyNo", form.armyNumber);
      formData.append("stationName", form.stationHQ);
      if (form.description) formData.append("description", form.description);
      formData.append("submissionSource", isFromQR ? "qr_code" : "portal");
      formData.append("priority", "medium");
      
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const result = await createGrievance.mutateAsync(formData);
      toast.success("Grievance submitted successfully!", {
        description: `Complaint ID: ${result?.grievanceId || "Generated"}`,
      });
      navigate("/user/complaints");
    } catch {
      // error handled by hook
    }
  }, [form, user, createGrievance, navigate, isFromQR]);

  return (
    <div className="min-h-screen bg-[#171719] font-sans overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-5 px-3">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground">
          <ChevronLeft className="w-5 h-5" color="#FFFFFF" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Raise Grievance</h1>
      </div>

      {/* QR Banner — shown when station is pre-filled from QR */}
      {isFromQR && (
        <div className="mx-5 mt-3 flex items-center gap-2 bg-[#826CF3]/10 border border-[#826CF3]/30 rounded-lg px-3 py-2">
          <span className="text-[#826CF3] text-xs">📱</span>
          <p className="text-xs text-[#826CF3]">
            Station pre-filled from QR scan — <span className="font-semibold">{stationFromQR}</span>
          </p>
        </div>
      )}

      {/* Form */}
      <div className="px-5 mt-2 ">

        <SelectRow
          label="Concern For"
          value={form.concernType}
          onChange={(v: string) => setForm((prev) => ({ ...prev, concernType: v }))}
          required
        >
          <option value="" disabled hidden>Select concern type</option>
          <option value="Self">Self</option>
          <option value="Dependent">Dependent</option>
        </SelectRow>

        <SelectRow
          label="Case Type"
          value={form.caseType}
          onChange={(v: string) => setForm((prev) => ({ ...prev, caseType: v }))}
          required
        >
          <option value="" disabled hidden>Select case type</option>
          {caseTypesList.map((ct: any) => <option key={ct._id || ct.name} value={ct.name}>{ct.name}</option>)}
        </SelectRow>

        {/* Station HQ — disabled if from QR */}
        <SelectRow
          label="Station HQ"
          value={form.stationHQ}
          onChange={(v: string) => setForm((prev) => ({ ...prev, stationHQ: v }))}
          required
          disabled={isFromQR}
        >
          <option value="" disabled hidden>Select Station HQ</option>
          {stationHQsList.map((s: any) => <option key={s._id || s.name} value={s.name}>{s.name}</option>)}
        </SelectRow>

        <InputRow
          label="Rank"
          value={form.rank}
          onChange={(v: string) => setForm((prev) => ({ ...prev, rank: v }))}
          placeholder="Enter rank"
        />

        <InputRow
          label="Army No"
          value={form.armyNumber}
          onChange={(v: string) => setForm((prev) => ({ ...prev, armyNumber: v }))}
          placeholder="Enter army number"
        />

        {/* Description */}
        <div className="py-3 border-b lg:border-none border-[#1f1f23]">
          <label className="block text-sm text-foreground font-normal text-[#FFFFFF] mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
            placeholder="Describe your grievance..."
            className="w-full bg-[#242424] rounded-md px-4 py-3 text-sm text-white placeholder:text-[#75717D] outline-none focus:border-[#826CF3] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Attachments */}
        <div className="py-3">
          <label className="block text-sm font-normal text-[#FFFFFF] mb-2">
            Attachments <span className="text-[#75717D] text-xs">(optional · max 3 files · JPG, PNG, PDF · 5MB each)</span>
          </label>

          {/* Upload Button */}
          <label className="flex items-center gap-2 w-full bg-[#242424] border border-dashed border-[#3a3a3e] rounded-md px-4 py-3 cursor-pointer hover:border-[#826CF3]/50 transition-colors">
            <Paperclip className="w-4 h-4 text-[#75717D]" />
            <span className="text-sm text-[#75717D]">
              {attachments.length > 0 ? `${attachments.length} file(s) selected — tap to add more` : "Tap to attach documents"}
            </span>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={attachments.length >= 3}
            />
          </label>

          {/* File List */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-[#242424] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type === "application/pdf"
                      ? <FileText className="w-4 h-4 text-[#826CF3] shrink-0" />
                      : <Image className="w-4 h-4 text-[#826CF3] shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-[#75717D]">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="p-1 rounded-full hover:bg-[#3a3a3e] text-[#75717D] hover:text-white transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={createGrievance.isPending || !form.concernType || !form.caseType || !form.stationHQ}
          className="mt-4 w-full bg-[#826CF3] text-white font-bold text-sm py-4 mb-4 lg:my-1 rounded-xl shadow-[0_4px_12px_rgba(23,84,207,0.2)] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 lg:w-[30%] lg:mx-auto"
        >
          {createGrievance.isPending ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Grievance"
          )}
        </button>
      </div>

      <style>{`
        select option { background-color: #1c1c1e; color: #ffffff; }
        select:required:invalid { color: #6b7280; }
      `}</style>
    </div>
  );
});