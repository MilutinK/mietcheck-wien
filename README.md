# mietcheck-wien
Interactive rent comparison tool for Vienna districts using open government data

# 1. Repo klonen (falls noch nicht auf diesem PC)
git clone https://github.com/MilutinK/mietcheck-wien.git
cd mietcheck-wien

# 2. Auf develop Branch wechseln
git checkout develop

# 3. Daten herunterladen
python backend/scripts/download_data.py

# 4. ETL laufen lassen (baut districts.json)
python backend/scripts/etl.py