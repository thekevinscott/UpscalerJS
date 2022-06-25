const splitParts = (version: string) => {
  try {
    const firstPart = version.split('-')[0];
    return firstPart.split(".");
  } catch(err) {
    console.error(`Could not split version ${version}`);
    throw err;
  }
}
export default (version: string) => {
  const parts = splitParts(version);
  if (parts.length !== 3) {
    return false;
  }
  for (let i = 0; i < 3; i++) {
    try {
      parseInt(parts[i], 10);
    } catch(err) {
      return false;
    }
  }
  return true;
}
