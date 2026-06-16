let latestFrame = null;

function getMaxFrameSizeMb() {
  const mb = Number(process.env.MAX_FRAME_SIZE_MB || 2);
  return Number.isFinite(mb) && mb > 0 ? mb : 2;
}

function saveFrame(buffer) {
  latestFrame = {
    buffer: Buffer.from(buffer),
    mimeType: 'image/jpeg',
    sizeBytes: buffer.length,
    receivedAt: new Date().toISOString()
  };

  return latestFrame;
}

function getFrame() {
  return latestFrame;
}

function getFrameInfo() {
  if (!latestFrame) {
    return {
      available: false,
      mimeType: 'image/jpeg',
      sizeBytes: 0,
      receivedAt: null
    };
  }

  return {
    available: true,
    mimeType: latestFrame.mimeType,
    sizeBytes: latestFrame.sizeBytes,
    receivedAt: latestFrame.receivedAt
  };
}

module.exports = {
  getMaxFrameSizeMb,
  saveFrame,
  getFrame,
  getFrameInfo
};
