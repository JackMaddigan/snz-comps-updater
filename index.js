import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const currentComps = JSON.parse(
  fs.readFileSync(path.resolve("competitions.json"), "utf8")
);

async function updateComps() {
  try {
    console.log("WORKING...");
    const newComps = [];

    const options = {
      timeZone: "Pacific/Auckland",
    };
    const now = new Date(new Date().toLocaleString("en-US", options));
    now.setHours(0, 0, 0, 0);

    const thirtyDaysBeforeNow = new Date(now);
    thirtyDaysBeforeNow.setDate(now.getDate() - 30);

    const currentCompIds = new Set(currentComps.map((comp) => comp.id));

    const response = await fetch(
      "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/competitions/NZ.json"
    );

    const comps = (await response.json())?.items;

    for (const comp of comps) {
      if (currentCompIds.has(comp.id)) continue;
      const till = new Date(
        new Date(comp.date.till).toLocaleString("en-US", options)
      );
      till.setHours(0, 0, 0, 0);
      if (till < thirtyDaysBeforeNow) break; // past the old ones now
      const supplementaryData = await getWcaData(comp.id);
      newComps.push({
        id: comp.id,
        name: comp.name,
        city: comp.city,
        date: comp.date,
        isCanceled: comp.isCanceled,
        events: comp.events,
        venue: comp.venue,
        ...supplementaryData,
      });
    }

    if (newComps.length) {
      // remove older comps from the file
      const allComps = currentComps
        .filter((comp) => new Date(comp.date.till) > thirtyDaysBeforeNow)
        .concat(newComps)
        .sort((a, b) => a.date.from - b.date.from);

      // write to file
      console.log("WRITING...");
      fs.writeFileSync(
        "./competitions.json",
        JSON.stringify(allComps, null, 2)
      );
      console.log("DONE");
    }
  } catch (error) {
    console.error(error);
  }
}

async function getWcaData(compId) {
  try {
    const response = await fetch(
      `https://api.worldcubeassociation.org/competitions/${compId}`
    );

    const comp = await response.json();
    return {
      registration_open: comp.registration_open,
      registration_close: comp.registration_close,
      registration_full: comp["registration_full?"],
    };
  } catch (error) {
    console.error(error);
  }
}

updateComps().catch(console.error);
