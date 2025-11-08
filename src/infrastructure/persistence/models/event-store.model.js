import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

export class EventStoreModel extends Model {}

EventStoreModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aggregate_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    aggregate_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    event_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    correlation_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'EventStore',
    tableName: 'events',
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        fields: ['aggregate_id'],
      },
      {
        fields: ['event_type'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);
