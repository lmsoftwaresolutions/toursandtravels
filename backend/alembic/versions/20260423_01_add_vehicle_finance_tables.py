"""add vehicle finance tables

Revision ID: 20260423_01
Revises: 20260416_01
Create Date: 2026-04-23
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260423_01"
down_revision: Union[str, None] = "20260416_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_emi_plans (
            id SERIAL PRIMARY KEY,
            vehicle_number VARCHAR NOT NULL,
            vehicle_purchase_price DOUBLE PRECISION NOT NULL DEFAULT 0,
            down_payment DOUBLE PRECISION NOT NULL DEFAULT 0,
            loan_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            annual_interest_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
            loan_duration_months INTEGER NOT NULL DEFAULT 1,
            emi_start_date DATE NOT NULL,
            emi_end_date DATE NOT NULL,
            monthly_emi DOUBLE PRECISION NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_plans_id ON vehicle_emi_plans (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_plans_vehicle_number ON vehicle_emi_plans (vehicle_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_plans_is_active ON vehicle_emi_plans (is_active)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_emi_installments (
            id SERIAL PRIMARY KEY,
            emi_plan_id INTEGER NOT NULL REFERENCES vehicle_emi_plans(id) ON DELETE CASCADE,
            installment_number INTEGER NOT NULL,
            due_date DATE NOT NULL,
            opening_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            principal_component DOUBLE PRECISION NOT NULL DEFAULT 0,
            interest_component DOUBLE PRECISION NOT NULL DEFAULT 0,
            amount_due DOUBLE PRECISION NOT NULL DEFAULT 0,
            closing_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
            paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            paid_on DATE,
            is_paid BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_installments_id ON vehicle_emi_installments (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_installments_emi_plan_id ON vehicle_emi_installments (emi_plan_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_installments_due_date ON vehicle_emi_installments (due_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_emi_installments_is_paid ON vehicle_emi_installments (is_paid)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_insurance (
            id SERIAL PRIMARY KEY,
            vehicle_number VARCHAR NOT NULL,
            provider_name VARCHAR NOT NULL,
            policy_number VARCHAR NOT NULL,
            insurance_type VARCHAR NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_insurance_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
            monthly_insurance_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
            renewal_status VARCHAR NOT NULL DEFAULT 'pending',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_insurance_id ON vehicle_insurance (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_insurance_vehicle_number ON vehicle_insurance (vehicle_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_insurance_policy_number ON vehicle_insurance (policy_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_insurance_end_date ON vehicle_insurance (end_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_insurance_is_active ON vehicle_insurance (is_active)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_tax (
            id SERIAL PRIMARY KEY,
            vehicle_number VARCHAR NOT NULL,
            road_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            permit_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            fitness_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            pollution_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            permit_charges DOUBLE PRECISION NOT NULL DEFAULT 0,
            other_taxes DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax_start_date DATE NOT NULL,
            tax_expiry_date DATE NOT NULL,
            annual_total_tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            monthly_tax_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
            renewal_status VARCHAR NOT NULL DEFAULT 'pending',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_tax_id ON vehicle_tax (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_tax_vehicle_number ON vehicle_tax (vehicle_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_tax_tax_expiry_date ON vehicle_tax (tax_expiry_date)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicle_tax_is_active ON vehicle_tax (is_active)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vehicle_tax")
    op.execute("DROP TABLE IF EXISTS vehicle_insurance")
    op.execute("DROP TABLE IF EXISTS vehicle_emi_installments")
    op.execute("DROP TABLE IF EXISTS vehicle_emi_plans")
