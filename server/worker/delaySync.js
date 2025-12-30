function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

exports.callSleep = async (sleepTime) => {
  await sleep(sleepTime);
}