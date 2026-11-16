import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database.js';
import type {
  FuenteDatos,
  Moneda,
  TipoOperacion,
  EstadoAviso,
} from '../schemas/dominio.schema.js';
import type { InmuebleModel } from './Inmueble.model.js';
import type { FotoModel } from './Foto.model.js';

export class AvisoModel extends Model<
  InferAttributes<AvisoModel>,
  InferCreationAttributes<AvisoModel>
> {
  declare id: CreationOptional<string>;
  declare inmuebleId: string;
  declare idExterno: string;
  declare fuente: FuenteDatos;
  declare url: string;
  declare titulo: string;
  declare descripcion: string | null;
  declare precio: number | null;
  declare moneda: Moneda;
  declare operacion: TipoOperacion;
  declare anunciante: string | null;
  declare comercializadora: string | null;
  declare contactoTelefono: string | null;
  declare fechaVistoPrimeraVez: Date;
  declare fechaVistoUltimaVez: Date;
  declare estado: EstadoAviso;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociaciones
  declare inmueble?: NonAttribute<InmuebleModel>;
  declare fotos?: NonAttribute<FotoModel[]>;
}

AvisoModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    inmuebleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'inmuebles',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    idExterno: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    titulo: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    precio: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    moneda: {
      type: DataTypes.ENUM('USD', 'ARS'),
      allowNull: false,
      defaultValue: 'USD',
    },
    operacion: {
      type: DataTypes.ENUM('venta', 'alquiler'),
      allowNull: false,
    },
    anunciante: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    comercializadora: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contactoTelefono: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fechaVistoPrimeraVez: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fechaVistoUltimaVez: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.ENUM('activo', 'baja', 'pausado'),
      allowNull: false,
      defaultValue: 'activo',
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
    tableName: 'avisos',
    modelName: 'Aviso',
    timestamps: true,
    indexes: [
      {
        fields: ['inmuebleId'],
        name: 'idx_avisos_inmueble_id',
      },
      {
        unique: true,
        fields: ['fuente', 'idExterno'],
        name: 'idx_avisos_fuente_id_externo_unique',
      },
      {
        fields: ['estado'],
        name: 'idx_avisos_estado',
      },
      {
        fields: ['operacion'],
        name: 'idx_avisos_operacion',
      },
      {
        fields: ['fechaVistoUltimaVez'],
        name: 'idx_avisos_fecha_visto',
      },
    ],
  }
);
