"""Pydantic schemas for teacher endpoints (architecture.md §6, §5.1)."""

from datetime import datetime

from pydantic import BaseModel, Field


class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ClassOut(BaseModel):
    id: int
    name: str
    join_code: str
    created_at: datetime


class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    instructions: str = ""
    due_at: datetime  # UTC; 422 if in past (T2)


class AssignmentOut(BaseModel):
    id: int
    class_id: int
    title: str
    instructions: str
    due_at: datetime


class StudentSubmissionRow(BaseModel):
    """One row of the T3 roster view: submitted / late / missing per student."""

    student_id: int
    student_name: str
    status: str  # submitted | late | missing
    is_late: bool | None = None
    submitted_at: datetime | None = None
    version: int | None = None
