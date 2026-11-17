import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../config/database.js';
import type { FuenteDatos, EstadoCorrida } from '../schemas/dominio.schema.js';

export class CorridaScraperModel extends Model<
  InferAttributes<CorridaScraperModel>,
  InferCreationAttributes<CorridaScraperModel>
> {
  declare id: CreationOptional<string>;
  declare fuente: FuenteDatos;
  declare fechaInicio: Date;
  declare fechaFin: Date | null;
  declare estado: EstadoCorrida;
  declare totalLeidos: number;
  declare nuevos: number;
  declare actualizados: number;
  declare fallidos: number;
  declare mensajeError: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CorridaScraperModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fuente: {
      type: DataTypes.ENUM(
        'argenprop',
        'zonaprop',
        'properati',
        'manual_municipal',
        'planilla_externa',
        'baja_comercial'
      ),
      allowNull: false,
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaFin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('OK', 'FALLO', 'EN_PROCESO'),
      allowNull: false,
      defaultValue: 'EN_PROCESO',
    },
    totalLeidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    nuevos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    actualizados: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fallidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    mensajeError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'corridas_scraper',
    modelName: 'CorridaScraper',
    timestamps: true,
    indexes: [
      {
        fields: ['fuente', 'fechaInicio'],
        name: 'idx_corridas_fuente_fecha',
      },
      {
        fields: ['estado'],
        name: 'idx_corridas_estado',
      },
    ],
  }
);
