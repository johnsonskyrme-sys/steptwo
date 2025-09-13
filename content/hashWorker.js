// Enhanced hash worker using PerceptualDuplicateDetector for better efficiency
// This provides backward compatibility while using the advanced detection system

importScripts('./perceptual-duplicate-detector.js');

self.onmessage = async e => {
  const {id, url, options = {}} = e.data;
  try {
    // Use the enhanced detector's simple API for backward compatibility
    const hash = await PerceptualDuplicateDetector.generateSimpleHash(url);
    self.postMessage({id, hash});
  } catch(err){
    console.error('Hash worker error:', err);
    self.postMessage({id, error: true, message: err.message});
  }
};

// Fallback functions for cases where the detector isn't available
function loadImage(src){
  return new Promise((res,rej) => {
    const img = new Image();
    img.crossOrigin='anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function averageHash(img){
  const size=8;
  const canvas = new OffscreenCanvas(size,size);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img,0,0,size,size);
  const data = ctx.getImageData(0,0,size,size).data;
  let total=0; const gray=[];
  for(let i=0;i<data.length;i+=4){
    const g = 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
    gray.push(g); total+=g;
  }
  const avg = total/64;
  let hash=0n;
  gray.forEach((val,idx) => { if(val>avg) {hash |= (1n<<BigInt(idx));} });
  return hash.toString(16);
}