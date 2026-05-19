import { useState, memo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useCreateGrievance } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const caseTypes = ["Update Name","Death Intimation","Resolve Pension Issues","Update Aadhaar & PAN","Update Mobile & Email","Update Address","Stop FMA","Add Nominee","Monthly Pay Slip","Pension Payment Order","Update DOB of Spouse","Update Spouse Details","Add Family Details","Grievance for Increment","Track Case Status","SMS / Portal Alerts"];
const stationHQs = ["Nagpur Station HQ","Pune Station HQ","Ahmedabad Station HQ","Nashik Station HQ","Aurangabad Station HQ","Kolhapur Station HQ","Rajkot Station HQ","Surat Station HQ","Solapur Station HQ","Baroda Station HQ"];

 const SelectRow = ({ label, value, onChange, children, required = false }: any) => (
    <div className="py-1.5  border-[#1f1f23]">
      <label className="block text-sm text-foreground font-normal text-[#FFFFFF] mb-2">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className={`w-full bg-[#242424] rounded-md px-4 py-3 text-sm  appearance-none outline-none focus:border-[#826CF3] transition-colors cursor-pointer ${value ? "text-white" : "text-[#75717D]"}`}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#75717D] pointer-events-none" />
      </div>
    </div>
  );

  const InputRow = ({ label, value, onChange, placeholder, required = false }: any) => (
    <div className="py-1.5  border-[#1f1f23]">
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

  export default memo( function RaiseGrievance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const preselectedType = (location.state as any)?.caseType || "";

  const [form, setForm] = useState({
    concernType: "",
    caseType: preselectedType || "",
    stationHQ: "",
    description: "",
    armyNumber: "",
    rank: "",
  });
  const createGrievance = useCreateGrievance();

  const handleSubmit = useCallback(async () => {
    if (!form.concernType || !form.caseType || !form.stationHQ) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const result = await createGrievance.mutateAsync({
        type: form.caseType,
        veteranName: user?.name || "Veteran",
        veteranPhone: user?.phone,
        veteranRank: form.rank,
        veteranArmyNo: form.armyNumber,
        stationName: form.stationHQ,
        description: form.description,
        submissionSource: "portal",
        priority: "medium",
      });
      toast.success("Grievance submitted successfully!", {
        description: `Complaint ID: ${result?.grievanceId || "Generated"}`,
      });
      navigate("/user/complaints");
    } catch {
      // error handled by hook
    }
  }, [form, user, createGrievance, navigate]);

  return (
    <div className="max-h-screen bg-[#171719] font-sans  ">
      {/* Header */}
      <div className="flex items-center gap-5 px-2  h-[40px]  ">
        <Link to="/user" className="flex items-center justify-center w-8 h-8 rounded-full shrink-0">
          <ChevronLeft size={16} color="#ffffff"  className="" />
        </Link>
        <h1 className="text-md font-semibold text-white tracking-tight">Personal Details</h1>
      </div>

      {/* Form */}
      <div className="px-5">
        <SelectRow
          label="Concern For"
          value={form.concernType}
          onChange={(v: string) =>setForm((prev) => ({...prev,concernType: v,}))}
          required
          
        >
          <option value="" disabled hidden>Select concern type</option>
          <option value="Self">Self</option>
          <option value="Dependent">Dependent</option>
        </SelectRow>

        <SelectRow
          label="Case Type"
          value={form.caseType}
          onChange={(v: string) =>setForm((prev) => ({...prev,caseType: v,}))}
          required
        >
          <option value="" disabled hidden >Select case type</option>
          {caseTypes.map((t) => <option key={t} value={t}>{t}</option>)}

        </SelectRow>

        <SelectRow
          label="Station HQ"
          value={form.stationHQ}
          onChange={(v: string) =>setForm((prev) => ({...prev,stationHQ: v,}))}
          required
        >
          <option value="" disabled hidden>Select Station HQ</option>
          {stationHQs.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectRow>

        <InputRow
          label="Rank"
          value={form.rank}
          onChange={(v: string) =>setForm((prev) => ({...prev,rank: v,}))}
          placeholder="Enter rank"
        />

        <InputRow
          label="Army No"
          value={form.armyNumber}
          onChange={(v: string) =>setForm((prev) => ({...prev,armyNumber: v,}))}
          placeholder="Enter army number"
        />

        {/* Description */}
        <div className="py-3 border-b lg:border-none border-[#1f1f23]">
          <label className="block text-sm text-foreground font-normal text-[#FFFFFF] mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) =>setForm((prev) => ({...prev,description: e.target.value,}))}
            rows={4}
            placeholder="Describe your grievance..."
            className="w-full bg-[#242424]  rounded-md px-4 py-3 text-sm text-white placeholder:text-[#75717D] outline-none focus:border-[#826CF3] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          // disabled={createGrievance.isPending}
          disabled={createGrievance.isPending ||!form.concernType ||!form.caseType ||!form.stationHQ}
          className="mt-6 w-full bg-[#826CF3] text-white font-bold text-sm py-4 mb-4 lg:my-1 rounded-xl shadow-[0_4px_12px_rgba(23,84,207,0.2)] flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 lg:w-[30%] lg:mx-auto"
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

      {/* Global overrides for native select/option */}
      <style>{`
        select option  { background-color: #1c1c1e; color: #ffffff; }
        select:required:invalid { color: #6b7280; }
      `}</style>
    </div>
  );
});
