import fs from "fs";
import fetch from "node-fetch";

runUpdate();

async function runUpdate() {
  console.log("Starting update!");

  const comps = JSON.parse(fs.readFileSync("./competitions.json"));
  const knownCompIds = new Set(comps.map((comp) => comp.id));

  console.log(
    "Fetching comps from https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/competitions/NZ.json"
  );

  const response = await fetch(
    "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/competitions/NZ.json"
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const thirtyDaysBeforeNow = new Date(now);
  thirtyDaysBeforeNow.setDate(now.getDate() - 30);

  const fetchedComps = (await response.json()).items;

  for (const comp of fetchedComps) {
    if (knownCompIds.has(comp.id)) continue;
    const till = new Date(comp.date.till);
    if (till < thirtyDaysBeforeNow) break;
    console.log(`New comp: ${comp.name}`);
    // prettier-ignore
    const { id, name, city, date, isCanceled, events, venue: { name: venue, coordinates }} = comp;
    // prettier-ignore
    const newComp = { id, name, city, date, isCanceled, events, venue: { name: venue, coordinates, }, ...(await fetchWCACompData(comp.id)), };
    comps.push(newComp);
  }

  const sortedFilteredComps = comps
    .filter(
      (comp) =>
        new Date(comp.date.from) > thirtyDaysBeforeNow && !comp.isCanceled
    )
    .sort((a, b) => (new Date(a.date.from) < new Date(b.date.from) ? 1 : -1));

  console.log("Writing to competitions.json...");
  fs.writeFileSync(
    "./competitions.json",
    JSON.stringify(sortedFilteredComps, null, 2)
  );
  console.log("Finished");
}

async function fetchWCACompData(compId) {
  try {
    const response = await fetch(
      `https://api.worldcubeassociation.org/competitions/${compId}`
    );

    const comp = await response.json();
    return {
      registration_open: comp.registration_open,
      registration_close: comp.registration_close,
      use_wca_registration: comp.use_wca_registration,
    };
  } catch (error) {
    console.error(error);
  }
}
