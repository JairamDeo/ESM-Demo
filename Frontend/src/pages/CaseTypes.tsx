import { memo } from "react";
import { FileText, Users, CreditCard, Heart, Phone, MapPin, Shield, UserPlus, Receipt, FileCheck, Calendar, UserCog, Home, TrendingUp, Locate, Bell } from "lucide-react";
import { useCaseTypes } from "@/hooks/useApi";

const ICONS: Record<number, any> = { 1:FileText,2:Heart,3:CreditCard,4:Shield,5:Phone,6:MapPin,7:Shield,8:UserPlus,9:Receipt,10:FileCheck,11:Calendar,12:UserCog,13:Home,14:TrendingUp,15:Locate,16:Bell };

export default memo(function CaseTypes() {
  const { data: caseTypes = [], isLoading } = useCaseTypes();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Case Types</h1>
        <p className="text-muted-foreground text-sm mt-1">16 digital case types enabled via the ESM portal</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(16).fill(0).map((_, i) => (
          <div key={i} className="h-44 bg-card rounded-xl border border-border animate-pulse" />
        )) : caseTypes.map((ct: any) => {
          const Icon = ICONS[ct.id] || FileText;
          return (
            <div key={ct._id || ct.id} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all group cursor-pointer ">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">#{String(ct.id).padStart(2, "0")}</span>
              </div>
            
              <h3 className="font-semibold text-foreground text-sm">{ct.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{ct.description || ct.desc}</p>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                <div><p className="text-lg font-bold text-foreground">{ct.totalCases}</p><p className="text-xs text-muted-foreground">Total</p></div>
                <div><p className="text-lg font-bold text-warning">{ct.pendingCases}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                <div><p className="text-lg font-bold text-success">{ct.resolvedCases}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
