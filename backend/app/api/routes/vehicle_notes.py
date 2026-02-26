from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import calendar

from app.database.session import SessionLocal
from app.models.vehicle_note import VehicleNote
from app.schemas.vehicle_note import VehicleNoteCreate, VehicleNoteUpdate, VehicleNoteResponse

router = APIRouter(
    prefix="/vehicle-notes",
    tags=["Vehicle Notes"]
)


# DB dependency (local, simple)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=VehicleNoteResponse)
def add_vehicle_note(
    data: VehicleNoteCreate,
    db: Session = Depends(get_db),
):
    note = VehicleNote(
        vehicle_id=data.vehicle_id,
        note=data.note,
        note_date=data.note_date  # user-selected date
        # created_at auto-set
    )

    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.put("/{note_id}", response_model=VehicleNoteResponse)
def update_vehicle_note(
    note_id: int,
    data: VehicleNoteUpdate,
    db: Session = Depends(get_db),
):
    note = db.query(VehicleNote).filter(VehicleNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.note = data.note
    note.note_date = data.note_date
    db.commit()
    db.refresh(note)
    return note

@router.delete("/{note_id}")
def delete_vehicle_note(
    note_id: int,
    db: Session = Depends(get_db),
):
    note = db.query(VehicleNote).filter(VehicleNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True, "deleted_id": note_id}
@router.get("", response_model=list[VehicleNoteResponse])
def get_vehicle_notes(
    vehicle_id: int = Query(..., description="Vehicle ID"),
    month: str = Query(..., regex=r"^\d{4}-\d{2}$", description="Format: YYYY-MM"),
    db: Session = Depends(get_db),
):
    try:
        year, mon = map(int, month.split("-"))
        last_day = calendar.monthrange(year, mon)[1]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid month format. Use YYYY-MM"
        )

    start_date = date(year, mon, 1)
    end_date = date(year, mon, last_day)

    notes = (
        db.query(VehicleNote)
        .filter(
            VehicleNote.vehicle_id == vehicle_id,
            VehicleNote.note_date.between(start_date, end_date)
        )
        .order_by(VehicleNote.note_date.asc())
        .all()
    )

    return notes
