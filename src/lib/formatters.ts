export function getTodayYYYYMMDD(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function formatDateToYYYYMMDD(val: any): string {
  if (!val) return getTodayYYYYMMDD();

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return getTodayYYYYMMDD();

    // 1. If ISO string or contains time/timezone (e.g. "2026-08-09T17:00:00.000Z", "2026-08-09 17:00:00")
    if (trimmed.includes('T') || trimmed.includes('Z') || /\d{2}:\d{2}/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        try {
          return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(parsed);
        } catch {
          // Fallback
        }
      }
    }

    // 2. Pure YYYY-MM-DD or YYYY/MM/DD (exact date match without time component)
    const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (matchYMD) {
      const y = matchYMD[1];
      const m = matchYMD[2].padStart(2, '0');
      const d = matchYMD[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // 3. Pure DD-MM-YYYY or DD/MM/YYYY (exact date match without time component)
    const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (matchDMY) {
      const d = matchDMY[1].padStart(2, '0');
      const m = matchDMY[2].padStart(2, '0');
      const y = matchDMY[3];
      return `${y}-${m}-${d}`;
    }

    // 4. Fallback for other date string formats
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(parsed);
      } catch {}
    }
    return trimmed;
  }

  if (typeof val === 'number') {
    if (val > 30000 && val < 60000) {
      // Excel/Google Sheets serial date
      const utcMs = Math.round((val - 25569) * 86400 * 1000);
      const parsed = new Date(utcMs);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getUTCFullYear();
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(parsed);
      } catch {}
    }
    return getTodayYYYYMMDD();
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return getTodayYYYYMMDD();
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(val);
    } catch {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return getTodayYYYYMMDD();
}

export function formatRupiah(angka: number | string | undefined | null): string {
  const val = typeof angka === 'number' ? angka : Number(angka) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
}

export function formatSignedRupiah(angka: number | string | undefined | null): string {
  const val = typeof angka === 'number' ? angka : Number(angka) || 0;
  if (val > 0) {
    return '+' + formatRupiah(val);
  }
  if (val < 0) {
    return '-' + formatRupiah(Math.abs(val));
  }
  return formatRupiah(0);
}

export function formatAngka(angka: number | string | undefined | null): string {
  const val = typeof angka === 'number' ? angka : Number(angka) || 0;
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2
  }).format(val);
}

export function formatTanggalDisplay(tanggal: any): string {
  if (!tanggal) return '';
  const str = formatDateToYYYYMMDD(tanggal);
  const parts = str.split('-');
  if (parts.length !== 3) return String(tanggal);
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatTanggalLengkap(tanggal: any): string {
  if (!tanggal) return '';
  const str = formatDateToYYYYMMDD(tanggal);
  const parts = str.split('-');
  if (parts.length !== 3) return String(tanggal);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mIdx = Number(parts[1]) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${Number(parts[2])} ${monthNames[mIdx]} ${parts[0]}`;
  }
  return str;
}

export function parseRupiah(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
}

export function formatThousandDisplay(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const digits = String(val).replace(/[^0-9]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatInputRupiah(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseRupiah(val);
  if (num === 0) return '';
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

export function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
