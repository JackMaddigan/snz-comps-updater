import fs from "fs";
import fetch from "node-fetch";
import { setTimeout } from "timers/promises";

async function runUpdate() {
  console.info("Starting Update...")
  // Dates for comparing to the comps
  const now = new Date();
  const thirtyDaysBeforeNow = new Date(now);
  thirtyDaysBeforeNow.setDate(now.getDate() - 30);

  // Fetch currentComps from the json file and fetch the updated ones from unnoficial WCA api
  const data = JSON.parse(fs.readFileSync("./data.json"));
  const currentComps = data.competitions ? data.competitions.filter(comp => new Date(comp.date.till) > thirtyDaysBeforeNow) : [];
  const updatedComps = (await getUpdatedComps()).items;

  // Filter updatedComps to only include ones that are recent, current or future and not canceled, and remove a few fields
  const filteredUpdatedComps = updatedComps
    .filter((comp) => new Date(comp.date.till) > thirtyDaysBeforeNow && !comp.isCanceled)
    .map(({information, wcaDelegates, organisers, ...comp}) => comp);
  
  // for each filteredUpdatedComps, if it is in currentComps then add the reg date to it, else fetch from WCA
  // so that I don't have to update every field if something is changed such as events
  for(const comp of filteredUpdatedComps){
    comp.registration = currentComps.find(cc => cc.id==comp.id)?.registration || await getRegDatesFromWCA(comp.id);
  }

  // add any comps from currentComps that are not in updatedComps that may have been added manually such as an FMC multilocation
  // currentComps was already filtered so that old comps are no longer in it
  const filteredUpdatedCompsIds = filteredUpdatedComps.map(comp => comp.id);
  const manualComps = currentComps.filter(comp => {console.log(comp.id);return !filteredUpdatedCompsIds.includes(comp.id)});
  const processedComps = filteredUpdatedComps.concat(manualComps).sort((a, b) => a.date.from.localeCompare(b.date.from));

  fs.writeFileSync("./data.json", JSON.stringify({competitions: processedComps}, null, 2));
  console.info("Update Finished!")
}

async function getUpdatedComps() {
  const response = await fetch(`https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/competitions/NZ.json`);
  return await response.json();
}

async function getRegDatesFromWCA(compId){
    console.info("Fetching reg info for "+compId);
    await setTimeout(500);
    const response = await fetch(
      `https://api.worldcubeassociation.org/competitions/${compId}`
    );

    const { registration_open,registration_close } = await response.json();
    return { open: registration_open, close: registration_close };
}

runUpdate().catch(error => {
  console.error("An error occurred while running the update!\n", error);
});
