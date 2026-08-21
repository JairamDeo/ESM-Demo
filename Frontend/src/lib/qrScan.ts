const QR_SCAN_KEY = "vitric_qr_scan";

export type QrScanContext = {
  station: string;
  code?: string;
  scannedAt: string;
};

export function saveQrScan(station: string, code?: string | null) {
  const name = String(station || "").trim();
  if (!name) return;
  const payload: QrScanContext = {
    station: name,
    code: code ? String(code).trim() : undefined,
    scannedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(QR_SCAN_KEY, JSON.stringify(payload));
}

/** Persist station/code from a scanned QR URL without clearing an existing scan. */
export function captureQrScanFromSearch(search = window.location.search) {
  const params = new URLSearchParams(search);
  const station = params.get("station");
  const code = params.get("code");
  if (station) saveQrScan(station, code);
}

export function getQrScan(): QrScanContext | null {
  try {
    const raw = sessionStorage.getItem(QR_SCAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QrScanContext;
    if (!parsed?.station) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getQrScanStation(): string {
  return getQrScan()?.station || "";
}

export function clearQrScan() {
  sessionStorage.removeItem(QR_SCAN_KEY);
}
