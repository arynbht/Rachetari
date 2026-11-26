// Main imports this first thing, so the Rivetari userData is copied across
// (store/migrate) before anything reads repos.json or settings.json. Not under
// E2E, whose userData is a fresh temp folder.
import { app } from "electron";

import { copyRivetariUserData } from "./migrate";

if (process.env.RACHETARI_E2E !== "1")
  copyRivetariUserData(app.getPath("userData"));
