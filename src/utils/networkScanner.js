export async function scanSubnet(subnet, port = 5000) {
  const batchSize = 35;
  
  // Scan IPs from 2 to 254 in batches to avoid browser connection pooling blocks
  for (let i = 2; i <= 254; i += batchSize) {
    const batchPromises = [];
    const end = Math.min(i + batchSize - 1, 254);
    
    for (let ip = i; ip <= end; ip++) {
      const targetIp = `${subnet}.${ip}`;
      const url = `http://${targetIp}:${port}/api/config/locations`;
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 200); // 200ms local Wi-Fi ping timeout
      
      const p = fetch(url, { signal: controller.signal })
        .then(res => {
          clearTimeout(id);
          // If we get any valid response, it means the server is alive and responding
          if (res.status === 200) {
            return targetIp;
          }
          return null;
        })
        .catch(() => {
          clearTimeout(id);
          return null;
        });
        
      batchPromises.push(p);
    }
    
    const results = await Promise.all(batchPromises);
    const found = results.find(r => r !== null && r !== undefined);
    if (found) {
      return found; // Return the discovered server IP immediately
    }
  }
  return null;
}

export async function discoverLocalServer(onStatusUpdate) {
  // Most common local subnets used by routers in India (Jio, Airtel, Mi, TP-Link, D-Link, Win Hotspot)
  const commonSubnets = [
    '192.168.1',   // Airtel / TP-Link
    '192.168.29',  // JioFiber
    '192.168.31',  // Xiaomi / Mi Routers
    '192.168.0',   // D-Link / Netgear
    '192.168.137', // Windows Hotspot
    '192.168.8',   // Huawei 4G Dongle
    '10.0.0'       // Comcast / corporate routers
  ];
  
  for (const subnet of commonSubnets) {
    if (onStatusUpdate) {
      onStatusUpdate(`Scanning ${subnet}.x network...`);
    }
    const foundIp = await scanSubnet(subnet, 5000);
    if (foundIp) {
      return `http://${foundIp}:5000`;
    }
  }
  return null;
}
