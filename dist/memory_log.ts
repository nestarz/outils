function transformMemoryMetrics(memoryMetrics: ReturnType<Deno.memoryUsage>) {
  const bytesInMB = 1024 * 1024; // Bytes in 1MB

  let transformedMetrics: any = {};
  for (let key in memoryMetrics) {
    transformedMetrics[key] = (memoryMetrics[key] / bytesInMB).toFixed(2) +
      " MB";
  }

  const rss = transformedMetrics.rss;
  if (rss > 512) {
    throw Error("GCP memory usage exceeds the limit! " + rss);
  } else {
    return rss;
  }
}

if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  const watchMemory = () => {
    const memory = transformMemoryMetrics(Deno.memoryUsage());
    console.log(memory);
  };
  watchMemory();
  setInterval(watchMemory, 1000);
}
