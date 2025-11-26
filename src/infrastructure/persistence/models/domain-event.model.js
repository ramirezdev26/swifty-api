import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class DomainEventModel extends Model {}

DomainEventModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Unique identifier for the event (evt_timestamp_random)',
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of event (e.g., ImageUploadEvent, ImageProcessed)',
    },
    aggregate_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the aggregate root (e.g., imageId, userId)',
    },
    aggregate_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of aggregate (e.g., Image, User)',
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Event payload in JSON format',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata (userId, correlationId, etc.)',
    },
    version: {
      type: DataTypes.STRING(10),
      defaultValue: '1.0',
      allowNull: false,
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when the event occurred',
    },
  },
  {
    sequelize,
    modelName: 'DomainEvent',
    tableName: 'domain_events',
    timestamps: true,
    updatedAt: false, // Events are immutable, no updates
    indexes: [
      {
        fields: ['event_type'],
      },
      {
        fields: ['aggregate_id'],
      },
      {
        fields: ['aggregate_type'],
      },
      {
        fields: ['occurred_at'],
      },
      {
        fields: ['event_id'],
        unique: true,
      },
    ],
  }
);
