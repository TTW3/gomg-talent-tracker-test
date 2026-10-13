# GOMG Gear Database & automatic updates

- `gear-database.json` contains the current gear records from the GOMG Wiki Search Gear page.
- `gear-database.js` renders the Gear Database tab and supports text search plus filters for tier, slot, class, and area.
- `tools/update_gear_database.py` downloads the wiki's embedded `const GEAR` array and validates the result before replacing the local JSON file.
- `.github/workflows/update-gear-database.yml` runs weekly (Monday 03:31 UTC / 10:31 Vietnam time) and can also be run manually.

## Run an update manually
In GitHub, open **Actions → Update GOMG gear database → Run workflow**.

## Safety
The updater refuses to overwrite the file if the source page is unavailable, the data is suspiciously small, records lack IDs/names, or duplicate IDs are found. It commits only when the JSON changes.

## Files added/changed in this update
- Added `gear-database.json`
- Added `gear-database.js`
- Added `tools/update_gear_database.py`
- Added `.github/workflows/update-gear-database.yml`
- Updated `index.html` and `style.css`

The existing Talent Tracker, Trait / Title / Perk, Team Builder, and game-data updater files are retained.
