import { memo, useState } from "react";
import { Megaphone, Send, Clock, Check, Building2, Bell, Smartphone } from "lucide-react";
import { useAnnouncements, useCreateAnnouncement, useStations } from "@/hooks/useApi";

export default memo(function Announcements() {
  const { data: announcements = [], isLoading: loadingAnnouncements } = useAnnouncements();
  const { data: stationsData, isLoading: loadingStations } = useStations({ limit: 1000 });
  const createAnnouncement = useCreateAnnouncement();

  const [form, setForm] = useState({
    title:            "",
    message:          "",
    sendToAll:        true,
    selectedStations: [] as string[],
    sms:              false,
    push:             false,
  });

  const stations = stationsData?.data || [];

  const handleToggleStation = (id: string) => {
    setForm((prev) => {
      const selected = prev.selectedStations.includes(id)
        ? prev.selectedStations.filter((s) => s !== id)
        : [...prev.selectedStations, id];
      return { ...prev, selectedStations: selected };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    const confirmed = window.confirm(`Send announcement "${form.title}" to ${form.sendToAll ? "all stations" : `${form.selectedStations.length} station(s)`}?`);
    if (!confirmed) return;

    await createAnnouncement.mutateAsync({
      title:          form.title.trim(),
      message:        form.message.trim(),
      targetStations: form.sendToAll ? [] : form.selectedStations,
      sentViaSMS:     form.sms,
      sentViaPush:    form.push,
    });

    setForm({ title: "", message: "", sendToAll: true, selectedStations: [], sms: false, push: false });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> Announcements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and broadcast announcements to Station HQs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Create Announcement Form ── */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 h-fit">
          <h2 className="text-base font-semibold text-foreground">New Announcement</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Upcoming Pension Adalat"
                className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary placeholder:text-muted-foreground"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Detailed announcement text..."
                rows={4}
                className="mt-1 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground"
                required
              />
            </div>

            {/* Target Stations */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target Stations</label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sendToAll: true, selectedStations: [] })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${form.sendToAll
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                    }`}
                >
                  All Stations
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sendToAll: false })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    ${!form.sendToAll
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                    }`}
                >
                  Select Stations
                </button>
              </div>

              {/* Station selection list */}
              {!form.sendToAll && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg bg-secondary/30 p-2 space-y-1">
                  {loadingStations ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">Loading stations...</p>
                  ) : stations.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2 text-center">No stations found.</p>
                  ) : (
                    stations.map((s: any) => (
                      <label
                        key={s._id}
                        onClick={() => handleToggleStation(s._id)}
                        className="flex items-center gap-3 p-2 hover:bg-secondary rounded-md cursor-pointer group"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0
                          ${form.selectedStations.includes(s._id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40 group-hover:border-primary/50"
                          }`}
                        >
                          {form.selectedStations.includes(s._id) && (
                            <Check className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.city} · {s.stateName || s.state}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {/* Selected count */}
              {!form.sendToAll && form.selectedStations.length > 0 && (
                <p className="text-xs text-primary mt-1.5 font-medium">
                  {form.selectedStations.length} station{form.selectedStations.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Delivery Methods */}
            <div className="border-t border-border pt-4">
              <label className="text-xs font-medium text-muted-foreground">Delivery Methods</label>
              <div className="flex gap-3 mt-2">

                {/* SMS Toggle */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, sms: !form.sms })}
                  className={`flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-lg border transition-all
                    ${form.sms
                      ? "bg-info/10 border-info/30 text-info"
                      : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                    }`}
                >
                  {/* Toggle pill */}
                  <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0
                    ${form.sms ? "bg-info" : "bg-muted-foreground/30"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all
                      ${form.sms ? "left-4" : "left-0.5"}`}
                    />
                  </div>
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">SMS Alert</span>
                </button>

                {/* Push Toggle */}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, push: !form.push })}
                  className={`flex items-center gap-2.5 flex-1 px-3 py-2.5 rounded-lg border transition-all
                    ${form.push
                      ? "bg-warning/10 border-warning/30 text-warning"
                      : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                    }`}
                >
                  {/* Toggle pill */}
                  <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0
                    ${form.push ? "bg-warning" : "bg-muted-foreground/30"}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all
                      ${form.push ? "left-4" : "left-0.5"}`}
                    />
                  </div>
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">Push Notification</span>
                </button>

              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                createAnnouncement.isPending ||
                !form.title.trim() ||
                !form.message.trim() ||
                (!form.sendToAll && form.selectedStations.length === 0)
              }
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createAnnouncement.isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="w-4 h-4" /> Send Announcement</>
              }
            </button>

          </form>
        </div>

        {/* ── Past Announcements ── */}
        <div className="bg-card rounded-xl border border-border flex flex-col" style={{ maxHeight: "700px" }}>
          <div className="p-4 border-b border-border shrink-0">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Past Announcements
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingAnnouncements ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-28 bg-secondary/30 rounded-lg animate-pulse" />
              ))
            ) : announcements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                <Megaphone className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No announcements yet</p>
                <p className="text-xs mt-1 opacity-60">Announcements you send will appear here</p>
              </div>
            ) : (
              announcements.map((ann: any) => (
                <div key={ann._id} className="bg-secondary/20 border border-border rounded-lg p-4 hover:border-primary/20 transition-colors">

                  {/* Title + Date */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{ann.title}</h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-secondary px-2 py-0.5 rounded-full shrink-0">
                      {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ann.message}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      {ann.targetStations?.length > 0
                        ? `${ann.targetStations.length} Station${ann.targetStations.length > 1 ? "s" : ""}`
                        : "All Stations"
                      }
                    </div>

                    <div className="flex gap-1.5">
                      {ann.sentViaSMS && (
                        <span className="bg-info/10 text-info text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Smartphone className="w-2.5 h-2.5" /> SMS
                        </span>
                      )}
                      {ann.sentViaPush && (
                        <span className="bg-warning/10 text-warning text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5" /> Push
                        </span>
                      )}
                      {!ann.sentViaSMS && !ann.sentViaPush && (
                        <span className="bg-secondary text-muted-foreground text-[9px] px-2 py-0.5 rounded-full">
                          Portal only
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
});