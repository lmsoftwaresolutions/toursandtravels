from datetime import date


MIN_REASONABLE_YEAR = 1900


def validate_reasonable_past_or_today_date(value: date, field_label: str) -> date:
    today = date.today()

    if value.year < MIN_REASONABLE_YEAR:
        raise ValueError(f"{field_label} year must be {MIN_REASONABLE_YEAR} or later")

    if value > today:
        raise ValueError(f"{field_label} cannot be in the future")

    return value
