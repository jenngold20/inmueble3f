import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database.js';
import type { TipoInmueble, ZonaCodigo, Macrozona } from '../schemas/dominio.schema.js';
import type { AvisoModel } from './Aviso.model.js';

export class InmuebleModel extends Model<
  InferAttributes<InmuebleModel>,
  InferCreationAttributes<InmuebleModel>
> {
  declare id: CreationOptional<string>;
  declare direccion: string;
  declare direccionNormalizada: string | null;
  declare localidad: string;
  declare lat: number;
  declare lng: number;
  declare superficieTotalM2: number | null;
  declare superficieCubiertaM2: number | null;
  declare tipo: TipoInmueble;
  declare zonaCodigo: ZonaCodigo | null;
  declare macrozona: Macrozona | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociación relacional
  declare avisos?: NonAttribute<AvisoModel[]>;
}

InmuebleModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    direccionNormalizada: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    localidad: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lat: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    lng: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    superficieTotalM2: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    superficieCubiertaM2: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.ENUM('local', 'galpon', 'oficina', 'terreno'),
      allowNull: false,
    },
    zonaCodigo: {
      type: DataTypes.ENUM(
        'C1',
        'C2',
        'C3',
        'R1a',
        'R1b',
        'R2a',
        'R2b',
        'RMI1',
        'RMI2',
        'RMI3',
        'RC1',
        'RC2',
        'RC3'
      ),
      allowNull: true,
    },
    macrozona: {
      type: DataTypes.ENUM(
        'DESARROLLO_PRIORITARIO',
        'PROMOCION_HABITAT',
        'PROTECCION_PATRIMONIAL'
      ),
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
    tableName: 'inmuebles',
    modelName: 'Inmueble',
    timestamps: true,
    indexes: [
      {
        fields: ['lat', 'lng'],
        name: 'idx_inmuebles_coordenadas',
      },
      {
        fields: ['tipo'],
        name: 'idx_inmuebles_tipo',
      },
      {
        fields: ['localidad'],
        name: 'idx_inmuebles_localidad',
      },
      {
        fields: ['zonaCodigo'],
        name: 'idx_inmuebles_zona_codigo',
      },
    ],
  }
);
