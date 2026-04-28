import { useState, memo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useCreateGrievance } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const caseTypes = ["Update Name","Death Intimation","Resolve Pension Issues","Update Aadhaar & PAN","Update Mobile & Email","Update Address","Stop FMA","Add Nominee","Monthly Pay Slip","Pension Payment Order","Update DOB of Spouse","Update Spouse Details","Add/Update Family Details","Grievance for Increment","Track Case Status","SMS / Portal Alerts"];
const stationHQs = ["Nagpur Station HQ","Pune Station HQ","Ahmedabad Station HQ","Nashik Station HQ","Aurangabad Station HQ","Kolhapur Station HQ","Rajkot Station HQ","Surat Station HQ","Solapur Station HQ","Baroda Station HQ"];

export default memo(function RaiseGrievance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const preselectedType = (location.state as any)?.caseType || "";

  const [form, setForm] = useState({ concernType:"Self", mobileType:"registered", caseType:preselectedType, stationHQ:"", description:"", serviceNumber:"", rank:"" });
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
        veteranArmyNo: form.serviceNumber,
        stationName: form.stationHQ,
        description: form.description,
        submissionSource: "portal",
        priority: "medium",
      });
      toast.success("Grievance submitted successfully!", { description: `Complaint ID: ${result?.grievanceId || "Generated"}` });
      navigate("/user/complaints");
    } catch {
      // error handled by hook
    }
  }, [form, user, createGrievance, navigate]);

  const SelectRow = ({ label, value, onChange, children, required = false }: any) => (
    <div>
      <label className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
      <div className="mt-1.5 relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground appearance-none outline-none focus:border-primary transition-colors">
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="px-4 space-y-5 animate-fade-in pb-6">
      <div className="flex items-center gap-3">
        <Link to="/user" className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-foreground">Personal Details</h1>
      </div>
      <div className="space-y-4">
        <SelectRow label="Concern For" value={form.concernType} onChange={(v: string) => setForm({...form, concernType:v})} required>
          <option value="">Select concern type</option>
          <option value="Self">Self</option>
          <option value="Dependent">Dependent</option>
        </SelectRow>
        <SelectRow label="Mobile Number" value={form.mobileType} onChange={(v: string) => setForm({...form, mobileType:v})} required>
          <option value="">Select mobile type</option>
          <option value="registered">Registered Mobile</option>
          <option value="alternate">Alternate Mobile</option>
        </SelectRow>
        <SelectRow label="Case Type" value={form.caseType} onChange={(v: string) => setForm({...form, caseType:v})} required>
          <option value="">Select case type</option>
          {caseTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </SelectRow>
        <SelectRow label="Station HQ" value={form.stationHQ} onChange={(v: string) => setForm({...form, stationHQ:v})} required>
          <option value="">Select Station HQ</option>
          {stationHQs.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectRow>
        <div>
          <label className="text-sm font-medium text-foreground">Service Number</label>
          <input type="text" value={form.serviceNumber} onChange={(e) => setForm({...form, serviceNumber:e.target.value})} placeholder="Enter service number" className="mt-1.5 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Rank</label>
          <input type="text" value={form.rank} onChange={(e) => setForm({...form, rank:e.target.value})} placeholder="Enter rank" className="mt-1.5 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} rows={4} placeholder="Describe your grievance..." className="mt-1.5 w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none" />
        </div>
        <button onClick={handleSubmit} disabled={createGrievance.isPending} className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
          {createGrievance.isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting...</> : "Submit Grievance"}
        </button>
      </div>
    </div>
  );
});
