import { usePermissions } from "@/stores/rbac";
import { useState, memo, useCallback, useMemo, useEffect } from "react";
import { QrCode, Download, Eye, RefreshCw, X, Plus, Search, ChevronDown } from "lucide-react";
import QRCode from "react-qr-code";
import { useQRCodes, useGenerateQRCode, useRegenerateQRCode, useToggleQRStatus, useStations, getQRDownloadUrl } from "@/hooks/useApi";
import { toast } from "sonner";

type QRCodeData = Record<string, unknown> & {
  _id?: string;
  code: string;
  stationName?: string;
  station?: string;
  status?: string;
  qrData?: string;
  qrCodeData?: string;
  totalScans?: number;
  scans?: number;
  lastScannedAt?: string | Date;
  lastScan?: string;
};

export default memo(function QRCodes() {
  const permissions = usePermissions();
  const canManageQRCodes = permissions.manageQRCodes;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [form, setForm] = useState({ stationId: "", stationName: "" });

  const { data: qrCodes = [], isLoading } = useQRCodes({ search, status: filterStatus || undefined });
  const { data: stationsData } = useStations();
  const generate = useGenerateQRCode();
  const regenerate = useRegenerateQRCode();
  const toggle = useToggleQRStatus();

  const stations = useMemo(() => {
    const list = (stationsData?.data || []) as Array<{ _id: string; name: string }>;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [stationsData]);

  useEffect(() => {
    if (!open || stations.length === 0) return;
    const stillValid = stations.some((s) => s._id === form.stationId);
    if (!stillValid) {
      setForm({ stationId: stations[0]._id, stationName: stations[0].name });
    }
  }, [open, stations, form.stationId]);

  const handleGenerate = useCallback(async () => {
    if (!form.stationName) return;
    await generate.mutateAsync({
      stationName: form.stationName,
      stationId: form.stationId || undefined,
    });
    setForm({ stationId: "", stationName: "" });
    setOpen(false);
  }, [form, generate]);

  const handleDownload = useCallback((qr: QRCodeData) => {
    if (qr._id) {
      window.open(getQRDownloadUrl(qr._id), "_blank");
    } else {
      const svgEl = document.getElementById(`qr-${qr.code}`);
      if (!svgEl) return;
      const svg = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${qr.code}.svg`; a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("QR Code downloaded!");
  }, []);

  const handleRegenerate = useCallback(async (qr: QRCodeData) => {
    if (qr._id) await regenerate.mutateAsync(qr._id);
    else toast.info("QR regenerated (local)");
  }, [regenerate]);

  const handleToggle = useCallback(async (qr: QRCodeData) => {
    if (qr._id) await toggle.mutateAsync(qr._id);
  }, [toggle]);
 
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR Codes</h1>
          <p className="text-muted-foreground text-sm mt-1">QR codes installed at all {qrCodes.length} Station HQs for digital grievance submission</p>
        </div>
        {canManageQRCodes && (
          <button onClick={() => setOpen(true)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 self-start sm:self-auto">
            <QrCode className="w-4 h-4" /> Generate New
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search QR codes..." className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full" />
        </div>

        <div className="relative">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none bg-secondary/50 border border-border rounded-lg px-3 py-2 pr-10 text-sm text-foreground outline-none cursor-pointer hover:bg-secondary/80"
  >         <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
        </div>
      </div>

      {/* Generate Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Generate QR Code</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Station *</label>
            <div className="relative mt-1">
            <select
              value={form.stationId}
              onChange={(e) => {
                const selected = stations.find((s) => s._id === e.target.value);
                setForm({ stationId: e.target.value, stationName: selected?.name || "" });
              }}
              className="w-full appearance-none px-3 py-2 pr-10 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary"
            >
              {stations.length === 0 && <option value="">No stations available</option>}
              {stations.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground pointer-events-none" />
          </div>
          </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setOpen(false)} className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm">Cancel</button>
                <button onClick={handleGenerate} disabled={generate.isPending || !form.stationName} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {generate.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">QR Preview</h2>
              <button onClick={() => setSelectedQR(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-white p-4 rounded-xl inline-block mb-3">
              <QRCode value={(selectedQR.qrData || selectedQR.code) as string} size={200} />
            </div>
            <p className="text-sm font-medium text-foreground">{(selectedQR.stationName || selectedQR.station) as string}</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">{selectedQR.code}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { handleDownload(selectedQR); setSelectedQR(null); }} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => setSelectedQR(null)} className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-64 bg-card rounded-xl border border-border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr: QRCodeData) => (
            <div key={qr._id || qr.code} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${qr.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{qr.status}</span>
                <span className="text-xs font-mono text-muted-foreground">{qr.code}</span>
              </div>
              {/* <div className="w-full aspect-square bg-white rounded-lg flex items-center justify-center mb-4 p-3"> */}
              <div className="w-60 h-60 bg-white rounded-lg flex items-center justify-center mb-4 p-2 mx-auto">
                <QRCode id={`qr-${qr.code}`} value={(qr.qrData || qr.code) as string} size={120} />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{(qr.stationName || qr.station) as string}</h3>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>{Number(qr.totalScans ?? qr.scans ?? 0)} scans</span>
                <span>Last: {qr.lastScannedAt ? new Date(qr.lastScannedAt).toLocaleDateString("en-IN") : (qr.lastScan as string) || "Never"}</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => handleDownload(qr)} className="flex-1 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => setSelectedQR(qr)} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye className="w-4 h-4" /></button>
                {canManageQRCodes && (
                  <button onClick={() => handleRegenerate(qr)} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
          {qrCodes.length === 0 && (
            <div className="col-span-3 py-16 text-center text-muted-foreground">No QR codes found.</div>
          )}
        </div>
      )}
    </div>
  );
});
