from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import calendar

from app.database.session import SessionLocal
from app.models.dashboard_note import DashboardNote
from app.schemas.dashboard_note import (
    DashboardNoteCreate,
    DashboardNoteUpdate,
    DashboardNoteResponse
)

router = APIRouter(
    prefix="/dashboard-notes",
    tags=["Dashboard Notes"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=DashboardNoteResponse)
def add_dashboard_note(
    data: DashboardNoteCreate,
    db: Session = Depends(get_db),
):
    note = DashboardNote(
        note=data.note,
        note_date=data.note_date
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[DashboardNoteResponse])
def get_dashboard_notes(
    month: str = Query(..., regex=r"^\d{4}-\d{2}$", description="Format: YYYY-MM"),
    db: Session = Depends(get_db),
):
    try:
        year, mon = map(int, month.split("-"))
        last_day = calendar.monthrange(year, mon)[1]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    start_date = date(year, mon, 1)
    end_date = date(year, mon, last_day)

    notes = (
        db.query(DashboardNote)
        .filter(DashboardNote.note_date.between(start_date, end_date))
        .order_by(DashboardNote.note_date.asc())
        .all()
    )

    return notes


@router.put("/{note_id}", response_model=DashboardNoteResponse)
def update_dashboard_note(
    note_id: int,
    data: DashboardNoteUpdate,
    db: Session = Depends(get_db),
):
    note = db.query(DashboardNote).filter(DashboardNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.note = data.note
    note.note_date = data.note_date
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_dashboard_note(
    note_id: int,
    db: Session = Depends(get_db),
):
    note = db.query(DashboardNote).filter(DashboardNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"ok": True, "deleted_id": note_id}
