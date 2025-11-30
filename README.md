# Bespuitingsregister

Kleine full-stack demo waarin bespuitingsregistraties worden opgeslagen via een FastAPI-backend met SQLite en via een simpele HTML/JS-frontend worden beheerd.

## Backend draaien
1. Installeer afhankelijkheden:
   ```bash
   pip install -r requirements.txt
   ```
2. Start de API (luistert standaard op poort 8000):
   ```bash
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

Bij de eerste start wordt `data.db` aangemaakt met een `records` tabel. Endpoints:
- `GET /api/records` – lijst alle registraties (nieuwste eerst)
- `POST /api/records` – maak een registratie met velden `date`, `field`, `product`, `dose`, `notes`
- `DELETE /api/records/{id}` – verwijder één registratie
- `DELETE /api/records` – wis alle registraties

## Frontend draaien
De HTML/JS wordt statisch geserveerd. Open `index.html` of `register.html` via een eenvoudige server (bijv. `python -m http.server 5500`). Zorg dat de backend op dezelfde host draait of pas het `API_BASE` in `app.js` aan.

## CSV-export
De export blijft client-side: de tabeldata wordt vanuit de API geladen en direct als CSV gedownload.
