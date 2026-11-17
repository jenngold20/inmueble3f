import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database.js';
import type { AvisoModel } from './Aviso.model.js';

export class FotoModel extends Model<
  InferAttributes<FotoModel>,
  InferCreationAttributes<FotoModel>
> {
  declare id: CreationOptional<string>;
  declare avisoId: string;
  declare url: string;
  declare orden: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Asociación
  declare aviso?: NonAttribute<AvisoModel>;
}

FotoModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    avisoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'avisos',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'fotos',
    modelName: 'Foto',
    timestamps: true,
    indexes: [
      {
        fields: ['avisoId'],
        name: 'idx_fotos_aviso_id',
      },
      {
        fields: ['avisoId', 'orden'],
        name: 'idx_fotos_aviso_orden',
      },
    ],
  }
);
