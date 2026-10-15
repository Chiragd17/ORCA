"""Initial schema for ORCA models

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-15 15:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. data_sources
    op.create_table(
        'data_sources',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('provider', sa.String(length=128), nullable=False),
        sa.Column('url', sa.String(length=512), nullable=True),
        sa.Column('license', sa.String(length=128), nullable=True),
        sa.Column('update_frequency', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_data_sources_name'), 'data_sources', ['name'], unique=True)

    # 2. marine_observations
    op.create_table(
        'marine_observations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('observation_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('retrieval_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('variable', sa.String(length=64), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=32), nullable=False),
        sa.Column('quality_flag', sa.String(length=32), nullable=True),
        sa.Column('is_forecast', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_marine_obs_loc_time', 'marine_observations', ['latitude', 'longitude', 'observation_time'], unique=False)
    op.create_index('idx_marine_obs_var_time', 'marine_observations', ['variable', 'observation_time'], unique=False)
    op.create_index(op.f('ix_marine_observations_observation_time'), 'marine_observations', ['observation_time'], unique=False)
    op.create_index(op.f('ix_marine_observations_source_id'), 'marine_observations', ['source_id'], unique=False)
    op.create_index(op.f('ix_marine_observations_variable'), 'marine_observations', ['variable'], unique=False)

    # 3. hazard_events
    op.create_table(
        'hazard_events',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=False),
        sa.Column('external_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('hazard_type', sa.String(length=64), nullable=False),
        sa.Column('basin', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hazard_events_external_id'), 'hazard_events', ['external_id'], unique=True)
    op.create_index(op.f('ix_hazard_events_hazard_type'), 'hazard_events', ['hazard_type'], unique=False)
    op.create_index(op.f('ix_hazard_events_source_id'), 'hazard_events', ['source_id'], unique=False)

    # 4. hazard_tracks
    op.create_table(
        'hazard_tracks',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('hazard_event_id', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('wind_speed_kts', sa.Float(), nullable=True),
        sa.Column('central_pressure_mb', sa.Float(), nullable=True),
        sa.Column('is_forecast', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['hazard_event_id'], ['hazard_events.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_hazard_track_event_time', 'hazard_tracks', ['hazard_event_id', 'timestamp'], unique=False)
    op.create_index(op.f('ix_hazard_tracks_hazard_event_id'), 'hazard_tracks', ['hazard_event_id'], unique=False)
    op.create_index(op.f('ix_hazard_tracks_timestamp'), 'hazard_tracks', ['timestamp'], unique=False)

    # 5. coastal_features
    op.create_table(
        'coastal_features',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('feature_type', sa.String(length=64), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('geojson_geometry', sa.JSON(), nullable=True),
        sa.Column('estimated_population', sa.Integer(), nullable=True),
        sa.Column('source_id', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_coastal_features_feature_type'), 'coastal_features', ['feature_type'], unique=False)

    # 6. evidence_records
    op.create_table(
        'evidence_records',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('source_id', sa.String(length=64), nullable=True),
        sa.Column('source_identifier', sa.String(length=256), nullable=False),
        sa.Column('source_url', sa.String(length=1024), nullable=True),
        sa.Column('observation_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('retrieval_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('data_type', sa.String(length=64), nullable=False),
        sa.Column('raw_payload', sa.JSON(), nullable=False),
        sa.Column('hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['data_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. investigations
    op.create_table(
        'investigations',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('workspace', sa.String(length=64), nullable=False),
        sa.Column('query', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('plan', sa.JSON(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_investigations_status'), 'investigations', ['status'], unique=False)
    op.create_index(op.f('ix_investigations_workspace'), 'investigations', ['workspace'], unique=False)

    # 8. investigation_findings
    op.create_table(
        'investigation_findings',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('investigation_id', sa.String(length=64), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=False),
        sa.Column('claim', sa.Text(), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(length=32), nullable=True),
        sa.Column('evidence_ids', sa.JSON(), nullable=False),
        sa.Column('verification_state', sa.String(length=32), nullable=False),
        sa.Column('uncertainty_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_investigation_findings_agent_id'), 'investigation_findings', ['agent_id'], unique=False)
    op.create_index(op.f('ix_investigation_findings_investigation_id'), 'investigation_findings', ['investigation_id'], unique=False)

    # 9. investigation_events
    op.create_table(
        'investigation_events',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('investigation_id', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('agent_id', sa.String(length=64), nullable=True),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(['investigation_id'], ['investigations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_investigation_events_order', 'investigation_events', ['investigation_id', 'timestamp'], unique=False)
    op.create_index(op.f('ix_investigation_events_event_type'), 'investigation_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_investigation_events_investigation_id'), 'investigation_events', ['investigation_id'], unique=False)


def downgrade() -> None:
    op.drop_table('investigation_events')
    op.drop_table('investigation_findings')
    op.drop_table('investigations')
    op.drop_table('evidence_records')
    op.drop_table('coastal_features')
    op.drop_table('hazard_tracks')
    op.drop_table('hazard_events')
    op.drop_table('marine_observations')
    op.drop_table('data_sources')
