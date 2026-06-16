import { useEffect, useState } from 'react';
import { Camera, ImageOff } from 'lucide-react';

function CameraFeed({ imageSrc, cameraInfo }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [imageSrc]);

  const showImage = imageSrc && !hasError;
  const receivedAt = cameraInfo?.receivedAt || 'NO SIGNAL';
  const sizeBytes = cameraInfo?.sizeBytes ? `${cameraInfo.sizeBytes} B` : '0 B';

  return (
    <section className="panel camera-panel" aria-label="Camera feed">
      <div className="panel-title">
        <Camera size={18} />
        <span>CAMERA FEED</span>
      </div>

      <div className="camera-viewport">
        {showImage && (
          <img
            src={imageSrc}
            alt="ESP32-CAM latest frame"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={isLoaded ? 'visible' : ''}
          />
        )}

        {(!showImage || !isLoaded) && (
          <div className="camera-placeholder">
            <ImageOff size={34} />
            <span>{hasError || !imageSrc ? 'WAITING FOR CAMERA FRAME...' : 'SYNCING CAMERA FRAME...'}</span>
          </div>
        )}
      </div>

      <div className="camera-meta">
        <span>FRAME: {cameraInfo?.available ? 'AVAILABLE' : 'PENDING'}</span>
        <span>SIZE: {sizeBytes}</span>
        <span>RX: {receivedAt}</span>
      </div>
    </section>
  );
}

export default CameraFeed;
