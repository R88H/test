from datetime import date
from sqlite3 import Connection, Row, connect
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

DATABASE_PATH = "./data.db"

app = FastAPI(title="Bespuitingsregister API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection() -> Connection:
    conn = connect(DATABASE_PATH)
    conn.row_factory = Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                field TEXT NOT NULL,
                product TEXT NOT NULL,
                dose REAL NOT NULL,
                notes TEXT DEFAULT ''
            );
            """
        )
        conn.commit()


class RecordCreate(BaseModel):
    date: date
    field: str = Field(..., min_length=1)
    product: str = Field(..., min_length=1)
    dose: float = Field(..., ge=0)
    notes: str = Field(default="")

    @validator("notes", pre=True)
    def normalize_notes(cls, value: str) -> str:  # noqa: N805
        return value.strip() if isinstance(value, str) else ""


class Record(RecordCreate):
    id: int

    class Config:
        orm_mode = True


def row_to_record(row: Row) -> Record:
    return Record(
        id=row["id"],
        date=row["date"],
        field=row["field"],
        product=row["product"],
        dose=row["dose"],
        notes=row["notes"],
    )


@app.on_event("startup")
def startup_event() -> None:
    init_db()


def get_db(conn: Connection = Depends(get_connection)) -> Connection:
    return conn


@app.get("/api/records", response_model=List[Record])
def list_records(conn: Connection = Depends(get_db)) -> List[Record]:
    rows = conn.execute("SELECT * FROM records ORDER BY id DESC").fetchall()
    return [row_to_record(row) for row in rows]


@app.post("/api/records", response_model=Record, status_code=status.HTTP_201_CREATED)
def create_record(payload: RecordCreate, conn: Connection = Depends(get_db)) -> Record:
    cursor = conn.execute(
        "INSERT INTO records (date, field, product, dose, notes) VALUES (?, ?, ?, ?, ?)",
        (
            payload.date.isoformat(),
            payload.field.strip(),
            payload.product.strip(),
            payload.dose,
            payload.notes,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM records WHERE id = ?", (cursor.lastrowid,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Record niet beschikbaar")
    return row_to_record(row)


@app.delete("/api/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, conn: Connection = Depends(get_db)) -> None:
    cursor = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
    conn.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record niet gevonden")


@app.delete("/api/records", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_records(conn: Connection = Depends(get_db)) -> None:
    conn.execute("DELETE FROM records")
    conn.commit()
