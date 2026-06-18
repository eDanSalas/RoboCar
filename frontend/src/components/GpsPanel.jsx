import { ExternalLink, MapPin, Navigation, Satellite } from 'lucide-react';

function GpsPanel({ gps }) {
  const hasFix = Boolean(gps?.valid && isFiniteCoordinate(gps.lat, gps.lng));
  const mapUrl = hasFix ? buildMapUrl(gps.lat, gps.lng) : '';
  const mapsLink = hasFix ? (gps.mapsUrl || `https://maps.google.com/?q=${gps.lat},${gps.lng}`) : '';

  return (
    <section className="panel gps-panel" aria-label="GPS">
      <div className="panel-title">
        <Satellite size={18} />
        <span>GPS</span>
      </div>

      <div className="gps-grid">
        <GpsRow label="FIX" value={hasFix ? 'LOCKED' : 'NO FIX'} tone={hasFix ? 'ok' : 'warn'} />
        <GpsRow label="SATELLITES" value={gps?.satellites ?? 0} />
        <GpsRow label="LAT" value={hasFix ? formatCoordinate(gps.lat) : 'WAITING'} />
        <GpsRow label="LNG" value={hasFix ? formatCoordinate(gps.lng) : 'WAITING'} />
        <GpsRow label="HDOP" value={formatOptionalNumber(gps?.hdop, 2)} />
        <GpsRow label="ALT M" value={formatOptionalNumber(gps?.altitudeMeters, 1)} />
        <GpsRow label="SPEED KM/H" value={formatOptionalNumber(gps?.speedKmph, 2)} />
        <GpsRow label="COURSE" value={formatOptionalNumber(gps?.courseDeg, 1)} />
      </div>

      <div className="gps-map">
        {hasFix ? (
          <iframe
            title="GPS map"
            src={mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="map-placeholder">
            <MapPin size={30} />
            <span>WAITING FOR GPS FIX...</span>
          </div>
        )}
      </div>

      <div className="gps-footer">
        <span>RX: {gps?.receivedAt || 'WAITING'}</span>
        {hasFix && (
          <a href={mapsLink} target="_blank" rel="noreferrer">
            <Navigation size={14} />
            <span>OPEN MAP</span>
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </section>
  );
}

function GpsRow({ label, value, tone = 'normal' }) {
  return (
    <div className={`gps-row ${tone}`}>
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

function buildMapUrl(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const delta = 0.008;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta
  ].join('%2C');

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function isFiniteCoordinate(lat, lng) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function formatOptionalNumber(value, digits) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : 'N/A';
}

export default GpsPanel;
